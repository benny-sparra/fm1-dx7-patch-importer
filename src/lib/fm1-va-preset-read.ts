import { dx7PackedVoiceSize } from '@/lib/dx7'
import type { Fm1Firmware } from '@/lib/fm1-firmware'
import {
  fm1VaChecksum,
  fm1VaReplyKinds,
  fm1VaReplyStatuses,
  fm1VaRequestHeader,
  parseFm1VaReply,
} from '@/lib/fm1-va-sysex'

/**
 * Reading one stored preset from an FM1 on FM-1+VA, the one FM-1+VA command the editor may send
 * (docs/fm1-research.md, "Reading a stored preset"). It reads and changes nothing. Offer it only
 * where `readsFm1VaPresets` allows.
 */
export const fm1VaPresetCount = 128

/** The bytes of a preset's settings record, which holds its effects and engine. */
export const fm1VaPresetRecordSize = 59

const readCommand = 0x10

/** FM-1_079, the first FM-1+VA release that answers the preset read. */
const firstPresetReadRelease = 79

/**
 * Whether the editor may ask the FM1 for its stored presets: only FM-1+VA from the release that
 * added the read. On any other firmware the message is an unknown vendor command.
 */
export function readsFm1VaPresets(firmware: Fm1Firmware) {
  // `classifyFm1Firmware` names firmware FM-1+VA only for an `FM-1_NNN` identity.
  if (firmware.kind !== 'fm1-va') return false
  return Number(firmware.identity.slice('FM-1_'.length)) >= firstPresetReadRelease
}

/** The number the FM1 shows for a slot, 001 to 128, as the research notes name presets. */
export function fm1VaPresetNumber(slot: number) {
  return String(slot + 1).padStart(3, '0')
}

/** A preset as the FM1 stores it, kept exactly as read until each byte is understood. */
export type Fm1VaStoredPreset = {
  /** The 59-byte settings record, eight bits a byte. */
  record: Uint8Array
  /** The whole reply message, for fixtures and the MIDI log. */
  reply: Uint8Array
  slot: number
  /** The 128-byte packed voice. A Virtual Analog preset's voice bytes are not a DX7 voice. */
  voice: Uint8Array
}

type Fm1VaPresetReadProblem =
  | 'busy'
  | 'cancelled'
  | 'no-reply'
  | 'refused'
  | 'send-failed'
  /** The ports, SysEx, or firmware in use cannot read presets. */
  | 'unavailable'
  | 'unexpected'

/** A preset read that did not finish, with a code the UI can explain. */
export class Fm1VaPresetReadError extends Error {
  readonly problem: Fm1VaPresetReadProblem
  readonly slot: number

  constructor(problem: Fm1VaPresetReadProblem, slot: number, message: string) {
    super(message)
    this.name = 'Fm1VaPresetReadError'
    this.problem = problem
    this.slot = slot
  }
}

function assertSlot(slot: number) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= fm1VaPresetCount) {
    throw new RangeError(
      `An FM-1+VA preset slot is 0 to ${fm1VaPresetCount - 1}; received ${slot}.`,
    )
  }
}

/** `F0 43 00 7D 10 <slot> <sum> F7`, where the checksum covers the command and the slot. */
export function makeFm1VaPresetReadRequest(slot: number) {
  assertSlot(slot)
  const body = [readCommand, slot]
  return Uint8Array.of(...fm1VaRequestHeader, ...body, fm1VaChecksum(body), 0xf7)
}

type PresetReplyAnswer =
  | { preset: Fm1VaStoredPreset; type: 'preset' }
  | { status: number; type: 'status' }
  | { type: 'resend' }
  | { type: 'unexpected' }

/**
 * What a message says about the read of `slot`, or null when it answers something else. A reply
 * with status done is the preset if it is the size of one; a damaged request is worth sending
 * again.
 */
function answerFor(
  message: Uint8Array | readonly number[],
  slot: number,
): PresetReplyAnswer | null {
  const reply = parseFm1VaReply(message)
  if (!reply || reply.kind !== fm1VaReplyKinds.preset || reply.argument !== slot) return null
  if (reply.status === fm1VaReplyStatuses.damaged) return { type: 'resend' }
  if (reply.status !== fm1VaReplyStatuses.done) return { status: reply.status, type: 'status' }
  if (reply.data.length !== dx7PackedVoiceSize + fm1VaPresetRecordSize)
    return { type: 'unexpected' }
  return {
    preset: {
      record: reply.data.slice(dx7PackedVoiceSize),
      reply: Uint8Array.from(message),
      slot,
      voice: reply.data.slice(0, dx7PackedVoiceSize),
    },
    type: 'preset',
  }
}

/** The ports a read talks through: a send, which may wait its turn, and the input's messages. */
export type Fm1VaLink = {
  listen: (hear: (message: Uint8Array | readonly number[]) => void) => () => void
  send: (message: Uint8Array) => void | Promise<void>
}

export type Fm1VaPresetReadOptions = {
  /** How many times to send the request before giving up. */
  attempts?: number
  signal?: AbortSignal
  /** How long to wait for an answer before asking again. */
  timeoutMs?: number
}

/**
 * Asks the FM1 for stored preset `slot` (0–127) and resolves with it. Asks again when no answer
 * comes within `timeoutMs` or the FM1 says the request arrived damaged, up to `attempts` times.
 * Aborting `signal` stops listening and rejects as cancelled.
 */
export function readFm1VaPreset(
  link: Fm1VaLink,
  slot: number,
  { attempts = 3, signal, timeoutMs = 1500 }: Fm1VaPresetReadOptions = {},
) {
  const request = makeFm1VaPresetReadRequest(slot)
  const number = fm1VaPresetNumber(slot)

  return new Promise<Fm1VaStoredPreset>((resolve, reject) => {
    let sent = 0
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
    const fail = (problem: Fm1VaPresetReadProblem, message: string) =>
      finish(() => reject(new Fm1VaPresetReadError(problem, slot, message)))

    function cancel() {
      fail('cancelled', `The read of preset ${number} was cancelled.`)
    }

    const ask = async () => {
      clearTimeout(timer)
      if (sent === attempts) {
        fail('no-reply', `The FM1 did not answer the read of preset ${number}.`)
        return
      }
      sent += 1
      try {
        await link.send(request)
      } catch {
        fail('send-failed', `The read of preset ${number} could not be sent.`)
        return
      }
      if (!settled) timer = setTimeout(() => void ask(), timeoutMs)
    }

    const hear = (message: Uint8Array | readonly number[]) => {
      const answer = answerFor(message, slot)
      if (!answer) return
      if (answer.type === 'preset') finish(() => resolve(answer.preset))
      else if (answer.type === 'resend') void ask()
      else if (answer.type === 'unexpected') {
        // A release that changed the preset's size would answer this way; asking again cannot help.
        fail('unexpected', `The FM1 answered the read of preset ${number} with an unknown layout.`)
      } else if (answer.status === fm1VaReplyStatuses.busy) {
        fail('busy', `The FM1 was busy and did not read preset ${number}.`)
      } else fail('refused', `The FM1 refused the read of preset ${number} (${answer.status}).`)
    }

    if (signal?.aborted) {
      cancel()
      return
    }
    signal?.addEventListener('abort', cancel)
    stopListening = link.listen(hear)
    void ask()
  })
}
