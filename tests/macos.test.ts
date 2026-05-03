import { describe, it, expect } from "vitest"
import { parseMacOSPayload } from "../src/backends/macos.js"
import type { MediaControlMetadata, MediaControlStreamEvent } from "../src/types.js"

describe("parseMacOSPayload", () => {
  it("parses valid payload with playing: true", () => {
    const raw: MediaControlStreamEvent = {
      diff: true,
      payload: {
        title: "Get Lucky",
        artist: "Daft Punk",
        bundleIdentifier: "com.spotify.client",
        playing: true,
      },
    }
    expect(parseMacOSPayload(raw)).toEqual({
      title: "Get Lucky",
      artist: "Daft Punk",
      service: "spotify",
      state: "playing",
    })
  })

  it("parses valid payload with playing: false as paused", () => {
    const raw: MediaControlStreamEvent = {
      diff: true,
      payload: {
        title: "Get Lucky",
        artist: "Daft Punk",
        bundleIdentifier: "com.spotify.client",
        playing: false,
      },
    }
    expect(parseMacOSPayload(raw)).toEqual({
      title: "Get Lucky",
      artist: "Daft Punk",
      service: "spotify",
      state: "paused",
    })
  })

  it("parses flat media-control get output", () => {
    const raw: MediaControlMetadata = {
      title: "Landing in Love",
      artist: "HANRORO",
      bundleIdentifier: "com.apple.Music",
      playing: true,
    }
    expect(parseMacOSPayload(raw)).toEqual({
      title: "Landing in Love",
      artist: "HANRORO",
      service: "apple-music",
      state: "playing",
    })
  })

  it("returns null when payload is null", () => {
    const raw: MediaControlStreamEvent = {
      diff: true,
      payload: null,
    }
    expect(parseMacOSPayload(raw)).toBeNull()
  })

  it("returns null when stream payload is empty", () => {
    const raw: MediaControlStreamEvent = {
      diff: false,
      payload: {},
    }
    expect(parseMacOSPayload(raw)).toBeNull()
  })

  it("returns null when title is missing", () => {
    const raw: MediaControlStreamEvent = {
      diff: true,
      payload: {
        artist: "Daft Punk",
        bundleIdentifier: "com.spotify.client",
        playing: true,
      },
    }
    expect(parseMacOSPayload(raw)).toBeNull()
  })

  it("returns null when artist is missing", () => {
    const raw: MediaControlStreamEvent = {
      diff: true,
      payload: {
        title: "Get Lucky",
        bundleIdentifier: "com.spotify.client",
        playing: true,
      },
    }
    expect(parseMacOSPayload(raw)).toBeNull()
  })

  it("detects spotify from bundle ID", () => {
    const raw: MediaControlStreamEvent = {
      diff: true,
      payload: {
        title: "Test",
        artist: "Artist",
        bundleIdentifier: "com.spotify.client",
        playing: true,
      },
    }
    const result = parseMacOSPayload(raw)
    expect(result?.service).toBe("spotify")
  })

  it("detects apple-music from bundle ID", () => {
    const raw: MediaControlStreamEvent = {
      diff: true,
      payload: {
        title: "Test",
        artist: "Artist",
        bundleIdentifier: "com.apple.Music",
        playing: true,
      },
    }
    const result = parseMacOSPayload(raw)
    expect(result?.service).toBe("apple-music")
  })

  it("returns unknown for unrecognized bundle ID", () => {
    const raw: MediaControlStreamEvent = {
      diff: true,
      payload: {
        title: "Test",
        artist: "Artist",
        bundleIdentifier: "com.example.player",
        playing: true,
      },
    }
    const result = parseMacOSPayload(raw)
    expect(result?.service).toBe("unknown")
  })
})
