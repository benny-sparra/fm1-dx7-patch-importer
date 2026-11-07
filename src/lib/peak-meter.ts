/** How long the peak stays where a note put it before it starts to fall. */
export const peakHoldMs = 700

/** How fast the level and the peak fall, in full scales per second. */
const levelFallPerSecond = 2.4
const peakFallPerSecond = 0.9

export type PeakMeterReading = { level: number; peak: number }

export type PeakMeter = {
  /** Lights the meter to `value`, from 0 to 1, at `now` ms; a higher value moves the peak. */
  hit: (value: number, now: number) => void
  /** The level and peak at `now` ms, each from 0 to 1. */
  read: (now: number) => PeakMeterReading
}

/**
 * A meter with peak hold, as on a mixing desk: each hit lights the level, which falls straight
 * away, while the peak hangs at the highest hit for `peakHoldMs` and then falls more slowly, never
 * below the level. Time is passed in, so the meter can be read at any frame and tested without a
 * clock.
 */
export function createPeakMeter(): PeakMeter {
  let level = 0
  let peak = 0
  let heldUntil = 0
  let last: number | undefined

  const advance = (now: number) => {
    const seconds = last === undefined ? 0 : Math.max(0, now - last) / 1000
    last = now
    level = Math.max(0, level - seconds * levelFallPerSecond)
    if (now >= heldUntil) peak = Math.max(level, peak - seconds * peakFallPerSecond)
  }

  return {
    hit(value, now) {
      advance(now)
      const bounded = Math.min(1, Math.max(0, value))
      level = Math.max(level, bounded)
      if (bounded >= peak) {
        peak = bounded
        heldUntil = now + peakHoldMs
      }
    },
    read(now) {
      advance(now)
      return { level, peak }
    },
  }
}

/**
 * What each of `segments` segments shows for a reading, from the bottom: lit, lit in the top
 * `hotSegments`, the held peak, or dark.
 */
export function meterSegments(
  { level, peak }: PeakMeterReading,
  segments: number,
  hotSegments: number,
): ('hot' | 'on' | 'peak' | undefined)[] {
  const lit = Math.round(level * segments)
  const peakIndex = Math.round(peak * segments) - 1
  return Array.from({ length: segments }, (_, index) => {
    if (index < lit) return index >= segments - hotSegments ? 'hot' : 'on'
    return index === peakIndex ? 'peak' : undefined
  })
}
