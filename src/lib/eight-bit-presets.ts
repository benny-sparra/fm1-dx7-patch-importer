import {
  eightBitParameterCount,
  eightBitRow,
  eightBitRows,
  type EightBitRowId,
} from '@/lib/fm1-va-eight-bit-editor'
import { switchEffectsOff } from '@/lib/init-voice'

const bytes = (hex: string) => Uint8Array.from(hex.split(' '), (byte) => Number.parseInt(byte, 16))

/**
 * The blank 8-Bit preset the FM1 itself writes for Erase Preset, read back on `FM-1_097`
 * (docs/hardware-runs/fm1-va-097-capture-032-erase-8bit-2026-10-10.json, test M3). Init takes
 * every row from it.
 */
const blankVoice = bytes(
  '28 18 2D 63 00 60 32 0C 46 00 02 04 23 00 00 0A 28 34 26 24 5A 50 5C 32 10 41 00 4B 04 20 00 0C ' +
    '0D 00 48 32 1E 55 00 60 32 37 46 00 00 04 29 00 32 0A 5F 24 28 32 5A 00 2B 28 30 5A 00 04 00 23 ' +
    '00 00 08 23 48 32 0A 50 1E 32 28 2D 5A 00 3C 00 00 00 1E 08 00 4C 32 1C 46 00 58 32 52 4B 00 00 ' +
    '00 08 00 32 0A 50 63 63 63 63 32 32 32 32 00 08 23 00 00 00 30 18 49 4E 49 54 20 20 20 20 20 20',
)
const blankRecord = bytes(
  '6B 03 03 1E 1E 03 1E 1E 19 1E 37 46 1E 19 28 1E 32 14 C3 04 00 01 00 FF FF FF 03 00 00 00 01 00 ' +
    '00 02 00 00 03 00 00 04 00 00 05 00 00 FF FF FF FF FF FF FF 00 00 00 00 00 00 00',
)

/**
 * The FM1's own blank 8-Bit preset, with every effect switched off. The name, the effects'
 * settings, the Distortion type, Bitcrush, effect order, and knob choices are kept.
 */
export function initializeEightBit(parameters: Uint8Array) {
  if (parameters.length !== eightBitParameterCount) {
    throw new RangeError(`8-Bit presets require ${eightBitParameterCount} editor parameters.`)
  }
  const next = parameters.slice()
  for (const row of eightBitRows) next[row.index] = row.read(blankVoice, blankRecord)
  switchEffectsOff(next)
  return next
}

type DrumField = 'Choke' | 'Decay' | 'Pitch' | 'Snap' | 'Sweep' | 'Wave'
/** A drum's sound, stored as its rows store it: every field but Level, which keeps the kit's balance. */
type DrumSound = Readonly<Record<DrumField, number>>

/**
 * The twelve drums of the FM1's own blank kit (above), one per key from F0 to E1, as starting
 * points for any drum. Its hats share choke group A, as the FM1's manual describes. Named by what
 * each plays in that kit, listed kick first.
 */
export const eightBitDrumPresets = [
  { id: 'kick', key: 0 },
  { id: 'snare', key: 2 },
  { id: 'noiseSnare', key: 4 },
  { id: 'rim', key: 8 },
  { id: 'closedHat', key: 1 },
  { id: 'openHat', key: 5 },
  { id: 'metalHat', key: 3 },
  { id: 'crash', key: 11 },
  { id: 'lowTom', key: 6 },
  { id: 'midTom', key: 7 },
  { id: 'highTom', key: 9 },
  { id: 'blip', key: 10 },
] as const

export type EightBitDrumPresetId = (typeof eightBitDrumPresets)[number]['id']

const eightBitDrumKeyCount = 12
const drumFields: readonly DrumField[] = ['Wave', 'Pitch', 'Sweep', 'Decay', 'Snap', 'Choke']
const drumRowId = (drum: number, field: DrumField) => `drum${drum}${field}` as EightBitRowId

function blankDrum(key: number): DrumSound {
  const read = (field: DrumField) =>
    eightBitRow(drumRowId(key, field)).read(blankVoice, blankRecord)
  return Object.fromEntries(drumFields.map((field) => [field, read(field)])) as DrumSound
}

/** The rows drum `drum` (0 for F0 to 11 for E1) takes from preset `id`, as one change. */
export function eightBitDrumPresetValues(drum: number, id: EightBitDrumPresetId) {
  const preset = eightBitDrumPresets.find((candidate) => candidate.id === id)
  if (!preset) throw new RangeError(`Unknown 8-Bit drum preset: ${id}`)
  const sound = blankDrum(preset.key)
  return drumFields.map((field) => [drumRowId(drum, field), sound[field]] as const)
}

type PartField =
  | 'Attack'
  | 'Decay'
  | 'DutySequence'
  | 'Glide'
  | 'Release'
  | 'Sustain'
  | 'Sweep'
  | 'Vibrato'
  | 'Wave'
/**
 * A part's sound: its tone and the shape of each note. Its Arpeggio, Note Engine, Octave, Level,
 * and Mono are how it is played, and a preset leaves them alone. Sweep is stored, 50 holding the
 * pitch still.
 */
type PartSound = Readonly<Record<PartField, number>>

const [pulse125, pulse25, pulse50] = [0, 1, 2]
const triangle = 4
const [gbSine, gbOrgan, gbBass, gbBell] = [8, 10, 12, 13]
const [dutyOff, dutySweep, dutySlowWobble, dutyPluck] = [0, 4, 6, 7]

/**
 * Sounds for the bass or the lead. The first two are the FM1's own blank bass and lead; the rest
 * are the editor's, and are heard on an FM1 before they ship (docs/feature-backlog.md).
 */
