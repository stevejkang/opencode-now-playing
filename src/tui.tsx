/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule, TuiSlotContext } from "@opencode-ai/plugin/tui"
import { createSignal, onCleanup } from "solid-js"
import { detectPlatform, createBackend } from "./backend"
import { ensureCLI } from "./detector"
import { formatTrackLine, formatStatusLine } from "./format"
import type { NowPlayingInfo, PluginConfig } from "./types"

type Status = "loading" | "ready" | "not-installed" | "unsupported"

const tui: TuiPlugin = async (api, options, _meta) => {
  const refreshInterval = (options as PluginConfig | undefined)?.refreshInterval

  api.slots.register({
    order: 50,
    slots: {
      sidebar_content(ctx: TuiSlotContext, _props: unknown) {
        const t = ctx.theme.current

        const [nowPlaying, setNowPlaying] = createSignal<NowPlayingInfo | null>(null)
        const [status, setStatus] = createSignal<Status>("loading")
        const [hint, setHint] = createSignal("")

        const platform = detectPlatform()

        if (platform === "unsupported") {
          setStatus("unsupported")
        } else {
          ensureCLI(platform).then((result) => {
            if (!result.ready) {
              setHint(result.hint ?? "")
              setStatus("not-installed")
              return
            }

            const controller = new AbortController()
            const backend = createBackend(
              platform,
              controller.signal,
              (info) => {
                setNowPlaying(info)
                setStatus("ready")
              },
              refreshInterval,
            )

            backend.start()

            onCleanup(() => {
              controller.abort()
              backend.stop()
            })

            setStatus("ready")
          })
        }

        const dim = t.textMuted ?? "#546E7A"
        const warn = t.warning ?? "#FFCB6B"

        return (
          <box flexDirection="column">
            <text fg={t.primary}>{"🎵 Now Playing"}</text>
            {status() === "loading" && (
              <text fg={dim}>{"♪ Loading…"}</text>
            )}
            {status() === "unsupported" && (
              <text fg={dim}>{"♪ Not supported on this OS"}</text>
            )}
            {status() === "not-installed" && (
              <text fg={warn}>{`⚠ ${hint()}`}</text>
            )}
            {status() === "ready" && nowPlaying() === null && (
              <text fg={dim}>{"♪ Not playing"}</text>
            )}
            {status() === "ready" && nowPlaying() !== null && (
              <>
                <text>{formatTrackLine(nowPlaying()!)}</text>
                <text fg={dim}>{formatStatusLine(nowPlaying()!)}</text>
              </>
            )}
          </box>
        )
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id: "opencode-now-playing",
  tui,
}

export default plugin
