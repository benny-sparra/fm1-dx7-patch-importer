import { RotateCcw } from 'lucide-react'
import { type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogCloseButton, DialogFooter, DialogHeader } from '@/components/ui/dialog'

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
    <Dialog
      aria-describedby="restore-factory-banks-description"
      aria-labelledby="restore-factory-banks-title"
      ref={dialogRef}
      size="md"
    >
      <DialogHeader>
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
        <DialogCloseButton label={t('dialogs.restoreClose')} onClick={closeDialog} />
      </DialogHeader>

      <div className="p-5">
        <p className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm leading-6">
          {t('dialogs.restoreDetails')}
        </p>
      </div>

      <DialogFooter>
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
      </DialogFooter>
    </Dialog>
  )
}
