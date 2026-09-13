import { describe, expect, it } from 'vitest'

import { pitchEnvelopePresets } from '@/lib/pitch-envelope-presets'

describe('pitch envelope presets', () => {
  it('gives every preset a unique id', () => {
    const ids = pitchEnvelopePresets.map(({ id }) => id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps every rate and level inside the 0–99 parameter range', () => {
    for (const { levels, rates } of pitchEnvelopePresets) {
      for (const value of [...rates, ...levels]) {
        expect(Number.isInteger(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(99)
      }
    }
  })

  it('rests on the played pitch between notes except for the release fall', () => {
    const restingLevels = Object.fromEntries(
      pitchEnvelopePresets.map(({ id, levels }) => [id, levels[3] === 50]),
    )
    expect(restingLevels).toEqual({
      attackDrop: true,
      blipUp: true,
      flat: true,
      releaseFall: false,
      scoop: true,
    })
  })
})