export const eightBitPartPresets = [
  {
    id: 'triangle',
    sound: {
      Wave: triangle,
      DutySequence: dutyOff,
      Attack: 0,
      Decay: 40,
      Sustain: 75,
      Release: 12,
    },
  },
  {
    id: 'pulse',
    sound: { Wave: pulse25, DutySequence: dutyOff, Attack: 0, Decay: 35, Sustain: 60, Release: 30 },
  },
  {
    id: 'square',
    sound: {
      Wave: pulse50,
      DutySequence: dutyOff,
      Attack: 0,
      Decay: 30,
      Sustain: 70,
      Release: 20,
      Vibrato: 15,
    },
  },
  {
    id: 'pluck',
    sound: {
      Wave: pulse25,
      DutySequence: dutyPluck,
      Attack: 0,
      Decay: 25,
      Sustain: 0,
      Release: 10,
    },
  },
  {
    id: 'wobble',
    sound: {
      Wave: pulse50,
      DutySequence: dutySlowWobble,
      Attack: 0,
      Decay: 50,
      Sustain: 80,
      Release: 15,
    },
  },
  {
    id: 'sweep',
    sound: {
      Wave: pulse125,
      DutySequence: dutySweep,
      Attack: 0,
      Decay: 40,
      Sustain: 70,
      Release: 25,
      Vibrato: 20,
    },
  },
  {
    id: 'gbBass',
    sound: { Wave: gbBass, DutySequence: dutyOff, Attack: 0, Decay: 45, Sustain: 70, Release: 12 },
  },
  {
    id: 'organ',
    sound: { Wave: gbOrgan, DutySequence: dutyOff, Attack: 5, Decay: 20, Sustain: 90, Release: 20 },
  },
  {
    id: 'bell',
    sound: { Wave: gbBell, DutySequence: dutyOff, Attack: 0, Decay: 60, Sustain: 0, Release: 45 },
  },
  {
    id: 'pad',
    sound: {
      Wave: gbSine,
      DutySequence: dutyOff,
      Attack: 45,
      Decay: 50,
      Sustain: 80,
      Release: 60,
      Vibrato: 15,
    },
  },
] as const

export type EightBitPartPresetId = (typeof eightBitPartPresets)[number]['id']
type Part = 'bass' | 'lead'

function partSound(id: EightBitPartPresetId): PartSound {
  const preset = eightBitPartPresets.find((candidate) => candidate.id === id)
  if (!preset) throw new RangeError(`Unknown 8-Bit part preset: ${id}`)
  // Vibrato, Glide, and Sweep rest unless a preset moves them.
  return { Glide: 0, Sweep: 50, Vibrato: 0, ...preset.sound }
}

/** The rows part `part` takes from preset `id`, as one change. */
export function eightBitPartPresetValues(part: Part, id: EightBitPartPresetId) {
  return Object.entries(partSound(id)).map(
    ([field, value]) => [`${part}${field}` as EightBitRowId, value] as const,
  )
}

/**
 * Whole-patch starting points: the FM1's own kit at Drum Decay 50, a sound for each part, Tone and
 * Tuning, and each part's Arpeggio, which plays while the patch has no Key. The Key and its
 * settings, each part's Note Engine, Octave, Level, and Mono, the name, the Envelope, the LFO, and
 * the effects are kept.
 */
export const eightBitStarters = [
  { id: 'console', bass: 'triangle', lead: 'pulse', tone: 1, tuning: 0, leadArpeggio: 0 },
  { id: 'rawChip', bass: 'square', lead: 'sweep', tone: 0, tuning: 1, leadArpeggio: 0 },
  { id: 'gameBoy', bass: 'gbBass', lead: 'bell', tone: 1, tuning: 0, leadArpeggio: 0 },
  { id: 'arpLead', bass: 'pluck', lead: 'square', tone: 1, tuning: 0, leadArpeggio: 3 },
] as const satisfies readonly {
  bass: EightBitPartPresetId
  id: string
  lead: EightBitPartPresetId
  leadArpeggio: number
  tone: number
  tuning: number
}[]

export type EightBitStarterId = (typeof eightBitStarters)[number]['id']

/** Arp Speed 1/32, quick enough that an arpeggio reads as a chord. */
const arpSpeed32 = 4

/** Applies starter `id` to the editor's parameters, keeping what `eightBitStarters` keeps. */
export function applyEightBitStarter(parameters: Uint8Array, id: EightBitStarterId) {
  if (parameters.length !== eightBitParameterCount) {
    throw new RangeError(`8-Bit presets require ${eightBitParameterCount} editor parameters.`)
  }
  const starter = eightBitStarters.find((candidate) => candidate.id === id)
  if (!starter) throw new RangeError(`Unknown 8-Bit starter: ${id}`)
  const next = parameters.slice()
  const set = (values: Iterable<readonly [EightBitRowId, number]>) => {
    for (const [row, value] of values) next[eightBitRow(row).index] = value
  }
  for (let drum = 0; drum < eightBitDrumKeyCount; drum += 1) {
    set(drumFields.map((field) => [drumRowId(drum, field), blankDrum(drum)[field]] as const))
  }
  set(eightBitPartPresetValues('bass', starter.bass))
  set(eightBitPartPresetValues('lead', starter.lead))
  set([
    ['drumDecay', 50],
    ['tone', starter.tone],
    ['tuning', starter.tuning],
    ['bassArpeggio', 0],
    ['leadArpeggio', starter.leadArpeggio],
    ['leadArpSpeed', arpSpeed32],
  ])
  return next
}
