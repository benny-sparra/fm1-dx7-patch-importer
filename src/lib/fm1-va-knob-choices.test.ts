import { describe, expect, it } from 'vitest'

import { fm1VaRecordSize } from '@/lib/fm1-va-record'

import {
  fm1VaDefaultKnobChoices,
  fm1VaKnobChoiceIds,
  fm1VaRecordKnobChoices,
  fm1VaRecordWithKnobChoices,
  fmKnobChoice,
  playsFm1VaKnobChoices,
  virtualAnalogKnobChoice,
} from './fm1-va-knob-choices'

/** A record whose knob bytes 52 and 53 hold `byte52` and `byte53`, and every other byte `fill`. */
function recordWith(byte52: number, byte53: number, fill = 0) {
  const record = new Uint8Array(fm1VaRecordSize).fill(fill)
  record[52] = byte52
  record[53] = byte53
  return record
}

describe('fm1VaKnobChoiceIds', () => {
  it('offers eight distinct choices on each engine', () => {
    for (const ids of Object.values(fm1VaKnobChoiceIds)) {
      expect(ids).toHaveLength(8)
      expect(new Set(ids).size).toBe(8)
    }
  })

  it('starts each engine with four of its own choices', () => {
    expect(fm1VaDefaultKnobChoices('fm')).toEqual([0, 1, 2, 4])
    expect(fm1VaDefaultKnobChoices('virtual-analog')).toEqual([0, 1, 2, 3])
    expect(fm1VaDefaultKnobChoices('eight-bit')).toEqual([0, 1, 2, 3])
  })
})

describe('fm1VaRecordKnobChoices', () => {
  // The bytes the FM1 wrote on FM-1_097 (2026-10-10), each from an unset `00`.
  it('reads Knob 1 at Decay from the FM preset whose byte 53 the FM1 wrote as 8B', () => {
    expect(fm1VaRecordKnobChoices(recordWith(0x00, 0x8b), 'fm')).toEqual([3, 1, 2, 4])
  })

  it('reads Knob 3 at Vibrato from the FM preset whose byte 52 the FM1 wrote as A5', () => {
    expect(fm1VaRecordKnobChoices(recordWith(0xa5, 0x00), 'fm')).toEqual([0, 1, 5, 4])
  })

  it('reads Knob 2 at Shape from Virtual Analog preset 113, whose byte 53 the FM1 wrote as A0', () => {
    expect(fm1VaRecordKnobChoices(recordWith(0x00, 0xa0), 'virtual-analog')).toEqual([0, 4, 2, 3])
  })

  it('reads Knob 1 at Lead Arp Speed from 8-Bit preset 097, whose byte 53 the FM1 wrote as 8C', () => {
    expect(fm1VaRecordKnobChoices(recordWith(0x00, 0x8c), 'eight-bit')).toEqual([4, 1, 2, 3])
  })

  it('reads the defaults from the stock 03, whose bits 0–2 are not a choice without the mark', () => {
    expect(fm1VaRecordKnobChoices(recordWith(0x03, 0x03, 0x03), 'fm')).toEqual([0, 1, 2, 4])
  })

  it('reads the knobs past the Envelope switch in bit 6 of byte 53', () => {
    expect(fm1VaRecordKnobChoices(recordWith(0x00, 0xcb), 'fm')).toEqual([3, 1, 2, 4])
    expect(fm1VaRecordKnobChoices(recordWith(0x00, 0x43), 'fm')).toEqual([0, 1, 2, 4])
  })
})

