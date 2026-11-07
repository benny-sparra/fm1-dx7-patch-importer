import { useEffect, useEffectEvent } from 'react'
import type { MessageEvent } from 'webmidi'

import type { MidiController } from '@/hooks/use-midi'
import { midiActivity } from '@/lib/midi-activity'
import { Dx7VoiceReceiver, type Dx7VoiceReceipt } from '@/lib/dx7-voice-receiver'

/** How long a part-way dump may go quiet before it no longer counts as arriving. */
export const dumpStallMs = 2_000

type VoiceReceiverMidi = Pick<MidiController, 'inputs' | 'selectedInputId' | 'sysexAvailable'>

/** Why nothing can be received yet, or that the selected input is being listened to. */
export type Dx7VoiceReceiverState = 'listening' | 'no-input' | 'no-sysex'

/**
 * Listens on the selected MIDI input for a DX7 single-voice dump or 32-voice bank while the component using it is
 * mounted, and only then. It sends nothing. Switching MIDI off, losing SysEx, choosing another
 * input, and unmounting each remove the listener and forget a dump part-way through, so a message
 * arriving afterwards reaches nothing.
 */
export function useDx7VoiceReceiver(
  midi: VoiceReceiverMidi,
  onReceipt: (receipt: Dx7VoiceReceipt) => void,
  onProgress?: (progress: number) => void,
): Dx7VoiceReceiverState {
  const input = midi.inputs.find((device) => device.id === midi.selectedInputId)?.port
  const { sysexAvailable } = midi
  const report = useEffectEvent(onReceipt)
  const reportProgress = useEffectEvent((progress: number) => onProgress?.(progress))

  useEffect(() => {
    if (!input || !sysexAvailable) return
    const receiver = new Dx7VoiceReceiver()
    let listening = true
    let stalled: number | undefined
    const hear = (event: MessageEvent) => {
      if (!listening) return
      const receipt = receiver.receive(event.data)
      // A dump that has finished has all of it, whether it turned out a bank, a voice, or damaged.
      const progress = receipt ? 1 : receiver.progress
      reportProgress(progress)
      // A dump the sender gave up on, as an FM1's Receive Timeout does, stops showing as arriving.
      window.clearTimeout(stalled)
      if (progress > 0 && progress < 1) {
        stalled = window.setTimeout(() => reportProgress(0), dumpStallMs)
      }
      // A bank blips IN twice, as one that is sent blips OUT.
      if (receipt?.kind === 'bank') midiActivity.signal('in', true)
      if (receipt) report(receipt)
    }
    input.addListener('midimessage', hear)
    return () => {
      listening = false
      window.clearTimeout(stalled)
      input.removeListener('midimessage', hear)
    }
  }, [input, sysexAvailable])

  if (!input) return 'no-input'
  return sysexAvailable ? 'listening' : 'no-sysex'
}
