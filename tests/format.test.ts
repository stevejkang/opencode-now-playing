import { describe, it, expect } from "vitest"
import {
  displayWidth,
  sanitizeText,
  truncateText,
  detectService,
  detectServiceFromPlayerName,
  formatTrackLine,
  formatStatusLine,
  getFullTrackText,
  getScrollSlice,
} from "../src/format.js"
import type { NowPlayingInfo } from "../src/types.js"

interface CharPool {
  name: string
  width: 1 | 2
  range: [number, number]
}

const CHAR_POOLS: CharPool[] = [
  { name: "ascii", width: 1, range: [0x21, 0x7e] },
  { name: "hangul-syllables", width: 2, range: [0xac00, 0xd7a3] },
  { name: "hangul-jamo", width: 2, range: [0x1100, 0x115f] },
  { name: "hiragana", width: 2, range: [0x3041, 0x3096] },
  { name: "katakana", width: 2, range: [0x30a1, 0x30fa] },
  { name: "cjk-ideographs", width: 2, range: [0x4e00, 0x9fff] },
  { name: "fullwidth-forms", width: 2, range: [0xff01, 0xff5e] },
]

function randomCodePoint([min, max]: [number, number]): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function randomCharFrom(pool: CharPool): string {
  return String.fromCodePoint(randomCodePoint(pool.range))
}

function randomPool(): CharPool {
  return CHAR_POOLS[Math.floor(Math.random() * CHAR_POOLS.length)]!
}

function randomMixedString(length: number): { text: string; expectedWidth: number } {
  let text = ""
  let expectedWidth = 0
  for (let i = 0; i < length; i++) {
    const pool = randomPool()
    text += randomCharFrom(pool)
    expectedWidth += pool.width
  }
  return { text, expectedWidth }
}

const RANDOM_ITERATIONS = 200

describe("displayWidth", () => {
  it("returns 0 for empty string", () => {
    expect(displayWidth("")).toBe(0)
  })

  it("counts every printable ASCII character as 1 column", () => {
    for (let i = 0; i < RANDOM_ITERATIONS; i++) {
      const pool = CHAR_POOLS[0]!
      const char = randomCharFrom(pool)
      expect(displayWidth(char), `char: ${char}`).toBe(1)
    }
  })

  it("counts every wide-pool character as 2 columns", () => {
    const widePools = CHAR_POOLS.filter((p) => p.width === 2)
    for (let i = 0; i < RANDOM_ITERATIONS; i++) {
      const pool = widePools[i % widePools.length]!
      const char = randomCharFrom(pool)
      expect(displayWidth(char), `pool: ${pool.name}, char: ${char}`).toBe(2)
    }
  })

  it("width of random mixed string equals sum of per-character widths", () => {
    for (let i = 0; i < RANDOM_ITERATIONS; i++) {
      const length = 1 + Math.floor(Math.random() * 60)
      const { text, expectedWidth } = randomMixedString(length)
      expect(displayWidth(text), `text: ${text}`).toBe(expectedWidth)
    }
  })

  it("is additive over concatenation", () => {
    for (let i = 0; i < RANDOM_ITERATIONS; i++) {
      const a = randomMixedString(1 + Math.floor(Math.random() * 20)).text
      const b = randomMixedString(1 + Math.floor(Math.random() * 20)).text
      expect(displayWidth(a + b), `a: ${a}, b: ${b}`).toBe(
        displayWidth(a) + displayWidth(b)
      )
    }
  })

  it("counts control characters as 0 columns", () => {
    expect(displayWidth("\n\t\r")).toBe(0)
  })
})

describe("sanitizeText", () => {
  it("returns clean text unchanged", () => {
    expect(sanitizeText("Daft Punk")).toBe("Daft Punk")
  })

  it("replaces newlines with a space", () => {
    expect(sanitizeText("Song\nRemix")).toBe("Song Remix")
  })

  it("replaces tabs with a space", () => {
    expect(sanitizeText("Song\tRemix")).toBe("Song Remix")
  })

  it("replaces carriage returns with a space", () => {
    expect(sanitizeText("Song\r\nRemix")).toBe("Song Remix")
  })

  it("collapses consecutive control characters into a single space", () => {
    expect(sanitizeText("Song\n\n\nRemix")).toBe("Song Remix")
  })

  it("trims leading and trailing whitespace from result", () => {
    expect(sanitizeText("\nSong Title\n")).toBe("Song Title")
  })

  it("returns empty string for control-only input", () => {
    expect(sanitizeText("\n\t\r")).toBe("")
  })
})

