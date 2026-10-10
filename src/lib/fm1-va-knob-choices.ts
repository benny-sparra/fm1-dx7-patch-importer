import type { Fm1Firmware } from '@/lib/fm1-firmware'
import type { Fm1VaEngine } from '@/lib/fm1-va-engine'
import { FM1_VA_FM_KNOB_CHOICES } from '@/lib/fm1-parameters'
import { playsFm1VaBitcrush } from '@/lib/fm1-va-record-effects'

/**
 * What KNOB1–4 play on FM-1+VA's Preset knob bank, chosen per preset from eight its engine offers,
 * in the order the FM1 lists them (docs/fm1-research.md, "FM-1_096"). A choice's number is its
 * place in its engine's list.
 */
export const fm1VaKnobChoiceIds = {
  fm: ['brightness', 'feedback', 'attack', 'decay', 'release', 'vibrato', 'lfoSpeed', 'cutoff'],
  'virtual-analog': [
    'cutoff',
    'resonance',
    'filterEnvelope',
    'filterDecay',
    'shape',
    'super',
    'detune',
    'lfoToCutoff',
  ],
  'eight-bit': [
    'drumDecay',
    'bassArpeggio',
    'leadArpeggio',
    'leadDecay',
    'leadArpSpeed',
    'leadVibrato',
    'leadRelease',
    'bassDecay',
  ],
} as const satisfies Record<Fm1VaEngine, readonly string[]>

/** The four a new preset starts with on each engine, as FM-1+VA's manual lists them. */
const defaultKnobChoices: Record<Fm1VaEngine, readonly number[]> = {
  fm: FM1_VA_FM_KNOB_CHOICES,
  'virtual-analog': [0, 1, 2, 3],
  'eight-bit': [0, 1, 2, 3],
}

/** The knobs a preset that never chose them plays on `engine`. */
export function fm1VaDefaultKnobChoices(engine: Fm1VaEngine) {
  return [...defaultKnobChoices[engine]]
}

/**
 * Record byte 53 holds Knob 1 in bits 0–2 and Knob 2 in bits 3–5, and byte 52 Knob 3 and Knob 4
 * the same way. Bit 7 marks a byte's two choices as set; without it, both knobs play their
 * defaults. Bit 6 of byte 53 is the Envelope's switch, and bit 6 of byte 52 is kept as read.
 */
const knobBytes = [53, 52] as const
const setMark = 0x80
const keptBit = 0x40
const fieldMask = 0x07

/** FM-1_096 added knob choices with Bitcrush, so the same releases play them. */
export function playsFm1VaKnobChoices(firmware: Fm1Firmware) {
  return playsFm1VaBitcrush(firmware)
}

/** The four knob choices a record holds, Knob 1 first, for a preset on `engine`. */
export function fm1VaRecordKnobChoices(record: Uint8Array, engine: Fm1VaEngine): number[] {
  const defaults = defaultKnobChoices[engine]
  return knobBytes.flatMap((byte, pair) => {
    const value = record[byte]
    if (!(value & setMark)) return defaults.slice(pair * 2, pair * 2 + 2)
    return [value & fieldMask, (value >> 3) & fieldMask]
  })
}

/**
 * A copy of `record` holding `choices`, Knob 1 first, for a preset on `engine`. A byte whose two
 * knobs already read as `choices` is left as it was, and a record that needs no change is
 * returned as it was, so a preset whose knobs were never touched keeps bytes that never set them.
 * Changing a knob writes both choices of its byte and marks it set, as the FM1 does.
 */
export function fm1VaRecordWithKnobChoices(
  record: Uint8Array,
  choices: readonly number[],
  engine: Fm1VaEngine,
) {
  const current = fm1VaRecordKnobChoices(record, engine)
  const next = current.map((choice, knob) =>
    Math.max(0, Math.min(fieldMask, Math.round(choices[knob] ?? choice))),
  )
  if (next.every((choice, knob) => choice === current[knob])) return record
  const updated = record.slice()
  knobBytes.forEach((byte, pair) => {
    const [first, second] = next.slice(pair * 2, pair * 2 + 2)
    if (first === current[pair * 2] && second === current[pair * 2 + 1]) return
    updated[byte] = setMark | (record[byte] & keptBit) | (second << 3) | first
  })
  return updated
}
