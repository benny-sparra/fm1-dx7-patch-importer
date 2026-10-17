import { fm1VaChoiceValue } from '@/lib/fm1-va-sound-control'

/**
 * A row of an FM-1+VA preset an editor sets: where it sits among the editor's parameters, its
 * range, how it is read from and written to the preset's voice bytes and record, and the
 * sound-setting Control Change that sets it live, where it has one.
 */
export type Fm1VaRow<Id extends string = string> = {
  /** For a list, how many choices it has; the value is the choice's number. */
  choices?: number
  /** The sound-setting Control Change that sets it live, where it has one. */
  controller?: number
  id: Id
  /** Where the row is in the editor's parameters. */
  index: number
  max: number
  read: (voice: Uint8Array, record: Uint8Array) => number
  /** Writes `value` into copies of the voice and record. */
  write: (voice: Uint8Array, record: Uint8Array, value: number) => void
}

export type Fm1VaEnvelopeRowId = 'attack' | 'decay' | 'envelope' | 'release' | 'sustain'
export type Fm1VaLfoRowId =
  | 'ampModDepth'
  | 'lfoDelay'
  | 'lfoSpeed'
  | 'lfoSync'
  | 'lfoWave'
  | 'pitchModDepth'
  | 'pitchModSensitivity'

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, Math.round(value)))

/**
 * Record byte 53's bit 6 is the Envelope's switch; its other bits hold the knob choices, which
 * `fm1VaRecordWithKnobChoices` writes around it.
 */
const envelopeByte = 53
const envelopeOn = 0x40

/** One of the Envelope's four settings: 0–100, and 100 for any byte above it. */
function envelopeSettingRow(id: Fm1VaEnvelopeRowId, byte: number, controller: number) {
  return {
    controller,
    id,
    max: 100,
    read: (_voice: Uint8Array, record: Uint8Array) => Math.min(100, record[byte]),
    write: (_voice: Uint8Array, record: Uint8Array, value: number) => {
      record[byte] = clamp(value, 100)
    },
  }
}

/**
 * The Envelope, which a Virtual Analog and an 8-Bit preset keep in the same record bytes as an FM
 * one (docs/fm1-research.md): its switch, then Attack, Decay, Sustain, and Release, with the
 * controllers that set them live.
 */
export const fm1VaEnvelopeRows = [
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
  envelopeSettingRow('attack', 54, 73),
  envelopeSettingRow('decay', 55, 75),
  envelopeSettingRow('sustain', 56, 70),
  envelopeSettingRow('release', 57, 72),
] satisfies Omit<Fm1VaRow<Fm1VaEnvelopeRowId>, 'index'>[]

/** The Envelope's settings, which FM-1+VA plays, and sets by CC, only while its switch is on. */
export const fm1VaEnvelopeSettingIds: readonly Fm1VaEnvelopeRowId[] = [
  'attack',
  'decay',
  'sustain',
  'release',
]

/** Bits `shift` onwards of packed voice byte `byte`, `width` bits wide. */
export function voiceBitsRow<Id extends string>(
  id: Id,
  byte: number,
  shift: number,
  width: number,
  max = 0,
) {
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
export function voiceByteRow<Id extends string>(id: Id, byte: number) {
  return {
    id,
    max: 99,
    read: (voice: Uint8Array) => Math.min(99, voice[byte]),
    write: (voice: Uint8Array, _record: Uint8Array, value: number) => {
      voice[byte] = clamp(value, 99)
    },
  }
}

/**
 * The LFO, in the packed voice bytes a DX7 voice keeps it in on every FM-1+VA engine, at the index
 * of the DX7 voice parameter each shares, with the controllers that set its speed, delay, and
 * pitch depth live.
 */
export const fm1VaLfoRows = [
  { ...voiceByteRow('lfoSpeed', 112), controller: 76, index: 137 },
  { ...voiceByteRow('lfoDelay', 113), controller: 78, index: 138 },
  { ...voiceByteRow('pitchModDepth', 114), controller: 77, index: 139 },
  { ...voiceByteRow('ampModDepth', 115), index: 140 },
  { ...voiceBitsRow('lfoSync', 116, 0, 1), index: 141 },
  { ...voiceBitsRow('lfoWave', 116, 1, 3, 5), choices: 6, index: 142 },
  { ...voiceBitsRow('pitchModSensitivity', 116, 4, 3), index: 143 },
] satisfies Fm1VaRow<Fm1VaLfoRowId>[]

/**
 * The Control Change value that sets a row to `value` on FM-1+VA: a list's band, or the lowest
 * value the FM1 rounds to `value`, as it shows `round(cc × top ÷ 127)`.
 */
export function fm1VaRowControlValue(row: Fm1VaRow, value: number) {
  if (row.choices) return fm1VaChoiceValue(clamp(value, row.choices - 1), row.choices)
  return Math.min(127, Math.max(0, Math.ceil(((clamp(value, row.max) - 0.5) * 127) / row.max)))
}
