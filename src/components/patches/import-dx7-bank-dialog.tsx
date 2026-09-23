import { TriangleAlert, Upload } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { undoToastOptions } from '@/components/patches/undo-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { ErrorNotice } from '@/components/ui/error-notice'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { sysexFileAccept } from '@/lib/sysex-file'

type ImportDx7BankDialogProps = {
  bank: string
  bankName: string
  library: Pick<PatchLibrary, 'importBank' | 'undoChange'>
  onClose: () => void
}

export function ImportDx7BankDialog({
  bank,
  bankName,
  library,
  onClose,
}: ImportDx7BankDialogProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [working, setWorking] = useState(false)

  // The librarian mounts this dialog only while it is wanted, so it opens itself as it appears and
  // its state is discarded with it rather than being reset by hand.
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) return

    setWorking(true)
    setError('')
    try {
      const changed = await library.importBank(bank, file)
      trackAnalyticsEvent({ data: { source: 'file' }, name: 'bank_imported' })
      toast.success(
        t('toasts.bankImported', { bank: bankName }),
        undoToastOptions(t, library, changed),
      )
      dialogRef.current?.close()
    } catch (cause) {
      setError(bankErrorMessage(t, cause, t('banks.importFailed')))
    } finally {
      setWorking(false)
    }
  }

  return (
    <Dialog
      aria-describedby="import-dx7-bank-description"
      aria-labelledby="import-dx7-bank-title"
      closeOnBackdrop={!working}
      onCancel={(event) => {
        if (working) event.preventDefault()
      }}
      onClose={onClose}
      onToggle={(event) => {
        if (!event.currentTarget.open) return
        window.requestAnimationFrame(() => fileInputRef.current?.focus())
      }}
      ref={dialogRef}
      size="md"
    >
      <DialogHeader>
        <DialogTitle id="import-dx7-bank-title">
          {t('overwriteImport.title', { bank: bankName })}
        </DialogTitle>
        <DialogCloseButton
          disabled={working}
          label={t('common.close')}
          onClick={() => dialogRef.current?.close()}
        />
      </DialogHeader>
      <DialogBody>
        <p
          className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]"
          id="import-dx7-bank-description"
        >
          {t('overwriteImport.help')}
        </p>

        <form className="grid gap-5 p-5" onSubmit={(event) => void submit(event)}>
          <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
            <p>{t('overwriteImport.warning')}</p>
          </div>

          <label className="grid gap-2 text-sm font-semibold">
            {t('banks.soundData')}
            <span className="modal-input-surface flex min-h-11 cursor-pointer items-center rounded-md border border-dashed border-input px-3 font-normal transition-colors hover:bg-muted/50">
              <span className="min-w-0 truncate">{file?.name ?? t('banks.chooseSysexFile')}</span>
              <input
                accept={sysexFileAccept}
                className="sr-only"
                disabled={working}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null)
                  setError('')
                }}
                ref={fileInputRef}
                type="file"
              />
            </span>
          </label>

          {error ? <ErrorNotice>{error}</ErrorNotice> : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={working || !file} type="submit" variant="destructive">
              <Upload />
              <span>{working ? t('banks.importing') : t('overwriteImport.action')}</span>
            </Button>
          </div>
        </form>
      </DialogBody>
    </Dialog>
  )
}
