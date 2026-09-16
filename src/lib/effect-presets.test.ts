import { describe, expect, it } from 'vitest'

import { applyEffectPreset, effectOfParameter, effectPresets } from '@/lib/effect-presets'
import {
  FM1_EFFECT_PARAMETER_COUNT,
  fm1EffectParameters,
  getEffectParameterDefinition,
  type EffectParameterId,
} from '@/lib/fm1-parameters'

describe('effect presets', () => {
  it('gives every preset a unique id', () => {
    const ids = effectPresets.map(({ id }) => id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps every value an integer inside its parameter range', () => {
    for (const { values } of effectPresets) {
      for (const [id, value] of Object.entries(values)) {
        const definition = getEffectParameterDefinition(id as EffectParameterId)
        expect(Number.isInteger(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(definition.min)
        expect(value).toBeLessThanOrEqual(definition.max)
      }
    }
  })

  it('keeps continuous values away from the ends of their range', () => {
    for (const { values } of effectPresets) {
      const continuousValues = Object.entries(values).filter(
        ([id]) => getEffectParameterDefinition(id as EffectParameterId).kind === 'continuous',
      )
      for (const [id, value] of continuousValues) {
        const { max } = getEffectParameterDefinition(id as EffectParameterId)
        expect(value).toBeGreaterThanOrEqual(max * 0.05)
        expect(value).toBeLessThanOrEqual(max * 0.95)
      }
    }
  })

  it('sets every control of its own effect, switched on, and nothing else', () => {
    for (const { effect, values } of effectPresets) {
      const controls = fm1EffectParameters
        .filter(({ id }) => effectOfParameter(id) === effect)
        .map(({ id }) => id)

      expect(Object.keys(values).sort()).toEqual(controls.sort())
      expect(values[`effect.${effect}.enabled` as EffectParameterId]).toBe(1)
    }
  })

  it('leaves the other effects unchanged and reports the controls it set', () => {
    const settings = new Uint8Array(FM1_EFFECT_PARAMETER_COUNT).fill(1)
    const delayEnabled = getEffectParameterDefinition('effect.delay.enabled').controller

    const { controllers, settings: next } = applyEffectPreset(settings, 'smallRoom')

    expect(controllers).toEqual([4, 5, 6, 7])
    expect(Array.from(next.slice(4, 8))).toEqual([1, 0, 30, 25])
    expect(next[delayEnabled]).toBe(1)
    expect(Array.from(next).filter((_, controller) => !controllers.includes(controller))).toEqual(
      Array(FM1_EFFECT_PARAMETER_COUNT - 4).fill(1),
    )
    expect(settings.every((value) => value === 1)).toBe(true)
  })
})
