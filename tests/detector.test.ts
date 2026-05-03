import { describe, it, expect } from "vitest"
import { getInstallHint } from "../src/detector.js"

describe("getInstallHint", () => {
  it("returns brew install for macos", () => {
    expect(getInstallHint("macos")).toBe("brew install media-control")
  })

  it("returns playerctl hint for linux", () => {
    expect(getInstallHint("linux")).toContain("playerctl")
  })

  it("returns not-supported message for unsupported", () => {
    expect(getInstallHint("unsupported")).toContain("Not supported")
  })
})
