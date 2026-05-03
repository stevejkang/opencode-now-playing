import { describe, it, expect, afterEach } from "vitest"
import { detectPlatform } from "../src/backend.js"

describe("detectPlatform", () => {
  const originalPlatform = process.platform

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform })
  })

  it("returns macos for darwin", () => {
    Object.defineProperty(process, "platform", { value: "darwin" })
    expect(detectPlatform()).toBe("macos")
  })

  it("returns linux for linux", () => {
    Object.defineProperty(process, "platform", { value: "linux" })
    expect(detectPlatform()).toBe("linux")
  })

  it("returns unsupported for win32", () => {
    Object.defineProperty(process, "platform", { value: "win32" })
    expect(detectPlatform()).toBe("unsupported")
  })
})
