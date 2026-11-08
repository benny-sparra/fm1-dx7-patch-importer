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
  swayYaw,
  type WireLine,
} from './fm1-wireframe'

/** The canvas's size in its own pixels. It is drawn at this size and scaled, so every line is a pixel. */
export const wireframeWidth = 280
export const wireframeHeight = 200

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

/**
 * Starts the outline on a canvas: it sways about 12 frames a second, stops while the tab is hidden
 * or the canvas is off screen, turns when dragged, and holds one still frame with reduced motion.
 * Inside a `<dialog>`, the arrow keys turn it while the dialog has the keyboard, since the canvas
 * takes no focus, and a closed dialog draws nothing. Returns the cleanup, or null when the browser
 * cannot draw on a canvas.
 */
export function runFm1Wireframe(canvas: HTMLCanvasElement): (() => void) | null {
  const context = canvas.getContext('2d')
  if (!context) return null

  const camera = makeCamera(wireframeWidth, wireframeHeight)
  // Read here rather than from `@/lib/reduced-motion`: importing that made Rolldown split it out of
  // the entry into a chunk of its own, costing the entry bytes it never needed.
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const palette = readPalette(canvas)
  const dialog = canvas.closest('dialog')
  const turn = { pitch: restingView.pitch, yaw: restingView.yaw }
  let seconds = 0
  let frame = 0
  let last = 0
  let visible = true
  let drawn = false

  const draw = () => {
    // A closed dialog draws nothing; the welcome is unmounted as it closes, so this is a guard.
    if (dialog && !dialog.open) return
    const view = { pitch: turn.pitch, yaw: turn.yaw + (reduced ? 0 : swayYaw(seconds)) }
    context.fillStyle = palette.ground
    context.fillRect(0, 0, wireframeWidth, wireframeHeight)
    context.lineWidth = 1
    const lines = frameLines(view, camera)
    strokeLines(context, lines, true, palette.dim)
    strokeLines(context, lines, false, palette.bright)
    drawn = true
  }

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

  // The first frame is drawn now, so there is never a blank canvas, then the loop takes over. A
  // dialog may not be open yet as this runs (it opens in its own effect), so draw once it is.
  const timer = window.setTimeout(() => {
    if (!drawn) draw()
    start()
  }, 0)

  // Heard on the document, after React's own handlers at its root, so a key a control in the
  // dialog already used, such as the guide's tabs, is not also a turn.
  const onKeyDown = (event: KeyboardEvent) => {
    if (!(event.target instanceof Node) || !dialog?.contains(event.target)) return
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
  if (dialog) document.addEventListener('keydown', onKeyDown)

  let dragging: { x: number; y: number } | null = null
  const onPointerDown = (event: PointerEvent) => {
    dragging = { x: event.clientX, y: event.clientY }
    canvas.setPointerCapture?.(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return
    turn.yaw += (event.clientX - dragging.x) * turnPerPixel
    turn.pitch = clampPitch(turn.pitch + (event.clientY - dragging.y) * tiltPerPixel)
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
    document.removeEventListener('keydown', onKeyDown)
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', endDrag)
    canvas.removeEventListener('pointercancel', endDrag)
  }
}
