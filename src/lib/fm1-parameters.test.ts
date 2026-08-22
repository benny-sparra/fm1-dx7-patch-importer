import { describe, expect, it } from 'vitest'

import { packDx7Voice, unpackDx7Voice } from '@/lib/dx7'
import {
  clampFm1ParameterValue,
  displayToStoredValue,
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_EFFECT_PARAMETER_COUNT,
  FM1_EFFECT_PARAMETER_START,
  FM1_GLOBAL_PARAMETER_START,
  FM1_OPERATOR_COUNT,
  FM1_OPERATOR_PARAMETER_COUNT,
  FM1_VOICE_NAME_LENGTH,
  FM1_VOICE_NAME_START,
  FM1_VOICE_PARAMETER_COUNT,
  fm1EffectParameters,
  fm1GlobalParameters,
  fm1OperatorParameters,
  fm1VoiceNameParameter,
  getFm1ParameterDefinition,
  resolveEffectController,
  resolveEffectEditorIndex,
  resolveOperatorParameterIndex,
  isValidFm1ParameterValue,
  storedToDisplayValue,
} from '@/lib/fm1-parameters'

describe('FM1 parameter schema', () => {
  it('describes the complete, non-overlapping editor buffer', () => {
    expect(FM1_OPERATOR_COUNT).toBe(6)
    expect(FM1_OPERATOR_PARAMETER_COUNT).toBe(21)
    expect(fm1OperatorParameters).toHaveLength(21)
    expect(fm1OperatorParameters.map(({ offset }) => offset)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ])
    expect(FM1_GLOBAL_PARAMETER_START).toBe(126)
    expect(fm1GlobalParameters.map(({ voiceIndex }) => voiceIndex)).toEqual([
      126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144,
    ])
    expect(FM1_VOICE_NAME_START).toBe(145)
    expect(FM1_VOICE_NAME_LENGTH).toBe(10)
    expect(fm1VoiceNameParameter).toEqual({
      id: 'voice.name',
      length: 10,
      scope: 'voice-name',
      start: 145,
    })
    expect(FM1_VOICE_PARAMETER_COUNT).toBe(155)
    expect(FM1_EFFECT_PARAMETER_START).toBe(155)
    expect(FM1_EFFECT_PARAMETER_COUNT).toBe(24)
    expect(FM1_EDITOR_PARAMETER_COUNT).toBe(179)
    expect(fm1EffectParameters.map(({ editorIndex }) => editorIndex)).toEqual([
      155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173,
      174, 175, 176, 177, 178,
    ])
  })

  it('keeps UI operator 1 in the final block and operator 6 in the first block', () => {
    expect(resolveOperatorParameterIndex(1, 'operator.envelope.rate1')).toBe(105)
    expect(resolveOperatorParameterIndex(1, 'operator.outputLevel')).toBe(121)
    expect(resolveOperatorParameterIndex(6, 'operator.envelope.rate1')).toBe(0)
    expect(resolveOperatorParameterIndex(6, 'operator.outputLevel')).toBe(16)
  })

  it('assigns every editor index exactly once', () => {
    const operatorIndexes = [1, 2, 3, 4, 5, 6].flatMap((operator) =>
      fm1OperatorParameters.map(({ id }) => resolveOperatorParameterIndex(operator, id)),
    )
    const nameIndexes = [145, 146, 147, 148, 149, 150, 151, 152, 153, 154]
    const indexes = [
      ...operatorIndexes,
      ...fm1GlobalParameters.map(({ voiceIndex }) => voiceIndex),
      ...nameIndexes,
      ...fm1EffectParameters.map(({ editorIndex }) => editorIndex),
    ]
    expect(new Set(indexes).size).toBe(179)
    expect(indexes.toSorted((left, right) => left - right)).toEqual(
      Array.from({ length: 179 }, (_, index) => index),
    )
  })

  it('round-trips effect controller and editor indexes', () => {
    expect(resolveEffectEditorIndex(0)).toBe(155)
    expect(resolveEffectEditorIndex(23)).toBe(178)
    expect(resolveEffectController(155)).toBe(0)
    expect(resolveEffectController(178)).toBe(23)
    expect(() => resolveEffectEditorIndex(24)).toThrow(RangeError)
    expect(() => resolveEffectController(154)).toThrow(RangeError)
  })

  it('validates and clamps stored values using the declared domain', () => {
    const feedback = getFm1ParameterDefinition('global.feedback')
    if (feedback.scope === 'voice-name') throw new Error('Expected a numeric parameter')
    expect(isValidFm1ParameterValue(feedback, 7)).toBe(true)
    expect(isValidFm1ParameterValue(feedback, 8)).toBe(false)
    expect(isValidFm1ParameterValue(feedback, 3.5)).toBe(false)
    expect(clampFm1ParameterValue(feedback, -2)).toBe(0)
    expect(clampFm1ParameterValue(feedback, 8.4)).toBe(7)
  })

  it('keeps every numeric domain MIDI-safe and every option domain complete', () => {
    const definitions = [...fm1OperatorParameters, ...fm1GlobalParameters, ...fm1EffectParameters]
    expect(definitions.every(({ min, max }) => min >= 0 && max <= 127)).toBe(true)
    expect(
      definitions
        .filter((definition) => 'optionIds' in definition && definition.optionIds !== undefined)
        .every(
          (definition) =>
            'optionIds' in definition &&
            definition.optionIds?.length === definition.max - definition.min + 1,
        ),
    ).toBe(true)
  })

  it.each([
    ['global.transpose' as const, 0, -24],
    ['global.transpose' as const, 24, 0],
    ['global.transpose' as const, 48, 24],
    ['operator.detune' as const, 0, -7],
    ['operator.detune' as const, 7, 0],
    ['operator.detune' as const, 14, 7],
  ])('round-trips %s stored value %i through display value %i', (id, stored, displayed) => {
    const definition = getFm1ParameterDefinition(id)
    expect(definition.scope).not.toBe('voice-name')
    if (definition.scope === 'voice-name') throw new Error('Expected a numeric parameter')
    expect(storedToDisplayValue(definition, stored)).toBe(displayed)
    expect(displayToStoredValue(definition, displayed)).toBe(stored)
  })

  it('preserves the existing packed voice round trip', () => {
    const unpacked = new Uint8Array(FM1_VOICE_PARAMETER_COUNT)
    unpacked.set(new TextEncoder().encode('ROUND TRIP'), FM1_VOICE_NAME_START)
    const packed = packDx7Voice(unpacked)
    expect(packDx7Voice(unpackDx7Voice(packed)).data).toEqual(packed.data)
  })
})
