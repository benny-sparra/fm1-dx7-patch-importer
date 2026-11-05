import { useCallback, useEffect, useRef, useState } from 'react'
import type { MessageEvent } from 'webmidi'

import type { MidiController } from '@/hooks/use-midi'
import { resolveFirmwareProfile } from '@/lib/firmware-profile'
import { makeLogEntry } from '@/lib/midi'
import { midiActivity } from '@/lib/midi-activity'
import {
  decodeV16LiveEffects,
  readV16LiveEffects,
  V16LiveEffectsReadError,
} from '@/lib/v16-live-effects'

type LiveEffectsReadMidi = Pick<
  MidiController,
  | 'firmware'
  | 'hasMidiOutput'
  | 'inputs'
  | 'logStore'
  | 'outputs'
  | 'queueEffectOrder'
  | 'selectedInputId'
  | 'selectedOutputId'
  | 'sysexAvailable'
>

/**
 * What a read gives: the FM1's 24 effect controls and its chain order, or why it gave nothing, the
 * FM1 not answering or an answer that was not a whole reading.
 */
type V16LiveEffectsResult =
  | { effects: Uint8Array; order: number[]; type: 'reading' }
  | { problem: 'no-reply' | 'unusable'; type: 'failed' }

export type V16LiveEffectsRead = {
  /** Whether the profile, MIDI, SysEx, and both ports allow the read. */
  offered: boolean
  /**
   * Sends the one approved read, in turn on the effects' transfer queue, and resolves with what it
   * gave, or with `null` when it was cancelled or not offered.
   */
  read: () => Promise<V16LiveEffectsResult | null>
  reading: boolean
}

/**
 * Reads V16's live FX group back from the FM1 on an explicit action, through the one read approved
 * on 2026-11-02 and confirmed on hardware on 2026-11-05 (AGENTS.md, "MIDI"). Each call sends it
 * once, never again on its own, and takes its turn on the queue the effect order uses, so it cannot
 * land between another operation's read and write. It belongs to the ports it started on: changing
 * either, switching MIDI off, or unmounting cancels it. Offered only while the profile's
 * `liveEffectsRead` allows.
 */
export function useV16LiveEffectsRead(midi: LiveEffectsReadMidi): V16LiveEffectsRead {
  const { firmware, logStore, queueEffectOrder } = midi
  const input = midi.inputs.find((device) => device.id === midi.selectedInputId)?.port
  const output = midi.outputs.find((device) => device.id === midi.selectedOutputId)?.port
  const offered =
    resolveFirmwareProfile(firmware).capabilities.liveEffectsRead &&
    midi.hasMidiOutput &&
    midi.sysexAvailable &&
    input !== undefined &&
    output !== undefined
  const [reading, setReading] = useState(false)
  const abort = useRef<AbortController | null>(null)

  // A read belongs to the ports and firmware it started on.
  useEffect(() => () => abort.current?.abort(), [input, offered, output])

  const read = useCallback(async () => {
    if (!offered || !input || !output || abort.current) return null
    const controller = new AbortController()
    abort.current = controller
    setReading(true)
    let result: V16LiveEffectsResult = { problem: 'unusable', type: 'failed' }
    try {
      await queueEffectOrder(async () => {
        if (controller.signal.aborted) return
        try {
          const live = await readV16LiveEffects(
            {
              listen: (hear) => {
                const handle = (event: MessageEvent) => hear(event.data)
                input.addListener('midimessage', handle)
                return () => input.removeListener('midimessage', handle)
              },
              send: (message) => {
                output.send(message)
                midiActivity.signal('out')
                logStore.append(
                  makeLogEntry('out', 'Asked the FM1 for its live FX settings.', message),
                )
              },
            },
            { signal: controller.signal },
          )
          logStore.append(makeLogEntry('in', 'The FM1 sent its live FX settings.', live.reply))
          const decoded = decodeV16LiveEffects(live)
          if (decoded) result = { ...decoded, type: 'reading' }
        } catch (error) {
          if (controller.signal.aborted) return
          logStore.append(
            makeLogEntry('system', error instanceof Error ? error.message : 'The read failed.'),
          )
          if (error instanceof V16LiveEffectsReadError && error.problem === 'no-reply') {
            result = { problem: 'no-reply', type: 'failed' }
          }
        }
      }, controller.signal)
    } catch {
      // The queue drops a cancelled turn; anything else leaves the unusable result.
    } finally {
      if (abort.current === controller) {
        abort.current = null
        setReading(false)
      }
    }
    return controller.signal.aborted ? null : result
  }, [input, logStore, offered, output, queueEffectOrder])

  return { offered, read, reading }
}
