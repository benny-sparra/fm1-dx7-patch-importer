import type { Output } from 'webmidi'

import {
  assertFm1Pattern,
  fm1SequenceMaxLoopLength,
  type Fm1Pattern,
  type Fm1SequenceStep,
} from './fm1-sequence'

/**
 * Transmits a pattern into the FM1's stock recording path (SEQ-REC-002).
 *
 * This implements exactly the contract in docs/seq-rec-001-recording-contract.md and nothing more.
 * The user arms record mode by hand; the editor plays a whole loop's worth of steps in as ordinary
 * Note On/Off. The device acknowledges nothing and transmits nothing while recording, so a
 * completed pass means the pattern was *sent*, never that it was recorded. Only observing a later
 * playback pass confirms it.
 *
 * The operation replaces the whole recorded sequence. Recording always restarts at step 1, so
 * there is no way to update one step in place and no caller may ask for one.
 */

/** A rest is a Note On with velocity 0. Only pitch 60 has been captured, so it is not variable. */
export const fm1SequenceRestPitch = 0x3c

/** The fastest hold that recorded correctly on hardware (the fifteen-note fixture). */
export const fm1SequenceMinHoldMs = 80

/** The fastest Note On to Note On period that recorded correctly on hardware. */
export const fm1SequenceMinStepPeriodMs = 100

/**
 * Rests are only captured at roughly 600 ms, so that is what we send until a fixture shows a rest
 * recording correctly at the note cadence. Slower is always safe; faster is unevidenced.
 */
export const fm1SequenceRestPeriodMs = 600

export type Fm1PatternTransmitProblem = 'channel' | 'hold' | 'pattern' | 'step-period'

/** A transmit refused before a single byte was sent, with a code the UI can explain. */
export class Fm1PatternTransmitError extends Error {
  readonly problem: Fm1PatternTransmitProblem
  readonly cause?: unknown

  constructor(problem: Fm1PatternTransmitProblem, message: string, cause?: unknown) {
    super(message)
    this.name = 'Fm1PatternTransmitError'
    this.problem = problem
    this.cause = cause
  }
}

export type Fm1PatternTransmitOptions = {
  channel: number
  holdMs?: number
  stepPeriodMs?: number
  restPeriodMs?: number
}

export type Fm1PatternTransmitMessage = {
  /** Milliseconds from the first message of the pass. */
  atMs: number
  /** The step this message belongs to, counting from 0. */
  step: number
  kind: 'note-on' | 'note-off' | 'rest'
  bytes: Uint8Array
}

/**
 * The complete stream a pattern would produce, as exact bytes and offsets.
 *
 * Bytes are built here rather than through WebMidi's note helpers because a rest must leave as
 * literally `9n 3C 00`. A helper that rewrites a zero-velocity Note On into a Note Off would break
 * the operation: a bare Note Off as a step advance has never been tested on hardware.
 */
export function makeFm1PatternTransmission(
  pattern: Fm1Pattern,
  options: Fm1PatternTransmitOptions,
): Fm1PatternTransmitMessage[] {
  const { channel, holdMs, stepPeriodMs, restPeriodMs } = assertTransmittable(pattern, options)
  const status = (command: number) => command | ((channel - 1) & 0x0f)
  const messages: Fm1PatternTransmitMessage[] = []
  let atMs = 0

  pattern.steps.forEach((step, index) => {
    if (step.kind === 'rest') {
      messages.push({
        atMs,
        step: index,
        kind: 'rest',
        bytes: Uint8Array.from([status(0x90), fm1SequenceRestPitch, 0x00]),
      })
      atMs += restPeriodMs
      return
    }

    messages.push({
      atMs,
      step: index,
      kind: 'note-on',
      bytes: Uint8Array.from([status(0x90), step.pitch, step.velocity]),
    })
    messages.push({
      atMs: atMs + holdMs,
      step: index,
      kind: 'note-off',
      bytes: Uint8Array.from([status(0x80), step.pitch, 0x00]),
    })
    atMs += stepPeriodMs
  })

  return messages
}

type Fm1PatternTransmitOutcome =
  /** Every step left the browser. It is not confirmation that the device recorded them. */
  | 'sent'
  /** The caller aborted; the pass stopped at a step boundary with no note left hanging. */
  | 'cancelled'
  /** The MIDI port failed mid-pass; the device holds a partial overwrite. */
  | 'interrupted'

export type Fm1PatternTransmitResult = {
  outcome: Fm1PatternTransmitOutcome
  /** Steps fully transmitted. The device keeps its previous contents from here to the loop end. */
  stepsSent: number
  stepCount: number
  /** Present only when the port failed, so the caller can report why without showing its text. */
  failure?: unknown
}

export type Fm1PatternTransmitRuntime = {
  signal?: AbortSignal
  /** Injected so tests are deterministic. Late is safe; early is not, so never shorten a wait. */
  wait?: (ms: number) => Promise<void>
}

const defaultWait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

/**
 * Sends the pattern, one step at a time, in step order.
 *
 * Validation is all-or-nothing and happens before the first message: a pattern that failed partway
 * through would leave the device half-overwritten. A cancelled or interrupted pass is never
 * retried here; an unattended second pass would record into whatever the device is showing by then.
 */
