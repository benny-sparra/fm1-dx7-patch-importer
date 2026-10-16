import { makeFm1EditorParameters } from '@/lib/fm1-effects'
import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_VOICE_NAME_LENGTH,
  FM1_VOICE_NAME_START,
  FM1_VOICE_PARAMETER_COUNT,
} from '@/lib/fm1-parameters'
import { fm1VaRecordKnobChoices } from '@/lib/fm1-va-knob-choices'
import {
  fm1VaRecordBitcrush,
  fm1VaRecordDistortionType,
  fm1VaRecordEffectOrder,
} from '@/lib/fm1-va-record-effects'

/**
 * The fields of an 8-Bit preset the editor sets, and where the preset keeps each
 * (docs/fm1-research.md, "Every field of an 8-Bit preset"). A row's value is a number the editor
 * can hold in a `Uint8Array` parameter: a choice's number for a list, 0 or 1 for a switch, the
 * level shown for a level, and for a field the FM1 shows with a sign, the stored number, with
 * `shownOffset` taken off to get the number shown (Octave and the User Arpeggio's steps).
 *
 * The fields live in edit-buffer (E) bytes, but the library keeps the 128 packed voice bytes, so
 * each row reads and writes its bits where `packDx7Voice` puts them. A voice is never unpacked and
 * packed again: that drops bits, and a write here changes only its own bits.
 *
 * Left out: the LFO, Transpose, and the name, which are as on an FM preset, so the editor uses the
 * DX7 parameters of those names; and the Pattern, whose two parts' order the table does not give.
 */
type DrumField = 'Choke' | 'Decay' | 'Level' | 'Pitch' | 'Snap' | 'Sweep' | 'Wave'
type DrumNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
type PartField =
  | 'Arpeggio'
  | 'ArpSpeed'
  | 'Attack'
  | 'Chord'
  | 'Decay'
  | 'DutySequence'
  | 'Glide'
  | 'Level'
  | 'Mono'
  | 'NoteEngine'
  | 'Octave'
  | 'Release'
  | 'Sustain'
  | 'Sweep'
  | 'Vibrato'
  | 'Wave'
type UserArpeggioStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

type EightBitPart = 'bass' | 'lead'

export type EightBitRowId =
  | 'accidentals'
  | 'arpSync'
  | 'drumDecay'
  | 'drumsLevel'
  | 'key'
  | 'leadFollows'
  | 'scale'
  | 'tone'
  | 'tuning'
  | 'voicing'
  | `drum${DrumNumber}${DrumField}`
  | `${EightBitPart}${PartField}`
  | `${EightBitPart}UserArpeggio${UserArpeggioStep}`

export type EightBitRow = {
  /** For a list, how many choices it has; the value is the choice's number. */
  choices?: number
  id: EightBitRowId
  /** Where the row is in the editor's parameters. */
  index: number
  max: number
  read: (voice: Uint8Array, record: Uint8Array) => number
  /** What to take off the value to get the number the FM1 shows, for a field it shows signed. */
  shownOffset?: number
  /** Writes `value` into copies of the voice and record. */
  write: (voice: Uint8Array, record: Uint8Array, value: number) => void
}

type RowBody = Omit<EightBitRow, 'index'>

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)))

const operatorSize = 21
const operatorCount = 6
const packedOperatorSize = 17
/** The DX7 packing of the edit buffer's globals, from E 126 (`packDx7Voice`). */
const globalStart = operatorSize * operatorCount

type PackedBits = { byte: number; shift: number; width: number }

/**
 * Where each of an operator's 21 edit-buffer bytes lives in its 17 packed bytes: the byte, the
 * shift, and the width (`packDx7Voice`).
 */
const operatorBits: readonly (readonly [number, number, number])[] = [
  ...Array.from({ length: 11 }, (_, r): [number, number, number] => [r, 0, 7]),
  [11, 0, 2],
  [11, 2, 2],
  [12, 0, 3],
  [13, 0, 2],
  [13, 2, 3],
  [14, 0, 7],
  [15, 0, 1],
  [15, 1, 5],
  [16, 0, 7],
  [12, 3, 4],
]

/** The packed voice bits that hold edit-buffer byte `e`, as `packDx7Voice` stores it. */
function packedBits(e: number): PackedBits {
  if (e < globalStart) {
    const [byte, shift, width] = operatorBits[e % operatorSize]
    return { byte: Math.floor(e / operatorSize) * packedOperatorSize + byte, shift, width }
  }
  const global = e - globalStart
  if (global < 8) return { byte: 102 + global, shift: 0, width: 7 }
  if (global === 8) return { byte: 110, shift: 0, width: 5 }
  if (global === 9) return { byte: 111, shift: 0, width: 3 }
  if (global === 10) return { byte: 111, shift: 3, width: 1 }
  throw new RangeError(`E ${e} is not an 8-Bit field.`)
}

