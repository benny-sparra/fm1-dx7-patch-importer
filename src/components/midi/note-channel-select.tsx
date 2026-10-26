import { useTranslation } from 'react-i18next'

import { SettingsSelect } from '@/components/midi/device-select'
import type { MidiController } from '@/hooks/use-midi'
import { midiChannels } from '@/lib/midi-channels'

type NoteChannelSelectProps = {
  midi: Pick<MidiController, 'channel' | 'setChannel'>
}

/**
 * The note channel in the header, so the channel of an FM1 Voice or track can be changed from the
 * patch banks and the editor. It reads the same state as the Settings menu's Note channel, and
 * changing it sends nothing. It shows whether or not MIDI is online, so the header never shifts.
 */
export function NoteChannelSelect({ midi }: NoteChannelSelectProps) {
  const { t } = useTranslation()
  const label = t('settings.noteChannel')

  return (
    <span className="inline-flex w-[5.75rem] shrink-0">
      <SettingsSelect
        aria-label={label}
        onChange={(event) => midi.setChannel(Number(event.target.value))}
        title={label}
        value={midi.channel}
      >
        {midiChannels.map((midiChannel) => (
          <option key={midiChannel} value={midiChannel}>
            {t('root.channelShort', { number: midiChannel })}
          </option>
        ))}
      </SettingsSelect>
    </span>
  )
}
