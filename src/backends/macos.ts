import { spawn } from "node:child_process"
import type { NowPlayingInfo, MediaControlMetadata, MediaControlStreamEvent } from "../types"
import { detectService } from "../format"

/**
 * Pure function: converts raw media-control metadata → NowPlayingInfo.
 * Accepts both `media-control get` flat JSON and `media-control stream` events.
 * Returns null if payload is null (nothing playing) or data is incomplete.
 */
export function parseMacOSPayload(
  raw: MediaControlMetadata | MediaControlStreamEvent | null
): NowPlayingInfo | null {
  if (!raw) return null

  const metadata = "payload" in raw ? raw.payload : raw
  if (!metadata) return null

  const { title, artist, bundleIdentifier, playing } = metadata

  if (!title || !artist) return null

  const service = detectService(bundleIdentifier ?? "", title)
  const state = playing === true ? "playing" : "paused"

  return { title, artist, service, state }
}

/**
 * Single-shot fetch: runs `media-control get` once and returns parsed result.
 * Returns null on error or when nothing is playing.
 */
export async function pollMacOS(): Promise<NowPlayingInfo | null> {
  return new Promise((resolve) => {
    let output = ""
    const proc = spawn("media-control", ["get"])

    proc.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString()
    })

    proc.on("close", (code) => {
      if (code !== 0 || !output.trim()) {
        resolve(null)
        return
      }
      try {
        const raw: MediaControlMetadata | null = JSON.parse(output.trim())
        resolve(parseMacOSPayload(raw))
      } catch {
        resolve(null)
      }
    })

    proc.on("error", () => resolve(null))
  })
}

/**
 * Streaming: spawns `media-control stream` and calls onUpdate on each NDJSON event.
 * Automatically stops when the AbortSignal fires.
 * Calls onUpdate(null) when the stream ends (nothing playing).
 */
export function streamMacOS(
  signal: AbortSignal,
  onUpdate: (info: NowPlayingInfo | null, streamEnded?: boolean) => void
): void {
  if (signal.aborted) return

  let buffer = ""
  const proc = spawn(
    "media-control",
    ["stream", "--no-diff", "--no-artwork", "--debounce=100"],
    { signal }
  )

  proc.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString()
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const raw: MediaControlStreamEvent = JSON.parse(trimmed)
        onUpdate(parseMacOSPayload(raw))
      } catch {
        // skip malformed lines
      }
    }
  })

  proc.on("close", () => {
    onUpdate(null, true)
  })

  proc.on("error", (err) => {
    // ABORT_ERR is expected when signal fires — don't log it
    if ((err as NodeJS.ErrnoException).code !== "ABORT_ERR") {
      console.error("[opencode-now-playing] media-control error:", err.message)
    }
    onUpdate(null, true)
  })
}