/** Bits `shift` upwards, `width` wide, of edit-buffer byte `e`, as a field of the packed voice. */
type Part = { e: number; shift?: number; width?: number }

function resolvePart({ e, shift = 0, width }: Part) {
  const place = packedBits(e)
  const span = width ?? place.width - shift
  if (shift + span > place.width) throw new RangeError(`E ${e} has no bit ${shift + span - 1}.`)
  return { byte: place.byte, shift: place.shift + shift, width: span }
}

/** A value spread over the parts, the first holding its lowest bits. */
function voiceField(parts: readonly Part[]) {
  const places = parts.map(resolvePart)
  return {
    read: (voice: Uint8Array) => {
      let value = 0
      let offset = 0
      for (const place of places) {
        value |= ((voice[place.byte] >> place.shift) & ((1 << place.width) - 1)) << offset
        offset += place.width
      }
      return value
    },
    write: (voice: Uint8Array, value: number) => {
      let rest = value
      for (const place of places) {
        const mask = (1 << place.width) - 1
        voice[place.byte] =
          (voice[place.byte] & ~(mask << place.shift)) | ((rest & mask) << place.shift)
        rest >>= place.width
      }
    },
  }
}

/** A number in the voice, written as given between `min` and `max` and read as stored. */
function voiceRow(id: EightBitRowId, parts: readonly Part[], max: number, min = 0): RowBody {
  const field = voiceField(parts)
  return {
    id,
    max,
    read: (voice) => field.read(voice),
    write: (voice, _record, value) => field.write(voice, clamp(value, min, max)),
  }
}

/** A list in the voice. */
function voiceListRow(id: EightBitRowId, parts: readonly Part[], choices: number): RowBody {
  return { ...voiceRow(id, parts, choices - 1), choices }
}

/** An Off/On switch in one voice bit. */
function voiceSwitchRow(id: EightBitRowId, part: Part): RowBody {
  return voiceRow(id, [{ ...part, width: 1 }], 1)
}

/** A record byte holding a number whole. */
function recordByteRow(id: EightBitRowId, byte: number, max: number): RowBody {
  return {
    id,
    max,
    read: (_voice, record) => record[byte],
    write: (_voice, record, value) => {
      record[byte] = clamp(value, 0, max)
    },
  }
}

/** Record byte 18 names the engine; byte 26 holds the Key and Accidentals under a mark. */
const keyByte = 26
const keyMarked = (record: Uint8Array) => (record[keyByte] & 0xd0) === 0x40
const keyMark = 0x40
const accidentalsBit = 0x20

/** The Key and Accidentals keep their bits in byte 26 under the mark; without it, Key Off. */
function keyRow(): RowBody {
  return {
    choices: 13,
    id: 'key',
    max: 12,
    read: (_voice, record) => (keyMarked(record) ? record[keyByte] & 0x0f : 0),
    write: (_voice, record, value) => {
      const kept = keyMarked(record) ? record[keyByte] & accidentalsBit : 0
      record[keyByte] = keyMark | kept | clamp(value, 0, 12)
    },
  }
}

function accidentalsRow(): RowBody {
  return {
    choices: 2,
    id: 'accidentals',
    max: 1,
    read: (_voice, record) => (keyMarked(record) && record[keyByte] & accidentalsBit ? 1 : 0),
    write: (_voice, record, value) => {
      const key = keyMarked(record) ? record[keyByte] & 0x0f : 0
      record[keyByte] = keyMark | key | (value ? accidentalsBit : 0)
    },
  }
}

/**
 * Drums Level, record byte 2: `80` | (99 − level), and 99 without bit 7. A byte past 99 would
 * show a negative level, which a parameter cannot hold, so it reads 0.
 */
function drumsLevelRow(): RowBody {
  return {
    id: 'drumsLevel',
    max: 99,
    read: (_voice, record) => (record[2] & 0x80 ? Math.max(0, 99 - (record[2] & 0x7f)) : 99),
    write: (_voice, record, value) => {
      record[2] = 0x80 | (99 - clamp(value, 0, 99))
    },
  }
}

/**
 * Drum Decay, shown 0–99 with 50 the middle: (shown − 50) in seven bits, two's complement, bits
 * 0–2 in E 15, bits 3–5 in E 36, and bit 6 in E 14. Seven bits reach below 0 shown, which a
 * parameter cannot hold, so such a byte reads 0.
 */
function drumDecayRow(): RowBody {
  const field = voiceField([
    { e: 15, width: 3 },
    { e: 36, width: 3 },
    { e: 14, width: 1 },
  ])
  return {
    id: 'drumDecay',
    max: 99,
    read: (voice) => {
      const stored = field.read(voice)
      return Math.max(0, (stored >= 64 ? stored - 128 : stored) + 50)
    },
    write: (voice, _record, value) => field.write(voice, (clamp(value, 0, 99) - 50) & 0x7f),
  }
}

