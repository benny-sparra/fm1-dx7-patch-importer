import { fm1VaStoredVoice } from '@/lib/fm1-va-preset-message'
import type { Fm1VaStoredPreset } from '@/lib/fm1-va-preset-read'

/**
 * Development only: the hardware test of how closely FM-1+VA's preset writes can follow each other
 * (docs/fm1-va-096-tests.md, "Write timing"). The editor waits 3 s between writes and listens
 * 1.5 s after each for a reply that never comes; FM-1+VA's Device Manager reads each write back at
 * once and sends the next 120 ms later. This writes presets back exactly as read, so the FM1 keeps
 * what it holds, with a chosen gap, and records how long each took and whether it read back.
 */

/** One timing the test offers, named as docs/fm1-va-096-tests.md §6 names its runs. */
export type Fm1VaWriteTiming = {
  /** How long to wait after the last read-back before sending the next write. */
  gapMs: number
  id: string
  /** What the timing does, for the probe. */
  label: string
  /** How long a write listens for a reply before its read-back. */
  listenMs: number
}

/**
 * The timings the test runs, in the order the plan runs them: today's, then reading back at once
 * with a shorter gap each time, down to none.
 */
export const fm1VaWriteTimings: readonly Fm1VaWriteTiming[] = [
  // The editor sends a write 3 s after the last, which listened 1.5 s before its read-back.
  {
    gapMs: 1500,
    id: 'T1',
    label: 'T1: today’s timing, check after 1.5 s, next write about 3 s after the last',
    listenMs: 1500,
  },
  ...[1000, 500, 250, 120, 0].map((gapMs) => ({
    gapMs,
    id: `T2 ${gapMs} ms`,
    label:
      gapMs === 0
        ? 'T2: check at once, next write straight after'
        : `T2: check at once, next write ${gapMs} ms later${gapMs === 120 ? ' (as Baud Girl’s Device Manager)' : ''}`,
    listenMs: 0,
  })),
]

export type Fm1VaWriteTimingResult = {
  /** Whether the read back holds exactly what was written. */
  matches: boolean
  /** From sending the write to the end of its read-back. */
  readBackMs: number
  /** When the write was sent, from the start of the first write. */
  sentAtMs: number
  slot: number
}

type WriteTimingOptions = {
  /** How long to wait after a write's read-back before sending the next write. */
  gapMs: number
  now?: () => number
  /** Called after each write is read back, with every result so far. */
  onResult?: (results: Fm1VaWriteTimingResult[]) => void
  read: (slot: number) => Promise<Fm1VaStoredPreset>
  /** Aborting stops before the next write; a write already sent is still read back. */
  signal?: AbortSignal
  write: (slot: number, voice: Uint8Array, record: Uint8Array) => Promise<unknown>
}

/** Waits `ms`, resolving false at once if `signal` aborts first. */
function pause(ms: number, signal?: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    if (signal?.aborted) {
      resolve(false)
      return
    }
    const abort = () => {
      clearTimeout(timer)
      resolve(false)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve(true)
    }, ms)
    signal?.addEventListener('abort', abort, { once: true })
  })
}

function sameBytes(bytes: Uint8Array, other: Uint8Array) {
  return bytes.length === other.length && bytes.every((byte, index) => byte === other[index])
}

/**
 * Writes each of `presets`, as read from the FM1, back to its own slot unchanged, reading each
 * back straight after its write and waiting `gapMs` before the next. Resolves with a result for
 * every preset written, stopping after the first that does not read back as written, and before
 * the next write once `signal` aborts. A write or read that fails rejects, as in production.
 */
export async function runFm1VaWriteTiming(
  presets: readonly Fm1VaStoredPreset[],
  { gapMs, now = Date.now, onResult, read, signal, write }: WriteTimingOptions,
) {
  const results: Fm1VaWriteTimingResult[] = []
  const start = now()
  for (const [index, preset] of presets.entries()) {
    if (signal?.aborted) break
    if (index > 0 && !(await pause(gapMs, signal))) break
    const sentAt = now()
    await write(preset.slot, preset.voice, preset.record)
    const readBack = await read(preset.slot)
    const result = {
      matches:
        sameBytes(readBack.voice, fm1VaStoredVoice(preset.voice)) &&
        sameBytes(readBack.record, preset.record),
      readBackMs: now() - sentAt,
      sentAtMs: sentAt - start,
      slot: preset.slot,
    }
    results.push(result)
    onResult?.([...results])
    if (!result.matches) break
  }
  return results
}
