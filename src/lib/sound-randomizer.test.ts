import { describe, expect, it } from 'vitest'

import { dx7Algorithms, getDx7OperatorRole } from '@/lib/dx7-algorithms'
import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_EFFECT_PARAMETER_START,
  FM1_VOICE_NAME_START,
  fm1VoiceParameterMaximums,
  resolveOperatorParameterIndex,
  type OperatorParameterId,
} from '@/lib/fm1-parameters'
import { randomizeSound } from '@/lib/sound-randomizer'

const SEEDS = Array.from({ length: 400 }, (_, seed) => seed + 1)
const OPERATORS = [1, 2, 3, 4, 5, 6] as const

// Mulberry32: a small deterministic generator so every run sees the same voices.
function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeParameters() {
  const parameters = new Uint8Array(FM1_EDITOR_PARAMETER_COUNT).fill(5)
  parameters.set(new TextEncoder().encode('PATCH NAME'), FM1_VOICE_NAME_START)
  parameters.set(
    Array.from({ length: 24 }, (_, index) => index + 1),
    FM1_EFFECT_PARAMETER_START,
  )
  return parameters
}

function randomisedVoices() {
  return SEEDS.map((seed) => randomizeSound(makeParameters(), seededRandom(seed)))
}

function operatorValue(voice: Uint8Array, operator: number, id: OperatorParameterId) {
  return voice[resolveOperatorParameterIndex(operator, id)]
}

function isCarrier(voice: Uint8Array, operator: number) {
  const algorithmOperator = dx7Algorithms[voice[134]].find(({ id }) => id === operator)
  return algorithmOperator ? getDx7OperatorRole(algorithmOperator) === 'carrier' : false
}

describe('sound randomisation', () => {
  it('keeps every voice parameter within its legal DX7 range', () => {
    for (const voice of randomisedVoices()) {
      fm1VoiceParameterMaximums.slice(0, FM1_VOICE_NAME_START).forEach((maximum, index) => {
        expect(voice[index]).toBeLessThanOrEqual(maximum)
      })
    }
  })

  it('stays in range when the random source returns its extremes', () => {
    for (const random of [() => 0, () => 0.999999]) {
      const voice = randomizeSound(makeParameters(), random)
      fm1VoiceParameterMaximums.slice(0, FM1_VOICE_NAME_START).forEach((maximum, index) => {
        expect(voice[index]).toBeLessThanOrEqual(maximum)
      })
    }
  })

  it('preserves the patch name and FM1 effect settings', () => {
    const original = makeParameters()
    for (const voice of randomisedVoices()) {
      expect(Array.from(voice.slice(FM1_VOICE_NAME_START))).toEqual(
        Array.from(original.slice(FM1_VOICE_NAME_START)),
      )
    }
  })

  it('does not modify the input parameters', () => {
    const parameters = makeParameters()
    randomizeSound(parameters, seededRandom(1))

    expect(Array.from(parameters)).toEqual(Array.from(makeParameters()))
  })

  it('gives carriers an output level of at least 68 and modulators at least 36', () => {
    for (const voice of randomisedVoices()) {
      for (const operator of OPERATORS) {
        const level = operatorValue(voice, operator, 'operator.outputLevel')
        expect(level).toBeGreaterThanOrEqual(isCarrier(voice, operator) ? 68 : 36)
      }
    }
  })

  it('raises each operator envelope so its peak level is 99 and releases to 0', () => {
    for (const voice of randomisedVoices()) {
      for (const operator of OPERATORS) {
        const levels = (
          [
            'operator.envelope.level1',
            'operator.envelope.level2',
            'operator.envelope.level3',
          ] as const
        ).map((id) => operatorValue(voice, operator, id))
        expect(Math.max(...levels)).toBe(99)
        expect(operatorValue(voice, operator, 'operator.envelope.level4')).toBe(0)
      }
    }
  })

  it('keeps envelope attack and release rates within their documented ranges', () => {
    for (const voice of randomisedVoices()) {
      for (const operator of OPERATORS) {
        expect(operatorValue(voice, operator, 'operator.envelope.rate1')).toBeGreaterThanOrEqual(68)
        expect(operatorValue(voice, operator, 'operator.envelope.rate4')).toBeGreaterThanOrEqual(36)
      }
    }
  })

  it('limits carrier coarse frequencies to ratios 0.5, 1 and 2', () => {
    for (const voice of randomisedVoices()) {
      for (const operator of OPERATORS.filter((id) => isCarrier(voice, id))) {
        expect([0, 1, 2]).toContain(operatorValue(voice, operator, 'operator.frequency.coarse'))
      }
    }
  })

  it('mostly keeps modulator coarse frequencies at 7 or below while allowing the full range', () => {
    const modulatorCoarse = randomisedVoices().flatMap((voice) =>
      OPERATORS.filter((id) => !isCarrier(voice, id)).map((operator) =>
        operatorValue(voice, operator, 'operator.frequency.coarse'),
      ),
    )
    const wide = modulatorCoarse.filter((coarse) => coarse > 7).length

    expect(wide).toBeGreaterThan(0)
    expect(wide / modulatorCoarse.length).toBeLessThan(0.25)
  })

  it('uses a zero fine frequency for ratio-mode operators', () => {
    for (const voice of randomisedVoices()) {
      const ratioOperators = OPERATORS.filter(
        (operator) => operatorValue(voice, operator, 'operator.oscillatorMode') === 0,
      )
      for (const operator of ratioOperators) {
        expect(operatorValue(voice, operator, 'operator.frequency.fine')).toBe(0)
      }
    }
  })

  it('disables keyboard scaling, velocity sensitivity and detune', () => {
    const neutralIds = [
      'operator.keyboard.breakpoint',
      'operator.keyboard.leftDepth',
      'operator.keyboard.rightDepth',
      'operator.keyboard.leftCurve',
      'operator.keyboard.rightCurve',
      'operator.keyboard.rateScaling',
      'operator.velocitySensitivity',
    ] as const
    for (const voice of randomisedVoices()) {
      for (const operator of OPERATORS) {
        neutralIds.forEach((id) => expect(operatorValue(voice, operator, id)).toBe(0))
        expect(operatorValue(voice, operator, 'operator.detune')).toBe(7)
      }
    }
  })

  it('usually leaves the pitch envelope neutral', () => {
    const neutral = randomisedVoices().filter(
      (voice) => Array.from(voice.slice(126, 134)).join() === '99,99,99,99,50,50,50,50',
    ).length

    expect(neutral / SEEDS.length).toBeGreaterThan(0.75)
    expect(neutral).toBeLessThan(SEEDS.length)
  })

  it('fixes transpose at C3 and LFO delay at 0 while sometimes enabling pitch-mod sensitivity', () => {
    const voices = randomisedVoices()

    voices.forEach((voice) => {
      expect(voice[144]).toBe(24)
      expect(voice[138]).toBe(0)
    })
    expect(voices.some((voice) => voice[143] > 0)).toBe(true)
  })

  it('produces the same voice for the same random sequence', () => {
    expect(Array.from(randomizeSound(makeParameters(), seededRandom(42)))).toEqual(
      Array.from(randomizeSound(makeParameters(), seededRandom(42))),
    )
  })

  it('rejects incomplete editor data', () => {
    expect(() => randomizeSound(new Uint8Array(155))).toThrow('179')
  })
})