/** Eight steps of five bits, least significant first across five record bytes. */
const userArpeggioStepCount = 8
const userArpeggioStepBits = 5
/** Stored as shown + 12, so −12 to +18, with 31 as End. */
const userArpeggioOffset = 12
const userArpeggioEnd = 31

function userArpeggioRow(id: EightBitRowId, bytes: readonly number[], step: number): RowBody {
  const first = step * userArpeggioStepBits
  const place = (bit: number) => ({
    byte: bytes[Math.floor(bit / 8)],
    mask: 1 << (bit % 8),
    bit,
  })
  const bits = Array.from({ length: userArpeggioStepBits }, (_, i) => place(first + i))
  return {
    id,
    max: userArpeggioEnd,
    read: (_voice, record) =>
      bits.reduce((value, { byte, mask }, i) => value | (record[byte] & mask ? 1 << i : 0), 0),
    shownOffset: userArpeggioOffset,
    write: (_voice, record, value) => {
      const stored = clamp(value, 0, userArpeggioEnd)
      bits.forEach(({ byte, mask }, i) => {
        record[byte] = stored & (1 << i) ? record[byte] | mask : record[byte] & ~mask
      })
    },
  }
}

/** Where each of the 12 drums' five fields begin in the edit buffer, two drums an operator. */
const drumStart = [0, 5, 21, 26, 42, 47, 63, 68, 84, 89, 105, 110]
const drumWaveByte = [20, 18, 41, 39, 62, 60, 83, 81, 104, 102, 125, 123]
const drumChokeByte = [11, 12, 32, 33, 53, 54, 74, 75, 95, 96, 116, 117]
const drumFields = ['Pitch', 'Sweep', 'Decay', 'Level', 'Snap'] as const

const drumDefinitions: RowBody[] = drumStart.flatMap((start, drum) => {
  const id = (field: DrumField) => `drum${drum as DrumNumber}${field}` as const
  return [
    ...drumFields.map((field, offset) =>
      field === 'Sweep'
        ? { ...voiceRow(id(field), [{ e: start + offset }], 99, 1), shownOffset: 50 }
        : voiceRow(id(field), [{ e: start + offset }], 99),
    ),
    // A wave is one of the 15; the byte holds more bits than that.
    voiceListRow(id('Wave'), [{ e: drumWaveByte[drum] }], 15),
    voiceListRow(id('Choke'), [{ e: drumChokeByte[drum] }], 4),
  ]
})

type PartPlace = {
  arpSpeed: number
  attack: number
  chord: number
  decay: number
  glide: number
  level: number
  mono: number
  noteEngineBit: number
  octave: number
  release: number
  sustain: number
  sweep: number
  userArpeggio: readonly number[]
  vibrato: number
  waveRecord: number
}

const bass: PartPlace = {
  arpSpeed: 10,
  attack: 16,
  chord: 57,
  decay: 19,
  glide: 52,
  level: 61,
  mono: 38,
  noteEngineBit: 0,
  octave: 13,
  release: 37,
  sustain: 31,
  sweep: 58,
  userArpeggio: [23, 24, 25, 45, 46],
  vibrato: 40,
  waveRecord: 19,
}

const lead: PartPlace = {
  arpSpeed: 73,
  attack: 79,
  chord: 99,
  decay: 82,
  glide: 115,
  level: 124,
  mono: 101,
  noteEngineBit: 1,
  octave: 76,
  release: 100,
  sustain: 94,
  sweep: 121,
  userArpeggio: [47, 48, 49, 50, 51],
  vibrato: 103,
  waveRecord: 21,
}