describe("truncateText", () => {
  it("returns text unchanged when shorter than maxLength", () => {
    expect(truncateText("Hello", 10)).toBe("Hello")
  })

  it("truncates text longer than maxLength with …", () => {
    expect(truncateText("A Very Long Song Title That Exceeds Limit", 30)).toBe(
      "A Very Long Song Title That Ex…"
    )
  })

  it("returns text unchanged when exactly maxLength", () => {
    expect(truncateText("Exactly thirty characters long", 30)).toBe(
      "Exactly thirty characters long"
    )
  })

  it("returns empty string unchanged", () => {
    expect(truncateText("", 10)).toBe("")
  })

  it("never exceeds maxWidth + 1 columns for random mixed strings", () => {
    for (let i = 0; i < RANDOM_ITERATIONS; i++) {
      const length = 1 + Math.floor(Math.random() * 80)
      const maxWidth = 4 + Math.floor(Math.random() * 40)
      const { text } = randomMixedString(length)
      const result = truncateText(text, maxWidth)
      expect(
        displayWidth(result),
        `text: ${text}, maxWidth: ${maxWidth}, result: ${result}`
      ).toBeLessThanOrEqual(maxWidth + 1)
    }
  })

  it("returns random text unchanged when it fits within maxWidth columns", () => {
    for (let i = 0; i < RANDOM_ITERATIONS; i++) {
      const { text, expectedWidth } = randomMixedString(1 + Math.floor(Math.random() * 15))
      const result = truncateText(text, expectedWidth)
      expect(result, `text: ${text}`).toBe(text)
    }
  })

  it("appends … and preserves original prefix when truncating random text", () => {
    for (let i = 0; i < RANDOM_ITERATIONS; i++) {
      const { text, expectedWidth } = randomMixedString(10 + Math.floor(Math.random() * 40))
      const maxWidth = Math.max(2, Math.floor(expectedWidth / 2))
      const result = truncateText(text, maxWidth)
      expect(result.endsWith("…"), `text: ${text}, result: ${result}`).toBe(true)
      const prefix = result.slice(0, -1)
      expect(text.startsWith(prefix), `text: ${text}, prefix: ${prefix}`).toBe(true)
      expect(displayWidth(prefix)).toBeLessThanOrEqual(maxWidth)
    }
  })

  it("never splits a wide character at the truncation boundary", () => {
    for (let i = 0; i < RANDOM_ITERATIONS; i++) {
      const widePools = CHAR_POOLS.filter((p) => p.width === 2)
      const pool = widePools[i % widePools.length]!
      let text = ""
      for (let j = 0; j < 20; j++) text += randomCharFrom(pool)
      const oddWidth = 5 + 2 * Math.floor(Math.random() * 10)
      const result = truncateText(text, oddWidth)
      expect(
        displayWidth(result.slice(0, -1)) % 2,
        `pool: ${pool.name}, text: ${text}, result: ${result}`
      ).toBe(0)
      expect(displayWidth(result.slice(0, -1))).toBeLessThanOrEqual(oddWidth - 1)
    }
  })
})

describe("detectService", () => {
  it("maps com.spotify.client to spotify", () => {
    expect(detectService("com.spotify.client")).toBe("spotify")
  })

  it("maps com.spotify.Spotify to spotify", () => {
    expect(detectService("com.spotify.Spotify")).toBe("spotify")
  })

  it("maps com.apple.Music to apple-music", () => {
    expect(detectService("com.apple.Music")).toBe("apple-music")
  })

  it("maps com.google.Chrome to browser", () => {
    expect(detectService("com.google.Chrome")).toBe("browser")
  })

  it("maps org.mozilla.firefox to browser", () => {
    expect(detectService("org.mozilla.firefox")).toBe("browser")
  })

  it("maps com.apple.Safari to browser", () => {
    expect(detectService("com.apple.Safari")).toBe("browser")
  })

  it("returns unknown for unrecognized bundle ID", () => {
    expect(detectService("com.example.unknown")).toBe("unknown")
  })
})

