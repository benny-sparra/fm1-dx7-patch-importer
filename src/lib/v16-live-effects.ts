import { unpackSevenBitStream } from '@/lib/fm1-firmware'
import { fm1EffectParameters } from '@/lib/fm1-parameters'
import {
  checksumOf,
  effectOrderOfTable,
  makeUpdaterFrame,
  type V16SettingsLink,
} from '@/lib/v16-settings-block'

/**
 * The one read of V16's live FX settings the owner approved on 2026-11-02 (AGENTS.md, "MIDI"):
 * command `0x23` on object 5, below offset `0x10000000`, which answers from the live edit state
 * (`FUN_0200c970`) and changes nothing. This module builds that single request, with nothing in it
 * to choose another object, offset, length, or command, and parses its reply. It sends nothing:
 * the caller sends, on an explicit action (docs/v16-fx-readback-validation.md).
 *
 * The request is the object-4 read's framing with object 5, offset `0x9C`, and length 54: the 27
 * live effect values (`0x9C`–`0xB6`, three per effect by number) and the 27-byte FX table
 * (`0xB7`–`0xD1`). **Confirmed** on stock `FM-1_016` on 2026-11-05
 * (docs/hardware-runs/stock-v16-live-fx-read-2026-11-05.md): the reply echoes the request's eight
 * bytes before the data, and every one of the 24 controls is where the decoding below reads it.
 */
const readCommand = 0x23
const liveObject = 5
export const liveEffectsOffset = 0x9c
const valueCount = 27
const tableLength = 27
const dataLength = valueCount + tableLength

/** The object, offset, and length the request carries, which a reply may echo before its data. */
const requestPrefix = Uint8Array.of(liveObject, liveEffectsOffset, 0, 0, 0, dataLength, 0, 0)

/** A frame packs to about 8/7 of its bytes; anything much larger is no reply to this read. */
const maximumReplyBytes = 128

const effectCount = 6
const tableEntries = 9

/** `F0 00 32 …`: asks for the live FX values and table. It changes nothing on the FM1. */
export function makeV16LiveEffectsReadRequest() {
  return makeUpdaterFrame(readCommand, requestPrefix)
}

/** What a read of the live FX settings returned, every byte as the FM1 sent it. */
export type V16LiveEffects = {
  /** The reply message, for the MIDI log and fixtures. */
  readonly reply: Uint8Array
  /** The 27 values from `0x9C`, effect `e`'s three at `3e`. */
  readonly values: Uint8Array
  /** The 27-byte FX table from `0xB7`: entry `e`'s bytes 1 and 2 are effect `e`'s On/Off and Type. */
  readonly table: Uint8Array
}

type LiveEffectsProblem = 'checksum' | 'layout' | 'length' | 'seven-bit' | 'table'

export type V16LiveEffectsAnswer =
  { problem: LiveEffectsProblem; type: 'invalid' } | { reading: V16LiveEffects; type: 'reading' }

/**
 * What a message says about a read of the live FX settings: null when it is not a reply to one, the
 * reading when it holds one, and otherwise why it is not usable. A reply is the 54 data bytes alone
 * or the request's eight bytes before them. Nothing is clamped, and a table the firmware itself
 * would reject (entries' effect numbers at most 8 and all different, On/Off at most 1, Type at most
 * 2) is refused rather than read.
 */
export function parseV16LiveEffectsReply(
  message: Uint8Array | readonly number[],
): V16LiveEffectsAnswer | null {
  const data = Uint8Array.from(message)
  if (data.length < 3 || data.length > maximumReplyBytes) return null
  if (data[0] !== 0xf0 || data[data.length - 1] !== 0xf7) return null
  const inner = data.subarray(1, -1)
  if (inner[0] !== 0x00 || inner[1] !== 0x32) return null
  const invalid = (problem: LiveEffectsProblem): V16LiveEffectsAnswer => ({
    problem,
    type: 'invalid',
  })
  if (inner.some((byte) => byte > 0x7f)) return invalid('seven-bit')
  const frame = unpackSevenBitStream(inner)
  if (frame[0] !== 0x00 || frame[1] !== 0x59 || frame[2] !== readCommand) return null
  const length = frame[3] | (frame[4] << 8) | (frame[5] << 16)
  const payload = frame.slice(6, 6 + length)
  const echoed = requestPrefix.every((byte, index) => payload[index] === byte)
  // Without an echo only the exact length is this read's: another read's reply, such as the
  // settings block's, is somebody else's.
  if (length !== dataLength && !(echoed && length === requestPrefix.length + dataLength)) {
    return echoed ? invalid('length') : null
  }
  if (frame.length < 6 + length + 1 || payload.length !== length) return invalid('length')
  if (frame[6 + length] !== checksumOf(payload)) return invalid('checksum')
  const body = echoed && length !== dataLength ? payload.slice(requestPrefix.length) : payload
  const values = Uint8Array.from(body.slice(0, valueCount))
  const table = Uint8Array.from(body.slice(valueCount))
  const entry = (index: number) => table.subarray(index * 3, index * 3 + 3)
  const entries = Array.from({ length: tableEntries }, (_, index) => entry(index))
  if (
    entries.some(([order, onOff, type]) => order > 8 || onOff > 1 || type > 2) ||
    new Set(entries.map(([order]) => order)).size !== tableEntries
  ) {
    return invalid('table')
  }
  return { reading: { reply: data, table, values }, type: 'reading' }
}

