import { describe, expect, it } from 'vitest'

import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import {
  FM1_EFFECT_PARAMETER_START,
  FM1_VA_DISTORTION_TYPE_INDEX,
  FM1_VOICE_NAME_LENGTH,
  FM1_VOICE_NAME_START,
  fm1EffectParameters,
} from '@/lib/fm1-parameters'
import {
  makeVirtualAnalogEditorParameters,
  virtualAnalogFromEditorParameters,
  virtualAnalogParameterCount,
  virtualAnalogRow,
  virtualAnalogRows,
} from '@/lib/fm1-va-virtual-analog-editor'
import {
  applyVirtualAnalogPreset,
  initializeVirtualAnalog,
  randomizeVirtualAnalog,
  virtualAnalogPresets,
} from '@/lib/virtual-analog-presets'
import {
  capturedVirtualAnalogRecord,
  capturedVirtualAnalogVoice,
} from '@/test/fm1-va-virtual-analog'

/** Preset 097 with every effect switched on and a set Distortion type, Bitcrush, and order. */
function capturedParameters() {
  const parameters = makeVirtualAnalogEditorParameters(
    capturedVirtualAnalogVoice(),
    capturedVirtualAnalogRecord(),
    makeDefaultFm1Effects(),
  )
  for (const { editorIndex, kind } of fm1EffectParameters) {
    parameters[editorIndex] = kind === 'switch' ? 1 : 7
  }
  parameters.fill(3, FM1_VA_DISTORTION_TYPE_INDEX, virtualAnalogRows[0].index)
  return parameters
}

const level = virtualAnalogRow('level').index
const name = (parameters: Uint8Array) =>
  Array.from(
    parameters.subarray(FM1_VOICE_NAME_START, FM1_VOICE_NAME_START + FM1_VOICE_NAME_LENGTH),
  )
const keptAfterEffects = (parameters: Uint8Array) =>
  Array.from(parameters.subarray(FM1_VA_DISTORTION_TYPE_INDEX, virtualAnalogRows[0].index))

/** A repeatable stand-in for Math.random. */
function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

