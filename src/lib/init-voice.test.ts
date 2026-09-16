import { describe, expect, it } from 'vitest'

import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_EFFECT_PARAMETER_START,
  FM1_VOICE_NAME_START,
  FM1_VOICE_PARAMETER_COUNT,
  fm1EffectParameters,
} from '@/lib/fm1-parameters'
import { initializeVoice } from '@/lib/init-voice'

// Yamaha's DX7 INIT VOICE as single-voice (VCED) bytes 0–144, operator 6 first.
// prettier-ignore
const operator = (outputLevel: number) => [
  99, 99, 99, 99, 99, 99, 99, 0, // envelope rates and levels
  39, 0, 0, 0, 0, 0, 0, 0, // keyboard scaling and sensitivities
  outputLevel, 0, 1, 0, 7, // output level, ratio mode, coarse 1, fine 0, no detune
]
// prettier-ignore
const DX7_INIT_VOICE = [
  ...operator(0), ...operator(0), ...operator(0), ...operator(0), ...operator(0), ...operator(99),
  99, 99, 99, 99, 50, 50, 50, 50, // pitch envelope
  0, 0, 1, 35, 0, 0, 0, 1, 0, 3, 24, // algorithm 1 to transpose C3
]

function makeParameters() {
  const parameters = new Uint8Array(FM1_EDITOR_PARAMETER_COUNT).fill(5)
  parameters.set(new TextEncoder().encode('PATCH NAME'), FM1_VOICE_NAME_START)
  parameters.set(
    Array.from({ length: 24 }, (_, index) => index + 1),
    FM1_EFFECT_PARAMETER_START,
  )
  return parameters
}

describe('voice initialisation', () => {
  it('writes the DX7 INIT VOICE', () => {
    expect(Array.from(initializeVoice(makeParameters()).slice(0, FM1_VOICE_NAME_START))).toEqual(
      DX7_INIT_VOICE,
    )
  })

  it('preserves the patch name', () => {
    expect(
      Array.from(
        initializeVoice(makeParameters()).slice(FM1_VOICE_NAME_START, FM1_VOICE_PARAMETER_COUNT),
      ),
    ).toEqual(Array.from(makeParameters().slice(FM1_VOICE_NAME_START, FM1_VOICE_PARAMETER_COUNT)))
  })

  it('switches every FM1 effect off', () => {
    const initialised = initializeVoice(makeParameters())
    const switches = fm1EffectParameters.filter(({ kind }) => kind === 'switch')

    expect(switches.map(({ editorIndex }) => initialised[editorIndex])).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('keeps every FM1 effect setting other than its switch', () => {
    const parameters = makeParameters()
    const initialised = initializeVoice(parameters)
    const settings = fm1EffectParameters.filter(({ kind }) => kind !== 'switch')

    expect(settings.map(({ editorIndex }) => initialised[editorIndex])).toEqual(
      settings.map(({ editorIndex }) => parameters[editorIndex]),
    )
  })

  it('does not modify the input parameters', () => {
    const parameters = makeParameters()
    initializeVoice(parameters)

    expect(Array.from(parameters)).toEqual(Array.from(makeParameters()))
  })

  it('rejects parameters that are not a complete FM1 editor voice', () => {
    expect(() => initializeVoice(new Uint8Array(FM1_EDITOR_PARAMETER_COUNT - 1))).toThrow(
      RangeError,
    )
  })
})
