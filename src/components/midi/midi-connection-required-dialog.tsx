import { useEffect, useRef } from 'react'
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

type MidiConnectionRequiredDialogProps = {
  onClose: () => void
}

export function MidiConnectionRequiredDialog({ onClose }: MidiConnectionRequiredDialogProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeDialog = () => dialogRef.current?.close()

  // The librarian mounts this dialog only while it is wanted, so it opens itself as it appears and
  // its state is discarded with it rather than being reset by hand.
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  return (
    <Dialog
      aria-labelledby="midi-connection-required-title"
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
          <p>{t('dialogs.midiSteps')}</p>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button autoFocus onClick={closeDialog} type="button">
          {t('common.close')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
