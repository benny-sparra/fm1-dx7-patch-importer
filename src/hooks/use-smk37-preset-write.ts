import { useCallback, useEffect, useRef } from 'react'

import type { MidiController } from '@/hooks/use-midi'
import { makeDx7SingleVoicePayload, makeYamahaSysexMessage, type Dx7Voice } from '@/lib/dx7'
import { resolveFirmwareProfile } from '@/lib/firmware-profile'
import { makeLogEntry, sendDx7Voice } from '@/lib/midi'
import { MidiTransferCancelledError } from '@/lib/midi-transfer-queue'

type Smk37PresetWriteMidi = Pick<
  MidiController,
  | 'channel'
  | 'firmware'
  | 'logStore'
  | 'outputs'
  | 'queueEffectOrder'
  | 'selectedOutputId'
  | 'sysexAvailable'
>

/** What a write reports, so **Write to SMK-37…** can say why one did not go. */
export type Smk37PresetWriteResult =
  | { ok: true }
  | { ok: false; reason: 'no_output' | 'sysex_unavailable' | 'transport' | 'unsupported' }

/**
 * Writes one patch over the preset selected on the SMK-37, as a DX7 single-voice dump it saves
 * for good (docs/hardware-runs/smk37-2026-11-03.md), and only where the profile offers
 * `selectedPresetWrite`. It lives outside `useMidi`, as the FM-1+VA preset writer does, so it costs
 * the entry nothing, and takes its turn on the transfer queue behind any patch still going. A
 * write belongs to the output it started on: changing it, switching MIDI off, or unmounting
 * cancels one still waiting its turn, while one already sent cannot be taken back.
 */
export function useSmk37PresetWrite(midi: Smk37PresetWriteMidi) {
  const { channel, firmware, logStore, queueEffectOrder, sysexAvailable } = midi
  const output = midi.outputs.find((device) => device.id === midi.selectedOutputId)?.port
  const writes = useRef(new Set<AbortController>())

  useEffect(() => {
    const active = writes.current
    return () => {
      active.forEach((write) => write.abort())
      active.clear()
    }
  }, [output])

  return useCallback(
    async (voice: Dx7Voice): Promise<Smk37PresetWriteResult> => {
      if (!output) return { ok: false, reason: 'no_output' }
      if (!sysexAvailable) return { ok: false, reason: 'sysex_unavailable' }
      if (!resolveFirmwareProfile(firmware).capabilities.selectedPresetWrite) {
        return { ok: false, reason: 'unsupported' }
      }

      const write = new AbortController()
      writes.current.add(write)
      let sent = false
      try {
        await queueEffectOrder(async () => {
          if (write.signal.aborted) return
          sendDx7Voice(output, channel, voice)
          sent = true
          logStore.append(
            makeLogEntry(
              'out',
              `Wrote ${voice.name} over the selected preset.`,
              makeYamahaSysexMessage(makeDx7SingleVoicePayload(voice, channel)),
            ),
          )
        }, write.signal)
      } catch (error) {
        if (sent) return { ok: true }
        logStore.append(
          makeLogEntry('system', error instanceof Error ? error.message : 'Patch write failed.'),
        )
        // A turn dropped because the output changed or MIDI went off is no transport failure.
        const dropped = write.signal.aborted || error instanceof MidiTransferCancelledError
        return { ok: false, reason: dropped ? 'no_output' : 'transport' }
      } finally {
        writes.current.delete(write)
      }
      return sent ? { ok: true } : { ok: false, reason: 'no_output' }
    },
    [channel, firmware, logStore, output, queueEffectOrder, sysexAvailable],
  )
}
