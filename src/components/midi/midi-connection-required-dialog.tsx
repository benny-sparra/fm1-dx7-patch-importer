import { Cable, X } from 'lucide-react'
import { type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

type MidiConnectionRequiredDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>
}

export function MidiConnectionRequiredDialog({ dialogRef }: MidiConnectionRequiredDialogProps) {
  const { t } = useTranslation()
  const closeDialog = () => dialogRef.current?.close()

  return (
    <dialog
      aria-labelledby="midi-connection-required-title"
      className="fixed inset-0 z-50 m-auto w-[min(480px,calc(100vw-2rem))] rounded-lg border border-primary/30 bg-card p-0 text-card-foreground shadow-2xl"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog()
      }}
      ref={dialogRef}
    >
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
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
        <Button
          aria-label={t('dialogs.midiClose')}
          className="shrink-0"
          onClick={closeDialog}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      </div>

      <div className="grid gap-3 px-5 py-4 text-sm leading-5">
        <p>{t('dialogs.midiSteps')}</p>
      </div>

      <div className="flex justify-end border-t bg-muted/40 px-5 py-4">
        <Button autoFocus onClick={closeDialog} type="button">
          {t('common.close')}
        </Button>
      </div>
    </dialog>
  )
}
