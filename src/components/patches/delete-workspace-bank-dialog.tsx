import { Trash2 } from 'lucide-react'
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

type DeleteWorkspaceBankDialogProps = {
  bankName: string
  onClose: () => void
  onDelete: () => void
}

export function DeleteWorkspaceBankDialog({
  bankName,
  onClose,
  onDelete,
}: DeleteWorkspaceBankDialogProps) {
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
      aria-describedby="delete-workspace-bank-description"
      aria-labelledby="delete-workspace-bank-title"
      onClose={onClose}
      ref={dialogRef}
      size="sm"
    >
      <DialogHeader>
        <DialogTitle id="delete-workspace-bank-title">{t('banks.deleteBank')}</DialogTitle>
        <DialogCloseButton label={t('common.close')} onClick={closeDialog} />
      </DialogHeader>
      <DialogBody>
        <p
          className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]"
          id="delete-workspace-bank-description"
        >
          {t('banks.deleteBankConfirm', { name: bankName })}
        </p>
      </DialogBody>
      <DialogFooter>
        <Button
          className="shadow-none hover:shadow-none"
          onClick={() => {
            onDelete()
            closeDialog()
          }}
          type="button"
          variant="danger"
        >
          <Trash2 />
          {t('banks.deleteBank')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
