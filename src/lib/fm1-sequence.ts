/**
 * Behavioural model of an FM1 pattern (SEQ-OBS-001).
 *
 * Every field here comes from Confirmed observable V15 hardware behaviour: ordered steps carrying
 * pitch and attack velocity, rests, a loop length of 1 to 16, and one pattern-global gate. It is
 * deliberately not the V13 32-byte record, which is firmware evidence without hardware
 * corroboration. See docs/fm1-research.md §5.7 and §5.8.
 */

/** Ten of the sixteen steps have been exercised at once; the selectable range is 1 to 16. */
export const fm1SequenceMinLoopLength = 1
export const fm1SequenceMaxLoopLength = 16

export const fm1SequenceMinPitch = 0
export const fm1SequenceMaxPitch = 127

/** Velocity 0 is reserved: on the recording path it is how a rest is transmitted. */
export const fm1SequenceMinVelocity = 1
export const fm1SequenceMaxVelocity = 127

/** The stock Gate control's range, read from the V13 stock-UI constraint and visible on V15. */
export const fm1SequenceMinGatePercent = 20
export const fm1SequenceMaxGatePercent = 100

export type Fm1SequenceNoteStep = {
  kind: 'note'
  pitch: number
  velocity: number
}

export type Fm1SequenceRestStep = {
  kind: 'rest'
}

export type Fm1SequenceStep = Fm1SequenceNoteStep | Fm1SequenceRestStep

/**
 * A pattern as the device plays it back.
 *
 * `gatePercent` is the device's own global Gate. It is modelled because it explains what the user
 * hears, not because the editor can set it; no host path to any pattern-global control is known.
 */
export type Fm1Pattern = {
  loopLength: number
  steps: readonly Fm1SequenceStep[]
  gatePercent: number
}

export type Fm1SequenceFieldProblem = 'gate' | 'loop-length' | 'pitch' | 'step-count' | 'velocity'

/** An invalid pattern field, with a problem code the UI can explain in any language. */
export class Fm1SequenceError extends Error {
  readonly problem: Fm1SequenceFieldProblem

  constructor(problem: Fm1SequenceFieldProblem, message: string) {
    super(message)
    this.name = 'Fm1SequenceError'
    this.problem = problem
  }
}

type Fm1SequenceConfidence = 'confirmed-observable-v15' | 'needs-hardware-test'

export type Fm1SequenceFieldProvenance = {
  /** How strongly the hardware fixtures support modelling this field at all. */
  readonly confidence: Fm1SequenceConfidence
  /** Whether a host can author this field through the stock recording path (SEQ-REC-001). */
  readonly transmittable: boolean
  readonly fixtures: readonly string[]
}

/**
 * Which fixture established each modelled field, and at what confidence. Fixture ids are the file
 * names in docs/sequencer-fixtures/V15/; the co-located test asserts every one of them exists.
 */
export const fm1SequenceProvenance = {
  pitch: {
    confidence: 'confirmed-observable-v15',
    transmittable: true,
    fixtures: [
      'seq-V15-pattern-01-one-note-64-velocity-90-2026-08-31',
      'seq-V15-pattern-01-one-note-65-velocity-90-2026-08-31',
    ],
  },
  velocity: {
    confidence: 'confirmed-observable-v15',
    transmittable: true,
    fixtures: [
      'seq-V15-pattern-01-note-60-velocity-32-2026-08-31',
      'seq-V15-pattern-01-note-60-velocity-90-2026-08-31',
    ],
  },
  rest: {
    confidence: 'confirmed-observable-v15',
    transmittable: true,
    fixtures: [
      'seq-V15-pattern-01-host-rest-single-2026-09-17',
      'seq-V15-pattern-01-host-rest-double-2026-09-17',
    ],
  },
  repeatedPitch: {
    confidence: 'confirmed-observable-v15',
    transmittable: true,
    fixtures: [
      'seq-V15-pattern-01-repeated-note-60-run-1-2026-09-17',
      'seq-V15-pattern-01-repeated-note-60-run-2-2026-09-17',
    ],
  },
  stepPosition: {
    confidence: 'confirmed-observable-v15',
    transmittable: true,
    fixtures: [
      'seq-V15-pattern-01-record-start-position-g4-2026-09-17',
      'seq-V15-pattern-01-record-start-position-a4-2026-09-17',
    ],
  },
  loopLength: {
    confidence: 'confirmed-observable-v15',
    transmittable: false,
    fixtures: [
      'seq-V15-pattern-01-step-16-note-60-2026-08-31',
      'seq-V15-pattern-01-fifteen-step-60-through-74-2026-08-31',
    ],
  },
  gatePercent: {
    confidence: 'confirmed-observable-v15',
    transmittable: false,
    fixtures: [
      'seq-V15-pattern-01-two-step-60-65-gate-50-2026-08-31',
      'seq-V15-pattern-01-two-step-60-65-velocity-90-2026-08-31',
    ],
  },
} as const satisfies Record<string, Fm1SequenceFieldProvenance>

