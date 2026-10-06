import { describe, expect, it } from 'vitest'

import { dx7PackedVoiceSize } from '@/lib/dx7'
import { fm1EffectParameterCount } from '@/lib/fm1-effects'
import { parseFm1VaReply } from '@/lib/fm1-va-sysex'
import {
  capturedOrgan3Reply,
  capturedVirtualAnalogDistortionReply,
  capturedVirtualAnalogFoldbackReply,
  capturedVirtualAnalogReorderedReply,
} from '@/test/fm1-va-captures'

import {
  fm1VaBitcrushSampleRateHz,
  fm1VaRecordBitcrush,
  fm1VaRecordDistortionType,
  fm1VaRecordEffects,
  fm1VaRecordWithBitcrush,
  fm1VaRecordWithDistortionType,
  fm1VaRecordWithEffects,
  playsFm1VaBitcrush,
} from './fm1-va-record-effects'

function recordOf(reply: Uint8Array) {
  const parsed = parseFm1VaReply(reply)
  if (!parsed) throw new Error('The captured reply did not parse.')
  return parsed.data.slice(dx7PackedVoiceSize)
}

describe('fm1VaRecordEffects', () => {
  it('reads each effect controller from the place the hardware tests found it', () => {
    // Preset 097 after the record-mapping tests: every effect on, the Filter high pass and Reverb
    // Plate, and each setting the value the FX probe sent for it (docs/fm1-research.md).
    // prettier-ignore
    expect(Array.from(fm1VaRecordEffects(recordOf(capturedVirtualAnalogDistortionReply)))).toEqual([
      1, 2, 40, 5,
      1, 2, 11, 77,
      1, 12, 33, 13,
      1, 14, 44, 15,
      1, 16, 55, 17,
      1, 18, 19, 66,
    ])
  })

  it('reads a factory preset with every effect off', () => {
    // ORGAN 3 as FM-1+VA stores it: Cutoff 80 and every other setting 3.
    // prettier-ignore
    expect(Array.from(fm1VaRecordEffects(recordOf(capturedOrgan3Reply)))).toEqual([
      0, 0, 80, 3,
      0, 0, 3, 3,
      0, 3, 3, 3,
      0, 3, 3, 3,
      0, 3, 3, 3,
      0, 3, 3, 3,
    ])
  })

  it('holds a value above a controller’s range at its maximum', () => {
    const record = new Uint8Array(59)
    record[0] = 200
    record[28] = 0x7f

    const effects = fm1VaRecordEffects(record)

    expect(effects).toHaveLength(fm1EffectParameterCount)
    expect(effects[2]).toBe(107)
    expect(effects[0]).toBe(1)
  })
})

describe('fm1VaRecordWithEffects', () => {
  const captures = [
    capturedOrgan3Reply,
    capturedVirtualAnalogDistortionReply,
    capturedVirtualAnalogReorderedReply,
  ]

  it('gives back each captured record unchanged with the effects it holds', () => {
    for (const reply of captures) {
      const record = recordOf(reply)

      expect(fm1VaRecordWithEffects(record, fm1VaRecordEffects(record))).toEqual(record)
    }
  })

  it('puts each effect in the record byte it is read from, and changes no other', () => {
    const record = recordOf(capturedOrgan3Reply)
    const effects = fm1VaRecordEffects(record)
    effects[4] = 1 // Reverb on
    effects[9] = 64 // Delay Decay

    const updated = fm1VaRecordWithEffects(record, effects)

    expect(fm1VaRecordEffects(updated)).toEqual(effects)
    const changed = Array.from(updated.keys()).filter((index) => updated[index] !== record[index])
    expect(changed).toEqual([6, 31])
  })

  it('leaves the record it was given as it is', () => {
    const record = recordOf(capturedOrgan3Reply)
    const before = record.slice()

    fm1VaRecordWithEffects(record, new Uint8Array(fm1EffectParameterCount).fill(1))

    expect(record).toEqual(before)
  })
})

describe('fm1VaRecordDistortionType', () => {
  it('reads Hard Clip from the preset it was set on, and Soft Clip from a factory preset', () => {
    // Preset 097 had Distortion Type turned to Hard Clip on the FX screen (docs/fm1-research.md).
    expect(fm1VaRecordDistortionType(recordOf(capturedVirtualAnalogDistortionReply))).toBe(1)
    expect(fm1VaRecordDistortionType(recordOf(capturedOrgan3Reply))).toBe(0)
  })

  it('reads Foldback from the same preset once it was set to Foldback', () => {
    const foldback = recordOf(capturedVirtualAnalogFoldbackReply)
    const hardClip = recordOf(capturedVirtualAnalogDistortionReply)

    expect(fm1VaRecordDistortionType(foldback)).toBe(2)
    expect(Array.from(foldback.keys()).filter((i) => foldback[i] !== hardClip[i])).toEqual([38])
  })
})

