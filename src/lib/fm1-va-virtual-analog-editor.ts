import { makeFm1EditorParameters } from '@/lib/fm1-effects'
import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_VOICE_NAME_LENGTH,
  FM1_VOICE_NAME_START,
  FM1_VOICE_PARAMETER_COUNT,
} from '@/lib/fm1-parameters'
import { fm1VaRecordKnobChoices } from '@/lib/fm1-va-knob-choices'
import { fm1VaChoiceValue } from '@/lib/fm1-va-sound-control'
import {
  fm1VaRecordBitcrush,
  fm1VaRecordDistortionType,
  fm1VaRecordEffectOrder,
} from '@/lib/fm1-va-record-effects'

/**
 * The rows of a Virtual Analog preset the editor sets, as FM-1+VA's own screens list them, and
 * where the preset keeps each (docs/fm1-research.md, "Every row of a Virtual Analog preset"). A
 * row's value is the one the FM1 shows: a choice's number for a list, 0 or 1 for a switch.
 *
 * The rows live among the editor's parameters, which keep the DX7 editor's layout so the effects
 * panel, Bitcrush, and the effect order work unchanged: Level, Velocity to Level, and the LFO at the
 * voice parameters they share with a DX7 voice, the name at the name's, and the record's own rows
 * after FM-1+VA's effect order. Every other voice parameter is unused.
 */
export type VirtualAnalogRowId =
  | 'ampModDepth'
  | 'attack'
  | 'cutoff'
  | 'decay'
  | 'detune'
  | 'drift'
  | 'envelope'
  | 'filterDecay'
  | 'filterEnvelope'
  | 'filterShape'
  | 'filterType'
  | 'filterVelocity'
  | 'keyTracking'
  | 'level'
  | 'lfoDelay'
  | 'lfoSpeed'
  | 'lfoSync'
  | 'lfoToCutoff'
  | 'lfoWave'
  | 'mono'
  | 'noise'
  | 'pitchModDepth'
  | 'pitchModSensitivity'
  | 'pwm'
  | 'release'
  | 'resonance'
  | 'sub'
  | 'super'
  | 'sustain'
  | 'velocityToLevel'
  | 'waveform'

export type VirtualAnalogRow = {
  /** For a list, how many choices it has; the value is the choice's number. */
  choices?: number
  /** The sound-setting Control Change that sets it live, where it has one. */
  controller?: number
  id: VirtualAnalogRowId
  /** Where the row is in the editor's parameters. */
  index: number
  max: number
  read: (voice: Uint8Array, record: Uint8Array) => number
  /** Writes `value` into copies of the voice and record. */
  write: (voice: Uint8Array, record: Uint8Array, value: number) => void
}

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, Math.round(value)))

/** Bit 7 of a record byte marks a setting as set; without it, the row plays its default. */
const setMark = 0x80

/** A record byte holding 0–100 plainly, with `fallback` where it holds more. */
function plainRecordRow(id: VirtualAnalogRowId, byte: number, fallback: number) {
  return {
    id,
    max: 100,
    read: (_voice: Uint8Array, record: Uint8Array) =>
      record[byte] <= 100 ? record[byte] : fallback,
    write: (_voice: Uint8Array, record: Uint8Array, value: number) => {
      record[byte] = clamp(value, 100)
    },
  }
}

/** A record byte holding `80` | 0–100, read as `fallback` without the mark. */
function markedRecordRow(id: VirtualAnalogRowId, byte: number, fallback: number) {
  return {
    id,
    max: 100,
    read: (_voice: Uint8Array, record: Uint8Array) =>
      record[byte] & setMark && (record[byte] & 0x7f) <= 100 ? record[byte] & 0x7f : fallback,
    write: (_voice: Uint8Array, record: Uint8Array, value: number) => {
      record[byte] = setMark | clamp(value, 100)
    },
  }
}

/** Bits `shift` onwards of packed voice byte `byte`, `width` bits wide. */
function voiceBitsRow(id: VirtualAnalogRowId, byte: number, shift: number, width: number, max = 0) {
  const mask = (1 << width) - 1
  const top = max || mask
  return {
    id,
    max: top,
    read: (voice: Uint8Array) => Math.min(top, (voice[byte] >> shift) & mask),
    write: (voice: Uint8Array, _record: Uint8Array, value: number) => {
      voice[byte] = (voice[byte] & ~(mask << shift)) | (clamp(value, top) << shift)
    },
  }
}

/** A packed voice byte holding 0–99. */
function voiceByteRow(id: VirtualAnalogRowId, byte: number) {
  return {
    id,
    max: 99,
    read: (voice: Uint8Array) => Math.min(99, voice[byte]),
    write: (voice: Uint8Array, _record: Uint8Array, value: number) => {
      voice[byte] = clamp(value, 99)
    },
  }
}

