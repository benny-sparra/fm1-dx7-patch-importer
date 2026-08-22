import { TriangleAlert, Upload } from 'lucide-react'
import { type FormEvent, type RefObject, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogCloseButton, DialogHeader } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { trackAnalyticsEvent } from '@/lib/analytics'

type ImportDx7BankDialogProps = {
  bank: string | null
  bankName: string
  dialogRef: RefObject<HTMLDialogElement | null>
  library: PatchLibrary
}

export function ImportDx7BankDialog({
  bank,
  bankName,
  dialogRef,
  library,
}: ImportDx7BankDialogProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [working, setWorking] = useState(false)

  const reset = () => {
    setError('')
    setFile(null)
    setWorking(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!bank || !file) return

    setWorking(true)
    setError('')
    try {
      await library.importBank(bank, file)
      trackAnalyticsEvent({ data: { source: 'file' }, name: 'bank_imported' })
      toast.success(t('toasts.bankImported', { bank: bankName }))
      dialogRef.current?.close()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('banks.importFailed'))
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
      onClose={reset}
      onToggle={(event) => {
        if (!event.currentTarget.open) return
        window.requestAnimationFrame(() => fileInputRef.current?.focus())
      }}
      ref={dialogRef}
      size="md"
    >
      <DialogHeader>
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold" id="import-dx7-bank-title">
            <Upload className="size-5 text-primary" />
            {t('overwriteImport.title', { bank: bankName })}
          </h2>
          <p
            className="font-vt323 mt-1 text-lg text-muted-foreground"
            id="import-dx7-bank-description"
          >
            {t('overwriteImport.help')}
          </p>
        </div>
        <DialogCloseButton
          disabled={working}
          label={t('common.close')}
          onClick={() => dialogRef.current?.close()}
        />
      </DialogHeader>

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
              accept=".syx,application/octet-stream"
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

        {error ? (
          <p
            className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button disabled={working || !bank || !file} type="submit" variant="destructive">
            <Upload />
            {working ? t('banks.importing') : t('overwriteImport.action')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
