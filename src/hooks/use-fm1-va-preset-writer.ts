import { useCallback, useEffect, useRef } from 'react'
import type { MessageEvent } from 'webmidi'

import type { MidiController } from '@/hooks/use-midi'
import { fm1VaPresetNumber, type Fm1VaLink } from '@/lib/fm1-va-preset-read'
import {
  Fm1VaPresetWriteError,
  fm1VaPresetWriteSpacingMs,
  writeFm1VaPreset,
  writesFm1VaPresets,
} from '@/lib/fm1-va-preset-write'
import { makeLogEntry } from '@/lib/midi'
import { midiActivity } from '@/lib/midi-activity'

type PresetWriterMidi = Pick<
  MidiController,
  | 'firmware'
  | 'inputs'
  | 'logStore'
  | 'outputs'
  | 'selectedInputId'
  | 'selectedOutputId'
  | 'sysexAvailable'
>

/**
 * Writes stored presets to an FM1 on FM-1+VA through the ports `useMidi` has selected, as
 * `useFm1VaPresetReader` reads them, and outside `useMidi` for the same reason.
 *
 * Each write waits until `fm1VaPresetWriteSpacingMs` has passed since the one before. A write
 * belongs to the ports it started on: changing either, or unmounting, cancels one still waiting,
 * while one already sent cannot be taken back.
 */
export function useFm1VaPresetWriter(midi: PresetWriterMidi) {
  const { firmware, logStore, sysexAvailable } = midi
  const input = midi.inputs.find((device) => device.id === midi.selectedInputId)?.port
  const output = midi.outputs.find((device) => device.id === midi.selectedOutputId)?.port
  const canWrite = Boolean(input && output && sysexAvailable && writesFm1VaPresets(firmware))
  const writes = useRef(new Set<AbortController>())
  const lastWriteAt = useRef<number | null>(null)

  useEffect(() => {
    const active = writes.current
    return () => {
      active.forEach((write) => write.abort())
      active.clear()
    }
  }, [input, output])

  /**
   * Stores `voice`, the preset's voice bytes as a read returns them, and `record` in preset `slot`
   * (0–127) and resolves with the FM-1+VA replies
   * heard after it. Rejects with an `Fm1VaPresetWriteError` when the ports, SysEx, or firmware
   * cannot write presets, when the write cannot be sent, and when `signal` or a change of ports
   * cancels it before it is sent.
   */
  const writePreset = useCallback(
    async (slot: number, voice: Uint8Array, record: Uint8Array, signal?: AbortSignal) => {
      const number = fm1VaPresetNumber(slot)
      const log = (direction: 'out' | 'system', message: string, data?: Uint8Array) =>
        logStore.append(makeLogEntry(direction, message, data))
      if (!canWrite || !input || !output) {
        const error = new Fm1VaPresetWriteError(
          'unavailable',
          slot,
          'Writing a stored preset needs an FM1 on FM-1+VA FM-1_079 or later, SysEx, and its input and output.',
        )
        log('system', error.message)
        throw error
      }

      const write = new AbortController()
      const cancel = () => write.abort()
      writes.current.add(write)
      signal?.addEventListener('abort', cancel)
      if (signal?.aborted) cancel()
      const cancelled = () =>
        new Fm1VaPresetWriteError('cancelled', slot, `The write of preset ${number} was cancelled.`)
      try {
        if (!(await waitForSpacing(lastWriteAt.current, write.signal))) throw cancelled()
        const link: Fm1VaLink = {
          listen: (hear) => {
            const handle = (event: MessageEvent) => hear(event.data)
            input.addListener('midimessage', handle)
            return () => input.removeListener('midimessage', handle)
          },
          send: (message) => {
            output.send(message)
            midiActivity.signal('out')
            lastWriteAt.current = Date.now()
            log('out', `Wrote stored preset ${number} to the FM1.`, message)
          },
        }
        return await writeFm1VaPreset(link, slot, voice, record, { signal: write.signal })
      } catch (caughtError) {
        if (caughtError instanceof Error) log('system', caughtError.message)
        throw caughtError
      } finally {
        writes.current.delete(write)
        signal?.removeEventListener('abort', cancel)
      }
    },
    [canWrite, input, logStore, output],
  )

  return { canWrite, writePreset }
}

/**
 * Waits until the spacing after the last write has passed, resolving true, or false as soon as
 * `signal` aborts.
 */
function waitForSpacing(lastWriteAt: number | null, signal: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    if (signal.aborted) {
      resolve(false)
      return
    }
    const wait = lastWriteAt === null ? 0 : lastWriteAt + fm1VaPresetWriteSpacingMs - Date.now()
    if (wait <= 0) {
      resolve(true)
      return
    }
    const abort = () => {
      clearTimeout(timer)
      resolve(false)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve(true)
    }, wait)
    signal.addEventListener('abort', abort, { once: true })
  })
}
