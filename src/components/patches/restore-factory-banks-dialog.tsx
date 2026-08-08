import { RotateCcw, X } from 'lucide-react'
import { type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

type RestoreFactoryBanksDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>
  onRestore: () => void
}

export function RestoreFactoryBanksDialog({
  dialogRef,
  onRestore,
}: RestoreFactoryBanksDialogProps) {
  const { t } = useTranslation()
  const closeDialog = () => dialogRef.current?.close()

  return (
    <dialog
      aria-describedby="restore-factory-banks-description"
      aria-labelledby="restore-factory-banks-title"
      className="fixed inset-0 z-50 m-auto w-[min(520px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-primary/30 bg-card p-0 text-card-foreground shadow-2xl"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog()
      }}
      ref={dialogRef}
    >
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex gap-3">
          <RotateCcw className="mt-0.5 size-6 shrink-0 text-primary" />
          <div>
            <h2 className="text-lg font-bold" id="restore-factory-banks-title">
              {t('dialogs.restoreTitle')}
            </h2>
            <p
              className="mt-1 text-sm leading-5 text-muted-foreground"
              id="restore-factory-banks-description"
            >
              {t('dialogs.restoreIntro')}
            </p>
          </div>
        </div>
        <Button
          aria-label={t('dialogs.restoreClose')}
          className="shrink-0"
          onClick={closeDialog}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      </div>

      <div className="p-5">
        <p className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm leading-6">
          {t('dialogs.restoreDetails')}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t bg-muted/40 px-5 py-4 sm:flex-row sm:justify-end">
        <Button onClick={closeDialog} type="button" variant="outline">
          {t('common.cancel')}
        </Button>
        <Button
          onClick={() => {
            onRestore()
            closeDialog()
          }}
          type="button"
        >
          <RotateCcw />
          {t('dialogs.restoreAction')}
        </Button>
      </div>
    </dialog>
  )
}
