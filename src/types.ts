/** Supported music service types */
export type ServiceType = "apple-music" | "spotify" | "browser" | "unknown"

/** Playback state */
export type PlaybackState = "playing" | "paused" | "stopped"

/** Normalized now-playing info passed to TUI */
export interface NowPlayingInfo {
  title: string
  artist: string
  service: ServiceType
  state: PlaybackState
}

/** Metadata object emitted by `media-control get` or stream event payloads */
export interface MediaControlMetadata {
  title?: string
  artist?: string
  album?: string
  bundleIdentifier?: string
  playing?: boolean
  elapsedTime?: number
  duration?: number
  elapsedTimeMicros?: number
  durationMicros?: number
}

/** Raw event from `media-control stream` (macOS) */
export interface MediaControlStreamEvent {
  type?: string
  diff: boolean
  payload: MediaControlMetadata | null
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
