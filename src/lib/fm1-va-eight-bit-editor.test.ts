import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_VA_BITCRUSH_START,
  FM1_VA_DISTORTION_TYPE_INDEX,
  FM1_VA_EFFECT_ORDER_START,
  FM1_VA_KNOB_CHOICES_START,
  FM1_VOICE_NAME_START,
  FM1_VOICE_PARAMETER_COUNT,
} from '@/lib/fm1-parameters'
import { packDx7Voice, unpackDx7Voice } from '@/lib/dx7'
import {
  eightBitFromEditorParameters,
  eightBitParameterCount,
  eightBitRow,
  eightBitRows,
  makeEightBitEditorParameters,
  type EightBitRowId,
} from '@/lib/fm1-va-eight-bit-editor'
import { capturedEightBitRecord, capturedEightBitVoice } from '@/test/fm1-va-eight-bit'

const runs = path.resolve(__dirname, '../../docs/hardware-runs')

const hex = (text: string) =>
  Uint8Array.from(text.trim().split(/\s+/), (byte) => parseInt(byte, 16))

/** A read of preset 097 from the 2026-10-16 run on FM-1_098. */
function capture(name: string) {
  const file = `fm1-va-8bit-fields-capture-097-${name}-2026-10-16.json`
  const json = JSON.parse(readFileSync(path.join(runs, file), 'utf8')) as {
    record: string
    voice: string
  }
  return { record: hex(json.record), voice: hex(json.voice) }
}

const read = (id: EightBitRowId, voice: Uint8Array, record: Uint8Array) =>
  eightBitRow(id).read(voice, record)

/** Writes `changes` into copies of a preset, row by row. */
function write(
  base: { record: Uint8Array; voice: Uint8Array },
  changes: Partial<Record<EightBitRowId, number>>,
) {
  const voice = base.voice.slice()
  const record = base.record.slice()
  for (const [id, value] of Object.entries(changes)) {
    eightBitRow(id as EightBitRowId).write(voice, record, value)
  }
  return { record, voice }
}

/** The bits of a packed voice an edit-buffer byte occupies, found by packing it with `packDx7Voice`. */
function packedFootprint(e: number) {
  const buffer = new Uint8Array(FM1_VOICE_PARAMETER_COUNT)
  buffer[e] = 0x7f
  return packDx7Voice(buffer).data
}

const nesRock = { record: capturedEightBitRecord(), voice: capturedEightBitVoice() }

const bitsOf = (bytes: Uint8Array) =>
  Array.from(bytes).flatMap((byte, i) => (byte ? [[i, byte]] : []))

/**
 * The bits a row writes, found by writing every value it takes over two bases, each with the Key's
 * mark already set so the mark is not counted against the Key or Accidentals.
 */
const footprints = new Map<EightBitRowId, ReturnType<typeof computeFootprint>>()
function footprint(id: EightBitRowId) {
  let found = footprints.get(id)
  if (!found) footprints.set(id, (found = computeFootprint(id)))
  return found
}

function computeFootprint(id: EightBitRowId) {
  const row = eightBitRow(id)
  const voiceBits = new Uint8Array(128)
  const recordBits = new Uint8Array(59)
  for (const fill of [0x00, 0xff]) {
    const base = {
      record: new Uint8Array(59).fill(fill),
      voice: new Uint8Array(128).fill(fill & 0x7f),
    }
    base.record[26] = fill ? 0x6f : 0x40
    for (let value = 0; value <= row.max; value += 1) {
      const voice = base.voice.slice()
      const record = base.record.slice()
      row.write(voice, record, value)
      voice.forEach((byte, i) => (voiceBits[i] |= byte ^ base.voice[i]))
      record.forEach((byte, i) => (recordBits[i] |= byte ^ base.record[i]))
    }
  }
  return { record: recordBits, voice: voiceBits }
}

