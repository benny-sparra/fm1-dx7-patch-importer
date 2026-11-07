import { useEffect, useRef } from 'react'

import { meterSegments, type PeakMeter } from '@/lib/peak-meter'

const segmentCount = 12

/**
 * Asked here rather than through `prefersReducedMotion`: importing that from this lazy chunk made
 * Rolldown split `reduced-motion` out of the entry into a chunk of its own the entry loads.
 */
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const hotSegmentCount = 3

export type MeterHit = { count: number; value: number }

/**
 * The keyboard's velocity meter: each note lights it to its velocity, and the peak segment hangs a
 * moment before it falls, as on a mixing desk. It is decoration, hidden from assistive technology,
 * since the velocity slider beside it already says the velocity. It paints its segments from an
 * animation frame rather than through React, and with reduced motion it shows the last note's
 * velocity and stays still.
 */
export function VelocityMeter({ hit, meter }: { hit: MeterHit | null; meter: PeakMeter }) {
  const meterRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const segments = meterRef.current?.children
    if (!hit || !segments) return
    const paint = (reading: { level: number; peak: number }) => {
      meterSegments(reading, segmentCount, hotSegmentCount).forEach((lit, index) => {
        const segment = segments[index] as HTMLElement
        if (lit) segment.dataset.lit = lit
        else delete segment.dataset.lit
      })
      return reading
    }
    if (reducedMotion()) {
      paint({ level: hit.value, peak: hit.value })
      return
    }
    let frame = 0
    const loop = (now: number) => {
      const { level, peak } = paint(meter.read(now))
      if (level > 0 || peak > 0) frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [hit, meter])

  return (
    <span aria-hidden="true" className="flex h-3 items-stretch gap-px" ref={meterRef}>
      {Array.from({ length: segmentCount }, (_, index) => (
        <span className="velocity-meter-segment w-1.5" data-meter-segment="" key={index} />
      ))}
    </span>
  )
}
