import { describe, it, expect } from "vitest"
import { parsePlayerctlOutput } from "../src/backends/linux.js"

describe("parsePlayerctlOutput", () => {
  it("parses valid Playing output", () => {
    expect(parsePlayerctlOutput("spotify\tPlaying\tDaft Punk\tGet Lucky")).toEqual({
      title: "Get Lucky",
      artist: "Daft Punk",
      service: "spotify",
      state: "playing",
    })
  })

  it("parses Paused status as paused state", () => {
    expect(parsePlayerctlOutput("spotify\tPaused\tDaft Punk\tGet Lucky")).toEqual({
      title: "Get Lucky",
      artist: "Daft Punk",
      service: "spotify",
      state: "paused",
    })
  })

  it("returns null for empty string", () => {
    expect(parsePlayerctlOutput("")).toBeNull()
  })

  it("returns null for Stopped status", () => {
    expect(
      parsePlayerctlOutput("spotify\tStopped\tDaft Punk\tGet Lucky")
    ).toBeNull()
  })

  it("returns null for incomplete line with fewer than 4 fields", () => {
    expect(parsePlayerctlOutput("spotify\tPlaying\tDaft Punk")).toBeNull()
  })

  it("returns null when artist field is empty", () => {
    expect(parsePlayerctlOutput("spotify\tPlaying\t\tGet Lucky")).toBeNull()
  })
})
