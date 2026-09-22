/**
 * Short looping phrases for auditioning a patch while it is edited.
 *
 * Each phrase exists to expose a different part of an FM voice, so the set is chosen for what it
 * tests rather than for the tune: sustained chords show the slow envelopes and the release,
 * staccato notes show the attack, and a rising velocity run shows the velocity sensitivity the
 * DX7 is known for. Every phrase is written for this project; none quotes an existing recording.
 *
 * Names live in the locale files under `phrases.<id>`.
 */

type AuditionPhraseNote = {
  /** Where the note starts, in beats from the start of the phrase. */
  start: number
  /** How long the note sounds, in beats. */
  duration: number
  /** MIDI note number, 0 to 127. */
  note: number
  /** MIDI attack velocity, 1 to 127. */
  velocity: number
}

export type AuditionPhrase = {
  id: string
  /** The length of the loop in beats; the phrase restarts here. */
  beats: number
  /** The tempo the phrase is written for, in beats per minute. */
  tempo: number
  notes: AuditionPhraseNote[]
}

export const minPhraseTempo = 40
export const maxPhraseTempo = 200

const c3 = 48
const c4 = 60

function chord(start: number, duration: number, notes: number[], velocity: number) {
  return notes.map((note) => ({ duration, note, start, velocity }))
}

function run(
  start: number,
  step: number,
  duration: number,
  notes: number[],
  velocity: (index: number) => number,
) {
  return notes.map((note, index) => ({
    duration,
    note,
    start: start + index * step,
    velocity: velocity(index),
  }))
}

/**
 * Sustained four-note chords. The long notes and the gap before the loop restarts show the
 * attack and release of the amplitude envelopes, and anything the effects add to a held sound.
 */
const pad: AuditionPhrase = {
  beats: 8,
  id: 'pad',
  notes: [
    ...chord(0, 3.6, [c3 + 5, c3 + 9, c4, c4 + 4], 72),
    ...chord(4, 3.6, [c3 + 7, c3 + 11, c4 + 2, c4 + 5], 64),
  ],
  tempo: 76,
}

/** Short, hard bass notes an octave and a half below middle C, for the attack and the low end. */
const bass: AuditionPhrase = {
  beats: 8,
  id: 'bass',
  notes: [
    ...run(0, 0.5, 0.3, [c3 - 12, c3 - 12, c3 - 5, c3 - 12], (index) =>
      index === 0 ? 112 : index === 2 ? 96 : 80,
    ),
    ...run(2, 0.5, 0.3, [c3 - 10, c3 - 12, c3 - 3, c3 - 12], (index) => (index === 0 ? 108 : 78)),
    ...run(4, 0.5, 0.3, [c3 - 12, c3 - 12, c3 - 5, c3 - 12], (index) =>
      index === 0 ? 112 : index === 2 ? 96 : 80,
    ),
    ...run(6, 0.5, 0.3, [c3 - 7, c3 - 5, c3 - 3, c3 - 1], (index) => 72 + index * 12),
  ],
  tempo: 108,
}

/**
 * Chords played off the beat with changing velocity, the way an electric piano is comped. The
 * velocity changes make the DX7's brightness-with-velocity response easy to hear.
 */
const electricPiano: AuditionPhrase = {
  beats: 8,
  id: 'electricPiano',
  notes: [
    ...chord(0, 0.9, [c3 + 5, c3 + 9, c4, c4 + 4], 104),
    ...chord(1.5, 0.4, [c3 + 9, c4, c4 + 4], 62),
    ...chord(2.5, 1.4, [c3 + 7, c3 + 11, c4 + 2], 88),
    ...chord(4, 0.9, [c3 + 4, c3 + 7, c3 + 11, c4 + 2], 100),
    ...chord(5.5, 0.4, [c3 + 7, c3 + 11, c4 + 2], 58),
    ...chord(6.5, 1.4, [c3 + 5, c3 + 9, c4, c4 + 4], 84),
  ],
  tempo: 96,
}

/**
 * A single line ending on a long held note, so the LFO delay and any vibrato have time to arrive
 * while the note is still sounding.
 */
const lead: AuditionPhrase = {
  beats: 8,
  id: 'lead',
  notes: [
    ...run(0, 0.5, 0.45, [c4, c4 + 3, c4 + 5, c4 + 7], () => 100),
    ...run(2, 0.5, 0.45, [c4 + 10, c4 + 7, c4 + 5, c4 + 3], () => 92),
    { duration: 1.4, note: c4 + 12, start: 4, velocity: 112 },
    ...run(5.5, 0.5, 0.45, [c4 + 10, c4 + 7], () => 88),
    { duration: 1, note: c4 + 5, start: 7, velocity: 96 },
  ],
  tempo: 104,
}

/** Fast, even sixteenths across two octaves, for the attack, the decay, and the tuning. */
const arpeggio: AuditionPhrase = {
  beats: 8,
  id: 'arpeggio',
  notes: [
    ...run(
      0,
      0.25,
      0.22,
      [c3, c3 + 7, c4, c4 + 4, c4 + 7, c4 + 4, c4, c3 + 7],
      (index) => 96 - index * 4,
    ),
    ...run(
      2,
      0.25,
      0.22,
      [c3 + 5, c3 + 9, c4, c4 + 5, c4 + 9, c4 + 5, c4, c3 + 9],
      (index) => 96 - index * 4,
    ),
    ...run(
      4,
      0.25,
      0.22,
      [c3 + 7, c3 + 11, c4 + 2, c4 + 7, c4 + 11, c4 + 7, c4 + 2, c3 + 11],
      (index) => 96 - index * 4,
    ),
    ...run(
      6,
      0.25,
      0.22,
      [c3, c3 + 7, c4, c4 + 4, c4 + 7, c4 + 4, c4, c3 + 7],
      (index) => 96 - index * 4,
    ),
  ],
  tempo: 120,
}

/** One note, eight times, from very soft to very hard: the plainest velocity test there is. */
const velocityRamp: AuditionPhrase = {
  beats: 8,
  id: 'velocityRamp',
  notes: run(
    0,
    1,
    0.8,
    Array.from({ length: 8 }, () => c4),
    (index) => 12 + index * 16,
  ),
  tempo: 88,
}

export const auditionPhrases: AuditionPhrase[] = [
  pad,
  electricPiano,
  bass,
  lead,
  arpeggio,
  velocityRamp,
]

export const defaultAuditionPhraseId = pad.id

export function findAuditionPhrase(id: string) {
  return auditionPhrases.find((phrase) => phrase.id === id)
}
