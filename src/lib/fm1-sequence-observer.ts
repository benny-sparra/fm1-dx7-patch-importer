import {
  createFm1Pattern,
  fm1SequenceMaxGatePercent,
  fm1SequenceMaxLoopLength,
  fm1SequenceMinGatePercent,
  fm1SequenceMinLoopLength,
  type Fm1Pattern,
  type Fm1SequenceStep,
} from './fm1-sequence'

/**
 * Reconstructs a pattern from the FM1's own playback (SEQ-OBS-002).
 *
 * This is the only read path there is: no request/reply for sequence state is known, so the editor
 * can see a pattern only while the device is playing it. It is read-only and transmits nothing.
 *
 * Two limits are inherent rather than incidental, and callers must keep presenting them as limits:
 *
 * - Observation cannot tell which step is step 1. A loop has no marker, so the reconstruction is a
 *   rotation of the true pattern, anchored on the first note that happened to be heard. Compare
 *   patterns with `fm1PatternRotationsMatch` rather than by index.
 * - A pattern is only declared once two complete passes agree. Anything less is reported as
 *   incomplete, never as a pattern with gaps filled in.
 */

export type Fm1ObservedNoteMessage = {
  atMs: number
  kind: 'on' | 'off'
  pitch: number
  velocity: number
}

/** Four passes of the longest loop, each step a note on and a note off, and room to spare. */
export const fm1ObservationMessageLimit = 256

/** Playback timing jitters by two to three milliseconds across the captured fixtures. */
export const fm1ObservationToleranceMs = 10

type Fm1ObservationProblem =
  /** Fewer than two notes were heard, so there is nothing to find a loop in. */
  | 'too-few-notes'
  /** No repeat was heard twice over. The device may not be playing, or may have just started. */
  | 'no-repeat'
  /** A repeat was found, but the passes disagree. Someone is probably playing along. */
  | 'inconsistent-passes'
  /** More than one step length fits what was heard, or none does. */
  | 'loop-length-unresolved'
  /** Notes landed off any step grid the loop period allows. */
  | 'off-grid'

export type Fm1PatternObservation =
  | {
      status: 'observed'
      /** Rotated: index 0 is the first note heard, not necessarily the device's step 1. */
      pattern: Fm1Pattern
      passes: number
      loopPeriodMs: number
      stepIntervalMs: number
      /** Estimated from playback note lengths; null when no note off was heard. */
      observedGatePercent: number | null
    }
  | {
      status: 'incomplete'
      problem: Fm1ObservationProblem
      passes: number
      /** Set for 'loop-length-unresolved': the step lengths that fit what was heard. */
      candidateLoopLengths?: number[]
    }

export type Fm1ObservationOptions = {
  /**
   * The Step length shown on the device. Several step lengths can fit the same playback, so an
   * observation that would otherwise be ambiguous is resolved by what the user can read off the
   * stock page rather than by guessing.
   */
  loopLength?: number
  toleranceMs?: number
}

/**
 * Collects inbound note messages in a bounded window, the way the MIDI log keeps a bounded history
 * rather than growing for as long as a device is connected.
 */
export class Fm1PlaybackObserver {
  private messages: Fm1ObservedNoteMessage[] = []
  private readonly limit: number

  constructor(limit = fm1ObservationMessageLimit) {
    this.limit = limit
  }

  /** Feeds one inbound MIDI message. Returns whether it was a note message worth keeping. */
  ingest(data: Uint8Array | number[], atMs: number) {
    const message = decodeNoteMessage(data, atMs)
    if (!message) return false
    this.messages.push(message)
    if (this.messages.length > this.limit) {
      this.messages = this.messages.slice(this.messages.length - this.limit)
    }
    return true
  }

  clear() {
    this.messages = []
  }

  get observed(): readonly Fm1ObservedNoteMessage[] {
    return this.messages
  }

  observe(options?: Fm1ObservationOptions) {
    return reconstructFm1Pattern(this.messages, options)
  }
}

