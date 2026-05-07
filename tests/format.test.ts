import { describe, it, expect } from "vitest"
import {
  truncateText,
  detectService,
  detectServiceFromPlayerName,
  formatTrackLine,
  formatStatusLine,
} from "../src/format.js"

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

  it("truncates long combined text to 30 chars with …", () => {
    const result = formatTrackLine({
      title: "A Very Long Song Title That Exceeds The Maximum",
      artist: "Some Artist With A Long Name",
      service: "spotify",
      state: "playing",
    })
    expect(result.length).toBeLessThanOrEqual(31)
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
