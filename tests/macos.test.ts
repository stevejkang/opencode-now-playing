import { describe, it, expect } from "vitest"
import { parseMacOSPayload } from "../src/backends/macos.js"
import type { MediaControlPayload } from "../src/types.js"

describe("parseMacOSPayload", () => {
  it("parses valid payload with playing: true", () => {
    const raw: MediaControlPayload = {
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
    const raw: MediaControlPayload = {
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

  it("returns null when payload is null", () => {
    const raw: MediaControlPayload = {
      diff: true,
      payload: null,
    }
    expect(parseMacOSPayload(raw)).toBeNull()
  })

  it("returns null when title is missing", () => {
    const raw: MediaControlPayload = {
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
    const raw: MediaControlPayload = {
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
    const raw: MediaControlPayload = {
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
    const raw: MediaControlPayload = {
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
    const raw: MediaControlPayload = {
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