describe('8-Bit rows: the table', () => {
  it('gives every row its own id and its own editor parameter', () => {
    expect(new Set(eightBitRows.map((row) => row.id)).size).toBe(eightBitRows.length)
    const indexes = eightBitRows.map((row) => row.index)
    expect(new Set(indexes).size).toBe(indexes.length)
  })

  it('keeps every row clear of the effects, Distortion type, Bitcrush, effect order, knob choices, and name', () => {
    for (const { index } of eightBitRows) {
      expect(index).toBeGreaterThanOrEqual(FM1_EDITOR_PARAMETER_COUNT)
      expect(index).toBeLessThan(eightBitParameterCount)
    }
    expect(FM1_EDITOR_PARAMETER_COUNT).toBeGreaterThan(FM1_VA_DISTORTION_TYPE_INDEX)
    expect(FM1_EDITOR_PARAMETER_COUNT).toBeGreaterThan(FM1_VA_BITCRUSH_START)
    expect(FM1_EDITOR_PARAMETER_COUNT).toBeGreaterThan(FM1_VA_EFFECT_ORDER_START)
    expect(FM1_EDITOR_PARAMETER_COUNT).toBeGreaterThan(FM1_VA_KNOB_CHOICES_START)
    expect(FM1_EDITOR_PARAMETER_COUNT).toBeGreaterThan(FM1_VOICE_NAME_START)
  })

  it('has every field of both tables, 12 drums and two parts', () => {
    const ids = new Set(eightBitRows.map((row) => row.id))
    for (const id of [
      'key',
      'accidentals',
      'scale',
      'voicing',
      'leadFollows',
      'arpSync',
      'tone',
      'tuning',
      'drumDecay',
      'drumsLevel',
    ] as const) {
      expect(ids).toContain(id)
    }
    for (let drum = 0; drum < 12; drum += 1) {
      for (const field of ['Pitch', 'Sweep', 'Decay', 'Level', 'Snap', 'Wave', 'Choke']) {
        expect(ids).toContain(`drum${drum}${field}`)
      }
    }
    for (const part of ['bass', 'lead']) {
      for (const field of [
        'Wave',
        'DutySequence',
        'Arpeggio',
        'Chord',
        'ArpSpeed',
        'Attack',
        'Decay',
        'Sustain',
        'Release',
        'Vibrato',
        'Glide',
        'Sweep',
        'Octave',
        'Level',
        'Mono',
        'NoteEngine',
        ...Array.from({ length: 8 }, (_, step) => `UserArpeggio${step + 1}`),
      ]) {
        expect(ids).toContain(`${part}${field}`)
      }
    }
  })

  it('gives every row bits no other row writes', () => {
    const owner = new Map<string, EightBitRowId>()
    for (const { id } of eightBitRows) {
      const { record, voice } = footprint(id)
      for (const [name, bits] of [
        ['voice', voice],
        ['record', record],
      ] as const) {
        bits.forEach((byte, i) => {
          for (let bit = 0; bit < 8; bit += 1) {
            if (!(byte & (1 << bit))) continue
            const key = `${name} ${i}.${bit}`
            expect(owner.get(key), `${key}: ${id} and ${owner.get(key)}`).toBeUndefined()
            owner.set(key, id)
          }
        })
      }
    }
  })

  it('writes none of the bits the preset does not read, nor the LFO, Transpose, and name', () => {
    const unread = [
      17, 97, 118, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 144, 145,
    ]
    const forbidden = new Uint8Array(128)
    for (const e of unread) packedFootprint(e).forEach((byte, i) => (forbidden[i] |= byte))
    for (let byte = 112; byte < 128; byte += 1) forbidden[byte] = 0x7f
    for (const { id } of eightBitRows) {
      footprint(id).voice.forEach((byte, i) => {
        expect(byte & forbidden[i], `${id} byte ${i}`).toBe(0)
      })
    }
  })

  it('puts the edit-buffer bytes of each field where packDx7Voice puts them', () => {
    const drumStart = [0, 5, 21, 26, 42, 47, 63, 68, 84, 89, 105, 110]
    const expectations: [EightBitRowId, number[]][] = [
      ['scale', [56, 98]],
      ['voicing', [59]],
      ['leadFollows', [80]],
      ['arpSync', [122]],
      ['tone', [55]],
      ['tuning', [34]],
      ['drumDecay', [15, 36, 14]],
      ['bassChord', [57]],
      ['leadChord', [99]],
      ['bassArpSpeed', [10]],
      ['leadArpSpeed', [73]],
      ['bassAttack', [16]],
      ['bassDecay', [19]],
      ['bassSustain', [31]],
      ['bassRelease', [37]],
      ['leadAttack', [79]],
      ['leadDecay', [82]],
      ['leadSustain', [94]],
      ['leadRelease', [100]],
      ['bassVibrato', [40]],
      ['bassGlide', [52]],
      ['leadVibrato', [103]],
      ['leadGlide', [115]],
      ['bassSweep', [58]],
      ['leadSweep', [121]],
      ['bassOctave', [13]],
      ['leadOctave', [76]],
      ['bassLevel', [61]],
      ['leadLevel', [124]],
      ['bassMono', [38]],
      ['leadMono', [101]],
      ['bassNoteEngine', [35]],
      ['leadNoteEngine', [35]],
      ...drumStart.flatMap((start, drum): [EightBitRowId, number[]][] =>
        (['Pitch', 'Sweep', 'Decay', 'Level', 'Snap'] as const).map((field, offset) => [
          `drum${drum as 0}${field}`,
          [start + offset],
        ]),
      ),
      ...[20, 18, 41, 39, 62, 60, 83, 81, 104, 102, 125, 123].map(
        (e, drum): [EightBitRowId, number[]] => [`drum${drum as 0}Wave`, [e]],
      ),
      ...[11, 12, 32, 33, 53, 54, 74, 75, 95, 96, 116, 117].map(
        (e, drum): [EightBitRowId, number[]] => [`drum${drum as 0}Choke`, [e]],
      ),
    ]
    for (const [id, bytes] of expectations) {
      const allowed = new Uint8Array(128)
      for (const e of bytes) packedFootprint(e).forEach((byte, i) => (allowed[i] |= byte))
      const written = footprint(id).voice
      expect({ id, bits: bitsOf(written).length > 0 }).toEqual({ id, bits: true })
      written.forEach((byte, i) => expect(byte & ~allowed[i], `${id} byte ${i}`).toBe(0))
    }
  })
})

