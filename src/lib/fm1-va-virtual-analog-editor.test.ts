import { describe, expect, it } from 'vitest'

import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_VA_BITCRUSH_START,
  FM1_VA_DISTORTION_TYPE_INDEX,
  FM1_VA_EFFECT_ORDER_START,
  FM1_VA_KNOB_CHOICES_START,
  FM1_VA_STOCK_EFFECT_ORDER,
  FM1_VOICE_NAME_START,
  FM1_EFFECT_PARAMETER_START,
} from '@/lib/fm1-parameters'
import {
  makeVirtualAnalogEditorParameters,
  virtualAnalogControlValue,
  virtualAnalogCutoffHertz,
  virtualAnalogFromEditorParameters,
  virtualAnalogParameterCount,
  virtualAnalogRow,
  virtualAnalogRows,
  type VirtualAnalogRowId,
} from '@/lib/fm1-va-virtual-analog-editor'
import {
  capturedVirtualAnalogRecord,
  capturedVirtualAnalogVoice,
} from '@/test/fm1-va-virtual-analog'

/** A record as Erase Preset to VA leaves it (docs/fm1-research.md, "A new Virtual Analog preset"). */
function newVirtualAnalogRecord() {
  const record = new Uint8Array(59).fill(0x03)
  record[18] = 0x5a
  record.set([0x02, 0x00, 0x32, 0x00, 0xe4, 0x80, 0x80, 0x80], 19)
  for (const byte of [45, 46, 47, 48, 49, 50, 51]) record[byte] = 0x80
  record.set([0, 0, 0, 0, 0, 0], 53)
  return record
}

const read = (id: VirtualAnalogRowId, voice: Uint8Array, record: Uint8Array) =>
  virtualAnalogRow(id).read(voice, record)

/** Saves `changes` over the preset, as the editor would, and returns the bytes it would store. */
function save(
  voice: Uint8Array,
  record: Uint8Array,
  changes: Partial<Record<VirtualAnalogRowId, number>>,
) {
  const parameters = makeVirtualAnalogEditorParameters(voice, record, makeDefaultFm1Effects())
  for (const [id, value] of Object.entries(changes)) {
    parameters[virtualAnalogRow(id as VirtualAnalogRowId).index] = value
  }
  return virtualAnalogFromEditorParameters(voice, record, parameters)
}

