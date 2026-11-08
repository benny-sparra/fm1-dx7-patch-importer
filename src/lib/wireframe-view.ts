import type { Point } from '@/lib/algorithm-layout'
import { prefersReducedMotion } from '@/lib/reduced-motion'
import {
  project,
  rotate,
  steppedPositions,
  visibleCubeEdges,
  wireCubeHalf,
  type Vec3,
  type WireOperator,
} from '@/lib/wireframe-3d'

/** An Elite-like stepped redraw: twelve frames a second, and a move in six of them. */
export const WIREFRAME_FPS = 12
export const WIREFRAME_MOVE_STEPS = 6

const homeX = -0.35
const homeY = 0.45
const swayAmount = 0.25
const maxTilt = 1.3
const dragRadiansPerPixel = 0.015
const cameraDistance = 700

export type WireframeView = {
  dispose: () => void
  /** Turns the view by the given angles, as a drag or an arrow key does. */
  turn: (dx: number, dy: number) => void
  /** Shows another algorithm; its operators move there in stepped frames unless motion is reduced. */
  update: (scene: readonly WireOperator[], labels: readonly string[]) => void
}

/*
  The wireframe draws on a canvas that React renders but never touches: this owns it. The loop
  runs only while the page is visible and the canvas is on screen, and only while something moves
  (sway, a rearrangement, a drag); a reduced-motion view draws once per change.
*/
export function createWireframeView(canvas: HTMLCanvasElement): WireframeView {
  const context = canvas.getContext('2d')
  if (!context) return { dispose: () => {}, turn: () => {}, update: () => {} }
  const g = context

  let scene: readonly WireOperator[] = []
  let labels: readonly string[] = []
  let from: readonly Point[] = []
  let shown: readonly Point[] = []
  let step = WIREFRAME_MOVE_STEPS
  let ax = homeX
  let ay = homeY
  let time = 0
  let dragging = false
  let onScreen = true
  let timer: ReturnType<typeof setTimeout> | undefined

  const colour = (name: string) => getComputedStyle(canvas).getPropertyValue(name).trim()

  // The idle turn to and fro; a drag holds it still, and reduced motion removes it.
  const sway = () => (prefersReducedMotion() || dragging ? 0 : Math.sin(time * 0.9) * swayAmount)

  function draw() {
    const { height, width } = canvas
    if (width === 0 || height === 0) return
    const turnY = ay + sway()
    const scale = Math.min(width / 160, height / 96)
    const [led, accent, line, dim] = [
      '--crt-led',
      '--crt-acc',
      '--crt-acc-mid',
      '--crt-acc-lt',
    ].map(colour)

    g.setLineDash([])
    g.clearRect(0, 0, width, height)
    g.lineWidth = 1
    g.lineCap = 'butt'
    const at = (p: Vec3): Point => {
      const [x, y] = project(rotate(p, ax, turnY), cameraDistance, scale)
      return [Math.round(width / 2 + x) + 0.5, Math.round(height / 2 + y) + 0.5]
    }
    const lines = (kind: 'feedback' | 'links', stroke: string, dash: number[]) => {
      g.strokeStyle = stroke
      g.setLineDash(dash)
      g.beginPath()
      scene.forEach((operator, index) => {
        const [x, y] = shown[index] ?? [operator.x, operator.y]
        for (const polyline of operator[kind]) {
          polyline.forEach(([px, py], i) => {
            const [sx, sy] = at([x + px, y + py, 0])
            if (i === 0) g.moveTo(sx, sy)
            else g.lineTo(sx, sy)
          })
        }
      })
      g.stroke()
    }
    lines('links', line, [])
    lines('feedback', dim, [2, 2])
    g.setLineDash([])

    g.font = `${Math.max(10, Math.round(scale * 4.4))}px VT323, ui-monospace, monospace`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    scene.forEach((operator, index) => {
      const [x, y] = shown[index] ?? [operator.x, operator.y]
      const tone = operator.carrier ? led : accent
      g.strokeStyle = tone
      g.beginPath()
      for (const [p, q] of visibleCubeEdges([x, y, 0], wireCubeHalf, ax, turnY, cameraDistance)) {
        const [x1, y1] = project(p, cameraDistance, scale)
        const [x2, y2] = project(q, cameraDistance, scale)
        g.moveTo(Math.round(width / 2 + x1) + 0.5, Math.round(height / 2 + y1) + 0.5)
        g.lineTo(Math.round(width / 2 + x2) + 0.5, Math.round(height / 2 + y2) + 0.5)
      }
      g.stroke()
      const [lx, ly] = at([x, y, 0])
      const size = Math.max(10, Math.round(scale * 4.4))
      g.fillStyle = tone
      g.fillText(String(operator.id), lx, ly - size * 0.4)
      if (labels[index]) g.fillText(labels[index], lx, ly + size * 0.55, scale * 20)
    })
  }

  const animating = () => step < WIREFRAME_MOVE_STEPS || !prefersReducedMotion()

  function tick() {
    timer = undefined
    time += 1 / WIREFRAME_FPS
    if (step < WIREFRAME_MOVE_STEPS) {
      step++
      shown = steppedPositions(
        from,
        scene.map((operator): Point => [operator.x, operator.y]),
        step,
        WIREFRAME_MOVE_STEPS,
      )
    }
    draw()
    if (animating()) schedule()
  }

  function schedule() {
    const active = onScreen && document.visibilityState !== 'hidden'
    if (timer === undefined && active) timer = setTimeout(tick, 1000 / WIREFRAME_FPS)
  }

  const refresh = () => {
    if (timer === undefined) schedule()
  }

  const resize = () => {
    const { clientHeight, clientWidth } = canvas
    if (canvas.width === clientWidth && canvas.height === clientHeight) return
    canvas.width = clientWidth
    canvas.height = clientHeight
    refresh()
  }

  const resizeObserver =
    typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : undefined
  resizeObserver?.observe(canvas)
  const intersectionObserver =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
          onScreen = entries.at(-1)?.isIntersecting ?? true
          if (onScreen) refresh()
          else if (timer !== undefined) {
            clearTimeout(timer)
            timer = undefined
          }
        })
      : undefined
  intersectionObserver?.observe(canvas)
  const onVisibility = () => {
    if (document.visibilityState === 'hidden' && timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    } else refresh()
  }
  document.addEventListener('visibilitychange', onVisibility)

  let pointer: { id: number; x: number; y: number } | undefined
  const onDown = (event: PointerEvent) => {
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
    ay += sway()
    dragging = true
    canvas.setPointerCapture?.(event.pointerId)
  }
  const onMove = (event: PointerEvent) => {
    if (!pointer || pointer.id !== event.pointerId) return
    ay += (event.clientX - pointer.x) * dragRadiansPerPixel
    ax = Math.max(
      -maxTilt,
      Math.min(maxTilt, ax + (event.clientY - pointer.y) * dragRadiansPerPixel),
    )
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
    refresh()
  }
  const onUp = () => {
    if (!pointer) return
    pointer = undefined
    dragging = false
    // Sway resumes from where the view was left, not from where it was when the drag began.
    ay -= sway()
    refresh()
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)

  resize()
  refresh()

  return {
    dispose() {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      resizeObserver?.disconnect()
      intersectionObserver?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
    },
    turn(dx, dy) {
      ay += dx
      ax = Math.max(-maxTilt, Math.min(maxTilt, ax + dy))
      refresh()
    },
    update(next, nextLabels) {
      const rearranged = next !== scene
      const first = scene.length === 0
      if (rearranged) from = shown
      scene = next
      labels = nextLabels
      if (!rearranged) {
        // Only the labels changed (a knob turned); nothing moves.
      } else if (first || prefersReducedMotion()) {
        step = WIREFRAME_MOVE_STEPS
        shown = next.map((operator): Point => [operator.x, operator.y])
      } else {
        step = 0
      }
      refresh()
    },
  }
}
