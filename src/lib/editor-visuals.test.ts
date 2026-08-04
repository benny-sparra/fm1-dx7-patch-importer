import { describe, expect, it } from 'vitest'

import { formatOperatorRatio, rotaryControlAngle } from './editor-visuals'

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
  it('names exact octave relationships in musical terms', () => {
    expect(formatOperatorRatio(0.5)).toBe('−1 OCT')
    expect(formatOperatorRatio(1)).toBe('UNISON')
    expect(formatOperatorRatio(2)).toBe('+1 OCT')
    expect(formatOperatorRatio(4)).toBe('+2 OCT')
  })

  it('keeps non-octave harmonic ratios numeric', () => {
    expect(formatOperatorRatio(3)).toBe('3.00×')
  })

  it('keeps fine-tuned ratios numeric', () => {
    expect(formatOperatorRatio(1.01)).toBe('1.01×')
  })
})