describe('Virtual Analog rows', () => {
  it('gives every row its own parameter, clear of the effects, knob choices, and name', () => {
    const indexes = virtualAnalogRows.map((row) => row.index)
    expect(new Set(indexes).size).toBe(indexes.length)
    for (const index of indexes) {
      expect(index).toBeLessThan(virtualAnalogParameterCount)
      expect(index < FM1_VOICE_NAME_START || index >= FM1_EDITOR_PARAMETER_COUNT).toBe(true)
    }
  })

  it('sends only controllers FM-1+VA reads as sound settings, each once', () => {
    const controllers = virtualAnalogRows.flatMap((row) => row.controller ?? [])
    expect(new Set(controllers).size).toBe(controllers.length)
    for (const controller of controllers) {
      expect([...range(24, 31), ...range(52, 57), ...range(70, 78)]).toContain(controller)
    }
  })

  it('reads a new Virtual Analog preset as the FM1 shows it', () => {
    const record = newVirtualAnalogRecord()
    const voice = capturedVirtualAnalogVoice()
    expect(read('waveform', voice, record)).toBe(1)
    expect(read('super', voice, record)).toBe(0)
    expect(read('detune', voice, record)).toBe(50)
    expect(read('cutoff', voice, record)).toBe(100)
    expect(read('filterType', voice, record)).toBe(0)
    expect(read('keyTracking', voice, record)).toBe(0)
    expect(read('envelope', voice, record)).toBe(0)
    expect(read('mono', voice, record)).toBe(0)
  })

  it('reads unset record bytes as their defaults', () => {
    const record = new Uint8Array(59).fill(0x03)
    const voice = capturedVirtualAnalogVoice()
    expect(read('cutoff', voice, record)).toBe(100)
    expect(read('sub', voice, record)).toBe(0)
    expect(read('filterType', voice, record)).toBe(0)
    expect(read('waveform', voice, record)).toBe(2)
  })

  it('reads the FM Filter cutoff the FM1 showed as 5 kHz as step 80', () => {
    const record = new Uint8Array(59)
    record[23] = 0xd0
    expect(read('cutoff', capturedVirtualAnalogVoice(), record)).toBe(80)
  })

  it('stores the bytes the FM1 stored for each mapped row (FM-1_093, 2026-10-04)', () => {
    const voice = capturedVirtualAnalogVoice()
    let record = newVirtualAnalogRecord()
    const steps: [Partial<Record<VirtualAnalogRowId, number>>, number, number][] = [
      [{ filterType: 1 }, 26, 0x81],
      [{ keyTracking: 1 }, 26, 0x85],
      [{ waveform: 3 }, 19, 0x04],
      [{ waveform: 0 }, 19, 0x01],
      [{ waveform: 2 }, 19, 0x03],
      [{ filterType: 3 }, 26, 0x87],
      [{ keyTracking: 3 }, 26, 0x8f],
      [{ super: 50 }, 20, 0x32],
      [{ super: 100 }, 20, 0x64],
      [{ detune: 100 }, 21, 0x64],
    ]
    for (const [change, byte, stored] of steps) {
      const saved = save(voice, record, change)
      const changed = [...saved.record.keys()].filter(
        (index) => saved.record[index] !== record[index],
      )
      expect(changed).toEqual([byte])
      expect(saved.record[byte]).toBe(stored)
      record = saved.record
    }
  })

  it('marks the filter and oscillator settings it sets', () => {
    const record = newVirtualAnalogRecord()
    const saved = save(capturedVirtualAnalogVoice(), record, {
      cutoff: 0,
      filterDecay: 100,
      lfoToCutoff: 30,
      sub: 100,
    })
    expect(saved.record[23]).toBe(0x80)
    expect(saved.record[51]).toBe(0xe4)
    expect(saved.record[50]).toBe(0x80 | 30)
    expect(saved.record[45]).toBe(0xe4)
  })

  it('switches the Envelope with bit 6 of byte 53, keeping the knob choices', () => {
    const record = newVirtualAnalogRecord()
    record[53] = 0x89
    const on = save(capturedVirtualAnalogVoice(), record, { envelope: 1, attack: 25 })
    expect(on.record[53]).toBe(0xc9)
    expect(on.record[54]).toBe(25)
    const off = save(capturedVirtualAnalogVoice(), on.record, { envelope: 0 })
    expect(off.record[53]).toBe(0x89)
  })

  it('stores Level, Velocity to Level, and the LFO in the packed voice bits they share', () => {
    const voice = capturedVirtualAnalogVoice()
    const record = newVirtualAnalogRecord()
    const saved = save(voice, record, {
      level: 50,
      lfoSync: 1,
      lfoWave: 4,
      pitchModSensitivity: 7,
      velocityToLevel: 7,
    })
    expect(saved.voice[14]).toBe(50)
    expect(saved.voice[13]).toBe((voice[13] & 0x63) | 0x1c)
    expect(saved.voice[116] & 0x01).toBe(1)
    expect((saved.voice[116] >> 1) & 7).toBe(4)
    expect((saved.voice[116] >> 4) & 7).toBe(7)
    expect(saved.record).toEqual(record)
  })

  it('changes nothing it was not asked to, beyond values a DX7 voice would not allow', () => {
    const voice = capturedVirtualAnalogVoice()
    voice[112] = 127
    const record = capturedVirtualAnalogRecord()
    const saved = save(voice, record, {})
    expect(saved.voice).toEqual(voice)
    expect(saved.record).toEqual(record)
  })

  it('reads the name, effects, Distortion type, Bitcrush, and effect order', () => {
    const effects = makeDefaultFm1Effects()
    effects[2] = 40
    const record = newVirtualAnalogRecord()
    record[38] = 2
    const parameters = makeVirtualAnalogEditorParameters(
      capturedVirtualAnalogVoice(),
      record,
      effects,
    )
    expect(
      String.fromCharCode(...parameters.slice(FM1_VOICE_NAME_START, FM1_VOICE_NAME_START + 10)),
    ).toBe('VOICE 97  ')
    expect(parameters[FM1_EFFECT_PARAMETER_START + 2]).toBe(40)
    expect(parameters[FM1_VA_DISTORTION_TYPE_INDEX]).toBe(2)
    expect(
      Array.from(parameters.subarray(FM1_VA_BITCRUSH_START, FM1_VA_BITCRUSH_START + 4)),
    ).toEqual([0, 8, 72, 100])
    expect(
      Array.from(parameters.subarray(FM1_VA_EFFECT_ORDER_START, FM1_VA_EFFECT_ORDER_START + 7)),
    ).toEqual(FM1_VA_STOCK_EFFECT_ORDER)
  })

  it('reads the knob choices as a Virtual Analog preset plays them, past the Envelope switch', () => {
    const record = newVirtualAnalogRecord()
    record[53] = 0xe0
    const parameters = makeVirtualAnalogEditorParameters(
      capturedVirtualAnalogVoice(),
      record,
      makeDefaultFm1Effects(),
    )
    expect(
      Array.from(parameters.subarray(FM1_VA_KNOB_CHOICES_START, FM1_EDITOR_PARAMETER_COUNT)),
    ).toEqual([0, 4, 2, 3])
    expect(parameters[virtualAnalogRow('envelope').index]).toBe(1)
  })

  it('writes a new name into the packed name bytes', () => {
    const voice = capturedVirtualAnalogVoice()
    const parameters = makeVirtualAnalogEditorParameters(
      voice,
      newVirtualAnalogRecord(),
      makeDefaultFm1Effects(),
    )
    parameters.set(new TextEncoder().encode('BASS 1    '), FM1_VOICE_NAME_START)
    const saved = virtualAnalogFromEditorParameters(voice, newVirtualAnalogRecord(), parameters)
    expect(String.fromCharCode(...saved.voice.slice(118))).toBe('BASS 1    ')
    expect(saved.voice.slice(0, 118)).toEqual(voice.slice(0, 118))
  })
})

