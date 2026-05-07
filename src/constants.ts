import type { ServiceType, PlaybackState } from "./types"

/** macOS bundle ID → ServiceType mapping */
export const BUNDLE_ID_MAP: Record<string, ServiceType> = {
  "com.apple.Music": "apple-music",
  "com.apple.music": "apple-music",
  "com.spotify.client": "spotify",
  "com.spotify.Spotify": "spotify",
  "com.google.Chrome": "browser",
  "org.mozilla.firefox": "browser",
  "com.apple.Safari": "browser",
}

/** Linux playerctl player name → ServiceType mapping */
export const PLAYER_NAME_MAP: Record<string, ServiceType> = {
  spotify: "spotify",
  Spotify: "spotify",
  chromium: "browser",
  firefox: "browser",
  "google-chrome": "browser",
  rhythmbox: "unknown",
  vlc: "unknown",
}

/** Human-readable service names for display (e.g. "playing on Spotify") */
export const SERVICE_LABELS: Record<ServiceType, string> = {
  "apple-music": "Apple Music",
  "spotify": "Spotify",
  "browser": "Browser",
  "unknown": "Unknown",
}

/** Icons shown before track name */
export const STATE_ICONS: Record<PlaybackState, string> = {
  playing: "▶",
  paused: "⏸",
  stopped: "■",
}

/** Verb phrase used in 2nd line: "playing on", "paused on", "stopped" */
export const STATE_LABELS: Record<PlaybackState, string> = {
  playing: "playing on",
  paused: "paused on",
  stopped: "stopped",
}

/** Max characters for track/artist text before truncation */
export const MAX_TEXT_LENGTH = 30

/** Default polling interval in ms (used as fallback when stream breaks) */
export const DEFAULT_REFRESH_INTERVAL = 5000
