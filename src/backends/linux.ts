import { spawn } from "node:child_process"
import type { NowPlayingInfo } from "../types"
import { detectServiceFromPlayerName } from "../format"

/** playerctl template format string — tab-separated fields */
const PLAYERCTL_FORMAT = "{{playerName}}\t{{status}}\t{{artist}}\t{{title}}"

/**
 * Pure function: parses a single line of playerctl --format output → NowPlayingInfo.
 * Returns null if line is empty, malformed, or no player is active.
 * Input format: "playerName\tstatus\tartist\ttitle"
 * Example: "spotify\tPlaying\tDaft Punk\tGet Lucky"
 */
export function parsePlayerctlOutput(line: string): NowPlayingInfo | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const parts = trimmed.split("\t")
  if (parts.length < 4) return null

  const [playerName, status, artist, title] = parts

  if (!playerName || !artist || !title) return null
  if (status === "Stopped" || !status) return null

  const service = detectServiceFromPlayerName(playerName, title)
  const state = status === "Playing" ? "playing" : "paused"

  return { title, artist, service, state }
}

/**
 * Single-shot fetch: runs `playerctl metadata --format ...` once and returns parsed result.
 * Returns null on error or when no player is active.
 */
export async function pollLinux(): Promise<NowPlayingInfo | null> {
  return new Promise((resolve) => {
    let output = ""
    const proc = spawn("playerctl", ["metadata", "--format", PLAYERCTL_FORMAT])

    proc.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString()
    })

    proc.on("close", (code) => {
      if (code !== 0 || !output.trim()) {
        resolve(null)
        return
      }
      resolve(parsePlayerctlOutput(output.trim()))
    })

    proc.on("error", () => resolve(null))
  })
}

/**
 * Streaming: spawns `playerctl metadata --follow --format ...` and calls onUpdate on each change.
 * Automatically stops when the AbortSignal fires.
 * Calls onUpdate(null) when no player is active.
 */
export function streamLinux(
  signal: AbortSignal,
  onUpdate: (info: NowPlayingInfo | null, streamEnded?: boolean) => void
): void {
  if (signal.aborted) return

  const proc = spawn(
    "playerctl",
    ["metadata", "--follow", "--format", PLAYERCTL_FORMAT],
    { signal }
  )

  proc.stdout.on("data", (chunk: Buffer) => {
    const lines = chunk.toString().split("\n")
    for (const line of lines) {
      if (!line.trim()) continue
      onUpdate(parsePlayerctlOutput(line))
    }
  })

  proc.on("close", () => {
    onUpdate(null, true)
  })

  proc.on("error", (err) => {
    if ((err as NodeJS.ErrnoException).code !== "ABORT_ERR") {
      console.error("[opencode-now-playing] playerctl error:", err.message)
    }
    onUpdate(null, true)
  })
}
