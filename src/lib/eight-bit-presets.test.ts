import { describe, expect, it } from 'vitest'

import {
  applyEightBitStarter,
  eightBitDrumPresets,
  eightBitDrumPresetValues,
  eightBitPartPresets,
  eightBitPartPresetValues,
  eightBitStarters,
  initializeEightBit,
} from '@/lib/eight-bit-presets'
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

describe('8-Bit drum presets', () => {
  it('takes one of each of the FM1 blank kit’s twelve drums', () => {
    expect(new Set(eightBitDrumPresets.map(({ id }) => id)).size).toBe(12)
    expect(eightBitDrumPresets.map(({ key }) => key).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 12 }, (_, key) => key),
    )
  })

  it('gives a drum its preset’s sound from the kit, in range, leaving its Level', () => {
    const blank = initializeEightBit(nesRock())
    for (const { id, key } of eightBitDrumPresets) {
      const values = new Map(eightBitDrumPresetValues(7, id))
      expect(values.has('drum7Level')).toBe(false)
      for (const field of ['Wave', 'Pitch', 'Sweep', 'Decay', 'Snap', 'Choke'] as const) {
        const value = values.get(`drum7${field}`)
        expect({ id, field, value }).toEqual({
          id,
          field,
          value: blank[eightBitRow(`drum${key as 0}${field}`).index],
        })
        expect(value).toBeLessThanOrEqual(eightBitRow(`drum7${field}`).max)
      }
    }
  })

  it('puts the hats in choke group A, as the FM1’s own kit does', () => {
    const choke = (id: Parameters<typeof eightBitDrumPresetValues>[1]) =>
      new Map(eightBitDrumPresetValues(0, id)).get('drum0Choke')
    expect(['closedHat', 'openHat', 'metalHat'].map((id) => choke(id as 'kick'))).toEqual([1, 1, 1])
    expect(choke('kick')).toBe(0)
  })
})

describe('8-Bit part presets', () => {
  const played = ['Arpeggio', 'NoteEngine', 'Octave', 'Level', 'Mono', 'ArpSpeed']

  it('sets each part’s sound in range, and leaves how it is played alone', () => {
    expect(new Set(eightBitPartPresets.map(({ id }) => id)).size).toBe(eightBitPartPresets.length)
    for (const part of ['bass', 'lead'] as const) {
      for (const { id } of eightBitPartPresets) {
        for (const [row, value] of eightBitPartPresetValues(part, id)) {
          expect(row.startsWith(part)).toBe(true)
          expect(played.some((field) => row === `${part}${field}`)).toBe(false)
          expect({ id, row, ok: value >= 0 && value <= eightBitRow(row).max }).toEqual({
            id,
            row,
            ok: true,
          })
        }
      }
    }
  })

  it('starts with the FM1’s own blank bass and lead', () => {
    const blank = initializeEightBit(nesRock())
    for (const [part, id] of [
      ['bass', 'triangle'],
      ['lead', 'pulse'],
    ] as const) {
      for (const [row, value] of eightBitPartPresetValues(part, id)) {
        expect({ row, value }).toEqual({ row, value: blank[eightBitRow(row).index] })
      }
    }
  })
})

describe('applyEightBitStarter', () => {
  it('sets the kit, both parts, and Tone, keeping the Key, levels, name, and effects', () => {
    const present = nesRock()
    for (const { id } of eightBitStarters) {
      const next = applyEightBitStarter(present, id)
      const blank = initializeEightBit(present)
      for (const row of [
        'key',
        'scale',
        'bassLevel',
        'leadLevel',
        'drumsLevel',
        'drum0Level',
      ] as const) {
        expect({ id, row, value: next[eightBitRow(row).index] }).toEqual({
          id,
          row,
          value: present[eightBitRow(row).index],
        })
      }
      expect(next[eightBitRow('drum1Wave').index]).toBe(blank[eightBitRow('drum1Wave').index])
      expect(next.slice(0, FM1_VOICE_NAME_START + FM1_VOICE_NAME_LENGTH)).toEqual(
        present.slice(0, FM1_VOICE_NAME_START + FM1_VOICE_NAME_LENGTH),
      )
      expect(fm1EffectParameters.map(({ editorIndex }) => next[editorIndex])).toEqual(
        fm1EffectParameters.map(({ editorIndex }) => present[editorIndex]),
      )
    }
  })

  it('gives every starter its own id', () => {
    expect(new Set(eightBitStarters.map(({ id }) => id)).size).toBe(eightBitStarters.length)
  })
})
