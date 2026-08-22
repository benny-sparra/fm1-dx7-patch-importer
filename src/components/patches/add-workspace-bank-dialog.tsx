import { Library, Plus, Upload } from 'lucide-react'
import { type FormEvent, type RefObject, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogCloseButton, DialogHeader } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { dx7BankCatalog } from '@/data/dx7-bank-catalog'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { parseDx7Bank } from '@/lib/dx7'
import { loadDx7CatalogBank } from '@/lib/dx7-bank-catalog'
import { normalizeWorkspaceBankNameForSave, workspaceBankTitleLength } from '@/lib/patch-library'
import { cn } from '@/lib/utils'
import { trackAnalyticsEvent } from '@/lib/analytics'

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
  const toast = useToast()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [description, setDescription] = useState('')
  const [catalogBankId, setCatalogBankId] = useState('')
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [source, setSource] = useState<'catalog' | 'upload'>('catalog')
  const [working, setWorking] = useState(false)

  const reset = () => {
    setCatalogBankId('')
    setDescription('')
    setError('')
    setFile(null)
    setName('')
    setSource('catalog')
    setWorking(false)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!bank) return
    const normalizedName = normalizeWorkspaceBankNameForSave(name)
    if (!normalizedName) {
      setError(t('banks.bankNameRequired'))
      return
    }
    if (source === 'catalog' && !catalogBankId) {
      setError(t('banks.soundSourceRequired'))
      return
    }
    if (source === 'upload' && !file) {
      setError(t('banks.soundSourceRequired'))
      return
    }

    setWorking(true)
    setError('')
    try {
      const imported =
        source === 'catalog'
          ? await loadDx7CatalogBank(catalogBankId)
          : parseDx7Bank(await file!.arrayBuffer())
      library.addBank(bank, normalizedName, description, imported)
      trackAnalyticsEvent({
        data: { source: source === 'catalog' ? 'catalog' : 'file' },
        name: 'bank_imported',
      })
      onCreated(bank)
      toast.success(t('toasts.bankCreated', { bank: normalizedName }))
      dialogRef.current?.close()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('banks.addBankFailed'))
    } finally {
      setWorking(false)
    }
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
          <p
            className="font-vt323 mt-1 text-lg text-muted-foreground"
            id="add-workspace-bank-description"
          >
            {t('banks.addBankHelp')}
          </p>
        </div>
        <DialogCloseButton
          disabled={working}
          label={t('common.close')}
          onClick={() => dialogRef.current?.close()}
        />
      </DialogHeader>

      <form className="grid gap-5 p-5" onSubmit={(event) => void submit(event)}>
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

        <label className="grid gap-1 text-sm font-semibold">
          {t('namedBanks.description')}
          <textarea
            className="min-h-24 resize-y rounded-md border border-input bg-background px-3 py-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('namedBanks.descriptionPlaceholder')}
            value={description}
          />
        </label>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold">{t('banks.soundSource')}</legend>

          <div className="relative grid grid-cols-2 rounded-lg border border-primary/20 bg-white p-1 shadow-sm">
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-primary shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none',
                source === 'upload' && 'translate-x-full',
              )}
            />
            <label className="relative z-10 min-w-0 cursor-pointer">
              <input
                checked={source === 'catalog'}
                className="peer sr-only"
                disabled={working}
                name="sound-source"
                onChange={() => {
                  setFile(null)
                  setSource('catalog')
                }}
                type="radio"
              />
              <span
                className={cn(
                  'flex h-10 items-center justify-center gap-2 rounded-md px-3 text-center text-sm font-bold text-muted-foreground transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50 hover:bg-accent hover:text-accent-foreground',
                  source === 'catalog' &&
                    'text-primary-foreground hover:bg-transparent hover:text-primary-foreground',
                )}
              >
                <Library className="size-4 shrink-0" />
                {t('banks.catalogSource')}
              </span>
            </label>
            <label className="relative z-10 min-w-0 cursor-pointer">
              <input
                checked={source === 'upload'}
                className="peer sr-only"
                disabled={working}
                name="sound-source"
                onChange={() => {
                  setCatalogBankId('')
                  setSource('upload')
                }}
                type="radio"
              />
              <span
                className={cn(
                  'flex h-10 items-center justify-center gap-2 rounded-md px-3 text-center text-sm font-bold text-muted-foreground transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50 hover:bg-accent hover:text-accent-foreground',
                  source === 'upload' &&
                    'text-primary-foreground hover:bg-transparent hover:text-primary-foreground',
                )}
              >
                <Upload className="size-4 shrink-0" />
                {t('banks.uploadSource')}
              </span>
            </label>
          </div>

          <div className="modal-input-surface rounded-md border border-input p-3">
            {source === 'catalog' ? (
              <select
                aria-label={t('banks.catalogBank')}
                className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={working}
                onChange={(event) => setCatalogBankId(event.target.value)}
                value={catalogBankId}
              >
                <option value="">{t('banks.chooseCatalogBank')}</option>
                {(['Factory', 'VRC Voice ROMs', 'Grey Matter E!'] as const).map((category) => (
                  <optgroup key={category} label={category}>
                    {dx7BankCatalog
                      .filter((catalogBank) => catalogBank.category === category)
                      .map((catalogBank) => (
                        <option key={catalogBank.id} value={catalogBank.id}>
                          {catalogBank.name} — {catalogBank.description}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <label className="flex min-h-10 cursor-pointer items-center rounded-md border border-dashed border-input bg-background px-3 text-sm transition-colors hover:bg-muted/50">
                <span className="min-w-0 truncate">{file?.name ?? t('banks.chooseSysexFile')}</span>
                <input
                  accept=".syx,application/octet-stream"
                  className="sr-only"
                  disabled={working}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{t('banks.soundDataHelp')}</span>
        </fieldset>

        {error ? (
          <p
            className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            disabled={working || !bank || (source === 'catalog' ? !catalogBankId : !file)}
            type="submit"
          >
            <Plus />
            {working ? t('banks.creatingBank') : t('banks.createBank')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
