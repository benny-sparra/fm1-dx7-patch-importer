import { describe, expect, it } from 'vitest'

import { createPeakMeter, meterSegments, peakHoldMs } from './peak-meter'

describe('createPeakMeter', () => {
  it('lights the level to a hit at once', () => {
    const meter = createPeakMeter()
    meter.hit(0.8, 1000)

    expect(meter.read(1000)).toEqual({ level: 0.8, peak: 0.8 })
  })

  it('lets the level fall while the peak holds', () => {
    const meter = createPeakMeter()
    meter.hit(0.8, 1000)

    const reading = meter.read(1000 + peakHoldMs / 2)

    expect(reading.level).toBeLessThan(0.8)
    expect(reading.peak).toBe(0.8)
  })

  it('drops the peak once its hold is over, never below the level', () => {
    const meter = createPeakMeter()
    meter.hit(0.8, 1000)
    meter.read(1000 + peakHoldMs)

    const reading = meter.read(1000 + peakHoldMs + 200)

    expect(reading.peak).toBeLessThan(0.8)
    expect(reading.peak).toBeGreaterThanOrEqual(reading.level)
  })

  it('keeps the higher peak when a softer note follows', () => {
    const meter = createPeakMeter()
    meter.hit(0.9, 1000)
    meter.hit(0.4, 1100)

    expect(meter.read(1100).peak).toBe(0.9)
  })

  it('goes dark in the end', () => {
    const meter = createPeakMeter()
    meter.hit(1, 1000)

    expect(meter.read(10_000)).toEqual({ level: 0, peak: 0 })
  })

  it('bounds a hit to the meter’s scale', () => {
    const meter = createPeakMeter()
    meter.hit(3, 1000)

    expect(meter.read(1000)).toEqual({ level: 1, peak: 1 })
  })
})

describe('meterSegments', () => {
  it('lights segments to the level, the top ones hot', () => {
    expect(meterSegments({ level: 1, peak: 1 }, 4, 1)).toEqual(['on', 'on', 'on', 'hot'])
  })

  it('shows the held peak above a lower level', () => {
    expect(meterSegments({ level: 0.25, peak: 0.75 }, 4, 1)).toEqual([
      'on',
      undefined,
      'peak',
      undefined,
    ])
  })

  it('stays dark at rest', () => {
    expect(meterSegments({ level: 0, peak: 0 }, 3, 1)).toEqual([undefined, undefined, undefined])
  })
})
