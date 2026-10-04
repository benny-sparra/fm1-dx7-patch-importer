import { useCallback } from 'react'

import type { MidiController } from '@/hooks/use-midi'
import { makeFm1VaSoundControlMessage, sendsFm1VaSoundControls } from '@/lib/fm1-va-sound-control'
import { makeLogEntry } from '@/lib/midi'
import { midiActivity } from '@/lib/midi-activity'

type SoundControlMidi = Pick<
  MidiController,
  'channel' | 'firmware' | 'logStore' | 'outputs' | 'selectedOutputId'
>

/**
 * Sends FM-1+VA's sound-setting Control Changes on the MIDI Channel, through the output `useMidi`
 * has selected. It lives outside `useMidi`, which every page loads, so only the code that sets
 * Virtual Analog settings carries it. Each change goes straight to the output: it is an unsaved
 * edit on the FM1, like turning a knob, and only the latest value matters.
 */
export function useFm1VaSoundControl(midi: SoundControlMidi) {
  const { channel, firmware, logStore } = midi
  const output = midi.outputs.find((device) => device.id === midi.selectedOutputId)?.port
  const canSend = Boolean(output && sendsFm1VaSoundControls(firmware))

  /**
   * Sends `controller` = `value` and returns whether it went. Throws a `RangeError` for a
   * controller that is not a sound setting or a value outside 0–127.
   */
  const sendSoundControl = useCallback(
    (controller: number, value: number) => {
      const message = makeFm1VaSoundControlMessage(controller, value, channel)
      if (!canSend || !output) return false
      output.send(message)
      midiActivity.signal('out')
      logStore.append(
        makeLogEntry(
          'out',
          `Sent FM-1+VA sound CC ${controller} = ${value} on channel ${channel}.`,
          message,
        ),
      )
      return true
    },
    [canSend, channel, logStore, output],
  )

  return { canSend, sendSoundControl }
}