describe('fm1VaRecordWithDistortionType', () => {
  it('sets only the type, in a copy', () => {
    const record = recordOf(capturedVirtualAnalogDistortionReply)

    const updated = fm1VaRecordWithDistortionType(record, 0)

    expect(Array.from(updated.keys()).filter((i) => updated[i] !== record[i])).toEqual([38])
    expect(fm1VaRecordDistortionType(record)).toBe(1)
  })
})

/**
 * Preset 032 as FM-1_096 stores it after Erase Preset to FM: Bitcrush never set (byte 5 `03`), and
 * the six other effects in their stock order in the chain bytes, 27 + 3k
 * (docs/hardware-runs/fm1-va-bitcrush-order-2026-10-06.md).
 */
function erasedRecord() {
  const record = recordOf(capturedOrgan3Reply)
  record[5] = 0x03
  ;[27, 30, 33, 36, 39, 42].forEach((byte, place) => (record[byte] = place))
  record[35] = 0
  record[41] = 0
  record[44] = 0
  return record
}

describe('playsFm1VaBitcrush', () => {
  it('names FM-1+VA from FM-1_096, the release that added Bitcrush', () => {
    expect(playsFm1VaBitcrush({ identity: 'FM-1_096', kind: 'fm1-va' })).toBe(true)
    expect(playsFm1VaBitcrush({ identity: 'FM-1_094', kind: 'fm1-va' })).toBe(false)
    expect(playsFm1VaBitcrush({ identity: 'FM-1_015', kind: 'mvave' })).toBe(false)
  })
})

describe('fm1VaRecordBitcrush', () => {
  it('reads a record that never set Bitcrush as Off at its defaults', () => {
    expect(fm1VaRecordBitcrush(erasedRecord())).toEqual([0, 8, 72, 100])
  })

  it('reads the switch, Bits, Sample Rate, and Mix of a record that set them', () => {
    const record = erasedRecord()
    // After B4 of the hardware run: On, Bits 4, Sample Rate 73, Mix 50.
    record[5] = 0x8c
    record[35] = 4
    record[41] = 73
    record[44] = 50

    expect(fm1VaRecordBitcrush(record)).toEqual([1, 4, 73, 50])
  })

  it('brings a setting outside its range into it', () => {
    const record = erasedRecord()
    record[5] = 0x80
    record[35] = 0
    record[41] = 120

    expect(fm1VaRecordBitcrush(record).slice(1, 3)).toEqual([1, 100])
  })
})

describe('fm1VaRecordWithBitcrush', () => {
  it('leaves a record that never set Bitcrush as it was while the editor has not changed it', () => {
    const record = erasedRecord()

    expect(fm1VaRecordWithBitcrush(record, [0, 8, 72, 100])).toBe(record)
  })

  it('switches Bitcrush on as the FM1 does: marked set, after the Distortion, at its defaults', () => {
    const updated = fm1VaRecordWithBitcrush(erasedRecord(), [1, 8, 72, 100])

    // B1 of the hardware run stored exactly these bytes.
    expect([updated[5], updated[35], updated[41], updated[44]]).toEqual([0x8c, 8, 72, 100])
  })

  it('puts Bitcrush after the Distortion wherever the chain has moved it', () => {
    const record = erasedRecord()
    // Distortion moved to the top: Distortion, Filter, Reverb, Delay, Chorus, Phaser.
    ;[3, 0, 1, 2, 4, 5].forEach((effect, place) => (record[27 + place * 3] = effect))

    // On, in place 1, straight after the Distortion.
    expect(fm1VaRecordWithBitcrush(record, [1, 8, 72, 100])[5]).toBe(0x89)
  })

  it('keeps the place of a Bitcrush already set, changing only what the editor changed', () => {
    const record = erasedRecord()
    record[5] = 0x88
    record[35] = 8
    record[41] = 72
    record[44] = 100

    const updated = fm1VaRecordWithBitcrush(record, [0, 4, 72, 50])

    expect([updated[5], updated[35], updated[41], updated[44]]).toEqual([0x80, 4, 72, 50])
  })

  it('changes no other byte of the record', () => {
    const record = erasedRecord()

    const updated = fm1VaRecordWithBitcrush(record, [1, 4, 10, 50])

    const changed = Array.from(updated.keys()).filter((index) => updated[index] !== record[index])
    expect(changed).toEqual([5, 35, 41, 44])
  })
})

describe('fm1VaBitcrushSampleRateHz', () => {
  it('runs from 300 Hz to 44.1 kHz, with 73 at the 11.5k the FM1 showed', () => {
    expect(fm1VaBitcrushSampleRateHz(0)).toBe(300)
    expect(fm1VaBitcrushSampleRateHz(100)).toBeCloseTo(44118)
    expect(Math.round(fm1VaBitcrushSampleRateHz(73) / 100) / 10).toBe(11.5)
    expect(Math.round(fm1VaBitcrushSampleRateHz(72) / 100) / 10).toBe(10.9)
  })
})
