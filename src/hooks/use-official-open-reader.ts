import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { MidiController } from '@/hooks/use-midi'
import type { Dx7Voice } from '@/lib/dx7'
import { resolveFirmwareProfile } from '@/lib/firmware-profile'
import { makeLogEntry } from '@/lib/midi'
import { officialOpenLibraryBank, officialOpenTrackVoice } from '@/lib/official-open-library-read'
import { makeOfficialOpenLink, takeOfficialOpenToken } from '@/lib/official-open-link'
import { readOfficialOpenExport } from '@/lib/official-open-read'
import { readOfficialOpenInfo } from '@/lib/official-open-track-send'
import {
  OfficialOpenReadError,
  type OfficialOpenEngine,
  type OfficialOpenLink,
} from '@/lib/official-open-transfer'

type ReaderMidi = Pick<
  MidiController,
  | 'firmware'
  | 'inputs'
  | 'logStore'
  | 'outputs'
  | 'queueEffectOrder'
  | 'selectedInputId'
  | 'selectedOutputId'
  | 'sysexAvailable'
>

type Turn = { signal: AbortSignal; takeToken: () => number }

export type OfficialOpenReader = {
  /** Whether a bank of the FM1's DX7 library can be read: V14 or later, SysEx, and both ports. */
  canReadBanks: boolean
  /** Whether a DX7 track's voice can be read: Official Open, SysEx, and both ports. */
  canReadTracks: boolean
  /** The 32 patches of library bank `bank`, 0 to 3. */
  readLibraryBank: (bank: number, signal?: AbortSignal) => Promise<Dx7Voice[]>
  /** The engine each of the eight tracks runs, track 1 first. */
  readTrackEngines: (signal?: AbortSignal) => Promise<OfficialOpenEngine[]>
  /** The patch DX7 track `track`, 1 to 8, plays. */
  readTrackVoice: (track: number, signal?: AbortSignal) => Promise<Dx7Voice>
}

const beginExportCommand = 1
const infoCommand = 0

/**
 * Reads what an FM1 on M-VAVE's Official Open holds, through the ports `useMidi` has selected and
 * the read commands approved on 2026-10-20 (AGENTS.md, "MIDI"): a DX7 track's voice, a bank of
 * its DX7 library, and command 0's track engines. None changes anything on the FM1. It lives
 * outside `useMidi`, which every page loads, so only the code that reads carries it.
 *
 * Each read holds one turn of the queue every MIDI write waits in, so nothing lands between its
 * chunks, and belongs to the ports it started on: changing either, switching MIDI off, or
 * unmounting cancels it. Every read rejects with an `OfficialOpenReadError`, `cancelled` among
 * its problems. The MIDI log records a read starting and ending, not each of its chunks.
 */
export function useOfficialOpenReader(midi: ReaderMidi): OfficialOpenReader {
  const { firmware, logStore, queueEffectOrder, sysexAvailable } = midi
  const input = midi.inputs.find((device) => device.id === midi.selectedInputId)?.port
  const output = midi.outputs.find((device) => device.id === midi.selectedOutputId)?.port
  const { libraryBankRead, trackVoiceRead } = resolveFirmwareProfile(firmware).capabilities
  const connected = Boolean(input && output && sysexAvailable)
  const canReadBanks = connected && libraryBankRead
  const canReadTracks = connected && trackVoiceRead
  const reads = useRef(new Set<AbortController>())

  useEffect(() => {
    const active = reads.current
    return () => {
      active.forEach((read) => read.abort())
      active.clear()
    }
  }, [input, output])

  const inTurn = useCallback(
    async <Result>(
      allowed: boolean,
      what: string,
      signal: AbortSignal | undefined,
      run: (link: OfficialOpenLink, turn: Turn) => Promise<Result>,
    ) => {
      const log = (direction: 'in' | 'out' | 'system', message: string, data?: Uint8Array) =>
        logStore.append(makeLogEntry(direction, message, data))
      if (!allowed || !input || !output) {
        const error = new OfficialOpenReadError(
          'send-failed',
          `Reading ${what} needs an FM1 on Official Open, SysEx, and its input and output.`,
        )
        log('system', error.message)
        throw error
      }

      const read = new AbortController()
      const cancel = () => read.abort()
      reads.current.add(read)
      signal?.addEventListener('abort', cancel)
      if (signal?.aborted) cancel()
      const link = makeOfficialOpenLink(input, output, (request) => {
        // A bank is 66 requests, so only the one that starts a read is logged.
        if (request[5] === beginExportCommand || request[5] === infoCommand) {
          log('out', `Asked the FM1 for ${what}.`, request)
        }
      })

      const outcome: { error?: unknown; result?: { value: Result } } = {}
      try {
        await queueEffectOrder(async () => {
          if (read.signal.aborted) return
          try {
            outcome.result = {
              value: await run(link, { signal: read.signal, takeToken: takeOfficialOpenToken }),
            }
          } catch (caughtError) {
            outcome.error = caughtError
          }
        }, read.signal)
      } catch {
        // The queue dropped the read before its turn: the output changed or MIDI went off.
      } finally {
        signal?.removeEventListener('abort', cancel)
        reads.current.delete(read)
      }

      if (outcome.result && !read.signal.aborted) {
        log('in', `Read ${what} from the FM1.`)
        return outcome.result.value
      }
      const error =
        outcome.error instanceof OfficialOpenReadError && !read.signal.aborted
          ? outcome.error
          : outcome.error === undefined || read.signal.aborted
            ? new OfficialOpenReadError('cancelled', `The read of ${what} was cancelled.`)
            : new OfficialOpenReadError('unexpected', `The read of ${what} failed.`)
      log('system', error.message)
      throw error
    },
    [input, logStore, output, queueEffectOrder],
  )

  return useMemo(
    () => ({
      canReadBanks,
      canReadTracks,
      readLibraryBank: (bank, signal) =>
        inTurn(canReadBanks, `bank ${bank + 1} of its DX7 library`, signal, async (link, turn) =>
          officialOpenLibraryBank(
            await readOfficialOpenExport(link, { ...turn, kind: 'bank', target: bank }),
          ),
        ),
      readTrackEngines: (signal) =>
        inTurn(canReadTracks, 'its tracks’ engines', signal, async (link, turn) => {
          const info = await readOfficialOpenInfo(link, turn.takeToken(), { signal: turn.signal })
          return info.engines
        }),
      readTrackVoice: (track, signal) =>
        inTurn(canReadTracks, `the voice of track ${track}`, signal, async (link, turn) =>
          officialOpenTrackVoice(
            await readOfficialOpenExport(link, { ...turn, kind: 'voice', target: track - 1 }),
          ),
        ),
    }),
    [canReadBanks, canReadTracks, inTurn],
  )
}