describe('virtualAnalogControlValue', () => {
  it('sends the first value of a list choice’s band', () => {
    expect(virtualAnalogControlValue(virtualAnalogRow('waveform'), 0)).toBe(0)
    expect(virtualAnalogControlValue(virtualAnalogRow('waveform'), 3)).toBe(96)
  })

  it('sends the lowest value the FM1 rounds to the setting', () => {
    const superRow = virtualAnalogRow('super')
    expect(virtualAnalogControlValue(superRow, 0)).toBe(0)
    expect(virtualAnalogControlValue(superRow, 1)).toBe(1)
    expect(virtualAnalogControlValue(superRow, 50)).toBe(63)
    expect(virtualAnalogControlValue(superRow, 51)).toBe(65)
    expect(virtualAnalogControlValue(superRow, 100)).toBe(127)
    const speed = virtualAnalogRow('lfoSpeed')
    expect(virtualAnalogControlValue(speed, 50)).toBe(64)
    expect(virtualAnalogControlValue(speed, 99)).toBe(127)
  })

  it('sends a value the FM1 shows as the setting for every value of every row', () => {
    for (const row of virtualAnalogRows.filter((candidate) => candidate.controller)) {
      for (let value = 0; value <= row.max; value += 1) {
        const sent = virtualAnalogControlValue(row, value)
        const shown = row.choices
          ? Math.floor((sent * row.choices) / 128)
          : Math.round((sent * row.max) / 127)
        expect(shown).toBe(value)
      }
    }
  })
})

function range(first: number, last: number) {
  return Array.from({ length: last - first + 1 }, (_, offset) => first + offset)
}

describe('virtualAnalogCutoffHertz', () => {
  it('gives the hertz the FM1 showed for each Cutoff step (FM-1_093, 2026-10-04)', () => {
    // The steps CC 0, 1, 2, 32, 64, 65, 96, 126, and 127 set; 80 is the 5 kHz FM Filter capture.
    expect([0, 1, 2, 25, 50, 51, 76, 80, 99, 100].map(virtualAnalogCutoffHertz)).toEqual([
      20, 21, 23, 112, 632, 678, 3800, 5000, 18600, 20000,
    ])
  })
})
