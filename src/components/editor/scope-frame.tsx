import { type ReactNode, type Ref, useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

export const scopeViewWidth = 300
export const scopeViewHeight = 48

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Runs `step` every animation frame with the seconds since the last one, and
 * once with 0 after every render so a changed parameter redraws at once. With
 * reduced motion (or no requestAnimationFrame) only the render redraws happen,
 * leaving a still frame. The latest `step` is always used, so callers can
 * close over props without restarting the loop.
 *
 * Attach the returned ref to the scope's `ScopeFrame`: frames are only
 * requested while it shows on screen, so a scope scrolled away or inside a
 * folded rack panel (clipped to zero height) stops repainting. Without
 * IntersectionObserver the loop always runs.
 */
export function useAnimationLoop(step: (elapsed: number) => void) {
  const stepRef = useRef(step)
  stepRef.current = step
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    stepRef.current(0)
  })

  useEffect(() => {
    if (typeof window.requestAnimationFrame !== 'function' || prefersReducedMotion()) return

    let frame: number | undefined
    let last: number | undefined
    const tick = (now: number) => {
      // Cap the step so a tab returning from the background doesn't lurch.
      const elapsed = last === undefined ? 0 : Math.min(0.1, (now - last) / 1000)
      last = now
      stepRef.current(elapsed)
      frame = window.requestAnimationFrame(tick)
    }
    const start = () => {
      if (frame !== undefined) return
      // Resume from where the scope paused rather than jumping ahead.
      last = undefined
      frame = window.requestAnimationFrame(tick)
    }
    const stop = () => {
      if (frame === undefined) return
      window.cancelAnimationFrame(frame)
      frame = undefined
    }

    const target = frameRef.current
    if (!target || typeof window.IntersectionObserver !== 'function') {
      start()
      return stop
    }

    // A clipped scope touching its clip edge still counts as intersecting
    // with no area, so only a visible area resumes the loop.
    const observer = new window.IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1)
        if (!entry) return
        if (entry.isIntersecting && entry.intersectionRatio > 0) start()
        else stop()
      },
      { threshold: [0, 0.01] },
    )
    observer.observe(target)
    return () => {
      observer.disconnect()
      stop()
    }
  }, [])

  return frameRef
}

/** Faint graticule lines: evenly spaced verticals plus a horizontal at `rowY`. */
export function ScopeGrid({ columns, rowY }: { columns: number; rowY: number }) {
  return (
    <g stroke="var(--crt-line-dk)" strokeWidth="1" vectorEffect="non-scaling-stroke">
      {Array.from({ length: columns - 1 }, (_, index) => (
        <line
          key={index}
          vectorEffect="non-scaling-stroke"
          x1={((index + 1) * scopeViewWidth) / columns}
          x2={((index + 1) * scopeViewWidth) / columns}
          y1="0"
          y2={scopeViewHeight}
        />
      ))}
      <line vectorEffect="non-scaling-stroke" x1="0" x2={scopeViewWidth} y1={rowY} y2={rowY} />
    </g>
  )
}

/** The glowing accent group a scope draws its traces in, dimmed while inactive. */
export function ScopeTrace({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <g
      className="transition-opacity duration-300"
      opacity={active ? 1 : 0.4}
      style={{ filter: 'drop-shadow(0 0 3px var(--crt-acc))' }}
    >
      {children}
    </g>
  )
}

/**
 * The sunken well every scope sits in. The SVG stretches to fill it, so
 * strokes should use non-scaling-stroke; round marks that must stay round go
 * in `overlay` as HTML positioned by percentage.
 */
export function ScopeFrame({
  children,
  className,
  overlay,
  ref,
  testId,
}: {
  children: ReactNode
  className?: string
  overlay?: ReactNode
  ref?: Ref<HTMLDivElement>
  testId: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'crt-inset relative h-12 min-w-0 overflow-hidden bg-[var(--crt-bg-well)]',
        className,
      )}
      data-testid={testId}
      ref={ref}
    >
      <svg
        className="absolute inset-0 size-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${scopeViewWidth} ${scopeViewHeight}`}
      >
        {children}
      </svg>
      {overlay}
    </div>
  )
}

/** A small LED dot for a scope overlay, positioned in view units. */
export function ScopeDot({ active, x, y }: { active: boolean; x: number; y: number }) {
  return (
    <span
      className="absolute size-1.5 -translate-1/2 rounded-full bg-[var(--crt-led)] shadow-[0_0_6px_var(--crt-led)] transition-opacity duration-300"
      style={{
        left: `${(x / scopeViewWidth) * 100}%`,
        opacity: active ? 1 : 0.4,
        top: `${(y / scopeViewHeight) * 100}%`,
      }}
    />
  )
}