describe('8-Bit rows: writing', () => {
  it.each(eightBitRows.map((row) => [row.id] as const))(
    '%s reads back what it writes and changes only its own bits, for every value',
    (id) => {
      const row = eightBitRow(id)
      const own = footprint(id)
      const lowest = id.endsWith('Sweep') ? 1 : 0
      for (let value = lowest; value <= row.max; value += 1) {
        const after = write(nesRock, { [id]: value })
        expect({ value, read: read(id, after.voice, after.record) }).toEqual({ value, read: value })
        expect(after.voice.every((byte, i) => !((byte ^ nesRock.voice[i]) & ~own.voice[i]))).toBe(
          true,
        )
        expect(
          after.record.every((byte, i) => !((byte ^ nesRock.record[i]) & ~own.record[i])),
        ).toBe(true)
      }
    },
  )

  it('clamps a write to the row range, and a Sweep to 1', () => {
    const loud = write(nesRock, { bassLevel: 500 })
    expect(read('bassLevel', loud.voice, loud.record)).toBe(99)
    const after = write(nesRock, { bassSweep: 0, leadOctave: -4, drum3Wave: 40 })
    expect(read('bassSweep', after.voice, after.record)).toBe(1)
    expect(read('leadOctave', after.voice, after.record)).toBe(0)
    expect(read('drum3Wave', after.voice, after.record)).toBe(14)
  })

  it('reads a stored value as it is, even beyond the row range', () => {
    const voice = nesRock.voice.slice()
    const record = nesRock.record.slice()
    record[19] = 0xf4
    record[20] = 100
    expect(read('bassWave', voice, record)).toBe(4)
    expect(read('bassDutySequence', voice, record)).toBe(15)
    expect(read('bassArpeggio', voice, record)).toBe(100)
  })

  it('stores a Drum Decay as seven bits of two’s complement around 50', () => {
    const voice = new Uint8Array(128)
    const record = new Uint8Array(59)
    eightBitRow('drumDecay').write(voice, record, 40)
    const edit = unpackDx7Voice({ data: voice, name: '' })
    expect([edit[15], edit[36], edit[14]]).toEqual([6, 6, 1])
    expect(read('drumDecay', voice, record)).toBe(40)
    eightBitRow('drumDecay').write(voice, record, 99)
    expect(read('drumDecay', voice, record)).toBe(99)
    eightBitRow('drumDecay').write(voice, record, 0)
    expect(read('drumDecay', voice, record)).toBe(0)
  })

  it('stores the User Arpeggio as eight steps of five bits, least significant first', () => {
    const voice = new Uint8Array(128)
    const record = new Uint8Array(59)
    const row = (step: number) => eightBitRow(`leadUserArpeggio${step as 1}`)
    for (let step = 1; step <= 8; step += 1) row(step).write(voice, record, step * 3 + 1)
    for (let step = 1; step <= 8; step += 1)
      expect(row(step).read(voice, record)).toBe(step * 3 + 1)
    // Step 2's five bits start at bit 5 of record 47 and end in bit 1 of record 48.
    const alone = write({ record: new Uint8Array(59), voice }, { leadUserArpeggio2: 31 })
    expect([alone.record[47], alone.record[48]]).toEqual([0xe0, 0x03])
    // The bass takes records 23, 24, 25, 45, and 46.
    const bassLast = write({ record: new Uint8Array(59), voice }, { bassUserArpeggio8: 31 })
    expect([bassLast.record[45], bassLast.record[46]]).toEqual([0x00, 0xf8])
    expect(eightBitRow('leadUserArpeggio1').shownOffset).toBe(12)
  })

  it('marks the Key in record 26 and keeps Accidentals beside it', () => {
    const unmarked = { record: new Uint8Array(59).fill(0xff), voice: new Uint8Array(128) }
    expect(read('key', unmarked.voice, unmarked.record)).toBe(0)
    expect(read('accidentals', unmarked.voice, unmarked.record)).toBe(0)
    const keyed = write(unmarked, { key: 5 })
    expect(keyed.record[26]).toBe(0x45)
    expect(write(keyed, { accidentals: 1 }).record[26]).toBe(0x65)
    expect(write(write(keyed, { accidentals: 1 }), { key: 0 }).record[26]).toBe(0x60)
    expect(write(unmarked, { accidentals: 1 }).record[26]).toBe(0x60)
  })

  it('stores Drums Level as 80 | (99 − level), and 99 without the mark', () => {
    const record = new Uint8Array(59)
    const voice = new Uint8Array(128)
    expect(read('drumsLevel', voice, record)).toBe(99)
    eightBitRow('drumsLevel').write(voice, record, 50)
    expect(record[2]).toBe(0xb1)
    eightBitRow('drumsLevel').write(voice, record, 0)
    expect(record[2]).toBe(0xe3)
    expect(read('drumsLevel', voice, record)).toBe(0)
  })
})

