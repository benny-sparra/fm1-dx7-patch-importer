import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { SettingsSelect } from '@/components/midi/device-select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InfoNotice } from '@/components/ui/info-notice'
import '@/i18n/voices'
import type { MidiController } from '@/hooks/use-midi'
import { useVoiceSetup } from '@/hooks/use-voice-setup'
import { midiChannels } from '@/lib/midi-channels'
import { aimedVoice, setVoiceChannel } from '@/lib/voice-setup'

type VoiceChannelsDialogProps = {
  midi: Pick<MidiController, 'channel' | 'setChannel'>
  onClose: () => void
}

/**
 * Each of Voices 1–8's channel, kept out of the strip since it is set once to match the FM1. It
 * changes only the setup the app keeps and, for the aimed Voice, the note channel: nothing is sent.
 */
export function VoiceChannelsDialog({ midi, onClose }: VoiceChannelsDialogProps) {
  const { t } = useTranslation()
  const { aimed, setup } = useVoiceSetup()
  const aimedIndex = aimedVoice(setup, midi.channel, aimed)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeDialog = () => dialogRef.current?.close()

  // The strip mounts this dialog only while it is wanted, so it opens itself as it appears.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
  }, [])

  return (
    <Dialog aria-labelledby="voice-channels-title" onClose={onClose} ref={dialogRef} size="3xl">
      <DialogHeader>
        <DialogTitle id="voice-channels-title">{t('voices.channelsTitle')}</DialogTitle>
        <DialogCloseButton label={t('voices.channelsClose')} onClick={closeDialog} />
      </DialogHeader>
      <DialogBody>
        <div className="grid gap-3 p-4">
          <InfoNotice>
            <p>{t('voices.setupNote')}</p>
            <p>{t('voices.howToAssign')}</p>
          </InfoNotice>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {setup.voices.map((voice, index) => {
              const number = index + 1
              return (
                <label className="grid gap-1 text-[11px] tracking-[0.1em] uppercase" key={number}>
                  <span className="text-muted-foreground">{t('voices.voice', { number })}</span>
                  <SettingsSelect
                    aria-label={t('voices.channelOf', { number })}
                    onChange={(event) => {
                      const channel = Number(event.target.value)
                      setVoiceChannel(index, channel)
                      // The aim stays on the Voice, so the note channel follows it.
                      if (index === aimedIndex) midi.setChannel(channel)
                    }}
                    value={voice.channel}
                  >
                    {midiChannels.map((midiChannel) => (
                      <option key={midiChannel} value={midiChannel}>
                        {t('root.channelShort', { number: midiChannel })}
                      </option>
                    ))}
                  </SettingsSelect>
                </label>
              )
            })}
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button autoFocus onClick={closeDialog} type="button" variant="ghost">
          {t('common.close')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