describe('Virtual Analog presets', () => {
  it('gives each preset its own id', () => {
    const ids = virtualAnalogPresets.map(({ id }) => id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('sets every row but Level the same way whatever the patch held before', () => {
    const from = capturedParameters()
    const other = from.slice()
    for (const row of virtualAnalogRows) other[row.index] = row.max - from[row.index]
    for (const { id } of [...virtualAnalogPresets, { id: 'init' as const }]) {
      const apply = (parameters: Uint8Array) =>
        id === 'init'
          ? initializeVirtualAnalog(parameters)
          : applyVirtualAnalogPreset(parameters, id)
      const rows = (parameters: Uint8Array) =>
        virtualAnalogRows
          .filter((row) => row.id !== 'level')
          .map((row) => [id, row.id, parameters[row.index]])
      expect(rows(apply(other))).toEqual(rows(apply(from)))
    }
  })

  it('keeps every row within what the FM1 shows', () => {
    for (const { id } of virtualAnalogPresets) {
      const applied = applyVirtualAnalogPreset(capturedParameters(), id)
      expect(virtualAnalogRows.filter((row) => applied[row.index] > row.max)).toEqual([])
    }
  })

  it('switches the Envelope on, since its switch off plays an envelope the editor leaves alone', () => {
    const envelope = virtualAnalogRow('envelope').index
    expect(initializeVirtualAnalog(capturedParameters())[envelope]).toBe(1)
    for (const { id } of virtualAnalogPresets) {
      expect(applyVirtualAnalogPreset(capturedParameters(), id)[envelope]).toBe(1)
    }
  })

  it('keeps the name and Level', () => {
    const from = capturedParameters()
    for (const { id } of virtualAnalogPresets) {
      const applied = applyVirtualAnalogPreset(from, id)
      expect(name(applied)).toEqual(name(from))
      expect(applied[level]).toBe(from[level])
    }
    expect(name(initializeVirtualAnalog(from))).toEqual(name(from))
    expect(initializeVirtualAnalog(from)[level]).toBe(from[level])
  })

  it('replaces the effect chain but keeps the Distortion type, Bitcrush, and effect order', () => {
    const from = capturedParameters()
    const applied = applyVirtualAnalogPreset(from, 'mono-bass')
    expect(
      Array.from(applied.subarray(FM1_EFFECT_PARAMETER_START, FM1_VA_DISTORTION_TYPE_INDEX)),
    ).toEqual(
      Array.from({ length: FM1_VA_DISTORTION_TYPE_INDEX - FM1_EFFECT_PARAMETER_START }, () => 0),
    )
    expect(keptAfterEffects(applied)).toEqual(keptAfterEffects(from))
  })

  it('switches the effects off for Init patch, keeping their settings', () => {
    const from = capturedParameters()
    const initialized = initializeVirtualAnalog(from)
    for (const { editorIndex, kind } of fm1EffectParameters) {
      expect(initialized[editorIndex]).toBe(kind === 'switch' ? 0 : from[editorIndex])
    }
    expect(keptAfterEffects(initialized)).toEqual(keptAfterEffects(from))
  })

  it('starts Init patch from a saw through an open filter', () => {
    const initialized = initializeVirtualAnalog(capturedParameters())
    expect(initialized[virtualAnalogRow('waveform').index]).toBe(1)
    expect(initialized[virtualAnalogRow('cutoff').index]).toBe(100)
    expect(initialized[virtualAnalogRow('sustain').index]).toBe(100)
  })

  it('randomises within each row’s range and keeps the name, Level, and effects', () => {
    const from = capturedParameters()
    for (let seed = 1; seed <= 50; seed += 1) {
      const random = randomizeVirtualAnalog(from, seededRandom(seed))
      expect(virtualAnalogRows.filter((row) => random[row.index] > row.max)).toEqual([])
      expect(random[virtualAnalogRow('envelope').index]).toBe(1)
      expect(random[virtualAnalogRow('sustain').index]).toBeGreaterThanOrEqual(30)
      expect(name(random)).toEqual(name(from))
      expect(random[level]).toBe(from[level])
      expect(
        Array.from(random.subarray(FM1_EFFECT_PARAMETER_START, virtualAnalogRows[0].index)),
      ).toEqual(Array.from(from.subarray(FM1_EFFECT_PARAMETER_START, virtualAnalogRows[0].index)))
    }
  })

  it('gives the same random sound for the same random numbers', () => {
    const from = capturedParameters()
    expect(randomizeVirtualAnalog(from, seededRandom(7))).toEqual(
      randomizeVirtualAnalog(from, seededRandom(7)),
    )
  })

  it('leaves the bytes of the operators the editor does not show as read once saved', () => {
    const voice = capturedVirtualAnalogVoice()
    const record = capturedVirtualAnalogRecord()
    const parameters = makeVirtualAnalogEditorParameters(voice, record, makeDefaultFm1Effects())
    const saved = virtualAnalogFromEditorParameters(
      voice,
      record,
      applyVirtualAnalogPreset(parameters, 'warm-pad'),
    )
    // Operators 5 to 1 follow operator 6's 17 bytes and hold nothing the editor sets.
    expect(Array.from(saved.voice.subarray(17, 102))).toEqual(Array.from(voice.subarray(17, 102)))
  })

  it('refuses parameters of another length', () => {
    const wrong = new Uint8Array(virtualAnalogParameterCount - 1)
    expect(() => initializeVirtualAnalog(wrong)).toThrow(RangeError)
    expect(() => applyVirtualAnalogPreset(wrong, 'super-saw')).toThrow(RangeError)
    expect(() => randomizeVirtualAnalog(wrong)).toThrow(RangeError)
  })
})
