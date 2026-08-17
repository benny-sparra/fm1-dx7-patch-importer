import { Cable } from 'lucide-react'
import { type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogCloseButton, DialogFooter, DialogHeader } from '@/components/ui/dialog'

type MidiConnectionRequiredDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>
}

export function MidiConnectionRequiredDialog({ dialogRef }: MidiConnectionRequiredDialogProps) {
  const { t } = useTranslation()
  const closeDialog = () => dialogRef.current?.close()

  return (
    <Dialog
      aria-labelledby="midi-connection-required-title"
      ref={dialogRef}
      size="sm"
    >
      <DialogHeader>
        <div className="flex gap-3">
          <Cable className="mt-0.5 size-6 shrink-0 text-primary" />
          <div>
            <h2 className="text-lg font-bold" id="midi-connection-required-title">
              {t('dialogs.midiTitle')}
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {t('dialogs.midiIntro')}
            </p>
          </div>
        </div>
        <DialogCloseButton
          label={t('dialogs.midiClose')}
          onClick={closeDialog}
        />
      </DialogHeader>

      <div className="grid gap-3 px-5 py-4 text-sm leading-5">
        <p>{t('dialogs.midiSteps')}</p>
      </div>

      <DialogFooter>
        <Button autoFocus onClick={closeDialog} type="button">
          {t('common.close')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
