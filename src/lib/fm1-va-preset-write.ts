import type { Fm1Firmware } from '@/lib/fm1-firmware'
import { makeFm1VaPresetWrite } from '@/lib/fm1-va-preset-message'
import { fm1VaPresetNumber, readsFm1VaPresets, type Fm1VaLink } from '@/lib/fm1-va-preset-read'
import { parseFm1VaReply, type Fm1VaReply } from '@/lib/fm1-va-sysex'

/**
 * Writing one stored preset to an FM1 on FM-1+VA, `7D 04 <slot>` (docs/fm1-research.md, FM-1+VA),
 * approved 2026-10-03 for one preset per message, spaced as `fm1VaPresetWriteTiming` says, each
 * read back to confirm it. A write replaces the stored preset at once, and the FM1 has no undo: an
 * FM-1+VA backup is the way back. Offer it only where `writesFm1VaPresets` allows.
 */

/** How a run of preset writes is paced. */
export type Fm1VaPresetWriteTiming = {
  /** How long a write listens for a reply before it resolves and its read-back is sent. */
  listenMs: number
  /** The least time between sending one write and sending the next. */
  spacingMs: number
}

/**
 * Before FM-1_096: FM-1+VA's Presets page waited 3 s between writes, because writes sent closer
 * together were heard as crackling, and the editor listened 1.5 s after each for a reply.
 */
const presetsPageTiming: Fm1VaPresetWriteTiming = { listenMs: 1500, spacingMs: 3000 }

/**
 * From FM-1_096, tested on hardware (docs/fm1-research.md, "FM-1_096"): no wait for a reply, which
 * never comes, so the read-back follows at once. The FM1 answers it about 200 ms after the write,
 * and 320 ms between writes leaves about 120 ms after that, as FM-1+VA's Device Manager waits.
 * Writes with no gap at all read back clean and without crackle, so this keeps a margin.
 */
const deviceManagerTiming: Fm1VaPresetWriteTiming = { listenMs: 0, spacingMs: 320 }

/** FM-1_096, the first release the faster timing was tested on. */
const firstDeviceManagerTimingRelease = 96

/** How to pace preset writes to `firmware`: faster only on the releases it was tested on. */
export function fm1VaPresetWriteTiming(firmware: Fm1Firmware): Fm1VaPresetWriteTiming {
  // `classifyFm1Firmware` names firmware FM-1+VA only for an `FM-1_NNN` identity.
  return firmware.kind === 'fm1-va' &&
    Number(firmware.identity.slice('FM-1_'.length)) >= firstDeviceManagerTimingRelease
    ? deviceManagerTiming
    : presetsPageTiming
}

/**
 * Whether the editor may write the FM1's stored presets: only FM-1+VA from FM-1_079, the release
 * that added the write along with the read that confirms it.
 */
export function writesFm1VaPresets(firmware: Fm1Firmware) {
  return readsFm1VaPresets(firmware)
}

type Fm1VaPresetWriteProblem = 'cancelled' | 'send-failed' | 'unavailable'

/** A preset write that was not sent, with a code the UI can explain. */
export class Fm1VaPresetWriteError extends Error {
  readonly problem: Fm1VaPresetWriteProblem
  readonly slot: number

  constructor(problem: Fm1VaPresetWriteProblem, slot: number, message: string) {
    super(message)
    this.name = 'Fm1VaPresetWriteError'
    this.problem = problem
    this.slot = slot
  }
}

export type Fm1VaPresetWriteOptions = {
  /**
   * How long to listen after sending for FM-1+VA replies. Whether, and how, the FM1 answers a write
   * is not known yet, so the replies are collected for the hardware test to read.
   */
  listenMs?: number
  /** Cancels the write while it waits to be sent. Once sent, the write cannot be taken back. */
  signal?: AbortSignal
}

/**
 * Sends the write that stores `voice`, the preset's voice bytes as a read returns them, and
 * `record` in preset `slot`, once, and resolves with the
 * FM-1+VA replies heard in the `listenMs` after it. A write is never sent twice: unlike a read, a
 * repeat would store the preset again.
 */
export function writeFm1VaPreset(
  link: Fm1VaLink,
  slot: number,
  voice: Uint8Array,
  record: Uint8Array,
  { listenMs = 1500, signal }: Fm1VaPresetWriteOptions = {},
) {
  const message = makeFm1VaPresetWrite(slot, voice, record)
  const number = fm1VaPresetNumber(slot)

  return new Promise<Fm1VaReply[]>((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        new Fm1VaPresetWriteError(
          'cancelled',
          slot,
          `The write of preset ${number} was cancelled.`,
        ),
      )
      return
    }

    const replies: Fm1VaReply[] = []
    const stopListening = link.listen((heard) => {
      const reply = parseFm1VaReply(heard)
      if (reply) replies.push(reply)
    })
    const finish = () => {
      clearTimeout(timer)
      stopListening()
      signal?.removeEventListener('abort', finish)
      resolve(replies)
    }
    let timer: ReturnType<typeof setTimeout> | undefined

    void (async () => {
      try {
        await link.send(message)
      } catch {
        stopListening()
        reject(
          new Fm1VaPresetWriteError(
            'send-failed',
            slot,
            `The write of preset ${number} could not be sent.`,
          ),
        )
        return
      }
      // Sent: cancelling now only stops listening, since the FM1 already has the write.
      signal?.addEventListener('abort', finish)
      timer = setTimeout(finish, listenMs)
    })()
  })
}