/** Record byte 26: `80` once set, Filter Type in bits 0–1, and Key Tracking in bits 2–3. */
const filterModeByte = 26
const filterMode = (record: Uint8Array) =>
  record[filterModeByte] & setMark ? record[filterModeByte] : setMark
function filterModeRow(id: VirtualAnalogRowId, shift: number) {
  return {
    choices: 4,
    id,
    max: 3,
    read: (_voice: Uint8Array, record: Uint8Array) =>
      record[filterModeByte] & setMark ? (record[filterModeByte] >> shift) & 3 : 0,
    write: (_voice: Uint8Array, record: Uint8Array, value: number) => {
      record[filterModeByte] = (filterMode(record) & ~(3 << shift)) | (clamp(value, 3) << shift)
    },
  }
}

/**
 * Record byte 53's bit 6 is the Envelope's switch; its other bits hold the knob choices, which
 * `fm1VaRecordWithKnobChoices` writes around it.
 */
const envelopeByte = 53
const envelopeOn = 0x40

/** The record's own rows go after the effect order, in this order. */
const recordRowStart = FM1_EDITOR_PARAMETER_COUNT

const recordRows = [
  {
    choices: 4,
    controller: 24,
    id: 'waveform',
    max: 3,
    // Sine 1, Saw 2, Triangle 3, Square 4; anything else plays Saw.
    read: (_voice: Uint8Array, record: Uint8Array) =>
      record[19] >= 1 && record[19] <= 4 ? record[19] - 1 : 1,
    write: (_voice: Uint8Array, record: Uint8Array, value: number) => {
      record[19] = clamp(value, 3) + 1
    },
  },
  { ...plainRecordRow('super', 20, 0), controller: 25 },
  { ...plainRecordRow('detune', 21, 50), controller: 26 },
  { ...plainRecordRow('drift', 22, 0), controller: 27 },
  { ...markedRecordRow('sub', 45, 0), controller: 28 },
  { ...markedRecordRow('noise', 46, 0), controller: 29 },
  { ...markedRecordRow('pwm', 48, 0), controller: 30 },
  { ...filterModeRow('filterType', 0), controller: 31 },
  { ...markedRecordRow('cutoff', 23, 100), controller: 74 },
  { ...markedRecordRow('resonance', 24, 0), controller: 71 },
  { ...markedRecordRow('filterEnvelope', 25, 0), controller: 52 },
  { ...markedRecordRow('filterDecay', 51, 0), controller: 53 },
  { ...markedRecordRow('filterShape', 49, 0), controller: 54 },
  { ...markedRecordRow('filterVelocity', 47, 0), controller: 55 },
  { ...filterModeRow('keyTracking', 2), controller: 56 },
  { ...markedRecordRow('lfoToCutoff', 50, 0), controller: 57 },
  {
    id: 'mono',
    max: 1,
    read: (_voice: Uint8Array, record: Uint8Array) => (record[58] ? 1 : 0),
    write: (_voice: Uint8Array, record: Uint8Array, value: number) => {
      record[58] = value ? 1 : 0
    },
  },
  {
    id: 'envelope',
    max: 1,
    read: (_voice: Uint8Array, record: Uint8Array) => (record[envelopeByte] & envelopeOn ? 1 : 0),
    write: (_voice: Uint8Array, record: Uint8Array, value: number) => {
      record[envelopeByte] = value
        ? record[envelopeByte] | envelopeOn
        : record[envelopeByte] & ~envelopeOn
    },
  },
  { ...plainRecordRow('attack', 54, 100), controller: 73, read: envelopeRead(54) },
  { ...plainRecordRow('decay', 55, 100), controller: 75, read: envelopeRead(55) },
  { ...plainRecordRow('sustain', 56, 100), controller: 70, read: envelopeRead(56) },
  { ...plainRecordRow('release', 57, 100), controller: 72, read: envelopeRead(57) },
] satisfies Omit<VirtualAnalogRow, 'index'>[]

/** The Envelope's four settings show 100 for any byte above it. */
function envelopeRead(byte: number) {
  return (_voice: Uint8Array, record: Uint8Array) => Math.min(100, record[byte])
}

/**
 * The rows kept in the packed voice, at the index of the DX7 voice parameter each shares. The
 * operator FM-1+VA calls 6 is stored first, so its bytes are 0–16 of the packed voice.
 */
const voiceRows = [
  { ...voiceByteRow('level', 14), index: 16 },
  { ...voiceBitsRow('velocityToLevel', 13, 2, 3), index: 15 },
  { ...voiceByteRow('lfoSpeed', 112), controller: 76, index: 137 },
  { ...voiceByteRow('lfoDelay', 113), controller: 78, index: 138 },
  { ...voiceByteRow('pitchModDepth', 114), controller: 77, index: 139 },
  { ...voiceByteRow('ampModDepth', 115), index: 140 },
  { ...voiceBitsRow('lfoSync', 116, 0, 1), index: 141 },
  { ...voiceBitsRow('lfoWave', 116, 1, 3, 5), choices: 6, index: 142 },
  { ...voiceBitsRow('pitchModSensitivity', 116, 4, 3), index: 143 },
] satisfies VirtualAnalogRow[]