/** The two parts' Wave and Duty Sequence nibbles, then Arpeggio, are bytes of the record. */
function partRows(name: EightBitPart, place: PartPlace): RowBody[] {
  const id = (field: PartField) => `${name}${field}` as const
  const nibble = (field: PartField, shift: number, max: number): RowBody => ({
    choices: max + 1,
    id: id(field),
    max,
    read: (_voice, record) => (record[place.waveRecord] >> shift) & 0x0f,
    write: (_voice, record, value) => {
      record[place.waveRecord] =
        (record[place.waveRecord] & ~(0x0f << shift)) | (clamp(value, 0, max) << shift)
    },
  })
  return [
    nibble('Wave', 0, 14),
    nibble('DutySequence', 4, 14),
    recordByteRow(id('Arpeggio'), place.waveRecord + 1, 32),
    voiceRow(id('Chord'), [{ e: place.chord }], 6),
    ...Array.from({ length: userArpeggioStepCount }, (_, step) =>
      userArpeggioRow(
        `${name}UserArpeggio${(step + 1) as UserArpeggioStep}`,
        place.userArpeggio,
        step,
      ),
    ),
    voiceListRow(id('ArpSpeed'), [{ e: place.arpSpeed }], 7),
    voiceRow(id('Attack'), [{ e: place.attack }], 99),
    voiceRow(id('Decay'), [{ e: place.decay }], 99),
    voiceRow(id('Sustain'), [{ e: place.sustain }], 99),
    voiceRow(id('Release'), [{ e: place.release }], 99),
    voiceRow(id('Vibrato'), [{ e: place.vibrato }], 99),
    voiceRow(id('Glide'), [{ e: place.glide }], 99),
    { ...voiceRow(id('Sweep'), [{ e: place.sweep }], 99, 1), shownOffset: 50 },
    {
      ...voiceRow(id('Octave'), [{ e: place.octave, width: 3 }], 7),
      shownOffset: 3,
    },
    voiceRow(id('Level'), [{ e: place.level }], 99),
    voiceSwitchRow(id('Mono'), { e: place.mono }),
    {
      ...voiceSwitchRow(id('NoteEngine'), { e: 35, shift: place.noteEngineBit }),
      choices: 2,
    },
  ]
}

/** The rows go after the editor's effects, Bitcrush, effect order, and knob choices. */
const rowStart = FM1_EDITOR_PARAMETER_COUNT

const definitions: RowBody[] = [
  keyRow(),
  accidentalsRow(),
  {
    ...voiceListRow(
      'scale',
      [
        { e: 56, width: 2 },
        { e: 98, width: 2 },
      ],
      9,
    ),
  },
  voiceListRow('voicing', [{ e: 59, width: 1 }], 2),
  voiceListRow('leadFollows', [{ e: 80, width: 1 }], 2),
  voiceListRow('arpSync', [{ e: 122, width: 1 }], 2),
  voiceListRow('tone', [{ e: 55, width: 1 }], 2),
  voiceListRow('tuning', [{ e: 34, width: 1 }], 2),
  drumDecayRow(),
  drumsLevelRow(),
  ...drumDefinitions,
  ...partRows('bass', bass),
  ...partRows('lead', lead),
]

export const eightBitRows: readonly EightBitRow[] = definitions.map((row, offset) => ({
  ...row,
  index: rowStart + offset,
}))

export const eightBitParameterCount = rowStart + eightBitRows.length

const rowsById = new Map(eightBitRows.map((row) => [row.id, row]))

export function eightBitRow(id: EightBitRowId) {
  const row = rowsById.get(id)
  if (!row) throw new RangeError(`${id} is not an 8-Bit row.`)
  return row
}

/** The packed voice's name bytes. */
const voiceNameByte = 118

/**
 * The editor's parameters for an 8-Bit preset: its rows, its name, the library's effects, and the
 * Distortion type, Bitcrush, effect order, and knob choices its record keeps.
 */
export function makeEightBitEditorParameters(
  voice: Uint8Array,
  record: Uint8Array,
  effects: Uint8Array,
) {
  const parameters = new Uint8Array(eightBitParameterCount)
  parameters.set(
    makeFm1EditorParameters(
      new Uint8Array(FM1_VOICE_PARAMETER_COUNT),
      effects,
      fm1VaRecordDistortionType(record),
      fm1VaRecordBitcrush(record),
      fm1VaRecordEffectOrder(record),
      fm1VaRecordKnobChoices(record, 'eight-bit'),
    ),
  )
  parameters.set(
    voice.subarray(voiceNameByte, voiceNameByte + FM1_VOICE_NAME_LENGTH),
    FM1_VOICE_NAME_START,
  )
  for (const row of eightBitRows) parameters[row.index] = row.read(voice, record)
  return parameters
}

/**
 * Copies of `voice` and `record` holding the rows and name in `parameters`. A row that already
 * reads as its parameter is left as it was, so a bit the edit did not touch keeps exactly what
 * the FM1 stored. The effects, Distortion type, Bitcrush, effect order, and knob choices are the
 * caller's, through the record functions that write them.
 */
export function eightBitFromEditorParameters(
  voice: Uint8Array,
  record: Uint8Array,
  parameters: Uint8Array,
) {
  const savedVoice = voice.slice()
  const savedRecord = record.slice()
  for (const row of eightBitRows) {
    if (row.read(savedVoice, savedRecord) !== parameters[row.index]) {
      row.write(savedVoice, savedRecord, parameters[row.index])
    }
  }
  savedVoice.set(
    parameters.subarray(FM1_VOICE_NAME_START, FM1_VOICE_NAME_START + FM1_VOICE_NAME_LENGTH),
    voiceNameByte,
  )
  return { record: savedRecord, voice: savedVoice }
}
