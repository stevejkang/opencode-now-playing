import type { NowPlayingInfo, ServiceType } from "./types"
import {
  BUNDLE_ID_MAP,
  PLAYER_NAME_MAP,
  SERVICE_LABELS,
  STATE_LABELS,
  MAX_TEXT_LENGTH,
  MARQUEE_GAP,
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

export function getFullTrackText(info: NowPlayingInfo): string {
  return `${info.artist} - ${info.title}`
}

/**
 * Fixed-width slice of looping text at given offset.
 * Wraps around via modular arithmetic with MARQUEE_GAP spaces between repetitions.
 */
export function getScrollSlice(text: string, offset: number, width: number): string {
  const padded = text + " ".repeat(MARQUEE_GAP)
  const len = padded.length
  const normalizedOffset = offset % len

  let result = ""
  for (let i = 0; i < width; i++) {
    result += padded[(normalizedOffset + i) % len]
  }
  return result
}

/**
 * Detects ServiceType from macOS bundle ID.
 * Known apps (Spotify, Apple Music) and browsers are mapped directly.
 */
export function detectService(bundleId: string): ServiceType {
  return BUNDLE_ID_MAP[bundleId] ?? "unknown"
}

/**
 * Detects ServiceType from Linux playerctl player name.
 * Known apps (Spotify) and browsers are mapped directly.
 */
export function detectServiceFromPlayerName(playerName: string): ServiceType {
  return PLAYER_NAME_MAP[playerName] ?? "unknown"
}
