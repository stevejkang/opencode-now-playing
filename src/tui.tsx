/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule, TuiSlotContext } from "@opencode-ai/plugin/tui"
import { createSignal, onCleanup } from "solid-js"
import { detectPlatform, createBackend } from "./backend"
import { ensureCLI } from "./detector"
import {
  formatTrackLine,
  formatStatusLine,
  getFullTrackText,
  getScrollSlice,
} from "./format"
import {
  MAX_TEXT_LENGTH,
  MARQUEE_SCROLL_INTERVAL,
  MARQUEE_PAUSE_DURATION,
  MARQUEE_GAP,
} from "./constants"
import type { NowPlayingInfo, PluginConfig } from "./types"

type Status = "loading" | "ready" | "not-installed" | "unsupported"

const tui: TuiPlugin = async (api, options, _meta) => {
  const config = options as PluginConfig | undefined
  const refreshInterval = config?.refreshInterval
  const marqueeEnabled = config?.marquee !== false

  api.slots.register({
    order: 50,
    slots: {
      sidebar_content(ctx: TuiSlotContext, _props: unknown) {
        const t = ctx.theme.current

        const [nowPlaying, setNowPlaying] = createSignal<NowPlayingInfo | null>(null)
        const [status, setStatus] = createSignal<Status>("loading")
        const [hint, setHint] = createSignal("")
        const [scrollOffset, setScrollOffset] = createSignal(0)

        let marqueeTimer: ReturnType<typeof setInterval> | null = null
        let pauseTimer: ReturnType<typeof setTimeout> | null = null
        let prevTrackKey = ""

        function clearMarqueeTimers() {
          if (marqueeTimer) { clearInterval(marqueeTimer); marqueeTimer = null }
          if (pauseTimer) { clearTimeout(pauseTimer); pauseTimer = null }
        }

        function startMarquee(fullText: string) {
          clearMarqueeTimers()
          setScrollOffset(0)

          const totalLength = fullText.length + MARQUEE_GAP

          pauseTimer = setTimeout(() => {
            marqueeTimer = setInterval(() => {
              setScrollOffset((prev) => (prev + 1) % totalLength)
            }, MARQUEE_SCROLL_INTERVAL)
          }, MARQUEE_PAUSE_DURATION)
        }

        function handleUpdate(info: NowPlayingInfo | null) {
          setNowPlaying(info)
          setStatus("ready")

          if (!marqueeEnabled || !info) {
            clearMarqueeTimers()
            setScrollOffset(0)
            prevTrackKey = ""
            return
          }

          const trackKey = `${info.artist}\0${info.title}`
          if (trackKey === prevTrackKey) return
          prevTrackKey = trackKey

          const fullText = getFullTrackText(info)
          if (fullText.length > MAX_TEXT_LENGTH) {
            startMarquee(fullText)
          } else {
            clearMarqueeTimers()
            setScrollOffset(0)
          }
        }

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
              handleUpdate,
              refreshInterval,
            )

            backend.start()

            onCleanup(() => {
              controller.abort()
              backend.stop()
              clearMarqueeTimers()
            })

            setStatus("ready")
          })
        }

        const dim = t.textMuted ?? "#546E7A"
        const warn = t.warning ?? "#FFCB6B"

        function trackDisplay() {
          const info = nowPlaying()
          if (!info) return ""

          const fullText = getFullTrackText(info)
          if (marqueeEnabled && fullText.length > MAX_TEXT_LENGTH) {
            return getScrollSlice(fullText, scrollOffset(), MAX_TEXT_LENGTH)
          }
          return formatTrackLine(info)
        }

        return (
          <box flexDirection="column">
            <text>{"Now Playing"}</text>
            {status() === "loading" && (
              <text fg={dim}>{"♪ Loading…"}</text>
            )}
            {status() === "unsupported" && (
              <text fg={dim}>{"♪ Not supported on this OS"}</text>
            )}
            {status() === "not-installed" && (
              <text fg={warn}>{`[!] ${hint()}`}</text>
            )}
            {status() === "ready" && nowPlaying() === null && (
              <text fg={dim}>{"♪ Not playing"}</text>
            )}
            {status() === "ready" && nowPlaying() !== null && (
              <>
                <text>{trackDisplay()}</text>
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
