import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

import {
  clampPitch,
  frameLines,
  makeCamera,
  restingView,
  swayYaw,
  type WireLine,
} from '@/lib/fm1-wireframe'
import { cn } from '@/lib/utils'

/** The canvas's size in its own pixels. It is drawn at this size and scaled, so every line is a pixel. */
const wireframeWidth = 280
const wireframeHeight = 200

// Elite redrew its screen a dozen times a second, and so does this: it reads as a vector display.
const frameInterval = 1000 / 12
const turnPerPixel = 0.011
const tiltPerPixel = 0.006
const keyTurn = 0.16
const keyTilt = 0.08

type Palette = { bright: string; dim: string; ground: string }

// Read from the page's tokens, so the outline follows the finish chosen.
function readPalette(element: Element): Palette {
  const style = getComputedStyle(element)
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    bright: token('--crt-acc-lt', '#9ff'),
    dim: token('--crt-acc-dim', '#488'),
    ground: token('--crt-bg-well', '#000'),
  }
}

function strokeLines(
  context: CanvasRenderingContext2D,
  lines: readonly WireLine[],
  dim: boolean,
  colour: string,
) {
  context.strokeStyle = colour
  context.beginPath()
  for (const [x1, y1, x2, y2, isDim] of lines) {
    if (isDim !== dim) continue
    // Half a pixel in, so a one-pixel line lands on one row of pixels rather than two.
    context.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5)
    context.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5)
  }
  context.stroke()
}

type Fm1WireframeProps = {
  /** The page's finish: the outline is redrawn in its colours when it changes. */
  colorway: string
  /** What shows when the browser cannot draw it, the FM1's photo. */
  fallback: ReactNode
}

/**
 * The FM1 as a slowly turning outline, traced from its photo. Decoration only: it is hidden from
 * assistive technology and takes no focus, so the welcome reads the same without it. It turns when
 * dragged, and from the arrow keys while the welcome's dialog has the keyboard.
 */
export function Fm1Wireframe({ colorway, fallback }: Fm1WireframeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [unavailable, setUnavailable] = useState(false)
  const redraw = useRef<() => void>(() => {})
  const turn = useRef({ pitch: restingView.pitch, yaw: restingView.yaw })

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) {
      setUnavailable(true)
      return
    }

    const camera = makeCamera(wireframeWidth, wireframeHeight)
    // Read here rather than from `@/lib/reduced-motion`: importing that made Rolldown split it out of
    // the entry into a chunk of its own, costing the entry bytes it never needed.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const palette = readPalette(canvas)
    const dialog = canvas.closest('dialog')
    let seconds = 0
    let frame = 0
    let timer = 0
    let last = 0
    let visible = true
    let drawn = false

    const draw = () => {
      // A closed dialog draws nothing; the welcome is unmounted as it closes, so this is a guard.
      if (dialog && !dialog.open) return
      const view = {
        pitch: turn.current.pitch,
        yaw: turn.current.yaw + (reduced ? 0 : swayYaw(seconds)),
      }
      context.fillStyle = palette.ground
      context.fillRect(0, 0, wireframeWidth, wireframeHeight)

      context.lineWidth = 1
      const lines = frameLines(view, camera)
      strokeLines(context, lines, true, palette.dim)
      strokeLines(context, lines, false, palette.bright)

      drawn = true
    }
    redraw.current = draw

    const tick = (time: number) => {
      frame = 0
      if (!visible || document.hidden) return
      frame = requestAnimationFrame(tick)
      if (last !== 0 && time - last < frameInterval) return
      // A long gap, such as a tab coming back, advances one frame rather than jumping.
      seconds += (last === 0 ? frameInterval : Math.min(time - last, 250)) / 1000
      last = time
      draw()
    }
    const start = () => {
      if (reduced || frame || !visible || document.hidden) return
      last = 0
      frame = requestAnimationFrame(tick)
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
    }

    // Stopped while the tab is hidden or the canvas is scrolled away; restarted on return.
    const onVisibility = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVisibility)
    let observer: IntersectionObserver | undefined
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? true
        if (visible) start()
        else stop()
      })
      observer.observe(canvas)
    }

    // The first frame is drawn now, so there is never a blank canvas, then the loop takes over. The
    // dialog may not be open yet as this effect runs (it opens in its own effect), so draw once it is.
    timer = window.setTimeout(() => {
      if (!drawn) draw()
      start()
    }, 0)

    // The arrow keys turn it while the dialog has the keyboard, since the canvas takes no focus.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      if (
        event.target instanceof HTMLElement &&
        /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)
      )
        return
      const { key } = event
      if (key === 'ArrowLeft') turn.current.yaw -= keyTurn
      else if (key === 'ArrowRight') turn.current.yaw += keyTurn
      else if (key === 'ArrowUp') turn.current.pitch = clampPitch(turn.current.pitch + keyTilt)
      else if (key === 'ArrowDown') turn.current.pitch = clampPitch(turn.current.pitch - keyTilt)
      else return
      event.preventDefault()
      draw()
    }
    dialog?.addEventListener('keydown', onKeyDown)

    return () => {
      window.clearTimeout(timer)
      stop()
      observer?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      dialog?.removeEventListener('keydown', onKeyDown)
      redraw.current = () => {}
    }
    // A new finish is a new palette, so the loop starts over with it.
  }, [colorway])

  const dragging = useRef<{ x: number; y: number } | null>(null)

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragging.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const from = dragging.current
    if (!from) return
    turn.current.yaw += (event.clientX - from.x) * turnPerPixel
    turn.current.pitch = clampPitch(turn.current.pitch + (event.clientY - from.y) * tiltPerPixel)
    dragging.current = { x: event.clientX, y: event.clientY }
    redraw.current()
  }
  const endDrag = () => {
    dragging.current = null
  }

  if (unavailable) return <>{fallback}</>
  return (
    <canvas
      aria-hidden="true"
      className={cn(
        'crt-inset block h-auto w-[280px] max-w-full cursor-grab touch-pan-y [image-rendering:pixelated] active:cursor-grabbing',
      )}
      height={wireframeHeight}
      onPointerCancel={endDrag}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      ref={canvasRef}
      width={wireframeWidth}
    />
  )
}
