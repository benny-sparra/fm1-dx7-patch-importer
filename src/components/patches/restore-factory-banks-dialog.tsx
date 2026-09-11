import { RotateCcw } from 'lucide-react'
import { type RefObject, useState } from 'react'
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

type RestoreFactoryBanksDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>
  onRestore: () => Promise<void>
}

export function RestoreFactoryBanksDialog({
  dialogRef,
  onRestore,
}: RestoreFactoryBanksDialogProps) {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const closeDialog = () => dialogRef.current?.close()

  const restore = async () => {
    setError('')
    setWorking(true)
    try {
      await onRestore()
      closeDialog()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('banks.importFailed'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <Dialog
      aria-describedby="restore-factory-banks-description"
      aria-labelledby="restore-factory-banks-title"
      closeOnBackdrop={!working}
      onCancel={(event) => {
        if (working) event.preventDefault()
      }}
      onClose={() => setError('')}
      ref={dialogRef}
      size="md"
    >
      <DialogHeader>
        <DialogTitle id="restore-factory-banks-title">
          <RotateCcw className="size-4 shrink-0" />
          {t('dialogs.restoreTitle')}
        </DialogTitle>
        <DialogCloseButton
          disabled={working}
          label={t('dialogs.restoreClose')}
          onClick={closeDialog}
        />
      </DialogHeader>
      <DialogBody>
        <p
          className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]"
          id="restore-factory-banks-description"
        >
          {t('dialogs.restoreIntro')}
        </p>

        <div className="p-5">
          <p className="border border-[var(--crt-line-lt)] p-3.5 text-sm leading-6 text-[var(--crt-ink-2)]">
            {t('dialogs.restoreDetails')}
          </p>
          {error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button disabled={working} onClick={() => void restore()} type="button">
          <RotateCcw />
          {working ? t('banks.importing') : t('dialogs.restoreAction')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
