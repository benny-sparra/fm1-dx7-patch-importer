import type { Fm1Firmware } from '@/lib/fm1-firmware'
import { makeFm1VaPresetWrite } from '@/lib/fm1-va-preset-message'
import { fm1VaPresetNumber, readsFm1VaPresets, type Fm1VaLink } from '@/lib/fm1-va-preset-read'
import { parseFm1VaReply, type Fm1VaReply } from '@/lib/fm1-va-sysex'

/**
 * Writing one stored preset to an FM1 on FM-1+VA, `7D 04 <slot>` (docs/fm1-research.md, FM-1+VA),
 * approved 2026-10-03 for one preset per message, at least `fm1VaPresetWriteSpacingMs` apart, each
 * read back to confirm it. A write replaces the stored preset at once, and the FM1 has no undo: an
 * FM-1+VA backup is the way back. Offer it only where `writesFm1VaPresets` allows.
 */

/**
 * The least time between two writes. FM-1+VA's own Presets page waits this long, because writes
 * sent closer together were heard as crackling.
 */
export const fm1VaPresetWriteSpacingMs = 3000

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