describe('8-Bit rows: NES ROCK, the one pack preset in the repository', () => {
  it('reads as FM-1+VA shows it', () => {
    const { voice, record } = nesRock
    expect(read('bassWave', voice, record)).toBe(4)
    expect(read('leadWave', voice, record)).toBe(1)
    expect(read('key', voice, record)).toBe(5)
    expect(read('bassLevel', voice, record)).toBe(95)
    expect(read('bassNoteEngine', voice, record)).toBe(0)
    expect(read('leadNoteEngine', voice, record)).toBe(0)
    expect(read('leadMono', voice, record)).toBe(0)
    expect(read('leadOctave', voice, record)).toBe(3)
    expect(read('drum0Pitch', voice, record)).toBe(40)
    expect(read('drumDecay', voice, record)).toBe(50)
  })

  it('reads every row in range', () => {
    for (const row of eightBitRows) {
      expect({ id: row.id, ok: row.read(nesRock.voice, nesRock.record) <= row.max }).toEqual({
        id: row.id,
        ok: true,
      })
    }
  })

  it('leaves every byte as read when each row is written its own value', () => {
    // Key, Accidentals, and Drums Level are the rows that write a mark, so a byte without it
    // changes; the editor skips a row whose value did not change.
    const marked = new Set<EightBitRowId>(['key', 'accidentals', 'drumsLevel'])
    for (const row of eightBitRows) {
      if (marked.has(row.id)) continue
      const own = row.read(nesRock.voice, nesRock.record)
      const after = write(nesRock, { [row.id]: own })
      expect({ id: row.id, voice: after.voice }).toEqual({ id: row.id, voice: nesRock.voice })
      expect({ id: row.id, record: after.record }).toEqual({ id: row.id, record: nesRock.record })
    }
  })

  it('stays byte for byte as read through the editor parameters, unchanged', () => {
    const parameters = makeEightBitEditorParameters(
      nesRock.voice,
      nesRock.record,
      makeDefaultFm1Effects(),
    )
    const saved = eightBitFromEditorParameters(nesRock.voice, nesRock.record, parameters)
    expect(saved.voice).toEqual(nesRock.voice)
    expect(saved.record).toEqual(nesRock.record)
  })

  it('writes only the row an edited parameter belongs to', () => {
    const parameters = makeEightBitEditorParameters(
      nesRock.voice,
      nesRock.record,
      makeDefaultFm1Effects(),
    )
    parameters[eightBitRow('leadOctave').index] = 5
    const saved = eightBitFromEditorParameters(nesRock.voice, nesRock.record, parameters)
    expect(saved.record).toEqual(nesRock.record)
    expect(saved.voice[63]).toBe(0x25)
    expect(saved.voice.filter((byte, i) => byte !== nesRock.voice[i])).toHaveLength(1)
  })
})