export const virtualAnalogRows: readonly VirtualAnalogRow[] = [
  ...recordRows.map((row, offset) => ({ ...row, index: recordRowStart + offset })),
  ...voiceRows,
]

export const virtualAnalogParameterCount = recordRowStart + recordRows.length

const rowsById = new Map(virtualAnalogRows.map((row) => [row.id, row]))

export function virtualAnalogRow(id: VirtualAnalogRowId) {
  const row = rowsById.get(id)
  if (!row) throw new RangeError(`${id} is not a Virtual Analog row.`)
  return row
}

/** The Envelope's settings, which FM-1+VA plays, and sets by CC, only while its switch is on. */
export const virtualAnalogEnvelopeRows: readonly VirtualAnalogRowId[] = [
  'attack',
  'decay',
  'sustain',
  'release',
]

/** The packed voice's name bytes. */
const voiceNameByte = 118

/**
 * The editor's parameters for a Virtual Analog preset: its rows, its name, the library's effects,
 * and the Distortion type, Bitcrush, effect order, and knob choices its record keeps.
 */
export function makeVirtualAnalogEditorParameters(
  voice: Uint8Array,
  record: Uint8Array,
  effects: Uint8Array,
) {
  const parameters = new Uint8Array(virtualAnalogParameterCount)
  parameters.set(
    makeFm1EditorParameters(
      new Uint8Array(FM1_VOICE_PARAMETER_COUNT),
      effects,
      fm1VaRecordDistortionType(record),
      fm1VaRecordBitcrush(record),
      fm1VaRecordEffectOrder(record),
      fm1VaRecordKnobChoices(record, 'virtual-analog'),
    ),
  )
  parameters.set(
    voice.subarray(voiceNameByte, voiceNameByte + FM1_VOICE_NAME_LENGTH),
    FM1_VOICE_NAME_START,
  )
  for (const row of virtualAnalogRows) parameters[row.index] = row.read(voice, record)
  return parameters
}

/**
 * Copies of `voice` and `record` holding the rows and name in `parameters`. A row that already
 * reads as its parameter is left as it was, so a byte the edit did not touch keeps exactly what
 * the FM1 stored, unmarked defaults included. The effects, Distortion type, Bitcrush, effect
 * order, and knob choices are the caller's, through the record functions that write them.
 */
export function virtualAnalogFromEditorParameters(
  voice: Uint8Array,
  record: Uint8Array,
  parameters: Uint8Array,
) {
  const savedVoice = voice.slice()
  const savedRecord = record.slice()
  for (const row of virtualAnalogRows) {
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

/**
 * The Control Change value that sets a row to `value` on FM-1+VA: a list's band, or the lowest
 * value the FM1 rounds to `value`, as it shows `round(cc × top ÷ 127)`.
 */
export function virtualAnalogControlValue(row: VirtualAnalogRow, value: number) {
  if (row.choices) return fm1VaChoiceValue(clamp(value, row.choices - 1), row.choices)
  return Math.min(127, Math.max(0, Math.ceil(((clamp(value, row.max) - 0.5) * 127) / row.max)))
}

// The FM1's own Cutoff table (Baud Girl's Device Manager, `cutoffText`, from the firmware's
// `ui_knobs.cpp`): steps 0–56 in hertz, then 57–100 in hundreds of hertz.
const cutoffHertz = [
  20, 21, 23, 25, 26, 28, 30, 32, 35, 37, 40, 43, 46, 49, 53, 56, 60, 65, 69, 74, 80, 85, 91, 98,
  105, 112, 121, 129, 138, 148, 159, 170, 182, 195, 209, 224, 240, 258, 276, 296, 317, 340, 364,
  390, 418, 448, 480, 514, 551, 590, 632, 678, 726, 778, 834, 893, 957,
]
const cutoffHundredsOfHertz = [
  10, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 23, 25, 26, 28, 30, 33, 35, 38, 40, 43, 46, 50,
  53, 57, 61, 66, 70, 76, 81, 87, 93, 100, 107, 115, 123, 132, 141, 151, 162, 174, 186, 200,
]

/** A Cutoff step, 0 to 100, in hertz as the FM1 shows it: 20 Hz to 20 kHz. */
export function virtualAnalogCutoffHertz(step: number) {
  const value = clamp(step, 100)
  return value < cutoffHertz.length
    ? cutoffHertz[value]
    : cutoffHundredsOfHertz[value - cutoffHertz.length] * 100
}
