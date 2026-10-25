import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import type { MidiController } from '@/hooks/use-midi'
import { midiActivity } from '@/lib/midi-activity'

/**
 * The MIDI activity LEDs on a synth's panel: IN lights as a message arrives from the selected
 * input, OUT as the editor sends one. The MIDI log is the record assistive technology reads, so the
 * LEDs stay out of the accessibility tree rather than announce every message. While MIDI is
 * offline the readout dims, as a panel does with its power off.
 */
export function MidiActivityLeds({ midi }: { midi: Pick<MidiController, 'midiAccess'> }) {
  const { t } = useTranslation()
  const activity = useSyncExternalStore(midiActivity.subscribe, midiActivity.getSnapshot)

  return (
    <span
      aria-hidden="true"
      data-offline={midi.midiAccess ? undefined : true}
      className="midi-activity crt-inset hidden h-8 items-center gap-2.5 px-2.5 text-[10px] tracking-[0.1em] sm:ml-auto sm:inline-flex"
      title={t('midi.activityTitle')}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="midi-activity-led" data-lit={activity.in || undefined} />
        <span>IN</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="midi-activity-led" data-lit={activity.out || undefined} />
        <span>OUT</span>
      </span>
    </span>
  )
}
