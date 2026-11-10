/*
  Paints the turning FM1 outline on a canvas and keeps it turning, with no framework, so the
  welcome's React component and the firmware page's showcase run the same loop. The geometry is in
  `fm1-wireframe.ts`; this is the drawing, the timing, and the drag.
*/

import {
  clampPitch,
  frameLines,
  makeCamera,
  restingView,
  spinSpeed,
  spinStep,
  type WireframeView,
  type WireLine,
} from './fm1-wireframe'

/** The canvas's size on the page; its pixels follow the screen's, so the lines stay sharp. */
export const wireframeWidth = 280
export const wireframeHeight = 200

const turnPerPixel = 0.01
const tiltPerPixel = 0.006
// A drag leaves the turntable spinning at the speed of the last move.
const flingPerPixel = 0.6
const keyTurn = 0.16
const keyTilt = 0.08
// The longest step one frame takes, so a stalled frame does not jump the case round.
const longestStepMs = 50
const glowBlur = 6

export type Palette = { bright: string; ground: string; line: string }

/** Read from the page's tokens, so the outline follows the finish chosen. */
export function readPalette(element: Element): Palette {
  const style = getComputedStyle(element)
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    bright: token('--crt-acc-lt', '#9ff'),
    ground: token('--crt-bg-well', '#000'),
    line: token('--crt-acc', '#6cc'),
  }
}

type Stroke = { alpha: number; colour: 'bright' | 'line'; width: number }

// Hidden-side detail faintly, the outline in the accent, and a hot line lit and thicker.
const strokes: ReadonlyArray<readonly [(line: WireLine) => boolean, Stroke]> = [
  [(line) => line[4] && !line[5], { alpha: 0.35, colour: 'line', width: 1 }],
  [(line) => !line[4] && !line[5], { alpha: 0.8, colour: 'line', width: 1 }],
  [(line) => line[5], { alpha: 1, colour: 'bright', width: 2 }],
]

function strokeLines(
  context: CanvasRenderingContext2D,
  lines: readonly WireLine[],
  include: (line: WireLine) => boolean,
) {
  context.beginPath()
  for (const line of lines) {
    if (!include(line)) continue
    context.moveTo(line[0], line[1])
    context.lineTo(line[2], line[3])
  }
  context.stroke()
}

/**
 * Strokes the case, turned to `view`, glowing in the palette's colours, into a box of the given
 * size at the context's origin. The caller fills the ground and places the box.
 */
export function paintWireframe(
  context: CanvasRenderingContext2D,
  view: WireframeView,
  width: number,
  height: number,
  palette: Palette,
) {
  context.lineJoin = 'round'
  // The phosphor's glow: blur belongs to light, never to a shadow.
  context.shadowColor = palette.line
  context.shadowBlur = glowBlur
  const lines = frameLines(view, makeCamera(width, height))
  for (const [include, stroke] of strokes) {
    context.globalAlpha = stroke.alpha
    context.lineWidth = stroke.width
    context.strokeStyle = palette[stroke.colour]
    strokeLines(context, lines, include)
  }
  context.globalAlpha = 1
  context.shadowBlur = 0
}

/**
 * Starts the outline on a canvas: it spins on every animation frame, stops while the tab is hidden
 * or the canvas is off screen, turns when dragged and keeps the speed it was flung at, and holds
 * one still frame with reduced motion. Inside a `<dialog>`, the arrow keys turn it while the dialog
 * has the keyboard, since the canvas takes no focus, and a closed dialog draws nothing. Returns the
 * cleanup, or null when the browser cannot draw on a canvas.
 */
export function runFm1Wireframe(canvas: HTMLCanvasElement): (() => void) | null {
  const context = canvas.getContext('2d')
  if (!context) return null

  // Read here rather than from `@/lib/reduced-motion`: importing that made Rolldown split it out of
  // the entry into a chunk of its own, costing the entry bytes it never needed.
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const palette = readPalette(canvas)
  const dialog = canvas.closest('dialog')
  const turn = {
    pitch: restingView.pitch,
    velocity: reduced ? 0 : spinSpeed,
    yaw: restingView.yaw,
  }
  let frame = 0
  let last = 0
  let visible = true
  let drawn = false
  let dragging: { x: number; y: number } | null = null

  // The canvas's pixels match its size on the page times the screen's density.
  const fit = () => {
    const width = canvas.clientWidth || wireframeWidth
    const height = canvas.clientHeight || wireframeHeight
    const density = window.devicePixelRatio || 1
    const pixelWidth = Math.round(width * density)
    const pixelHeight = Math.round(height * density)
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight
    context.setTransform(density, 0, 0, density, 0, 0)
    return { height, width }
  }

  const draw = () => {
    // A closed dialog draws nothing; the welcome is unmounted as it closes, so this is a guard.
    if (dialog && !dialog.open) return
    const { height, width } = fit()
    context.globalAlpha = 1
    context.shadowBlur = 0
    context.fillStyle = palette.ground
    context.fillRect(0, 0, width, height)
    paintWireframe(context, turn, width, height, palette)
    drawn = true
  }

  const tick = (time: number) => {
    frame = 0
    if (!visible || document.hidden) return
    frame = requestAnimationFrame(tick)
    const seconds = last === 0 ? 0 : Math.min(time - last, longestStepMs) / 1000
    last = time
    if (!dragging) Object.assign(turn, spinStep(turn.yaw, turn.velocity, seconds))
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

  // The first frame is drawn now, so there is never a blank canvas, then the loop takes over. A
  // dialog may not be open yet as this runs (it opens in its own effect), so draw once it is.
  const timer = window.setTimeout(() => {
    if (!drawn) draw()
    start()
  }, 0)

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
    if (
      event.target instanceof HTMLElement &&
      /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)
    )
      return
    const { key } = event
    if (key === 'ArrowLeft') turn.yaw -= keyTurn
    else if (key === 'ArrowRight') turn.yaw += keyTurn
    else if (key === 'ArrowUp') turn.pitch = clampPitch(turn.pitch + keyTilt)
    else if (key === 'ArrowDown') turn.pitch = clampPitch(turn.pitch - keyTilt)
    else return
    event.preventDefault()
    draw()
  }
  dialog?.addEventListener('keydown', onKeyDown)

  const onPointerDown = (event: PointerEvent) => {
    dragging = { x: event.clientX, y: event.clientY }
    canvas.setPointerCapture?.(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return
    const dx = event.clientX - dragging.x
    turn.yaw += dx * turnPerPixel
    turn.pitch = clampPitch(turn.pitch + (event.clientY - dragging.y) * tiltPerPixel)
    // With reduced motion a drag turns it and leaves it there, with no spin afterwards.
    if (!reduced) turn.velocity = dx * flingPerPixel
    dragging = { x: event.clientX, y: event.clientY }
    draw()
  }
  const endDrag = () => {
    dragging = null
  }
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)

  return () => {
    window.clearTimeout(timer)
    stop()
    observer?.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    dialog?.removeEventListener('keydown', onKeyDown)
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', endDrag)
    canvas.removeEventListener('pointercancel', endDrag)
  }
}
