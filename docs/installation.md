# opencode-now-playing Installation Guide

> This guide is designed for LLM agents to follow step-by-step. Each step includes expected outcomes for verification.

## What is opencode-now-playing?

An opencode TUI sidebar plugin that shows the current track from the system now-playing service. It supports Apple Music, Spotify, YouTube Music, and other players that publish playback metadata.

## Prerequisites

- [opencode](https://opencode.ai) installed and working
- Plugin support (`@opencode-ai/plugin` >= 1.4.3)
- macOS: `media-control` installed
- Linux: `playerctl` installed

Install the platform dependency:

```bash
# macOS
brew install media-control

# Linux
sudo apt install playerctl
# or, if using Homebrew on Linux:
brew install playerctl
```

## Step 1: Verify the platform dependency

### macOS

```bash
which media-control
media-control test
media-control get --no-artwork
```

Expected outcome:

- `which media-control` prints a path such as `/opt/homebrew/bin/media-control`
- `media-control test` exits with code `0`
- `media-control get --no-artwork` prints either `null` when nothing is playing or JSON with `title`, `artist`, `bundleIdentifier`, and `playing`

### Linux

```bash
which playerctl
playerctl metadata --format '{{playerName}}	{{status}}	{{artist}}	{{title}}'
```

Expected outcome:

- `which playerctl` prints a path
- `playerctl metadata ...` prints the current player, status, artist, and title when something is active

## Step 2: Configure the TUI plugin

Edit `~/.config/opencode/tui.json`. Create the file if it doesn't exist.

Add `["opencode-now-playing", { "enabled": true }]` to the `plugin` array:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    ["opencode-now-playing", { "enabled": true }]
  ]
}
```

**If the file already exists with other plugins**, append to the existing array. Do not replace existing entries:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    ["existing-plugin", { "enabled": true }],
    ["opencode-now-playing", { "enabled": true }]
  ]
}
```

### Options

All options are optional. Defaults shown:

```json
["opencode-now-playing", {
  "enabled": true,
  "refreshInterval": 5000
}]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `refreshInterval` | `number` | `5000` | Polling interval in milliseconds when streaming falls back to polling |

## Step 3: Restart opencode

The plugin loads at startup. Restart opencode to activate.

## Verification

After restart, the sidebar should show a "Now Playing" section.

When music is playing:

```text
Now Playing
HANRORO - Landing in Love
playing on Apple Music
```

When playback is paused:

```text
Now Playing
HANRORO - Landing in Love
paused on Apple Music
```

When no player is publishing metadata:

```text
Now Playing
♪ Not playing
```

If the platform dependency is missing:

```text
Now Playing
[!] brew install media-control
```

## Manual Install

Use this only when developing locally or when the package registry install is not desired.

From the repository root:

```bash
mkdir -p ~/.config/opencode/plugins/opencode-now-playing/backends
cp src/tui.tsx src/types.ts src/format.ts src/backend.ts \
   src/detector.ts src/constants.ts \
   ~/.config/opencode/plugins/opencode-now-playing/
cp src/backends/macos.ts src/backends/linux.ts \
   ~/.config/opencode/plugins/opencode-now-playing/backends/
```

Then register the local path:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    ["./plugins/opencode-now-playing/tui.tsx", { "enabled": true }]
  ]
}
```

Restart opencode after copying files.

## Troubleshooting

- **Plugin not showing**: Verify `tui.json` exists at `~/.config/opencode/tui.json` and contains the plugin entry. Restart opencode after editing.
- **Shows "brew install media-control" on macOS**: Install the dependency with `brew install media-control`, then restart opencode.
- **Shows "sudo apt install playerctl" on Linux**: Install `playerctl`, then restart opencode.
- **Shows "Not playing" while music is playing on macOS**: Run `media-control get --no-artwork`. If it returns track JSON, restart opencode. If it returns `null`, the system Now Playing service is not exposing metadata to `media-control`.
- **Shows "Not playing" while music is playing on Linux**: Run `playerctl metadata --format '{{playerName}}	{{status}}	{{artist}}	{{title}}'`. If this fails, the player is not publishing MPRIS metadata.
- **Data updates slowly after stream failure**: Lower `refreshInterval` in the plugin options. The value is in milliseconds.

## Uninstall

1. Remove `["opencode-now-playing", { "enabled": true }]` from the `plugin` array in `~/.config/opencode/tui.json`
2. Restart opencode
3. If manually installed, delete the copied plugin folder:

```bash
rm -rf ~/.config/opencode/plugins/opencode-now-playing/
```
