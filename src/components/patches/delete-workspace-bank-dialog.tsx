import { Trash2 } from 'lucide-react'
import { type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogCloseButton, DialogFooter, DialogHeader } from '@/components/ui/dialog'

type DeleteWorkspaceBankDialogProps = {
  bankName: string
  dialogRef: RefObject<HTMLDialogElement | null>
  onDelete: () => void
}

export function DeleteWorkspaceBankDialog({
  bankName,
  dialogRef,
  onDelete,
}: DeleteWorkspaceBankDialogProps) {
  const { t } = useTranslation()
  const closeDialog = () => dialogRef.current?.close()

  return (
    <Dialog
      aria-describedby="delete-workspace-bank-description"
      aria-labelledby="delete-workspace-bank-title"
      ref={dialogRef}
      size="sm"
    >
      <DialogHeader>
        <div className="flex gap-3">
          <Trash2 className="mt-0.5 size-6 shrink-0 text-destructive" />
          <div>
            <h2 className="text-lg font-bold" id="delete-workspace-bank-title">
              {t('banks.deleteBank')}
            </h2>
            <p
              className="mt-1 text-sm leading-5 text-muted-foreground"
              id="delete-workspace-bank-description"
            >
              {t('banks.deleteBankConfirm', { name: bankName })}
            </p>
          </div>
        </div>
        <DialogCloseButton label={t('common.close')} onClick={closeDialog} />
      </DialogHeader>

      <DialogFooter>
        <Button
          className="bg-destructive text-white shadow-none hover:bg-destructive/90 hover:shadow-none"
          onClick={() => {
            onDelete()
            closeDialog()
          }}
          type="button"
        >
          <Trash2 />
          {t('banks.deleteBank')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
