import { describe, expect, it } from 'vitest'

import {
  clampEnvelopeValue,
  formatOperatorFixedFrequency,
  formatOperatorFrequency,
  formatOperatorRatio,
  pitchEnvelopeLevelFromY,
  pitchEnvelopePointPosition,
  rotaryControlAngle,
} from './editor-visuals'
import { FM1_VOICE_PARAMETER_COUNT, resolveOperatorParameterIndex } from './fm1-parameters'

describe('rotary control angle', () => {
  it('maps the full value range onto the knob sweep', () => {
    expect(rotaryControlAngle(0, 0, 99)).toBe(-135)
    expect(rotaryControlAngle(49.5, 0, 99)).toBe(0)
    expect(rotaryControlAngle(99, 0, 99)).toBe(135)
  })

  it('clamps values outside the control range', () => {
    expect(rotaryControlAngle(-1, 0, 99)).toBe(-135)
    expect(rotaryControlAngle(100, 0, 99)).toBe(135)
  })

  it('uses the resting angle for an invalid or fixed range', () => {
    expect(rotaryControlAngle(5, 5, 5)).toBe(-135)
    expect(rotaryControlAngle(5, 10, 0)).toBe(-135)
  })
})

describe('operator ratio labels', () => {
  it('shows every ratio numerically for direct comparison', () => {
    expect(formatOperatorRatio(0.5)).toBe('0.50×')
    expect(formatOperatorRatio(1)).toBe('1.00×')
    expect(formatOperatorRatio(2)).toBe('2.00×')
    expect(formatOperatorRatio(3)).toBe('3.00×')
  })

  it('keeps fine-tuned ratios numeric', () => {
    expect(formatOperatorRatio(1.01)).toBe('1.01×')
  })
})

describe('operator fixed-frequency labels', () => {
  it('combines the coarse decade and logarithmic fine setting', () => {
    expect(formatOperatorFixedFrequency(0, 0)).toBe('1.00 Hz')
    expect(formatOperatorFixedFrequency(2, 99)).toBe('977.2 Hz')
  })

  it('uses kilohertz for compact four-digit frequencies', () => {
    expect(formatOperatorFixedFrequency(3, 99)).toBe('9.77 kHz')
  })

  it('uses the two fixed-mode coarse bits from a packed DX7 value', () => {
    expect(formatOperatorFixedFrequency(6, 0)).toBe('100.0 Hz')
  })
})

describe('operator frequency labels', () => {
  const voice = (operator: number, mode: number, coarse: number, fine: number) => {
    const parameters = new Uint8Array(FM1_VOICE_PARAMETER_COUNT)
    parameters[resolveOperatorParameterIndex(operator, 'operator.oscillatorMode')] = mode
    parameters[resolveOperatorParameterIndex(operator, 'operator.frequency.coarse')] = coarse
    parameters[resolveOperatorParameterIndex(operator, 'operator.frequency.fine')] = fine
    return parameters
  }

  it('shows a ratio in ratio mode', () => {
    expect(formatOperatorFrequency(voice(2, 0, 14, 0), 2)).toBe('14.00×')
  })

  it('reads coarse 0 as half the note frequency in ratio mode', () => {
    expect(formatOperatorFrequency(voice(1, 0, 0, 0), 1)).toBe('0.50×')
  })

  it('applies the fine setting to the ratio', () => {
    expect(formatOperatorFrequency(voice(6, 0, 2, 50), 6)).toBe('3.00×')
  })

  it('shows a fixed frequency in fixed mode', () => {
    expect(formatOperatorFrequency(voice(3, 1, 2, 0), 3)).toBe('100.0 Hz')
  })

  it('drops the ratio sign in the compact form', () => {
    expect(formatOperatorFrequency(voice(2, 0, 14, 0), 2, { compact: true })).toBe('14.00')
  })

  it('drops the space before the unit in the compact form', () => {
    expect(formatOperatorFrequency(voice(3, 1, 3, 99), 3, { compact: true })).toBe('9.77kHz')
  })

  it('reads the operator it is asked for', () => {
    const parameters = voice(4, 0, 3, 0)
    parameters[resolveOperatorParameterIndex(5, 'operator.frequency.coarse')] = 7
    expect(formatOperatorFrequency(parameters, 5)).toBe('7.00×')
  })
})

describe('envelope numeric values', () => {
  it('keeps values within the DX7 envelope range', () => {
    expect(clampEnvelopeValue(-1, 42)).toBe(0)
    expect(clampEnvelopeValue(100, 42)).toBe(99)
  })

  it('rounds envelope values to whole numbers', () => {
    expect(clampEnvelopeValue(48.6, 42)).toBe(49)
  })

  it('retains the current value for an invalid edit', () => {
    expect(clampEnvelopeValue(Number.NaN, 42)).toBe(42)
  })
})

describe('pitch envelope geometry', () => {
  it('centres level 50 on the base-pitch reference line', () => {
    expect(pitchEnvelopePointPosition(50, 50, 0).y).toBe(88)
  })

  it('maps the full pitch range above and below the base-pitch reference line', () => {
    expect(pitchEnvelopePointPosition(50, 99, 0).y).toBe(20)
    expect(pitchEnvelopePointPosition(50, 0, 0).y).toBe(156)
  })

  it('converts graph positions back to bounded pitch levels', () => {
    expect(pitchEnvelopeLevelFromY(20)).toBe(99)
    expect(pitchEnvelopeLevelFromY(88)).toBe(50)
    expect(pitchEnvelopeLevelFromY(156)).toBe(0)
  })
})