describe("detectServiceFromPlayerName", () => {
  it("maps spotify to spotify", () => {
    expect(detectServiceFromPlayerName("spotify")).toBe("spotify")
  })

  it("maps Spotify (capitalized) to spotify", () => {
    expect(detectServiceFromPlayerName("Spotify")).toBe("spotify")
  })

  it("maps chromium to browser", () => {
    expect(detectServiceFromPlayerName("chromium")).toBe("browser")
  })

  it("maps firefox to browser", () => {
    expect(detectServiceFromPlayerName("firefox")).toBe("browser")
  })

  it("maps google-chrome to browser", () => {
    expect(detectServiceFromPlayerName("google-chrome")).toBe("browser")
  })

  it("maps vlc to unknown (direct mapping)", () => {
    expect(detectServiceFromPlayerName("vlc")).toBe("unknown")
  })

  it("returns unknown for unrecognized player name", () => {
    expect(detectServiceFromPlayerName("some-random-player")).toBe("unknown")
  })
})

describe("formatTrackLine", () => {
  it("formats playing track without icon", () => {
    expect(
      formatTrackLine({
        title: "Get Lucky",
        artist: "Daft Punk",
        service: "spotify",
        state: "playing",
      })
    ).toBe("Daft Punk - Get Lucky")
  })

  it("formats paused track without icon", () => {
    expect(
      formatTrackLine({
        title: "Get Lucky",
        artist: "Daft Punk",
        service: "spotify",
        state: "paused",
      })
    ).toBe("Daft Punk - Get Lucky")
  })

  it("truncates long combined text to 30 columns with …", () => {
    const result = formatTrackLine({
      title: "A Very Long Song Title That Exceeds The Maximum",
      artist: "Some Artist With A Long Name",
      service: "spotify",
      state: "playing",
    })
    expect(displayWidth(result)).toBeLessThanOrEqual(31)
  })

  it("never exceeds 31 display columns for random CJK-heavy tracks", () => {
    const services: Array<NowPlayingInfo["service"]> = ["spotify", "apple-music", "browser", "unknown"]
    const states: Array<NowPlayingInfo["state"]> = ["playing", "paused", "stopped"]
    const widePools = CHAR_POOLS.filter((p) => p.width === 2)

    for (let i = 0; i < RANDOM_ITERATIONS; i++) {
      const artistPool = widePools[i % widePools.length]!
      const titlePool = widePools[(i + 1) % widePools.length]!
      let artist = ""
      let title = ""
      for (let j = 0; j < 3 + Math.floor(Math.random() * 8); j++) artist += randomCharFrom(artistPool)
      for (let j = 0; j < 5 + Math.floor(Math.random() * 20); j++) title += randomCharFrom(titlePool)

      const result = formatTrackLine({
        title,
        artist,
        service: services[i % services.length]!,
        state: states[i % states.length]!,
      })
      expect(
        displayWidth(result),
        `artist: ${artist}, title: ${title}, result: ${result}`
      ).toBeLessThanOrEqual(31)
    }
  })

  it("never exceeds 31 display columns for random mixed ASCII/CJK tracks", () => {
    const services: Array<NowPlayingInfo["service"]> = ["spotify", "apple-music", "browser", "unknown"]
    const states: Array<NowPlayingInfo["state"]> = ["playing", "paused", "stopped"]

    for (let i = 0; i < RANDOM_ITERATIONS; i++) {
      const artist = randomMixedString(2 + Math.floor(Math.random() * 10)).text
      const title = randomMixedString(3 + Math.floor(Math.random() * 25)).text

      const result = formatTrackLine({
        title,
        artist,
        service: services[i % services.length]!,
        state: states[i % states.length]!,
      })
      expect(
        displayWidth(result),
        `artist: ${artist}, title: ${title}, result: ${result}`
      ).toBeLessThanOrEqual(31)
    }
  })
})

describe("getFullTrackText", () => {
  it("returns untruncated artist - title", () => {
    expect(
      getFullTrackText({
        title: "Around the World (Extended Mix)",
        artist: "Daft Punk",
        service: "spotify",
        state: "playing",
      })
    ).toBe("Daft Punk - Around the World (Extended Mix)")
  })

  it("returns short text as-is", () => {
    expect(
      getFullTrackText({
        title: "Get Lucky",
        artist: "Daft Punk",
        service: "spotify",
        state: "playing",
      })
    ).toBe("Daft Punk - Get Lucky")
  })

  it("sanitizes control characters in artist and title", () => {
    expect(
      getFullTrackText({
        title: "Song\nRemix",
        artist: "Artist\tName",
        service: "spotify",
        state: "playing",
      })
    ).toBe("Artist Name - Song Remix")
  })
})

