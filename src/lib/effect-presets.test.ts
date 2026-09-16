import { describe, expect, it } from 'vitest'

import { applyEffectPreset, effectPresets } from '@/lib/effect-presets'
import {
  FM1_EFFECT_PARAMETER_COUNT,
  fm1EffectParameters,
  getEffectParameterDefinition,
  type EffectParameterId,
} from '@/lib/fm1-parameters'

const effectOf = (id: string) => id.split('.')[1]

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
      for (const [id, value] of Object.entries(values)) {
        const definition = getEffectParameterDefinition(id as EffectParameterId)
        if (definition.kind !== 'continuous') continue
        expect(value).toBeGreaterThanOrEqual(definition.max * 0.05)
        expect(value).toBeLessThanOrEqual(definition.max * 0.95)
      }
    }
  })

  it('sets every control of each effect a preset turns on, and never turns one off itself', () => {
    for (const { values } of effectPresets) {
      const switches = fm1EffectParameters.filter(
        ({ id, kind }) => kind === 'switch' && values[id] !== undefined,
      )
      const enabledEffects = switches.map(({ id }) => effectOf(id))
      const controlsOfEnabledEffects = fm1EffectParameters
        .filter(({ id }) => enabledEffects.includes(effectOf(id)))
        .map(({ id }) => id)

      expect(Object.keys(values).sort()).toEqual(controlsOfEnabledEffects.sort())
      expect(switches.map(({ id }) => values[id])).toEqual(switches.map(() => 1))
    }
  })

  it('bypasses the effects a preset does not use and keeps their settings', () => {
    const settings = new Uint8Array(FM1_EFFECT_PARAMETER_COUNT).fill(1)
    const chorusDepth = getEffectParameterDefinition('effect.chorus.depth').controller

    const next = applyEffectPreset(settings, 'smallRoom')

    const switchedOn = fm1EffectParameters
      .filter(({ controller, kind }) => kind === 'switch' && next[controller] === 1)
      .map(({ id }) => id)
    expect(switchedOn).toEqual(['effect.reverb.enabled'])
    expect(next[chorusDepth]).toBe(1)
    expect(settings.every((value) => value === 1)).toBe(true)
  })

  it('gives the same result whatever the effects were set to before', () => {
    const fromDefaults = applyEffectPreset(new Uint8Array(FM1_EFFECT_PARAMETER_COUNT), 'echo')
    const fromOther = applyEffectPreset(applyEffectPreset(fromDefaults, 'largeHall'), 'echo')

    const audible = (settings: Uint8Array) =>
      fm1EffectParameters
        .filter(({ id }) => effectOf(id) === 'delay')
        .map(({ controller }) => settings[controller])
    expect(audible(fromOther)).toEqual(audible(fromDefaults))
    expect(fromOther[getEffectParameterDefinition('effect.reverb.enabled').controller]).toBe(0)
  })

  it('switches every effect off for Dry', () => {
    const settings = new Uint8Array(FM1_EFFECT_PARAMETER_COUNT).fill(1)

    const next = applyEffectPreset(settings, 'dry')

    const switches = fm1EffectParameters.filter(({ kind }) => kind === 'switch')
    expect(switches.map(({ controller }) => next[controller])).toEqual([0, 0, 0, 0, 0, 0])
  })
})
