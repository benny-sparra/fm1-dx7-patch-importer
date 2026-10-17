import { describe, expect, it } from 'vitest'

import { initializeEightBit } from '@/lib/eight-bit-presets'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import {
  FM1_VA_KNOB_CHOICES_START,
  FM1_VOICE_NAME_LENGTH,
  FM1_VOICE_NAME_START,
  fm1EffectParameters,
} from '@/lib/fm1-parameters'
import {
  eightBitParameterCount,
  eightBitRow,
  makeEightBitEditorParameters,
  type EightBitRowId,
} from '@/lib/fm1-va-eight-bit-editor'
import { capturedEightBitRecord, capturedEightBitVoice } from '@/test/fm1-va-eight-bit'

const nesRock = () =>
  makeEightBitEditorParameters(
    capturedEightBitVoice(),
    capturedEightBitRecord(),
    makeDefaultFm1Effects(),
  )

describe('initializeEightBit', () => {
  it('starts from the FM1’s own blank 8-Bit preset, as its manual describes it', () => {
    const blank = initializeEightBit(nesRock())
    const value = (id: EightBitRowId) => blank[eightBitRow(id).index]

    // A mono triangle bass, a lead on a 25 % pulse, Tone Smooth, Tuning Exact, and Drum Decay 50.
    expect(value('bassWave')).toBe(4)
    expect(value('bassMono')).toBe(1)
    expect(value('leadWave')).toBe(1)
    expect(value('tone')).toBe(1)
    expect(value('tuning')).toBe(0)
    expect(value('drumDecay')).toBe(50)
    // No Key, every User Arpeggio step at End, the Envelope off, and the LFO on Triangle at 35.
    expect(value('key')).toBe(0)
    expect(value('bassUserArpeggio1')).toBe(31)
    expect(value('envelope')).toBe(0)
    expect(value('lfoWave')).toBe(0)
    expect(value('lfoSpeed')).toBe(35)
  })

  it('keeps the name and knob choices, and switches every effect off', () => {
    const present = nesRock()
    for (const { editorIndex, kind } of fm1EffectParameters) {
      if (kind === 'switch') present[editorIndex] = 1
    }
    const blank = initializeEightBit(present)

    const nameEnd = FM1_VOICE_NAME_START + FM1_VOICE_NAME_LENGTH
    expect(blank.slice(FM1_VOICE_NAME_START, nameEnd)).toEqual(
      present.slice(FM1_VOICE_NAME_START, nameEnd),
    )
    expect(blank.slice(FM1_VA_KNOB_CHOICES_START, FM1_VA_KNOB_CHOICES_START + 4)).toEqual(
      present.slice(FM1_VA_KNOB_CHOICES_START, FM1_VA_KNOB_CHOICES_START + 4),
    )
    expect(
      fm1EffectParameters
        .filter(({ kind }) => kind === 'switch')
        .map(({ editorIndex }) => blank[editorIndex]),
    ).toEqual(fm1EffectParameters.filter(({ kind }) => kind === 'switch').map(() => 0))
  })

  it('refuses parameters of another editor', () => {
    expect(() => initializeEightBit(new Uint8Array(eightBitParameterCount - 1))).toThrow(RangeError)
  })
})