describe("getScrollSlice", () => {
  it("returns first window at offset 0", () => {
    const text = "Daft Punk - Around the World (Extended Mix)"
    expect(getScrollSlice(text, 0, 10)).toBe("Daft Punk ")
  })

  it("shifts text by offset", () => {
    const text = "Daft Punk - Around the World (Extended Mix)"
    expect(getScrollSlice(text, 5, 10)).toBe("Punk - Aro")
  })

  it("wraps around to beginning through gap", () => {
    const text = "ABCDE"
    expect(getScrollSlice(text, 5, 5)).toBe("    A")
  })

  it("returns to exact start after full cycle", () => {
    const text = "Hello"
    expect(getScrollSlice(text, 9, 5)).toBe("Hello")
  })

  it("always returns exactly width columns for ASCII text", () => {
    const text = "A Very Long Song Title That Exceeds Everything"
    for (let offset = 0; offset < text.length + 10; offset++) {
      expect(displayWidth(getScrollSlice(text, offset, 30))).toBe(30)
    }
  })

  it("always fills exactly width columns for random CJK-only tracks at every offset", () => {
    const widePools = CHAR_POOLS.filter((p) => p.width === 2)
    for (let i = 0; i < 50; i++) {
      const pool = widePools[i % widePools.length]!
      let artist = ""
      let title = ""
      for (let j = 0; j < 3 + Math.floor(Math.random() * 6); j++) artist += randomCharFrom(pool)
      for (let j = 0; j < 5 + Math.floor(Math.random() * 15); j++) title += randomCharFrom(pool)
      const text = `${artist} - ${title}`
      const width = 10 + Math.floor(Math.random() * 25)
      const cycleLength = [...text].length + 4
      for (let offset = 0; offset < cycleLength; offset++) {
        expect(
          displayWidth(getScrollSlice(text, offset, width)),
          `pool: ${pool.name}, text: ${text}, offset: ${offset}, width: ${width}`
        ).toBe(width)
      }
    }
  })

  it("always fills exactly width columns for random mixed artist-title tracks at every offset", () => {
    for (let i = 0; i < 50; i++) {
      const artist = randomMixedString(2 + Math.floor(Math.random() * 8)).text
      const title = randomMixedString(3 + Math.floor(Math.random() * 15)).text
      const text = `${artist} - ${title}`
      const width = 10 + Math.floor(Math.random() * 25)
      const cycleLength = [...text].length + 4
      for (let offset = 0; offset < cycleLength; offset++) {
        expect(
          displayWidth(getScrollSlice(text, offset, width)),
          `text: ${text}, offset: ${offset}, width: ${width}`
        ).toBe(width)
      }
    }
  })

  it("always fills exactly width columns for random mixed strings at every offset", () => {
    for (let i = 0; i < 50; i++) {
      const length = 5 + Math.floor(Math.random() * 40)
      const width = 6 + Math.floor(Math.random() * 30)
      const { text } = randomMixedString(length)
      const cycleLength = [...text].length + 4
      for (let offset = 0; offset < cycleLength + 5; offset++) {
        expect(
          displayWidth(getScrollSlice(text, offset, width)),
          `text: ${text}, offset: ${offset}, width: ${width}`
        ).toBe(width)
      }
    }
  })

  it("returns to exact start after a full cycle for random mixed strings", () => {
    for (let i = 0; i < 50; i++) {
      const { text } = randomMixedString(5 + Math.floor(Math.random() * 30))
      const width = 6 + Math.floor(Math.random() * 20)
      const cycleLength = [...text].length + 4
      expect(
        getScrollSlice(text, cycleLength, width),
        `text: ${text}, width: ${width}`
      ).toBe(getScrollSlice(text, 0, width))
    }
  })
})

describe("formatStatusLine", () => {
  it("formats playing on Spotify", () => {
    expect(
      formatStatusLine({
        title: "Get Lucky",
        artist: "Daft Punk",
        service: "spotify",
        state: "playing",
      })
    ).toBe("playing on Spotify")
  })

  it("formats paused on Apple Music", () => {
    expect(
      formatStatusLine({
        title: "Get Lucky",
        artist: "Daft Punk",
        service: "apple-music",
        state: "paused",
      })
    ).toBe("paused on Apple Music")
  })

  it("formats stopped without service name", () => {
    expect(
      formatStatusLine({
        title: "Get Lucky",
        artist: "Daft Punk",
        service: "spotify",
        state: "stopped",
      })
    ).toBe("stopped")
  })
})
