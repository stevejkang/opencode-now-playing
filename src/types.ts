/** Supported music service types */
export type ServiceType = "apple-music" | "spotify" | "youtube-music" | "unknown"

/** Playback state */
export type PlaybackState = "playing" | "paused" | "stopped"

/** Normalized now-playing info passed to TUI */
export interface NowPlayingInfo {
  title: string
  artist: string
  service: ServiceType
  state: PlaybackState
}

/** Raw payload from `media-control get` or `media-control stream` (macOS) */
export interface MediaControlPayload {
  diff: boolean
  payload: {
    title?: string
    artist?: string
    album?: string
    bundleIdentifier?: string
    playing?: boolean
    elapsedTimeMicros?: number
    durationMicros?: number
  } | null
}

/** Parsed result from playerctl template output (Linux) */
export interface PlayerctlOutput {
  playerName: string
  status: string
  artist: string
  title: string
}

/** Plugin configuration (from tui.json options) */
export interface PluginConfig {
  refreshInterval?: number   // polling fallback interval in ms (default: 5000)
}
