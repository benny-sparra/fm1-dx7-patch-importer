import { Cable, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { MidiController } from '@/hooks/use-midi'
import { fm1SynthImage, fm1VaBankScreenImage } from '@/lib/fm1-responsive-images'
import { dismissFm1BankSelectionDialogForSession } from '@/lib/session'

type Fm1BankSelectionDialogProps = {
  isSending: boolean
  midi: Pick<
    MidiController,
    'connectMidi' | 'disconnectMidi' | 'firmware' | 'isConnecting' | 'midiAccess' | 'sysexAvailable'
  >
  /** What the bank becomes on the FM1 when it is not simply 32 patches, as for Favourites. */
  note?: string
  onClose: () => void
  onSend: () => void
}

export function Fm1BankSelectionDialog({
  isSending,
  midi,
  note,
  onClose,
  onSend,
}: Fm1BankSelectionDialogProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const sysexUnavailable = !midi.sysexAvailable
  // M-VAVE's firmware and FM-1+VA choose the destination bank differently. Until the editor knows
  // which one the FM1 runs, it gives M-VAVE's steps and says how FM-1+VA differs. Felucca ignores
  // DX7 banks, so the dialog says so before the bank is sent.
  const firmwareKind = midi.firmware.kind
  const steps =
    firmwareKind === 'fm1-va'
      ? (['dialogs.bankFm1VaStep1', 'dialogs.bankFm1VaStep2', 'dialogs.bankFm1VaStep3'] as const)
      : (['dialogs.bankStep1', 'dialogs.bankStep2', 'dialogs.bankStep3'] as const)
  // The photo shows the screen the steps describe.
  const photo =
    firmwareKind === 'fm1-va'
      ? { alt: t('dialogs.bankFm1VaImage'), image: fm1VaBankScreenImage }
      : { alt: t('dialogs.bankImage'), image: fm1SynthImage }
  const firmwareNote =
    firmwareKind === 'felucca'
      ? t('dialogs.bankFeluccaNote')
      : firmwareKind === 'checking' || firmwareKind === 'unidentified'
        ? t('dialogs.bankFm1VaNote')
        : null
  const closeDialog = () => dialogRef.current?.close()

  // The librarian mounts this dialog only while it is wanted, so it opens itself as it appears and
  // its state is discarded with it rather than being reset by hand.
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])
  const reconnectWithSysex = async () => {
    if (midi.midiAccess) await midi.disconnectMidi()
    await midi.connectMidi()
  }

  return (
    <Dialog
      aria-labelledby="fm1-bank-selection-title"
      onClose={() => {
        if (!sysexUnavailable && dontShowAgain) dismissFm1BankSelectionDialogForSession()
        onClose()
      }}
      ref={dialogRef}
      size="xl"
    >
      <DialogHeader>
        <DialogTitle id="fm1-bank-selection-title">
          {t(sysexUnavailable ? 'midi.sysexWarningTitle' : 'dialogs.bankTitle')}
        </DialogTitle>
        <DialogCloseButton
          label={t(sysexUnavailable ? 'midi.closeSysexWarning' : 'dialogs.bankClose')}
          onClick={closeDialog}
        />
      </DialogHeader>
      <DialogBody>
        <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]">
          {t(sysexUnavailable ? 'midi.sysexWarningBody' : 'dialogs.bankIntro')}
        </p>

        {sysexUnavailable ? (
          <div
            className="flex items-start gap-3 p-5 text-sm leading-5"
            key="sysex-warning"
            role="alert"
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <p>{t('midi.sysexRecovery')}</p>
          </div>
        ) : (
          <div
            className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center"
            key="bank-selection"
          >
            {[note, firmwareNote].map((text) =>
              text ? (
                <p
                  className="flex items-start gap-3 border border-[var(--crt-line)] bg-[var(--crt-bg-well)] p-3 text-sm leading-5 sm:col-span-2"
                  key={text}
                >
                  <Info
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-[var(--crt-led)]"
                  />
                  <span>{text}</span>
                </p>
              ) : null,
            )}
            {/* Keyed by firmware: a page translator's replaced text would otherwise stay behind
                when the steps change. */}
            <ol className="grid gap-4 text-sm leading-5" key={steps[0]}>
              <li className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <span>{t(steps[0])}</span>
              </li>
              <li className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                <span>{t(steps[1])}</span>
              </li>
              <li className="flex gap-3">
                <CircleCheck className="size-6 shrink-0 text-[var(--crt-acc-lt)]" />
                <span>{t(steps[2])}</span>
              </li>
            </ol>

            <figure className="rounded-lg border bg-[var(--fm1-photo-backdrop)] p-3 shadow-inner">
              <img
                alt={photo.alt}
                className="mx-auto h-auto w-full"
                decoding="async"
                height={photo.image.height}
                loading="lazy"
                sizes="(min-width: 640px) 194px, calc(100vw - 98px)"
                src={photo.image.src}
                srcSet={photo.image.srcSet}
                width={photo.image.width}
              />
            </figure>
          </div>
        )}
      </DialogBody>
      {/* Keys replace the whole footer: a page translator replaces bare text nodes, so React
          cannot remove the reconnect button's label on its own. */}
      {sysexUnavailable ? (
        <DialogFooter key="sysex-warning">
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
            <span>{t(midi.isConnecting ? 'midi.connecting' : 'midi.reconnectForSysex')}</span>
          </Button>
        </DialogFooter>
      ) : (
        <DialogFooter className="items-center justify-between gap-4" key="bank-selection">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              checked={dontShowAgain}
              className="size-4 accent-primary"
              onChange={(event) => setDontShowAgain(event.target.checked)}
              type="checkbox"
            />
            {t('dialogs.dontShow')}
          </label>
          <Button
            autoFocus
            className={isSending ? 'barber-pole' : undefined}
            disabled={isSending}
            onClick={onSend}
            type="button"
          >
            {t(isSending ? 'banks.sending' : 'banks.send')}
          </Button>
        </DialogFooter>
      )}
    </Dialog>
  )
}
