import { Radio } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import type { MidiController } from '@/hooks/use-midi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { DeviceSelect } from './device-select'
import { MidiConnectionError } from './midi-controls'

type MidiConnectionRequiredDialogProps = {
  midi: Pick<
    MidiController,
    | 'connectMidi'
    | 'error'
    | 'firmware'
    | 'hasMidiOutput'
    | 'isConnecting'
    | 'midiAccess'
    | 'outputs'
    | 'selectedOutputId'
    | 'setSelectedOutputId'
  >
  onClose: () => void
  /** Closes the dialog and sends the bank, once MIDI reaches the FM1. */
  onSend: () => void
}

/**
 * Send to FM1, pressed while MIDI cannot reach the FM1. Rather than saying where to go, the dialog
 * switches MIDI online and chooses the output itself, then sends from the same button.
 */
export function MidiConnectionRequiredDialog({
  midi,
  onClose,
  onSend,
}: MidiConnectionRequiredDialogProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const reasonId = useId()
  const closeDialog = () => {
    if (!midi.isConnecting) dialogRef.current?.close()
  }

  // The librarian mounts this dialog only while it is wanted, so it opens itself as it appears and
  // its state is discarded with it rather than being reset by hand.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
  }, [])

  // One button carries every step, so focus stays on it as MIDI connects and the send comes
  // within reach. Until then it says what it is waiting for, read with it.
  const step = !midi.midiAccess
    ? midi.isConnecting
      ? 'connecting'
      : 'connect'
    : !midi.hasMidiOutput
      ? 'chooseOutput'
      : midi.firmware.kind === 'checking'
        ? 'identifying'
        : 'send'
  const waitingReason =
    step === 'chooseOutput'
      ? t('midi.chooseOutput')
      : step === 'identifying'
        ? t('dialogs.midiIdentifying')
        : null
  const isWaiting = step === 'connecting' || waitingReason !== null
  const runStep = () => {
    if (step === 'connect') void midi.connectMidi()
    if (step === 'send') onSend()
  }

  return (
    <Dialog
      aria-labelledby="midi-connection-required-title"
      closeOnBackdrop={!midi.isConnecting}
      onCancel={(event) => {
        if (midi.isConnecting) event.preventDefault()
      }}
      onClose={onClose}
      ref={dialogRef}
      size="sm"
    >
      <DialogHeader>
        <DialogTitle id="midi-connection-required-title">{t('dialogs.midiTitle')}</DialogTitle>
        <DialogCloseButton label={t('dialogs.midiClose')} onClick={closeDialog} />
      </DialogHeader>
      <DialogBody>
        <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]">
          {t('dialogs.midiIntro')}
        </p>

        <div className="grid gap-3 px-5 py-4 text-sm leading-5">
          {/* Stays mounted, so each step it reaches is announced as the text changes. */}
          <p role="status">
            <span key={step}>
              {midi.midiAccess
                ? midi.hasMidiOutput
                  ? t('dialogs.midiReady')
                  : t('dialogs.midiChooseOutput')
                : t('dialogs.midiSteps')}
            </span>
            {step === 'connecting' ? (
              <span className="sr-only"> {t('midi.connecting')}</span>
            ) : null}
          </p>
          {midi.midiAccess ? (
            <DeviceSelect
              devices={midi.outputs}
              icon={<Radio />}
              label={t('settings.output')}
              onChange={midi.setSelectedOutputId}
              value={midi.selectedOutputId}
            />
          ) : null}
          <MidiConnectionError midi={midi} />
          {waitingReason ? (
            <span className="sr-only" id={reasonId} key={waitingReason}>
              {waitingReason}
            </span>
          ) : null}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button onClick={closeDialog} type="button" variant="ghost">
          {t('common.close')}
        </Button>
        <Button
          aria-describedby={waitingReason ? reasonId : undefined}
          aria-disabled={isWaiting || undefined}
          autoFocus
          onClick={isWaiting ? undefined : runStep}
          type="button"
        >
          {/* Keyed by step: a page translator's replaced text would otherwise stay behind. */}
          <span key={step}>
            {step === 'connect'
              ? t('dialogs.midiConnect')
              : step === 'connecting'
                ? t('midi.connecting')
                : t('banks.send')}
          </span>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
