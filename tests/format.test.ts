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

  it("returns unknown for Chrome with no title", () => {
    expect(detectService("com.google.Chrome")).toBe("unknown")
  })

  it("detects youtube-music from Chrome with YouTube Music title", () => {
    expect(detectService("com.google.Chrome", "YouTube Music - Song")).toBe(
      "youtube-music"
    )
  })

  it("returns unknown for Chrome with non-YouTube title", () => {
    expect(detectService("com.google.Chrome", "Some Other Site")).toBe("unknown")
  })

  it("detects youtube-music from Firefox with YouTube Music title", () => {
    expect(detectService("org.mozilla.firefox", "YouTube Music - Song")).toBe(
      "youtube-music"
    )
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

  it("detects youtube-music from chromium with YouTube Music title", () => {
    expect(
      detectServiceFromPlayerName("chromium", "YouTube Music - Song")
    ).toBe("youtube-music")
  })

  it("detects youtube-music from firefox with YouTube Music title", () => {
    expect(
      detectServiceFromPlayerName("firefox", "YouTube Music - Song")
    ).toBe("youtube-music")
  })

  it("maps vlc to unknown (direct mapping)", () => {
    expect(detectServiceFromPlayerName("vlc")).toBe("unknown")
  })

  it("returns unknown for unrecognized player name", () => {
    expect(detectServiceFromPlayerName("some-random-player")).toBe("unknown")
  })
})

describe("formatTrackLine", () => {
  it("formats playing track with icon", () => {
    expect(
      formatTrackLine({
        title: "Get Lucky",
        artist: "Daft Punk",
        service: "spotify",
        state: "playing",
      })
    ).toBe("▶ Daft Punk - Get Lucky")
  })

  it("formats paused track with pause icon", () => {
    expect(
      formatTrackLine({
        title: "Get Lucky",
        artist: "Daft Punk",
        service: "spotify",
        state: "paused",
      })
    ).toBe("⏸ Daft Punk - Get Lucky")
  })

  it("truncates long combined text to 30 chars with …", () => {
    const result = formatTrackLine({
      title: "A Very Long Song Title That Exceeds The Maximum",
      artist: "Some Artist With A Long Name",
      service: "spotify",
      state: "playing",
    })
    const textPart = result.slice(2)
    expect(textPart.length).toBeLessThanOrEqual(31)
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
    ).toBe("  playing on Spotify")
  })

  it("formats paused on Apple Music", () => {
    expect(
      formatStatusLine({
        title: "Get Lucky",
        artist: "Daft Punk",
        service: "apple-music",
        state: "paused",
      })
    ).toBe("  paused on Apple Music")
  })

  it("formats stopped without service name", () => {
    expect(
      formatStatusLine({
        title: "Get Lucky",
        artist: "Daft Punk",
        service: "spotify",
        state: "stopped",
      })
    ).toBe("  stopped")
  })
})