describe('8-Bit rows: the 2026-10-16 captures on FM-1_098', () => {
  const steps: [string, Partial<Record<EightBitRowId, number>>, string][] = [
    ['p1', { bassWave: 2 }, 'baseline'],
    ['p2a-key-off', { key: 0 }, 'p1'],
    ['p2b-key-c', { key: 1 }, 'p2a-key-off'],
    ['p3-drum-pitch', { drum0Pitch: 50 }, 'p2b-key-c'],
    ['p4a-decay-60', { drumDecay: 60 }, 'p3-drum-pitch'],
    ['p4b-decay-40', { drumDecay: 40 }, 'p4a-decay-60'],
    ['p5-lead-user-arp', { key: 0, leadArpeggio: 32, leadUserArpeggio1: 15 }, 'p4b-decay-40'],
    ['p6-lead-octave', { leadOctave: 5 }, 'p5-lead-user-arp'],
    ['p7a-bass-level', { bassLevel: 50 }, 'p6-lead-octave'],
    ['p7b-lead-mono', { leadMono: 1 }, 'p7a-bass-level'],
    ['ne-bass-chord', { bassNoteEngine: 1 }, 'p7b-lead-mono'],
    ['ne-bass-arp', { bassNoteEngine: 0 }, 'ne-bass-chord'],
    ['ne-lead-chord', { leadNoteEngine: 1 }, 'ne-bass-arp'],
    ['ne-lead-arp', { leadNoteEngine: 0 }, 'ne-lead-chord'],
  ]

  it('starts from the preset the repository already holds', () => {
    const baseline = capture('baseline')
    expect(baseline.voice).toEqual(nesRock.voice)
    expect(baseline.record.slice(0, 59)).toEqual(nesRock.record)
  })

  it.each(steps)(
    '%s: the change the ledger names gives the bytes the FM1 read back',
    (name, changes, from) => {
      const base = capture(from)
      const expected = capture(name)
      const after = write(base, changes)
      // The first SAVE also moved record 30 from 00 to 01, which no 8-Bit field owns.
      if (name === 'p1') after.record[30] = 0x01
      expect(after.voice).toEqual(expected.voice)
      expect(after.record).toEqual(expected.record)
    },
  )

  it('reads the Note Engine from E 35: bass in bit 0, lead in bit 1', () => {
    const chord = capture('ne-lead-chord')
    expect(read('leadNoteEngine', chord.voice, chord.record)).toBe(1)
    expect(read('bassNoteEngine', chord.voice, chord.record)).toBe(0)
    expect(chord.voice[30]).toBe(0x1a)
  })

  it('leaves every capture byte for byte unchanged through the editor parameters', () => {
    for (const [name] of steps) {
      const { record, voice } = capture(name)
      const parameters = makeEightBitEditorParameters(voice, record, makeDefaultFm1Effects())
      const saved = eightBitFromEditorParameters(voice, record, parameters)
      expect({ name, voice: saved.voice }).toEqual({ name, voice })
      expect({ name, record: saved.record }).toEqual({ name, record })
    }
  })
})
