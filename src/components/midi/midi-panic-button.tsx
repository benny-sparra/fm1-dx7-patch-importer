import { OctagonAlert } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { MidiController } from '@/hooks/use-midi'

type MidiPanicButtonProps = {
  midi: Pick<MidiController, 'hasMidiOutput' | 'midiAccess' | 'sendMidiPanic'>
}

/**
 * A MIDI panic: releases every note on the note channel, for notes left hanging on the FM1. Its
 * short label names it on a phone, where no tooltip shows; what stops it is in its tooltip and
 * also its description. It stays focusable while it cannot send, since a disabled button takes no
 * focus and its tooltip and description would never reach the keyboard. A notification confirms it
 * was sent; the MIDI log records why it could not be.
 */
export function MidiPanicButton({ midi }: MidiPanicButtonProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const reasonId = useId()
  const unavailableReason = !midi.midiAccess
    ? t('midi.switchOnFirst')
    : !midi.hasMidiOutput
      ? t('midi.chooseOutput')
      : null

  return (
    <>
      <Button
        aria-describedby={unavailableReason ? reasonId : undefined}
        aria-disabled={!midi.hasMidiOutput || undefined}
        aria-label={t('midi.panic')}
        className="font-vt323"
        onClick={() => {
          if (midi.hasMidiOutput && midi.sendMidiPanic()) toast.success(t('toasts.midiPanicSent'))
        }}
        title={
          unavailableReason
            ? t('midi.panicUnavailable', { reason: unavailableReason })
            : t('midi.panicHelp')
        }
        type="button"
        variant="secondary"
      >
        <OctagonAlert aria-hidden="true" />
        <span>{t('midi.panicLabel')}</span>
      </Button>
      {unavailableReason ? (
        <span className="sr-only" id={reasonId}>
          {unavailableReason}
        </span>
      ) : null}
    </>
  )
}
