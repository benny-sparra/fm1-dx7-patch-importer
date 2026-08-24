import { Cable, CircleCheck, TriangleAlert } from 'lucide-react'
import { type RefObject, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogCloseButton, DialogFooter, DialogHeader } from '@/components/ui/dialog'
import { type MidiController } from '@/hooks/use-midi'
import { fm1SynthImage } from '@/lib/fm1-responsive-images'
import { dismissFm1BankSelectionDialogForSession } from '@/lib/session'

type Fm1BankSelectionDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>
  isSending: boolean
  midi: MidiController
  onSend: () => void
}

export function Fm1BankSelectionDialog({
  dialogRef,
  isSending,
  midi,
  onSend,
}: Fm1BankSelectionDialogProps) {
  const { t } = useTranslation()
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const sysexUnavailable = !midi.sysexAvailable
  const closeDialog = () => dialogRef.current?.close()
  const reconnectWithSysex = async () => {
    if (midi.midiAccess) await midi.disconnectMidi()
    await midi.connectMidi()
  }

  return (
    <Dialog
      aria-labelledby="fm1-bank-selection-title"
      onClose={() => {
        if (!sysexUnavailable && dontShowAgain) dismissFm1BankSelectionDialogForSession()
      }}
      ref={dialogRef}
      size="xl"
    >
      <DialogHeader>
        <div>
          <h2 className="text-lg font-bold" id="fm1-bank-selection-title">
            {t(sysexUnavailable ? 'midi.sysexWarningTitle' : 'dialogs.bankTitle')}
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {t(sysexUnavailable ? 'midi.sysexWarningBody' : 'dialogs.bankIntro')}
          </p>
        </div>
        <DialogCloseButton
          label={t(sysexUnavailable ? 'midi.closeSysexWarning' : 'dialogs.bankClose')}
          onClick={closeDialog}
        />
      </DialogHeader>

      {sysexUnavailable ? (
        <div className="flex items-start gap-3 p-5 text-sm leading-5" role="alert">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <p>{t('midi.sysexRecovery')}</p>
        </div>
      ) : (
        <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
          <ol className="grid gap-4 text-sm leading-5">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </span>
              <span>{t('dialogs.bankStep1')}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>
              <span>{t('dialogs.bankStep2')}</span>
            </li>
            <li className="flex gap-3">
              <CircleCheck className="size-6 shrink-0 text-primary" />
              <span>{t('dialogs.bankStep3')}</span>
            </li>
          </ol>

          <figure className="rounded-lg border bg-[#22242a] p-3 shadow-inner">
            <img
              alt={t('dialogs.bankImage')}
              className="mx-auto h-auto w-full"
              decoding="async"
              height={fm1SynthImage.height}
              loading="lazy"
              sizes="(min-width: 640px) 194px, calc(100vw - 98px)"
              src={fm1SynthImage.src}
              srcSet={fm1SynthImage.srcSet}
              width={fm1SynthImage.width}
            />
          </figure>
        </div>
      )}

      {sysexUnavailable ? (
        <DialogFooter>
          <Button onClick={closeDialog} type="button" variant="outline">
            {t('common.close')}
          </Button>
          <Button
            autoFocus
            disabled={midi.isConnecting}
            onClick={() => void reconnectWithSysex()}
            type="button"
          >
            <Cable />
            {t(midi.isConnecting ? 'midi.connecting' : 'midi.reconnectForSysex')}
          </Button>
        </DialogFooter>
      ) : (
        <DialogFooter className="items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              checked={dontShowAgain}
              className="size-4 accent-primary"
              onChange={(event) => setDontShowAgain(event.target.checked)}
              type="checkbox"
            />
            {t('dialogs.dontShow')}
          </label>
          <div className="flex items-center gap-2">
            <Button onClick={closeDialog} type="button" variant="outline">
              {t('common.close')}
            </Button>
            <Button autoFocus disabled={isSending} onClick={onSend} type="button">
              {t(isSending ? 'banks.sending' : 'banks.send')}
            </Button>
          </div>
        </DialogFooter>
      )}
    </Dialog>
  )
}