describe('fm1VaRecordWithKnobChoices', () => {
  it('writes Knob 1 at Decay as the FM1 did, 8B, leaving byte 52 unset', () => {
    const updated = fm1VaRecordWithKnobChoices(recordWith(0x00, 0x00), [3, 1, 2, 4], 'fm')
    expect(updated[53]).toBe(0x8b)
    expect(updated[52]).toBe(0x00)
  })

  it('writes Knob 3 at Vibrato as the FM1 did, A5, leaving byte 53 unset', () => {
    const updated = fm1VaRecordWithKnobChoices(recordWith(0x00, 0x00), [0, 1, 5, 4], 'fm')
    expect(updated[52]).toBe(0xa5)
    expect(updated[53]).toBe(0x00)
  })

  it('writes Knob 2 at Shape on a Virtual Analog preset as the FM1 did, A0', () => {
    const updated = fm1VaRecordWithKnobChoices(
      recordWith(0x00, 0x00),
      [0, 4, 2, 3],
      'virtual-analog',
    )
    expect(updated[53]).toBe(0xa0)
  })

  it('writes Knob 1 at Lead Arp Speed on an 8-Bit preset as the FM1 did, 8C', () => {
    const updated = fm1VaRecordWithKnobChoices(recordWith(0x00, 0x00), [4, 1, 2, 3], 'eight-bit')
    expect(updated[53]).toBe(0x8c)
  })

  it('keeps the Envelope switch in bit 6 of byte 53', () => {
    const updated = fm1VaRecordWithKnobChoices(recordWith(0x00, 0x43), [3, 1, 2, 4], 'fm')
    expect(updated[53]).toBe(0xcb)
  })

  it('keeps bit 6 of byte 52 as read', () => {
    const updated = fm1VaRecordWithKnobChoices(recordWith(0x40, 0x00), [0, 1, 5, 4], 'fm')
    expect(updated[52]).toBe(0xe5)
  })

  it('returns the record itself when every knob already reads as given', () => {
    const record = recordWith(0x03, 0x03, 0x03)
    expect(fm1VaRecordWithKnobChoices(record, [0, 1, 2, 4], 'fm')).toBe(record)
  })

  it('leaves every byte but the changed knob byte exactly as read', () => {
    const record = recordWith(0x03, 0x03, 0x03)
    const updated = fm1VaRecordWithKnobChoices(record, [7, 1, 2, 4], 'fm')
    expect(updated).not.toBe(record)
    expect(Array.from(updated.keys()).filter((byte) => updated[byte] !== record[byte])).toEqual([
      53,
    ])
    expect(updated[53]).toBe(0x8f)
  })

  it('brings a choice out of range into 0 to 7', () => {
    const updated = fm1VaRecordWithKnobChoices(recordWith(0x00, 0x00), [9, -1, 2, 4], 'fm')
    expect(fm1VaRecordKnobChoices(updated, 'fm')).toEqual([7, 0, 2, 4])
  })
})

describe('playsFm1VaKnobChoices', () => {
  it('allows FM-1+VA from FM-1_096, the release that added knob choices', () => {
    expect(playsFm1VaKnobChoices({ identity: 'FM-1_096', kind: 'fm1-va' })).toBe(true)
    expect(playsFm1VaKnobChoices({ identity: 'FM-1_097', kind: 'fm1-va' })).toBe(true)
    expect(playsFm1VaKnobChoices({ identity: 'FM-1_094', kind: 'fm1-va' })).toBe(false)
    expect(playsFm1VaKnobChoices({ identity: 'FM-1_015', kind: 'mvave' })).toBe(false)
  })
})

describe('the controls a knob choice turns', () => {
  it('gives each Virtual Analog choice its own editor row', () => {
    const rows = [
      'cutoff',
      'resonance',
      'filterEnvelope',
      'filterDecay',
      'filterShape',
      'super',
      'detune',
      'lfoToCutoff',
    ]
    expect(rows.map(virtualAnalogKnobChoice)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(virtualAnalogKnobChoice('drift')).toBeUndefined()
  })

  it('puts the voice editor’s Feedback and LFO speed on the FM choices of those names', () => {
    expect(fm1VaKnobChoiceIds.fm[fmKnobChoice('global.feedback') ?? -1]).toBe('feedback')
    expect(fm1VaKnobChoiceIds.fm[fmKnobChoice('global.lfoSpeed') ?? -1]).toBe('lfoSpeed')
    expect(fmKnobChoice('global.lfoDelay')).toBeUndefined()
  })
})
