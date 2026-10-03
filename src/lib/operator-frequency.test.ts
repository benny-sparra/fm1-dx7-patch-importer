import { describe, expect, it } from 'vitest'

import { FM1_VOICE_PARAMETER_COUNT, resolveOperatorParameterIndex } from './fm1-parameters'
import {
  formatFrequencyEntry,
  frequencyEntryEdits,
  nearestFixedFrequencySetting,
  nearestRatioSetting,
  operatorFixedHertz,
  operatorRatio,
  parseFrequencyEntry,
} from './operator-frequency'

describe('operator ratio', () => {
  it('reads coarse 0 as half the note frequency', () => {
    expect(operatorRatio(0, 0)).toBe(0.5)
  })

  it('raises the coarse ratio by the fine percentage', () => {
    expect(operatorRatio(2, 50)).toBe(3)
  })
})

describe('operator fixed frequency', () => {
  it('takes the decade from the two low coarse bits', () => {
    expect(operatorFixedHertz(6, 0)).toBe(100)
  })
})

describe('nearest ratio setting', () => {
  it('finds a ratio the FM1 plays exactly', () => {
    expect(nearestRatioSetting(1.5)).toEqual({ coarse: 1, fine: 50 })
  })

  it('prefers a whole coarse ratio to the same ratio reached with fine', () => {
    expect(nearestRatioSetting(3)).toEqual({ coarse: 3, fine: 0 })
  })

  it('reaches a ratio from a lower coarse when that is exact', () => {
    expect(nearestRatioSetting(3.5)).toEqual({ coarse: 2, fine: 75 })
  })

  it('takes the closest reachable ratio for one between settings', () => {
    expect(nearestRatioSetting(1.234)).toEqual({ coarse: 1, fine: 23 })
  })

  it('reaches ratios below 1 through coarse 0', () => {
    expect(nearestRatioSetting(0.75)).toEqual({ coarse: 0, fine: 50 })
  })

  it('stops at the lowest ratio', () => {
    expect(nearestRatioSetting(0.1)).toEqual({ coarse: 0, fine: 0 })
  })

  it('stops at the highest ratio', () => {
    expect(nearestRatioSetting(100)).toEqual({ coarse: 31, fine: 99 })
  })

  it('never leaves a reachable ratio further away than another setting', () => {
    const reachableRatios: number[] = []
    for (let coarse = 0; coarse <= 31; coarse += 1) {
      for (let fine = 0; fine <= 99; fine += 1) {
        reachableRatios.push(operatorRatio(coarse, fine))
      }
    }

    // One assertion per ratio against the closest of every setting: an
    // assertion per setting made this half a million `expect` calls.
    for (let ratio = 0.5; ratio <= 61.5; ratio += 0.37) {
      const best = nearestRatioSetting(ratio)
      const bestError = Math.abs(operatorRatio(best.coarse, best.fine) - ratio)
      let closestError = Infinity
      for (const reachable of reachableRatios) {
        closestError = Math.min(closestError, Math.abs(reachable - ratio))
      }
      expect(bestError, `ratio ${ratio}`).toBeLessThanOrEqual(closestError + 1e-9)
    }
  })
})

describe('nearest fixed-frequency setting', () => {
  it('finds a decade with no fine offset', () => {
    expect(nearestFixedFrequencySetting(100, 0)).toEqual({ coarse: 2, fine: 0 })
  })

  it('takes the closest fine step within the decade', () => {
    // 10 ^ 2.64 is 436.5 Hz and 10 ^ 2.65 is 446.7 Hz.
    expect(nearestFixedFrequencySetting(440, 0)).toEqual({ coarse: 2, fine: 64 })
  })

  it('rounds up into the next decade', () => {
    expect(nearestFixedFrequencySetting(998, 0)).toEqual({ coarse: 3, fine: 0 })
  })

  it('keeps the coarse bits above the decade', () => {
    expect(nearestFixedFrequencySetting(100, 0b10111)).toEqual({ coarse: 0b10110, fine: 0 })
  })

  it('stops at 1 Hz', () => {
    expect(nearestFixedFrequencySetting(0.2, 0)).toEqual({ coarse: 0, fine: 0 })
  })

  it('stops at the highest fixed frequency', () => {
    expect(nearestFixedFrequencySetting(20000, 0)).toEqual({ coarse: 3, fine: 99 })
  })
})

describe('frequency entry text', () => {
  it('shows a ratio to two decimal places', () => {
    expect(formatFrequencyEntry('ratio', 3, 17)).toBe('3.51')
  })

  it('shows a fixed frequency in whole hertz from 1 kHz', () => {
    expect(formatFrequencyEntry('fixed', 3, 99)).toBe('9772')
  })

  it('shows a fixed frequency below 10 Hz to two decimal places', () => {
    expect(formatFrequencyEntry('fixed', 0, 0)).toBe('1.00')
  })

  it('reads a ratio with or without its sign', () => {
    expect(parseFrequencyEntry('3.5', 'ratio')).toBe(3.5)
    expect(parseFrequencyEntry(' 3.5 × ', 'ratio')).toBe(3.5)
    expect(parseFrequencyEntry('3.5x', 'ratio')).toBe(3.5)
  })

  it('reads a decimal comma', () => {
    expect(parseFrequencyEntry('3,5', 'ratio')).toBe(3.5)
  })

  it('reads hertz and kilohertz in fixed mode', () => {
    expect(parseFrequencyEntry('440 Hz', 'fixed')).toBe(440)
    expect(parseFrequencyEntry('1.2k', 'fixed')).toBe(1200)
    expect(parseFrequencyEntry('1.2 kHz', 'fixed')).toBe(1200)
  })

  it('rejects a unit from the other mode', () => {
    expect(parseFrequencyEntry('440 Hz', 'ratio')).toBeNull()
    expect(parseFrequencyEntry('2×', 'fixed')).toBeNull()
  })

  it('rejects text that is not a positive number', () => {
    expect(parseFrequencyEntry('', 'ratio')).toBeNull()
    expect(parseFrequencyEntry('abc', 'ratio')).toBeNull()
    expect(parseFrequencyEntry('-2', 'ratio')).toBeNull()
    expect(parseFrequencyEntry('0', 'fixed')).toBeNull()
  })
})

describe('frequency entry edits', () => {
  const coarseIndex = (operator: number) =>
    resolveOperatorParameterIndex(operator, 'operator.frequency.coarse')
  const fineIndex = (operator: number) =>
    resolveOperatorParameterIndex(operator, 'operator.frequency.fine')

  it('sets the operator’s coarse and fine together for a ratio', () => {
    const parameters = new Uint8Array(FM1_VOICE_PARAMETER_COUNT)

    expect(frequencyEntryEdits(parameters, 4, '3.5')).toEqual([
      [coarseIndex(4), 2, 0, 31],
      [fineIndex(4), 75, 0, 99],
    ])
  })

  it('reads hertz when the operator is in fixed mode', () => {
    const parameters = new Uint8Array(FM1_VOICE_PARAMETER_COUNT)
    parameters[resolveOperatorParameterIndex(2, 'operator.oscillatorMode')] = 1

    expect(frequencyEntryEdits(parameters, 2, '100')).toEqual([
      [coarseIndex(2), 2, 0, 31],
      [fineIndex(2), 0, 0, 99],
    ])
  })

  it('makes no edits for text that is not a frequency', () => {
    expect(frequencyEntryEdits(new Uint8Array(FM1_VOICE_PARAMETER_COUNT), 1, 'loud')).toBeNull()
  })
})
