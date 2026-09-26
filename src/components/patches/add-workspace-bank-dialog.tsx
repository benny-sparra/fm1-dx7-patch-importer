import { Library, Plus, Upload } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import {
  dx7BankCatalog,
  dx7BankCatalogCategories,
  dx7BankCatalogCategoryLabelKey,
} from '@/data/dx7-bank-catalog'
import { ErrorNotice } from '@/components/ui/error-notice'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { readDx7BankFile } from '@/lib/dx7'
import { loadDx7CatalogBank } from '@/lib/dx7-bank-catalog'
import {
  bankDescriptionLength,
  normalizeWorkspaceBankNameForSave,
  workspaceBankTitleLength,
} from '@/lib/patch-library'
import { sysexFileAccept } from '@/lib/sysex-file'
import { cn } from '@/lib/utils'
import { trackAnalyticsEvent } from '@/lib/analytics'

type AddWorkspaceBankDialogProps = {
  bank: string | null
  library: Pick<PatchLibrary, 'addBank'>
  onClose: () => void
  onCreated: (bank: string) => void
  suggestedName: string
}

export function AddWorkspaceBankDialog({
  bank,
  library,
  onClose,
  onCreated,
  suggestedName,
}: AddWorkspaceBankDialogProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [description, setDescription] = useState('')
  const [catalogBankId, setCatalogBankId] = useState('')
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [source, setSource] = useState<'catalog' | 'upload'>('catalog')
  const [working, setWorking] = useState(false)

  // The librarian mounts this dialog only while it is wanted, so it opens itself as it appears and
  // its state is discarded with it rather than being reset by hand.
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

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
          : await readDx7BankFile(file!)
      library.addBank(bank, normalizedName, description, imported)
      trackAnalyticsEvent({
        data: { source: source === 'catalog' ? 'catalog' : 'file' },
        name: 'bank_imported',
      })
      onCreated(bank)
      toast.success(t('toasts.bankCreated', { bank: normalizedName }))
      dialogRef.current?.close()
    } catch (cause) {
      setError(bankErrorMessage(t, cause, t('banks.addBankFailed')))
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
      onClose={onClose}
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
        <DialogTitle id="add-workspace-bank-title">{t('banks.addBankTitle', { bank })}</DialogTitle>
        <DialogCloseButton
          disabled={working}
          label={t('common.close')}
          onClick={() => dialogRef.current?.close()}
        />
      </DialogHeader>
      <DialogBody>
        <p
          className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]"
          id="add-workspace-bank-description"
        >
          {t('banks.addBankHelp')}
        </p>

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
              maxLength={bankDescriptionLength}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('namedBanks.descriptionPlaceholder')}
              value={description}
            />
          </label>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold">{t('banks.soundSource')}</legend>

            <div className="relative grid grid-cols-2 rounded-lg border border-primary/20 bg-card p-1 shadow-sm">
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
                    'flex h-10 items-center justify-center gap-2 rounded-md px-3 text-center text-sm font-bold transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                    source === 'catalog'
                      ? 'text-primary-foreground hover:bg-transparent hover:text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
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
                    'flex h-10 items-center justify-center gap-2 rounded-md px-3 text-center text-sm font-bold transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                    source === 'upload'
                      ? 'text-primary-foreground hover:bg-transparent hover:text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
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
                  {dx7BankCatalogCategories.map((category) => {
                    const labelKey = dx7BankCatalogCategoryLabelKey(category)
                    return (
                      <optgroup key={category} label={labelKey ? t(labelKey) : category}>
                        {dx7BankCatalog
                          .filter((catalogBank) => catalogBank.category === category)
                          .map((catalogBank) => (
                            <option key={catalogBank.id} value={catalogBank.id}>
                              {catalogBank.name} — {catalogBank.description}
                            </option>
                          ))}
                      </optgroup>
                    )
                  })}
                </select>
              ) : (
                <label className="flex min-h-10 cursor-pointer items-center rounded-md border border-dashed border-input bg-background px-3 text-sm transition-colors hover:bg-muted/50">
                  <span className="min-w-0 truncate">
                    {file?.name ?? t('banks.chooseSysexFile')}
                  </span>
                  <input
                    accept={sysexFileAccept}
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

          {error ? <ErrorNotice>{error}</ErrorNotice> : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              disabled={working || !bank || (source === 'catalog' ? !catalogBankId : !file)}
              type="submit"
            >
              <Plus />
              <span>{working ? t('banks.creatingBank') : t('banks.createBank')}</span>
            </Button>
          </div>
        </form>
      </DialogBody>
    </Dialog>
  )
}
