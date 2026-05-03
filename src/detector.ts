import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

/**
 * Checks whether the required CLI tool is installed on the given platform.
 * Uses `which` (macOS/Linux) to check for the binary.
 * Returns true if installed, false if not found.
 */
export async function checkCLI(platform: "macos" | "linux" | "unsupported"): Promise<boolean> {
  const cliName = platform === "macos" ? "media-control" : platform === "linux" ? "playerctl" : null
  if (!cliName) return false

  try {
    await execFileAsync("which", [cliName])
    return true
  } catch {
    return false
  }
}

/**
 * Returns a human-readable install hint for the missing CLI tool.
 * Used for displaying instructions in the sidebar when CLI is not found.
 */
export function getInstallHint(platform: "macos" | "linux" | "unsupported"): string {
  switch (platform) {
    case "macos":
      return "brew install media-control"
    case "linux":
      return "sudo apt install playerctl  # or: brew install playerctl"
    default:
      return "Not supported on this OS"
  }
}

/**
 * Checks CLI availability and returns ready status + hint if not installed.
 * This is the primary entry point used by tui.tsx.
 */
export async function ensureCLI(
  platform: "macos" | "linux" | "unsupported"
): Promise<{ ready: boolean; hint?: string }> {
  const ready = await checkCLI(platform)
  if (ready) return { ready: true }
  return { ready: false, hint: getInstallHint(platform) }
}