export const fm1SequenceDefaultGatePercent = 80

export function fm1NoteStep(pitch: number, velocity: number): Fm1SequenceNoteStep {
  assertPitch(pitch)
  assertVelocity(velocity)
  return { kind: 'note', pitch, velocity }
}

export function fm1RestStep(): Fm1SequenceRestStep {
  return { kind: 'rest' }
}

/**
 * A pattern of `loopLength` rests. Silence is an explicit rest at every step because a transmit
 * defines the whole loop; an absent step would leave whatever the device already holds.
 */
export function createFm1Pattern(
  loopLength: number,
  gatePercent = fm1SequenceDefaultGatePercent,
): Fm1Pattern {
  assertLoopLength(loopLength)
  assertGatePercent(gatePercent)
  return {
    loopLength,
    steps: Array.from({ length: loopLength }, fm1RestStep),
    gatePercent,
  }
}

/** Replaces one step, leaving the loop length and every other step alone. */
export function setFm1PatternStep(
  pattern: Fm1Pattern,
  index: number,
  step: Fm1SequenceStep,
): Fm1Pattern {
  if (!Number.isInteger(index) || index < 0 || index >= pattern.steps.length) {
    throw new Fm1SequenceError(
      'step-count',
      `Step index must be an integer from 0 to ${pattern.steps.length - 1}.`,
    )
  }
  if (step.kind === 'note') {
    assertPitch(step.pitch)
    assertVelocity(step.velocity)
  }
  const steps = pattern.steps.slice()
  steps[index] = step
  return { ...pattern, steps }
}

/**
 * Grows a pattern to its loop length with rests, so every step in the loop is defined.
 *
 * A pattern holding more steps than its loop length is refused rather than truncated: recording
 * past the loop length has never been captured, so the editor must not produce that input.
 */
export function padFm1PatternToLoopLength(pattern: Fm1Pattern): Fm1Pattern {
  assertLoopLength(pattern.loopLength)
  if (pattern.steps.length > pattern.loopLength) {
    throw new Fm1SequenceError(
      'step-count',
      `A pattern with loop length ${pattern.loopLength} cannot hold ${pattern.steps.length} steps.`,
    )
  }
  if (pattern.steps.length === pattern.loopLength) return pattern
  return {
    ...pattern,
    steps: [
      ...pattern.steps,
      ...Array.from({ length: pattern.loopLength - pattern.steps.length }, fm1RestStep),
    ],
  }
}

/** Throws the first problem that would make a pattern unusable, in field order. */
export function assertFm1Pattern(pattern: Fm1Pattern) {
  assertLoopLength(pattern.loopLength)
  assertGatePercent(pattern.gatePercent)
  if (pattern.steps.length !== pattern.loopLength) {
    throw new Fm1SequenceError(
      'step-count',
      `A pattern with loop length ${pattern.loopLength} must hold exactly ${pattern.loopLength} steps; received ${pattern.steps.length}.`,
    )
  }
  pattern.steps.forEach((step) => {
    if (step.kind !== 'note') return
    assertPitch(step.pitch)
    assertVelocity(step.velocity)
  })
}

export function isFm1Pattern(pattern: Fm1Pattern) {
  try {
    assertFm1Pattern(pattern)
    return true
  } catch {
    return false
  }
}

function assertLoopLength(loopLength: number) {
  if (
    !Number.isInteger(loopLength) ||
    loopLength < fm1SequenceMinLoopLength ||
    loopLength > fm1SequenceMaxLoopLength
  ) {
    throw new Fm1SequenceError(
      'loop-length',
      `Loop length must be an integer from ${fm1SequenceMinLoopLength} to ${fm1SequenceMaxLoopLength}.`,
    )
  }
}

function assertPitch(pitch: number) {
  if (!Number.isInteger(pitch) || pitch < fm1SequenceMinPitch || pitch > fm1SequenceMaxPitch) {
    throw new Fm1SequenceError(
      'pitch',
      `Step pitch must be an integer from ${fm1SequenceMinPitch} to ${fm1SequenceMaxPitch}.`,
    )
  }
}

function assertVelocity(velocity: number) {
  if (
    !Number.isInteger(velocity) ||
    velocity < fm1SequenceMinVelocity ||
    velocity > fm1SequenceMaxVelocity
  ) {
    throw new Fm1SequenceError(
      'velocity',
      `Step velocity must be an integer from ${fm1SequenceMinVelocity} to ${fm1SequenceMaxVelocity}; velocity 0 is reserved for a rest.`,
    )
  }
}

function assertGatePercent(gatePercent: number) {
  if (
    !Number.isInteger(gatePercent) ||
    gatePercent < fm1SequenceMinGatePercent ||
    gatePercent > fm1SequenceMaxGatePercent
  ) {
    throw new Fm1SequenceError(
      'gate',
      `Gate must be an integer percentage from ${fm1SequenceMinGatePercent} to ${fm1SequenceMaxGatePercent}.`,
    )
  }
}