function decodeNoteMessage(
  data: Uint8Array | number[],
  atMs: number,
): Fm1ObservedNoteMessage | null {
  const bytes = Array.from(data)
  if (bytes.length < 3) return null
  const command = bytes[0] & 0xf0
  const pitch = bytes[1]
  const velocity = bytes[2]
  if (pitch > 127 || velocity > 127) return null
  if (command === 0x80) return { atMs, kind: 'off', pitch, velocity }
  // A note on with velocity 0 is a release, as it is everywhere else in MIDI.
  if (command === 0x90) return { atMs, kind: velocity === 0 ? 'off' : 'on', pitch, velocity }
  return null
}

export function reconstructFm1Pattern(
  messages: readonly Fm1ObservedNoteMessage[],
  { loopLength, toleranceMs = fm1ObservationToleranceMs }: Fm1ObservationOptions = {},
): Fm1PatternObservation {
  const onsets = messages
    .filter((message) => message.kind === 'on')
    .slice()
    .sort((left, right) => left.atMs - right.atMs)

  if (onsets.length < 2) return { status: 'incomplete', problem: 'too-few-notes', passes: 0 }

  const loop = findLoop(onsets, toleranceMs)
  if (loop.problem) return { status: 'incomplete', problem: loop.problem, passes: loop.passes }

  const { periodMs, passes, firstPass } = loop
  const offsets = firstPass.map((onset) => onset.atMs - firstPass[0].atMs)
  const candidates = (
    loopLength === undefined
      ? Array.from(
          { length: fm1SequenceMaxLoopLength - fm1SequenceMinLoopLength + 1 },
          (_unused, index) => fm1SequenceMinLoopLength + index,
        )
      : [loopLength]
  ).filter((length) => fitsGrid(offsets, periodMs, length, toleranceMs))

  if (candidates.length !== 1) {
    return {
      status: 'incomplete',
      problem: candidates.length === 0 ? 'off-grid' : 'loop-length-unresolved',
      passes,
      ...(candidates.length > 1 ? { candidateLoopLengths: candidates } : {}),
    }
  }

  const resolvedLength = candidates[0]
  const stepIntervalMs = periodMs / resolvedLength
  const steps: Fm1SequenceStep[] = createFm1Pattern(resolvedLength).steps.slice()

  firstPass.forEach((onset, index) => {
    steps[Math.round(offsets[index] / stepIntervalMs)] = {
      kind: 'note',
      pitch: onset.pitch,
      velocity: onset.velocity,
    }
  })

  const observedGatePercent = estimateGatePercent(messages, firstPass, stepIntervalMs)

  return {
    status: 'observed',
    pattern: {
      loopLength: resolvedLength,
      steps,
      gatePercent: observedGatePercent ?? createFm1Pattern(resolvedLength).gatePercent,
    },
    passes,
    loopPeriodMs: periodMs,
    stepIntervalMs,
    observedGatePercent,
  }
}

type LoopSearchResult = {
  problem?: Fm1ObservationProblem
  passes: number
  periodMs: number
  firstPass: Fm1ObservedNoteMessage[]
}

/**
 * How many passes are compared. Two must agree before a pattern is declared; a third is compared
 * when it is there, so a pass from before the user changed the device cannot linger unnoticed.
 */
export const fm1ObservationMaxPasses = 3

/**
 * Finds the loop in the most recent playback.
 *
 * The window ends on the last note heard and runs backwards in whole periods, so every pass it
 * compares is bounded at both ends: the tail of a loop that has not finished playing is never
 * mistaken for the end of the pattern. Working backwards also keeps the comparison close together
 * in time, so the device's own few-millisecond drift cannot accumulate into a false mismatch.
 */