export async function transmitFm1Pattern(
  output: Output,
  pattern: Fm1Pattern,
  options: Fm1PatternTransmitOptions,
  { signal, wait = defaultWait }: Fm1PatternTransmitRuntime = {},
): Promise<Fm1PatternTransmitResult> {
  const { holdMs, stepPeriodMs, restPeriodMs } = assertTransmittable(pattern, options)
  const messages = makeFm1PatternTransmission(pattern, options)
  const stepCount = pattern.steps.length
  const byStep = pattern.steps.map((step, index) => ({
    step,
    messages: messages.filter((message) => message.step === index),
  }))

  const result = (outcome: Fm1PatternTransmitOutcome, stepsSent: number, failure?: unknown) =>
    failure === undefined
      ? { outcome, stepsSent, stepCount }
      : { outcome, stepsSent, stepCount, failure }

  let stepsSent = 0

  for (const [index, { messages: stepMessages }] of byStep.entries()) {
    if (signal?.aborted) return result('cancelled', stepsSent)

    if (index > 0) {
      const previous = byStep[index - 1].step
      const previousPeriod = previous.kind === 'rest' ? restPeriodMs : stepPeriodMs
      const alreadyWaited = previous.kind === 'rest' ? 0 : holdMs
      await wait(previousPeriod - alreadyWaited)
      if (signal?.aborted) return result('cancelled', stepsSent)
    }

    for (const [messageIndex, message] of stepMessages.entries()) {
      if (messageIndex > 0) await wait(holdMs)

      try {
        output.send(message.bytes)
      } catch (failure) {
        // A note-on already left, so close it if we can rather than leaving the device sounding.
        if (message.kind === 'note-off') return result('interrupted', stepsSent, failure)
        if (message.kind === 'note-on') closeHangingNote(output, message, stepMessages)
        return result('interrupted', stepsSent, failure)
      }
    }

    // A cancellation seen mid-step still completes that step's note off above, so the boundary is
    // always clean: the device holds whole steps, never a note without its release.
    stepsSent = index + 1
  }

  return result('sent', stepsSent)
}

function closeHangingNote(
  output: Output,
  noteOn: Fm1PatternTransmitMessage,
  stepMessages: Fm1PatternTransmitMessage[],
) {
  const noteOff = stepMessages.find((message) => message.kind === 'note-off')
  if (!noteOff || noteOn.kind !== 'note-on') return
  try {
    output.send(noteOff.bytes)
  } catch {
    // The port is already gone. Nothing further can be done from here.
  }
}

function assertTransmittable(pattern: Fm1Pattern, options: Fm1PatternTransmitOptions) {
  const holdMs = options.holdMs ?? fm1SequenceMinHoldMs
  const stepPeriodMs = options.stepPeriodMs ?? fm1SequenceMinStepPeriodMs
  const restPeriodMs = options.restPeriodMs ?? fm1SequenceRestPeriodMs

  if (!Number.isInteger(options.channel) || options.channel < 1 || options.channel > 16) {
    throw new Fm1PatternTransmitError('channel', 'MIDI channel must be an integer from 1 to 16.')
  }

  try {
    assertFm1Pattern(pattern)
  } catch (cause) {
    throw new Fm1PatternTransmitError(
      'pattern',
      'The pattern cannot be transmitted into record mode.',
      cause,
    )
  }

  if (pattern.steps.length > fm1SequenceMaxLoopLength) {
    throw new Fm1PatternTransmitError(
      'pattern',
      `A pass cannot send more than ${fm1SequenceMaxLoopLength} steps.`,
    )
  }
  if (!Number.isFinite(holdMs) || holdMs < fm1SequenceMinHoldMs) {
    throw new Fm1PatternTransmitError(
      'hold',
      `Note hold must be at least ${fm1SequenceMinHoldMs} ms; nothing faster has been captured.`,
    )
  }
  if (!Number.isFinite(stepPeriodMs) || stepPeriodMs < fm1SequenceMinStepPeriodMs) {
    throw new Fm1PatternTransmitError(
      'step-period',
      `Step period must be at least ${fm1SequenceMinStepPeriodMs} ms; nothing faster has been captured.`,
    )
  }
  if (stepPeriodMs <= holdMs) {
    throw new Fm1PatternTransmitError(
      'step-period',
      'Step period must leave a gap after the note off; notes must never overlap.',
    )
  }
  if (!Number.isFinite(restPeriodMs) || restPeriodMs < fm1SequenceMinStepPeriodMs) {
    throw new Fm1PatternTransmitError(
      'step-period',
      `Rest period must be at least ${fm1SequenceMinStepPeriodMs} ms; nothing faster has been captured.`,
    )
  }

  return { channel: options.channel, holdMs, stepPeriodMs, restPeriodMs }
}

export function fm1PatternTransmitDurationMs(
  pattern: Fm1Pattern,
  options: Fm1PatternTransmitOptions,
) {
  const { holdMs, stepPeriodMs, restPeriodMs } = assertTransmittable(pattern, options)
  return pattern.steps.reduce((total, step: Fm1SequenceStep, index) => {
    const last = index === pattern.steps.length - 1
    if (step.kind === 'rest') return total + (last ? 0 : restPeriodMs)
    return total + (last ? holdMs : stepPeriodMs)
  }, 0)
}
