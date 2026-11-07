import { useEffect, useEffectEvent, useRef } from 'react'

import { prefersReducedMotion } from '@/lib/reduced-motion'

/** How long a trace takes to draw, and a pulse to travel its links. */
const traceDrawMs = 600

/**
 * Draws `path` from its start to its end as a phosphor trace does, a bright dot leading it, using
 * the Web Animations API so the path's own markup never changes. Needs `pathLength="1"` on the
 * path. The path is whole again when the animation ends, and the dot, which sits in the same
 * drawing, is hidden. Does nothing where the browser cannot animate or reduced motion is asked.
 */
function drawTrace(path: SVGPathElement, dot: SVGCircleElement | null) {
  if (typeof path.animate !== 'function' || prefersReducedMotion()) return
  const animation = path.animate(
    [
      { strokeDasharray: '1 1', strokeDashoffset: 1 },
      { strokeDasharray: '1 1', strokeDashoffset: 0 },
    ],
    { duration: traceDrawMs, easing: 'linear' },
  )
  if (!dot || typeof path.getTotalLength !== 'function') return
  const follow = () => {
    const progress = Number(animation.currentTime ?? traceDrawMs) / traceDrawMs
    if (animation.playState === 'finished' || progress >= 1 || !path.isConnected) {
      dot.style.opacity = '0'
      return
    }
    const point = path.getPointAtLength(progress * path.getTotalLength())
    dot.setAttribute('cx', String(point.x))
    dot.setAttribute('cy', String(point.y))
    dot.style.opacity = '1'
    window.requestAnimationFrame(follow)
  }
  follow()
}

/**
 * Sends one pulse along each of the algorithm diagram's links, from the modulator at the top to
 * the operator it feeds, on the copies of the links the diagram keeps for it (`pathLength="1"`,
 * hidden at rest). Does nothing where the browser cannot animate or reduced motion is asked.
 */
export function pulseLinks(links: SVGGElement | null) {
  if (!links || prefersReducedMotion()) return
  for (const link of links.querySelectorAll('path')) {
    if (typeof link.animate !== 'function') return
    link.animate(
      [
        { opacity: 1, strokeDasharray: '0.25 1.25', strokeDashoffset: 0.25 },
        { opacity: 1, strokeDasharray: '0.25 1.25', strokeDashoffset: -1, offset: 0.9 },
        { opacity: 0, strokeDasharray: '0.25 1.25', strokeDashoffset: -1 },
      ],
      { duration: traceDrawMs, easing: 'linear' },
    )
  }
}

/**
 * Runs `pulse` when `signature` changes after the first render, so an algorithm already showing as
 * the editor opens does not pulse, and one chosen does.
 */
export function useChangePulse(signature: unknown, pulse: () => void) {
  const previous = useRef(signature)
  const run = useEffectEvent(pulse)
  useEffect(() => {
    if (previous.current === signature) return
    previous.current = signature
    run()
  }, [signature])
}

/**
 * Reveals a scope's whole drawing from left to right instead, for a trace that cannot be drawn
 * along its length because it scrolls and is stretched with a constant stroke width, as the LFO's.
 */
function sweepScope(drawing: SVGElement | null) {
  if (!drawing || typeof drawing.animate !== 'function' || prefersReducedMotion()) return
  drawing.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
    duration: traceDrawMs,
    easing: 'linear',
  })
}

/**
 * Redraws a scope's trace when what it shows is replaced, and when it first appears: the editor
 * opening, a preset, undo, or another algorithm changes `signature`. A change made while a point
 * is held, which `hold` reports, is the user's own edit and is never redrawn, since the trace is
 * being moved under their hand. Returns the refs for the path and the leading dot, and `hold`.
 */
export function usePhosphorTrace(signature: string, mode: 'sweep' | 'trace' = 'trace') {
  const pathRef = useRef<SVGPathElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const holding = useRef(false)
  const previous = useRef<string | null>(null)
  const draw = useEffectEvent(() => {
    const path = pathRef.current
    if (!path) return
    // Typing in one of the editor's own fields is as much the user's edit as a drag is.
    const owner = path.closest('[data-trace-owner]')
    if (owner?.contains(document.activeElement)) return
    if (mode === 'sweep') sweepScope(path.ownerSVGElement)
    else drawTrace(path, dotRef.current)
  })

  useEffect(() => {
    if (previous.current === signature) return
    previous.current = signature
    if (!holding.current) draw()
  }, [signature])

  return {
    dotRef,
    hold: (held: boolean) => {
      holding.current = held
    },
    pathRef,
  }
}

/** The leading dot's attributes: hidden until a trace is drawing, and never in the way. */
export const traceDotProps = {
  fill: 'var(--crt-acc-br)',
  pointerEvents: 'none',
  r: 4,
  style: { filter: 'drop-shadow(0 0 4px var(--crt-acc))', opacity: 0 },
} as const
