# opencode-now-playing Installation Guide

> This guide is designed for LLM agents to follow step-by-step. Each step includes expected outcomes for verification.

## What is opencode-now-playing?

An opencode TUI sidebar plugin that shows the current track from the system now-playing service. It supports Apple Music, Spotify, YouTube Music, and other players that publish playback metadata.

## Prerequisites

- [opencode](https://opencode.ai) installed and working
- opencode v1 (`@opencode-ai/plugin` >= 1.4.3) or opencode v2 (>= 2.0.20)
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

## Step 2: Detect the opencode major version

Run `opencode --version`.

- Output like `1.18.34` → follow **Step 3 (opencode v1)**.
- Output like `opencode v2.0.23` → follow **Step 3 (opencode v2)**.

## Step 3 (opencode v2): Configure the CLI plugin

Edit `~/.config/opencode/cli.json`. Create the file if it doesn't exist. Do not edit `tui.json` on opencode v2; it is no longer read.

Add `{ "package": "opencode-now-playing", "options": {} }` to the `plugins` array, appending to any existing entries:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    { "package": "opencode-now-playing", "options": {} }
  ]
}
```

Skip Step 3 (opencode v1) and continue at **Options** to customize the plugin, or at **Step 4** to keep the defaults.

## Step 3 (opencode v1): Configure the TUI plugin

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

## Options

All options are optional, and the option names and values are the same on opencode v1 and v2. Only the surrounding entry differs. Defaults shown:

**opencode v2** — inside the entry's `options` object in `~/.config/opencode/cli.json`:

```json
{ "package": "opencode-now-playing", "options": {
  "refreshInterval": 5000,
  "marquee": true
} }
```

**opencode v1** — as the second element of the plugin tuple in `~/.config/opencode/tui.json`:

```json
["opencode-now-playing", {
  "enabled": true,
  "refreshInterval": 5000,
  "marquee": true
}]
```

`enabled` is an opencode v1 plugin toggle, not a plugin option; do not add it on opencode v2.

| Option | Type | Default | Description |
|---|---|---|---|
| `refreshInterval` | `number` | `5000` | Polling interval in milliseconds when streaming falls back to polling |
| `marquee` | `boolean` | `true` | Horizontally scroll long track names instead of truncating |

## Step 4: Restart opencode

The plugin loads at startup. Restart opencode to activate.

## Verification

After restart, the sidebar should show a "Now Playing" section. The sidebar renders only after the first message in a session.

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

Then register the local path (opencode v1):

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    ["./plugins/opencode-now-playing/tui.tsx", { "enabled": true }]
  ]
}
```

On opencode v2, skip the copy and point `cli.json` at a clone of this repository, which exposes a root `tui.ts`. Run `bun install` in the clone first:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    { "package": "/path/to/opencode-now-playing", "options": {} }
  ]
}
```

Restart opencode after copying files or editing the config.

## Troubleshooting

- **Plugin not showing**: Verify the plugin entry exists in `~/.config/opencode/tui.json` (opencode v1) or `~/.config/opencode/cli.json` (opencode v2). On opencode v2, `opencode plugin list` should list it. Restart opencode after editing. The sidebar renders only after the first message.
- **Shows "brew install media-control" on macOS**: Install the dependency with `brew install media-control`, then restart opencode.
- **Shows "sudo apt install playerctl" on Linux**: Install `playerctl`, then restart opencode.
- **Shows "Not playing" while music is playing on macOS**: Run `media-control get --no-artwork`. If it returns track JSON, restart opencode. If it returns `null`, the system Now Playing service is not exposing metadata to `media-control`.
- **Shows "Not playing" while music is playing on Linux**: Run `playerctl metadata --format '{{playerName}}	{{status}}	{{artist}}	{{title}}'`. If this fails, the player is not publishing MPRIS metadata.
- **Data updates slowly after stream failure**: Lower `refreshInterval` in the plugin options. The value is in milliseconds.

## Uninstall

1. Remove the `opencode-now-playing` entry from `~/.config/opencode/tui.json` (opencode v1) or `~/.config/opencode/cli.json` (opencode v2)
2. Restart opencode
3. If manually installed, delete the copied plugin folder:

```bash
rm -rf ~/.config/opencode/plugins/opencode-now-playing/
```

4. Optionally delete opencode's downloaded copy of the package:
   - opencode v1: `rm -rf ~/.cache/opencode/packages/opencode-now-playing@*`
   - opencode v2: `rm -rf ~/.cache/opencode/npm/opencode-now-playing@*`

   Do not delete `~/.cache/opencode/` itself; it also holds other plugins and model data.
