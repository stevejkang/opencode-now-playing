import type { NowPlayingInfo } from "./types"
import { streamMacOS, pollMacOS } from "./backends/macos"
import { streamLinux, pollLinux } from "./backends/linux"
import { DEFAULT_REFRESH_INTERVAL } from "./constants"

export type Platform = "macos" | "linux" | "unsupported"

/**
 * Detects the current platform.
 * Returns "macos" on darwin, "linux" on linux, "unsupported" otherwise.
 */
export function detectPlatform(): Platform {
  switch (process.platform) {
    case "darwin": return "macos"
    case "linux": return "linux"
    default: return "unsupported"
  }
}

export interface Backend {
  start(): void
  stop(): void
}

/**
 * Creates a platform-appropriate backend.
 * Tries streaming first; falls back to polling if stream fails or exits.
 * Calls onUpdate(null) for unsupported platforms.
 *
 * Retry: if stream ends unexpectedly, waits 3s and retries up to 3 times,
 * then falls back to polling at DEFAULT_REFRESH_INTERVAL ms.
 */
export function createBackend(
  platform: Platform,
  signal: AbortSignal,
  onUpdate: (info: NowPlayingInfo | null) => void,
  refreshInterval = DEFAULT_REFRESH_INTERVAL
): Backend {
  if (platform === "unsupported") {
    return {
      start() { onUpdate(null) },
      stop() {},
    }
  }

  let retries = 0
  const MAX_RETRIES = 3
  let pollingTimer: ReturnType<typeof setInterval> | null = null
  let stopped = false

  function startPolling() {
    if (stopped || signal.aborted) return

    const pollFn = platform === "macos" ? pollMacOS : pollLinux

    async function poll() {
      if (stopped || signal.aborted) return
      const info = await pollFn()
      onUpdate(info)
    }

    poll()
    pollingTimer = setInterval(poll, refreshInterval)
  }

  signal.addEventListener("abort", () => {
    stopped = true
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  })

  return {
    start() {
      // Try streaming first; if stream exits cleanly and retries < MAX_RETRIES, retry after 3s
      // After MAX_RETRIES, fall back to polling
      function tryStream() {
        if (stopped || signal.aborted) return

        const streamFn = platform === "macos" ? streamMacOS : streamLinux
        let streamEnded = false

        streamFn(signal, (info) => {
          if (info === null && !streamEnded) {
            streamEnded = true
            if (retries < MAX_RETRIES) {
              retries++
              setTimeout(tryStream, 3000)
            } else {
              startPolling()
            }
          } else {
            onUpdate(info)
          }
        })
      }

      tryStream()
    },
    stop() {
      stopped = true
      if (pollingTimer) {
        clearInterval(pollingTimer)
        pollingTimer = null
      }
    },
  }
}
