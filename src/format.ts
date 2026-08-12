import type { NowPlayingInfo, ServiceType } from "./types"
import {
  BUNDLE_ID_MAP,
  PLAYER_NAME_MAP,
  SERVICE_LABELS,
  STATE_LABELS,
  MAX_TEXT_LENGTH,
  MARQUEE_GAP,
} from "./constants"

/** Bun global (available in opencode runtime; absent under Node-based test runners) */
declare const Bun: { stringWidth(text: string): number } | undefined

/**
 * Checks if a code point is East Asian Wide/Fullwidth (occupies 2 terminal columns).
 * Minimal fallback used when Bun.stringWidth is unavailable (e.g. vitest under Node).
 */
function isWideCodePoint(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    (cp >= 0x2e80 && cp <= 0x303e) || // CJK Radicals .. CJK Symbols and Punctuation
    (cp >= 0x3041 && cp <= 0x33ff) || // Hiragana .. CJK Compatibility
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Extension A
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified Ideographs
    (cp >= 0xa000 && cp <= 0xa4cf) || // Yi Syllables
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul Syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compatibility Ideographs
    (cp >= 0xfe30 && cp <= 0xfe4f) || // CJK Compatibility Forms
    (cp >= 0xff00 && cp <= 0xff60) || // Fullwidth Forms
    (cp >= 0xffe0 && cp <= 0xffe6) || // Fullwidth Signs
    (cp >= 0x1f300 && cp <= 0x1f64f) || // Emoji (misc symbols & pictographs, emoticons)
    (cp >= 0x1f900 && cp <= 0x1f9ff) || // Supplemental symbols & pictographs
    (cp >= 0x20000 && cp <= 0x3fffd) // CJK Extension B+
  )
}

function fallbackCharWidth(cp: number): number {
  // Control characters occupy no columns
  if (cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f)) return 0
  return isWideCodePoint(cp) ? 2 : 1
}

/**
 * Terminal display width (columns) of text. CJK characters count as 2 columns.
 * Uses Bun.stringWidth when available — the exact function the opentui renderer
 * uses to measure text — so truncation always matches actual rendering.
 */
export function displayWidth(text: string): number {
  if (typeof Bun !== "undefined" && typeof Bun.stringWidth === "function") {
    return Bun.stringWidth(text)
  }
  let width = 0
  for (const char of text) {
    width += fallbackCharWidth(char.codePointAt(0)!)
  }
  return width
}

/**
 * Strips ASCII control characters (newlines, tabs, etc.) from text.
 * Replaces sequences of control chars with a single space, then trims.
 */
export function sanitizeText(text: string): string {
  return text.replace(/[\x00-\x1f]+/g, " ").trim()
}

/**
 * Truncates text to maxWidth display columns, appending "…" if truncated.
 * CJK characters count as 2 columns.
 * Example: truncateText("A Very Long Title", 10) → "A Very Lon…"
 */
export function truncateText(text: string, maxWidth: number): string {
  if (displayWidth(text) <= maxWidth) return text

  let result = ""
  let width = 0
  for (const char of text) {
    const w = displayWidth(char)
    if (width + w > maxWidth) break
    result += char
    width += w
  }
  return result + "…"
}

/**
 * Formats the FIRST display line: "{artist} - {title}"
 * Both artist and title are truncated to MAX_TEXT_LENGTH before joining.
 * The combined "artist - title" string is then truncated to MAX_TEXT_LENGTH.
 */
export function formatTrackLine(info: NowPlayingInfo): string {
  const artist = truncateText(sanitizeText(info.artist), MAX_TEXT_LENGTH)
  const title = truncateText(sanitizeText(info.title), MAX_TEXT_LENGTH)
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
  return `${sanitizeText(info.artist)} - ${sanitizeText(info.title)}`
}

/**
 * Fixed-width slice of looping text at given offset.
 * `offset` advances one character (code point) per tick; `width` is display
 * columns. Wraps around via modular arithmetic with MARQUEE_GAP spaces between
 * repetitions. When a 2-column CJK character doesn't fit in the last remaining
 * column, a space is padded instead so the result is always exactly `width`
 * columns wide.
 */
export function getScrollSlice(text: string, offset: number, width: number): string {
  const chars = [...text, ..." ".repeat(MARQUEE_GAP)]
  const len = chars.length
  const normalizedOffset = offset % len

  let result = ""
  let used = 0
  let i = 0
  while (used < width) {
    const char = chars[(normalizedOffset + i) % len]
    const w = displayWidth(char)
    if (w === 0) {
      i++
      continue
    }
    if (used + w > width) {
      result += " "
      used += 1
      continue
    }
    result += char
    used += w
    i++
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
