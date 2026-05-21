# opencode-now-playing

An [opencode](https://opencode.ai) TUI sidebar plugin that shows what's playing right now. Supports Apple Music, Spotify, and YouTube Music on macOS and Linux.

```
Now Playing
Daft Punk - Get Lucky
playing on Spotify
```

Paused:
```
Now Playing
Daft Punk - Get Lucky
paused on Spotify
```

Nothing playing:
```
Now Playing
♪ Not playing
```

Missing dependency:
```
Now Playing
⚠ brew install media-control
```

## Install

Paste below into your OpenCode.

```
Install and configure opencode-now-playing by following the instructions here:
https://raw.githubusercontent.com/stevejkang/opencode-now-playing/refs/heads/main/docs/installation.md
```

### Prerequisites

Install the platform dependency:

```bash
# macOS
brew install media-control

# Linux
sudo apt install playerctl
# or, if using Homebrew on Linux:
brew install playerctl
```

If the dependency isn't found, the plugin shows an install prompt instead of playback info.

### Setup

One config file. Restart. Done.

**`~/.config/opencode/tui.json`**

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-now-playing"]
}
```

opencode resolves the npm package on startup automatically.

### Options

```json
{
  "plugin": [["opencode-now-playing", {
    "refreshInterval": 5000
  }]]
}
```

| Option | Default | Description |
|---|---|---|
| `refreshInterval` | `5000` | Polling interval in milliseconds (fallback when streaming connection breaks) |
| `marquee` | `true` | Horizontally scroll long track names instead of truncating |

## How It Works

Streams playback state in real-time. Falls back to polling (up to 3 retries) if the connection drops.

- **macOS**: Calls [media-control](https://github.com/ungive/media-control) CLI, which taps into the macOS MediaRemote framework. Any app registered in the system Now Playing center works: Apple Music, Spotify, YouTube Music in a browser, etc.
- **Linux**: Uses [playerctl](https://github.com/altdesktop/playerctl) with `--follow` mode for real-time MPRIS event streaming. YouTube Music is detected automatically when playing in Chrome, Firefox, or any Chromium-based browser.
- **Windows**: Coming soon.

## Features

|   | What | Why it matters |
|:---:|---|---|
| 🎧 | **Multi-source** | Apple Music, Spotify, YouTube Music, anything in system Now Playing |
| ⚡ | **Real-time streaming** | No stale data, instant track changes via native event APIs |
| 🔄 | **Polling fallback** | Connection drops don't kill the widget, retries up to 3 times |
| 🌐 | **Browser detection** | YouTube Music in Chrome/Firefox just works, no extra setup |
| 🖥 | **Cross-platform** | macOS and Linux today, Windows next |

## Requirements

- [opencode](https://opencode.ai) with plugin support (`@opencode-ai/plugin` >= 1.4.3)
- macOS: `brew install media-control`
- Linux: `sudo apt install playerctl` or `brew install playerctl`

## Manual Install

Skip npm. Copy the source files directly:

```bash
mkdir -p ~/.config/opencode/plugins/opencode-now-playing/backends
cp src/tui.tsx src/types.ts src/format.ts src/backend.ts \
   src/detector.ts src/constants.ts \
   ~/.config/opencode/plugins/opencode-now-playing/
cp src/backends/macos.ts src/backends/linux.ts \
   ~/.config/opencode/plugins/opencode-now-playing/backends/
```

Register the local path:

```json
{
  "plugin": ["./plugins/opencode-now-playing/tui.tsx"]
}
```

## Development

```bash
git clone https://github.com/stevejkang/opencode-now-playing.git
cd opencode-now-playing
bun install
```

Run tests:

```bash
bun test
```

Edit, restart opencode, see changes live.

## License

MIT
