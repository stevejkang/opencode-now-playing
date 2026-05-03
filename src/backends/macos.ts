import { spawn } from "node:child_process"
import type { NowPlayingInfo, MediaControlPayload } from "../types.js"
import { detectService } from "../format.js"

/**
 * Pure function: converts raw media-control payload → NowPlayingInfo.
 * Returns null if payload is null (nothing playing) or data is incomplete.
 */
export function parseMacOSPayload(raw: MediaControlPayload): NowPlayingInfo | null {
  if (!raw.payload) return null

  const { title, artist, bundleIdentifier, playing } = raw.payload

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
        const raw: MediaControlPayload = JSON.parse(output.trim())
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
  onUpdate: (info: NowPlayingInfo | null) => void
): void {
  if (signal.aborted) return

  let buffer = ""
  const proc = spawn("media-control", ["stream"], { signal })

  proc.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString()
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const raw: MediaControlPayload = JSON.parse(trimmed)
        onUpdate(parseMacOSPayload(raw))
      } catch {
        // skip malformed lines
      }
    }
  })

  proc.on("close", () => {
    onUpdate(null)
  })

  proc.on("error", (err) => {
    // ABORT_ERR is expected when signal fires — don't log it
    if ((err as NodeJS.ErrnoException).code !== "ABORT_ERR") {
      console.error("[opencode-now-playing] media-control error:", err.message)
    }
    onUpdate(null)
  })
}
