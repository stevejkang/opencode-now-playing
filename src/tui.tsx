/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule, TuiSlotContext } from "@opencode-ai/plugin/tui"
import type { ColorInput } from "@opentui/core"
import { createSignal } from "solid-js"
import { detectPlatform, createBackend, type Backend } from "./backend"
import { ensureCLI } from "./detector"
import {
  displayWidth,
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

interface SidebarColors {
  muted: ColorInput | undefined
  warning: ColorInput | undefined
}

/**
 * Owns playback state for one plugin instance. OpenCode v1 and v2 both compile npm-installed
 * plugins with the plain JSX runtime, so the slot render re-runs as a whole whenever a signal it
 * reads changes. State, the backend, and timers therefore live here, outside the render, and
 * are torn down through the host lifecycle instead of Solid's onCleanup.
 */
function startNowPlaying(rawOptions: unknown) {
  const config = (rawOptions as PluginConfig | undefined) ?? {}
  const refreshInterval = config.refreshInterval
  const marqueeEnabled = config.marquee !== false

  const [nowPlaying, setNowPlaying] = createSignal<NowPlayingInfo | null>(null)
  const [status, setStatus] = createSignal<Status>("loading")
  const [hint, setHint] = createSignal("")
  const [scrollOffset, setScrollOffset] = createSignal(0)

  let marqueeTimer: ReturnType<typeof setInterval> | null = null
  let pauseTimer: ReturnType<typeof setTimeout> | null = null
  let prevTrackKey = ""
  let disposed = false
  let backend: Backend | null = null
  const controller = new AbortController()

  function clearMarqueeTimers() {
    if (marqueeTimer) { clearInterval(marqueeTimer); marqueeTimer = null }
    if (pauseTimer) { clearTimeout(pauseTimer); pauseTimer = null }
  }

  function startMarquee(fullText: string) {
    clearMarqueeTimers()
    setScrollOffset(0)

    const totalLength = [...fullText].length + MARQUEE_GAP

    pauseTimer = setTimeout(() => {
      marqueeTimer = setInterval(() => {
        setScrollOffset((prev) => (prev + 1) % totalLength)
      }, MARQUEE_SCROLL_INTERVAL)
    }, MARQUEE_PAUSE_DURATION)
  }

  function handleUpdate(info: NowPlayingInfo | null) {
    if (disposed) return
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
    if (displayWidth(fullText) > MAX_TEXT_LENGTH) {
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
      if (disposed) return
      if (!result.ready) {
        setHint(result.hint ?? "")
        setStatus("not-installed")
        return
      }

      backend = createBackend(platform, controller.signal, handleUpdate, refreshInterval)
      backend.start()
      setStatus("ready")
    })
  }

  const dispose = () => {
    disposed = true
    controller.abort()
    backend?.stop()
    clearMarqueeTimers()
  }

  function trackDisplay() {
    const info = nowPlaying()
    if (!info) return ""

    const fullText = getFullTrackText(info)
    if (marqueeEnabled && displayWidth(fullText) > MAX_TEXT_LENGTH) {
      return getScrollSlice(fullText, scrollOffset(), MAX_TEXT_LENGTH)
    }
    return formatTrackLine(info)
  }

  const renderSidebar = (colors: SidebarColors) => {
    const dim = colors.muted ?? "#546E7A"
    const warn = colors.warning ?? "#FFCB6B"
    const current = status()
    const info = nowPlaying()

    return (
      <box flexDirection="column">
        <text>{"Now Playing"}</text>
        {current === "loading" && (
          <text fg={dim}>{"♪ Loading…"}</text>
        )}
        {current === "unsupported" && (
          <text fg={dim}>{"♪ Not supported on this OS"}</text>
        )}
        {current === "not-installed" && (
          <text fg={warn}>{`[!] ${hint()}`}</text>
        )}
        {current === "ready" && info === null && (
          <text fg={dim}>{"♪ Not playing"}</text>
        )}
        {current === "ready" && info !== null && (
          <>
            <text wrapMode="none">{trackDisplay()}</text>
            <text fg={dim}>{formatStatusLine(info)}</text>
          </>
        )}
      </box>
    )
  }

  return { renderSidebar, dispose }
}

const tui: TuiPlugin = async (api, options, _meta) => {
  const nowPlaying = startNowPlaying(options)
  api.lifecycle.onDispose(nowPlaying.dispose)

  api.slots.register({
    order: 50,
    slots: {
      sidebar_content(ctx: TuiSlotContext, _props: unknown) {
        const t = ctx.theme.current
        return nowPlaying.renderSidebar({ muted: t.textMuted, warning: t.warning })
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id: "opencode-now-playing",
  tui,
}

export default plugin
