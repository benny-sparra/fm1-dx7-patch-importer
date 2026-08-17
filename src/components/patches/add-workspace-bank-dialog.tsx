import { Plus, Upload } from 'lucide-react'
import { type RefObject, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogCloseButton, DialogHeader } from '@/components/ui/dialog'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { parseDx7Bank } from '@/lib/dx7'
import {
  normalizeWorkspaceBankNameForSave,
  workspaceBankTitleLength,
} from '@/lib/patch-library'

type AddWorkspaceBankDialogProps = {
  bank: string | null
  dialogRef: RefObject<HTMLDialogElement | null>
  library: PatchLibrary
  onCreated: (bank: string) => void
  suggestedName: string
}

export function AddWorkspaceBankDialog({
  bank,
  dialogRef,
  library,
  onCreated,
  suggestedName,
}: AddWorkspaceBankDialogProps) {
  const { t } = useTranslation()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [working, setWorking] = useState(false)

  const reset = () => {
    setError('')
    setFile(null)
    setName('')
    setWorking(false)
  }

  return (
    <Dialog
      aria-describedby="add-workspace-bank-description"
      aria-labelledby="add-workspace-bank-title"
      closeOnBackdrop={!working}
      onCancel={(event) => {
        if (working) event.preventDefault()
      }}
      onClose={reset}
      onToggle={(event) => {
        if (!event.currentTarget.open) return
        setName(suggestedName)
        window.requestAnimationFrame(() => {
          nameInputRef.current?.focus()
          nameInputRef.current?.select()
        })
      }}
      ref={dialogRef}
      size="xl"
    >
      <DialogHeader>
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold" id="add-workspace-bank-title">
            <Plus className="size-5 text-primary" />
            {t('banks.addBankTitle', { bank })}
          </h2>
          <p className="font-vt323 mt-1 text-lg text-muted-foreground" id="add-workspace-bank-description">
            {t('banks.addBankHelp')}
          </p>
        </div>
        <DialogCloseButton
          disabled={working}
          label={t('common.close')}
          onClick={() => dialogRef.current?.close()}
        />
      </DialogHeader>

      <form
        className="grid gap-5 p-5"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!bank) return
          const normalizedName = normalizeWorkspaceBankNameForSave(name)
          if (!normalizedName) {
            setError(t('banks.bankNameRequired'))
            return
          }

          setWorking(true)
          setError('')
          try {
            const imported = file ? parseDx7Bank(await file.arrayBuffer()) : undefined
            library.addBank(bank, normalizedName, imported)
            onCreated(bank)
            dialogRef.current?.close()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('banks.addBankFailed'))
          } finally {
            setWorking(false)
          }
        }}
      >
        <label className="grid gap-1 text-sm font-semibold">
          {t('banks.bankName')}
          <input
            autoComplete="off"
            className="h-10 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
            maxLength={workspaceBankTitleLength}
            onChange={(event) => setName(event.target.value)}
            placeholder={suggestedName}
            ref={nameInputRef}
            required
            value={name}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold">
          {t('banks.soundData')}
          <span className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-dashed border-input bg-background px-3 py-2 font-normal transition-colors hover:bg-muted/50">
            <Upload className="size-5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">
              {file?.name ?? t('banks.chooseSysexFile')}
            </span>
            <input
              accept=".syx,application/octet-stream"
              className="sr-only"
              disabled={working}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </span>
          <span className="font-normal text-muted-foreground">{t('banks.soundDataHelp')}</span>
        </label>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button disabled={working || !bank} type="submit">
            <Plus />
            {working ? t('banks.creatingBank') : t('banks.createBank')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
