import { useCallback, useEffect, useRef } from 'react'
import type { MessageEvent } from 'webmidi'

import type { MidiController } from '@/hooks/use-midi'
import {
  Fm1VaPresetReadError,
  fm1VaPresetNumber,
  readFm1VaPreset,
  readsFm1VaPresets,
  type Fm1VaLink,
} from '@/lib/fm1-va-preset-read'
import { makeLogEntry } from '@/lib/midi'
import { midiActivity } from '@/lib/midi-activity'

type PresetReaderMidi = Pick<
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
 * Reads stored presets from an FM1 on FM-1+VA through the ports `useMidi` has selected. It lives
 * outside `useMidi`, which every page loads, so only the code that reads presets carries it.
 *
 * The request goes straight to the output, as the identity query does, rather than through the
 * transfer queue: it changes nothing on the FM1, and a read that waits behind a bank transfer
 * asks again. A read belongs to the ports it started on, so changing either, or unmounting,
 * cancels it.
 */
export function useFm1VaPresetReader(midi: PresetReaderMidi) {
  const { firmware, logStore, sysexAvailable } = midi
  const input = midi.inputs.find((device) => device.id === midi.selectedInputId)?.port
  const output = midi.outputs.find((device) => device.id === midi.selectedOutputId)?.port
  const canRead = Boolean(input && output && sysexAvailable && readsFm1VaPresets(firmware))
  const reads = useRef(new Set<AbortController>())

  useEffect(() => {
    const active = reads.current
    return () => {
      active.forEach((read) => read.abort())
      active.clear()
    }
  }, [input, output])

  /**
   * Reads stored preset `slot` (0–127) exactly as stored. Rejects with an `Fm1VaPresetReadError`
   * when the ports, SysEx, or firmware cannot read presets, when the FM1 does not answer or
   * refuses, and when `signal` or a change of ports cancels it.
   */
  const readPreset = useCallback(
    async (slot: number, signal?: AbortSignal) => {
      const number = fm1VaPresetNumber(slot)
      const log = (direction: 'out' | 'system', message: string, data?: Uint8Array) =>
        logStore.append(makeLogEntry(direction, message, data))
      if (!canRead || !input || !output) {
        const error = new Fm1VaPresetReadError(
          'unavailable',
          slot,
          'Reading a stored preset needs an FM1 on FM-1+VA FM-1_079 or later, SysEx, and its input and output.',
        )
        log('system', error.message)
        throw error
      }

      const read = new AbortController()
      const cancel = () => read.abort()
      reads.current.add(read)
      signal?.addEventListener('abort', cancel)
      if (signal?.aborted) cancel()
      const link: Fm1VaLink = {
        listen: (hear) => {
          const handle = (event: MessageEvent) => hear(event.data)
          input.addListener('midimessage', handle)
          return () => input.removeListener('midimessage', handle)
        },
        send: (message) => {
          output.send(message)
          midiActivity.signal('out')
          log('out', `Asked the FM1 for stored preset ${number}.`, message)
        },
      }
      try {
        const preset = await readFm1VaPreset(link, slot, { signal: read.signal })
        log('system', `Read stored preset ${number} from the FM1.`)
        return preset
      } catch (caughtError) {
        if (caughtError instanceof Error) log('system', caughtError.message)
        throw caughtError
      } finally {
        reads.current.delete(read)
        signal?.removeEventListener('abort', cancel)
      }
    },
    [canRead, input, logStore, output],
  )

  return { canRead, readPreset }
}