function findLoop(onsets: Fm1ObservedNoteMessage[], toleranceMs: number): LoopSearchResult {
  const last = onsets[onsets.length - 1]
  const earliest = onsets[0].atMs
  let sawEnoughPasses = false

  for (let index = onsets.length - 2; index >= 0; index -= 1) {
    const candidate = onsets[index]
    if (candidate.pitch !== last.pitch || candidate.velocity !== last.velocity) continue

    const periodMs = last.atMs - candidate.atMs
    if (periodMs <= 0) continue

    const available = Math.floor((last.atMs - earliest + toleranceMs) / periodMs)
    const passes = Math.min(fm1ObservationMaxPasses, available)
    if (passes < 2) continue
    sawEnoughPasses = true

    const windowStart = last.atMs - passes * periodMs
    const grouped: Fm1ObservedNoteMessage[][] = Array.from({ length: passes }, () => [])

    onsets.forEach((onset) => {
      const elapsed = onset.atMs - windowStart
      if (elapsed < -toleranceMs) return
      const pass = Math.floor((elapsed + toleranceMs) / periodMs)
      if (pass < 0 || pass >= passes) return
      grouped[pass].push(onset)
    })

    const consistent = grouped.every((pass, passIndex) => {
      if (passIndex === 0) return grouped[0].length > 0
      if (pass.length !== grouped[0].length) return false
      return pass.every((onset, position) => {
        const reference = grouped[0][position]
        const offset = onset.atMs - windowStart - passIndex * periodMs
        const referenceOffset = reference.atMs - windowStart
        if (Math.abs(offset - referenceOffset) > toleranceMs) return false
        return onset.pitch === reference.pitch && onset.velocity === reference.velocity
      })
    })

    if (consistent) return { passes, periodMs, firstPass: grouped[0] }
  }

  return {
    problem: sawEnoughPasses ? 'inconsistent-passes' : 'no-repeat',
    passes: 0,
    periodMs: 0,
    firstPass: [],
  }
}

function fitsGrid(
  offsets: number[],
  periodMs: number,
  loopLength: number,
  toleranceMs: number,
): boolean {
  if (
    !Number.isInteger(loopLength) ||
    loopLength < fm1SequenceMinLoopLength ||
    loopLength > fm1SequenceMaxLoopLength
  ) {
    return false
  }

  const stepIntervalMs = periodMs / loopLength
  const used = new Set<number>()

  return offsets.every((offset) => {
    const index = Math.round(offset / stepIntervalMs)
    if (index < 0 || index >= loopLength || used.has(index)) return false
    used.add(index)
    return Math.abs(offset - index * stepIntervalMs) <= toleranceMs
  })
}

/**
 * Estimates the device's global Gate from how long playback held each note.
 *
 * The captured Gate values land within a percent or two of a multiple of five, so the estimate is
 * rounded to five: the stock control moves in visible steps, and a spuriously precise 79% would
 * invite a comparison the observation cannot support.
 */
function estimateGatePercent(
  messages: readonly Fm1ObservedNoteMessage[],
  firstPass: Fm1ObservedNoteMessage[],
  stepIntervalMs: number,
): number | null {
  const durations = firstPass
    .map((onset) => {
      const release = messages.find(
        (message) =>
          message.kind === 'off' && message.pitch === onset.pitch && message.atMs > onset.atMs,
      )
      return release ? release.atMs - onset.atMs : null
    })
    .filter((duration): duration is number => duration !== null && duration > 0)

  if (durations.length === 0) return null

  const sorted = durations.slice().sort((left, right) => left - right)
  const median = sorted[Math.floor(sorted.length / 2)]
  const percent = Math.round((median / stepIntervalMs) * 20) * 5

  return Math.min(fm1SequenceMaxGatePercent, Math.max(fm1SequenceMinGatePercent, percent))
}

/** Rotates a pattern so the step at `by` becomes index 0. */
export function rotateFm1Pattern(pattern: Fm1Pattern, by: number): Fm1Pattern {
  const length = pattern.steps.length
  const shift = ((by % length) + length) % length
  return {
    ...pattern,
    steps: [...pattern.steps.slice(shift), ...pattern.steps.slice(0, shift)],
  }
}

/**
 * Whether two patterns are the same loop, allowing for the rotation an observation cannot resolve.
 *
 * This is how a transmitted pattern is compared with the pattern heard back: the device's step 1 is
 * invisible from outside, so an index-by-index comparison would report a false mismatch.
 */
export function fm1PatternRotationsMatch(left: Fm1Pattern, right: Fm1Pattern): boolean {
  if (left.steps.length !== right.steps.length) return false
  return left.steps.some((_unused, shift) =>
    rotateFm1Pattern(left, shift).steps.every((step, index) => sameStep(step, right.steps[index])),
  )
}

function sameStep(left: Fm1SequenceStep, right: Fm1SequenceStep) {
  if (left.kind !== right.kind) return false
  if (left.kind !== 'note' || right.kind !== 'note') return true
  return left.pitch === right.pitch && left.velocity === right.velocity
}
