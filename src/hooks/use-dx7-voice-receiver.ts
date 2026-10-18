import { useEffect, useEffectEvent } from 'react'
import type { MessageEvent } from 'webmidi'

import type { MidiController } from '@/hooks/use-midi'
import { Dx7VoiceReceiver, type Dx7VoiceReceipt } from '@/lib/dx7-voice-receiver'

type VoiceReceiverMidi = Pick<MidiController, 'inputs' | 'selectedInputId' | 'sysexAvailable'>

/** Why nothing can be received yet, or that the selected input is being listened to. */
export type Dx7VoiceReceiverState = 'listening' | 'no-input' | 'no-sysex'

/**
 * Listens on the selected MIDI input for a DX7 single-voice dump while the component using it is
 * mounted, and only then. It sends nothing. Switching MIDI off, losing SysEx, choosing another
 * input, and unmounting each remove the listener and forget a dump part-way through, so a message
 * arriving afterwards reaches nothing.
 */
export function useDx7VoiceReceiver(
  midi: VoiceReceiverMidi,
  onReceipt: (receipt: Dx7VoiceReceipt) => void,
): Dx7VoiceReceiverState {
  const input = midi.inputs.find((device) => device.id === midi.selectedInputId)?.port
  const { sysexAvailable } = midi
  const report = useEffectEvent(onReceipt)

  useEffect(() => {
    if (!input || !sysexAvailable) return
    const receiver = new Dx7VoiceReceiver()
    let listening = true
    const hear = (event: MessageEvent) => {
      if (!listening) return
      const receipt = receiver.receive(event.data)
      if (receipt) report(receipt)
    }
    input.addListener('midimessage', hear)
    return () => {
      listening = false
      input.removeListener('midimessage', hear)
    }
  }, [input, sysexAvailable])

  if (!input) return 'no-input'
  return sysexAvailable ? 'listening' : 'no-sysex'
}
