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
  fm1VoiceParameterMaximums,
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

  it.each([
    [6, 0, 20],
    [5, 21, 41],
    [4, 42, 62],
    [3, 63, 83],
    [2, 84, 104],
    [1, 105, 125],
  ])('maps operator %i to edit-buffer addresses %i through %i', (operator, first, last) => {
    expect(resolveOperatorParameterIndex(operator, 'operator.envelope.rate1')).toBe(first)
    expect(resolveOperatorParameterIndex(operator, 'operator.detune')).toBe(last)
  })

  it('matches the documented operator parameter offsets and ranges', () => {
    expect(fm1OperatorParameters.map(({ id, max, offset }) => [id, offset, max])).toEqual([
      ['operator.envelope.rate1', 0, 99],
      ['operator.envelope.rate2', 1, 99],
      ['operator.envelope.rate3', 2, 99],
      ['operator.envelope.rate4', 3, 99],
      ['operator.envelope.level1', 4, 99],
      ['operator.envelope.level2', 5, 99],
      ['operator.envelope.level3', 6, 99],
      ['operator.envelope.level4', 7, 99],
      ['operator.keyboard.breakpoint', 8, 99],
      ['operator.keyboard.leftDepth', 9, 99],
      ['operator.keyboard.rightDepth', 10, 99],
      ['operator.keyboard.leftCurve', 11, 3],
      ['operator.keyboard.rightCurve', 12, 3],
      ['operator.keyboard.rateScaling', 13, 7],
      ['operator.ampModSensitivity', 14, 3],
      ['operator.velocitySensitivity', 15, 7],
      ['operator.outputLevel', 16, 99],
      ['operator.oscillatorMode', 17, 1],
      ['operator.frequency.coarse', 18, 31],
      ['operator.frequency.fine', 19, 99],
      ['operator.detune', 20, 14],
    ])
  })

  it('matches the documented global parameter addresses and ranges', () => {
    expect(fm1GlobalParameters.map(({ id, max, voiceIndex }) => [id, voiceIndex, max])).toEqual([
      ['global.pitchEnvelope.rate1', 126, 99],
      ['global.pitchEnvelope.rate2', 127, 99],
      ['global.pitchEnvelope.rate3', 128, 99],
      ['global.pitchEnvelope.rate4', 129, 99],
      ['global.pitchEnvelope.level1', 130, 99],
      ['global.pitchEnvelope.level2', 131, 99],
      ['global.pitchEnvelope.level3', 132, 99],
      ['global.pitchEnvelope.level4', 133, 99],
      ['global.algorithm', 134, 31],
      ['global.feedback', 135, 7],
      ['global.oscillatorSync', 136, 1],
      ['global.lfoSpeed', 137, 99],
      ['global.lfoDelay', 138, 99],
      ['global.lfoPitchModDepth', 139, 99],
      ['global.lfoAmpModDepth', 140, 99],
      ['global.lfoKeySync', 141, 1],
      ['global.lfoWave', 142, 5],
      ['global.pitchModSensitivity', 143, 7],
      ['global.transpose', 144, 48],
    ])
  })

  it('provides a legal value maximum for every address in the 155-byte edit buffer', () => {
    const operatorMaximums = [
      99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 3, 3, 7, 3, 7, 99, 1, 31, 99, 14,
    ]
    const globalMaximums = [99, 99, 99, 99, 99, 99, 99, 99, 31, 7, 1, 99, 99, 99, 99, 1, 5, 7, 48]

    expect(Array.from(fm1VoiceParameterMaximums)).toEqual([
      ...operatorMaximums,
      ...operatorMaximums,
      ...operatorMaximums,
      ...operatorMaximums,
      ...operatorMaximums,
      ...operatorMaximums,
      ...globalMaximums,
      127,
      127,
      127,
      127,
      127,
      127,
      127,
      127,
      127,
      127,
    ])
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
