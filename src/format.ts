import type { NowPlayingInfo, ServiceType } from "./types"
import {
  BUNDLE_ID_MAP,
  PLAYER_NAME_MAP,
  YOUTUBE_TITLE_PATTERNS,
  SERVICE_LABELS,
  STATE_LABELS,
  MAX_TEXT_LENGTH,
} from "./constants"

/**
 * Truncates text to maxLength characters, appending "…" if truncated.
 * Example: truncateText("A Very Long Title", 10) → "A Very Lon…"
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "…"
}

/**
 * Formats the FIRST display line: "{artist} - {title}"
 * Both artist and title are truncated to MAX_TEXT_LENGTH before joining.
 * The combined "artist - title" string is then truncated to MAX_TEXT_LENGTH.
 */
export function formatTrackLine(info: NowPlayingInfo): string {
  const artist = truncateText(info.artist, MAX_TEXT_LENGTH)
  const title = truncateText(info.title, MAX_TEXT_LENGTH)
  return truncateText(`${artist} - ${title}`, MAX_TEXT_LENGTH)
}

/**
 * Formats the SECOND display line (dimmed): "  {stateLabel} {serviceLabel}"
 * For "stopped" state, just returns "  stopped" (no service name).
 */
export function formatStatusLine(info: NowPlayingInfo): string {
  const label = STATE_LABELS[info.state]
  if (info.state === "stopped") {
    return label
  }
  const serviceName = SERVICE_LABELS[info.service]
  return `${label} ${serviceName}`
}

/**
 * Detects ServiceType from macOS bundle ID.
 * Falls back to YouTube Music detection via title heuristic if bundle ID is browser.
 */
export function detectService(bundleId: string, title?: string): ServiceType {
  const mapped = BUNDLE_ID_MAP[bundleId]
  if (mapped) return mapped

  const browserBundleIds = [
    "com.google.Chrome",
    "org.mozilla.firefox",
    "com.apple.Safari",
  ]

  if (browserBundleIds.includes(bundleId) && title) {
    for (const pattern of YOUTUBE_TITLE_PATTERNS) {
      if (pattern.test(title)) return "youtube-music"
    }
  }

  return "unknown"
}

/**
 * Detects ServiceType from Linux playerctl player name.
 * Falls back to YouTube Music detection via title heuristic.
 */
export function detectServiceFromPlayerName(playerName: string, title?: string): ServiceType {
  const mapped = PLAYER_NAME_MAP[playerName]
  if (mapped) return mapped

  const browserPlayerNames = ["chromium", "firefox", "google-chrome"]

  if (browserPlayerNames.includes(playerName) && title) {
    for (const pattern of YOUTUBE_TITLE_PATTERNS) {
      if (pattern.test(title)) return "youtube-music"
    }
  }

  return "unknown"
}
