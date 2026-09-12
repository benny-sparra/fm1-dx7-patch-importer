import { type RefObject } from 'react'
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
  dialogRef: RefObject<HTMLDialogElement | null>
}

export function MidiConnectionRequiredDialog({ dialogRef }: MidiConnectionRequiredDialogProps) {
  const { t } = useTranslation()
  const closeDialog = () => dialogRef.current?.close()

  return (
    <Dialog aria-labelledby="midi-connection-required-title" ref={dialogRef} size="sm">
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