type CandidateEffectValues =
  | { controller: number; problem: 'range'; type: 'invalid'; value: number }
  | {
      type: 'values'
      values: number[]
    }

/**
 * The editor's 24 effect values, in controller order, as the mapping in
 * docs/v16-fx-readback-validation.md proposes them: each effect's switch, and Filter's and Reverb's
 * type, from the table byte of that effect's number, and its other controls from its three values
 * in controller order. Every row was confirmed on V16 in the run of 2026-11-05, but only the
 * development probe reads it until **Read effects from FM1** is built. A value outside its
 * control's range is reported, never clamped.
 */
export function candidateEffectValues({ table, values }: V16LiveEffects): CandidateEffectValues {
  const decoded: number[] = []
  for (let effect = 0; effect < effectCount; effect += 1) {
    const controls = fm1EffectParameters.filter(({ controller }) => controller >> 2 === effect)
    let nextValue = 0
    for (const parameter of controls) {
      const value =
        parameter.kind === 'switch'
          ? table[effect * 3 + 1]
          : parameter.kind === 'enumerated'
            ? table[effect * 3 + 2]
            : values[effect * 3 + nextValue++]
      if (value < parameter.min || value > parameter.max) {
        return { controller: parameter.controller, problem: 'range', type: 'invalid', value }
      }
      decoded.push(value)
    }
  }
  return { type: 'values', values: decoded }
}

type LiveEffectsReadProblem = 'cancelled' | 'no-reply' | 'send-failed' | 'unusable'

/** A read of the live FX settings that did not finish, with a code the UI can explain. */
export class V16LiveEffectsReadError extends Error {
  readonly problem: LiveEffectsReadProblem

  constructor(problem: LiveEffectsReadProblem, message: string) {
    super(message)
    this.name = 'V16LiveEffectsReadError'
    this.problem = problem
  }
}

/**
 * Sends the read once and resolves with the first reply that is this read's. It never asks again:
 * no reply within `timeoutMs` rejects as `no-reply`, and an unusable reply rejects at once. The
 * listener is gone when it settles, so a late or duplicate reply is ignored. Aborting `signal`, as
 * the caller does when a port changes, stops listening and rejects as cancelled, before anything
 * is sent if it is already aborted. The caller serialises reads: a late reply to one read cannot
 * be told from the reply to the next, so start another only after this has settled.
 */
export function readV16LiveEffects(
  link: V16SettingsLink,
  { signal, timeoutMs = 1500 }: { signal?: AbortSignal; timeoutMs?: number } = {},
) {
  return new Promise<V16LiveEffects>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let settled = false
    let stopListening = () => {}

    const finish = (outcome: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      stopListening()
      signal?.removeEventListener('abort', cancel)
      outcome()
    }
    const fail = (problem: LiveEffectsReadProblem, message: string) =>
      finish(() => reject(new V16LiveEffectsReadError(problem, message)))
    function cancel() {
      fail('cancelled', 'The read of the live FX settings was cancelled.')
    }

    if (signal?.aborted) {
      cancel()
      return
    }
    signal?.addEventListener('abort', cancel)
    stopListening = link.listen((message) => {
      const answer = parseV16LiveEffectsReply(message)
      if (!answer) return
      if (answer.type === 'reading') finish(() => resolve(answer.reading))
      else
        fail(
          'unusable',
          `The FM1 answered the read of its live FX settings unusably (${answer.problem}).`,
        )
    })
    void (async () => {
      try {
        await link.send(makeV16LiveEffectsReadRequest())
      } catch {
        fail('send-failed', 'The read of the live FX settings could not be sent.')
        return
      }
      if (!settled) {
        timer = setTimeout(
          () => fail('no-reply', 'The FM1 did not answer the read of its live FX settings.'),
          timeoutMs,
        )
      }
    })()
  })
}

/**
 * The rack and the chain order a complete live reading holds: the 24 effect controls in the
 * editor's order and the effects by position. Null when any control is out of its range or the
 * table is no order of the six effects, so a reading is taken whole or not at all.
 */
export function decodeV16LiveEffects(reading: V16LiveEffects) {
  const decoded = candidateEffectValues(reading)
  const order = effectOrderOfTable(reading.table)
  if (decoded.type !== 'values' || !order) return null
  return { effects: Uint8Array.from(decoded.values), order }
}
