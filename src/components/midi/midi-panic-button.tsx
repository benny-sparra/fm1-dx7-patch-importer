import { OctagonAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { MidiController } from '@/hooks/use-midi'

type MidiPanicButtonProps = {
  midi: Pick<MidiController, 'hasMidiOutput' | 'midiAccess' | 'sendMidiPanic'>
}

/**
 * A MIDI panic: releases every note on the note channel, for notes left hanging on the FM1. It
 * shows only an icon, so its name and anything stopping it are in its tooltip. A notification
 * confirms it was sent; the MIDI log records why it could not be.
 */
export function MidiPanicButton({ midi }: MidiPanicButtonProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const unavailableReason = !midi.midiAccess
    ? t('midi.switchOnFirst')
    : !midi.hasMidiOutput
      ? t('midi.chooseOutput')
      : null

  return (
    <Button
      aria-label={t('midi.panic')}
      disabled={!midi.hasMidiOutput}
      onClick={() => {
        if (midi.sendMidiPanic()) toast.success(t('toasts.midiPanicSent'))
      }}
      size="icon"
      title={
        unavailableReason
          ? t('midi.panicUnavailable', { reason: unavailableReason })
          : t('midi.panicHelp')
      }
      type="button"
      variant="secondary"
    >
      <OctagonAlert aria-hidden="true" />
    </Button>
  )
}
