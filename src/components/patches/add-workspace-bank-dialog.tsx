import { Library, Plus, Upload } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useRef, useState, useId } from 'react'
import { useTranslation } from 'react-i18next'

import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { FileBankPicker, firstReadableBank } from '@/components/patches/file-bank-picker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
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
import { LoadFailedNotice } from '@/components/ui/load-failed-notice'
import { Select } from '@/components/ui/select'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import type { Dx7Voice } from '@/lib/dx7'
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
  const { i18n, t } = useTranslation()
  // The actions sit in the pinned footer, outside the form, and submit it by its id.
  const formId = useId()
  const toast = useToast()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [description, setDescription] = useState('')
  const [catalogBankId, setCatalogBankId] = useState('')
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  // The chosen file's banks, read as soon as it is chosen so a file joining several can offer a
  // choice, with null for a damaged one.
  const [fileBanks, setFileBanks] = useState<(Dx7Voice[] | null)[] | null>(null)
  const [chosenFileBank, setChosenFileBank] = useState(0)
  const [readerUnavailable, setReaderUnavailable] = useState(false)
  const readingFile = useRef<File | null>(null)
  const fileVoices = fileBanks?.[chosenFileBank] ?? null
  const [name, setName] = useState('')
  const [source, setSource] = useState<'catalog' | 'upload'>('catalog')
  const [working, setWorking] = useState(false)
  // Listed alphabetically in the interface language, so the order follows the names people read.
  const catalogGroups = useMemo(() => {
    const collator = new Intl.Collator(i18n.resolvedLanguage)
    return dx7BankCatalogCategories
      .map((category) => {
        const labelKey = dx7BankCatalogCategoryLabelKey(category)
        return { category, label: labelKey ? t(labelKey) : category }
      })
      .sort((a, b) => collator.compare(a.label, b.label))
  }, [i18n.resolvedLanguage, t])

  // The librarian mounts this dialog only while it is wanted, so it opens itself as it appears and
  // its state is discarded with it rather than being reset by hand.
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const chooseFile = async (chosen: File | null) => {
    readingFile.current = chosen
    setFile(chosen)
    setFileBanks(null)
    setError('')
    if (!chosen) return

    let archive: typeof import('@/lib/dx7-bank-archive')
    try {
      archive = await import('@/lib/dx7-bank-archive')
    } catch {
      if (readingFile.current === chosen) setReaderUnavailable(true)
      return
    }
    try {
      const read = (await archive.readDx7BankArchive(chosen)).map(({ voices }) => voices)
      // A file chosen while this one was being read replaces it.
      if (readingFile.current !== chosen) return
      setFileBanks(read)
      setChosenFileBank(firstReadableBank(read))
    } catch (cause) {
      if (readingFile.current === chosen)
        setError(bankErrorMessage(t, cause, t('banks.addBankFailed')))
    }
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
    if (source === 'upload' && !fileVoices) {
      setError(t('banks.soundSourceRequired'))
      return
    }

    setWorking(true)
    setError('')
    try {
      const imported = source === 'catalog' ? await loadDx7CatalogBank(catalogBankId) : fileVoices!
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

        <form id={formId} className="grid gap-5 p-5" onSubmit={(event) => void submit(event)}>
          <label className="grid gap-1 text-sm font-semibold">
            {t('banks.bankName')}
            <input
              autoComplete="off"
              className="name-caret h-10 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

            {/* The editor's segmented control: one sunken track, with the chosen source raised out
                of it. Focus rings the whole track, and the arrow keys move the choice. */}
            <div className="crt-inset grid grid-cols-2 gap-[2px] bg-[var(--crt-bg-1)] p-[2px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--crt-led)]">
              <label className="min-w-0 cursor-pointer">
                <input
                  checked={source === 'catalog'}
                  className="peer sr-only"
                  disabled={working}
                  name="sound-source"
                  onChange={() => {
                    void chooseFile(null)
                    setSource('catalog')
                  }}
                  type="radio"
                />
                <span
                  className={cn(
                    'flex h-9 items-center justify-center gap-2 border-t border-r border-b border-l px-3 text-center text-sm font-semibold transition-colors peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                    source === 'catalog'
                      ? 'border-t-[var(--crt-bevel-lt)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-btn)] text-[var(--crt-ink)]'
                      : 'border-transparent text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]',
                  )}
                >
                  <Library className="size-4 shrink-0" />
                  {t('banks.catalogSource')}
                </span>
              </label>
              <label className="min-w-0 cursor-pointer">
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
                    'flex h-9 items-center justify-center gap-2 border-t border-r border-b border-l px-3 text-center text-sm font-semibold transition-colors peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                    source === 'upload'
                      ? 'border-t-[var(--crt-bevel-lt)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-btn)] text-[var(--crt-ink)]'
                      : 'border-transparent text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]',
                  )}
                >
                  <Upload className="size-4 shrink-0" />
                  {t('banks.uploadSource')}
                </span>
              </label>
            </div>

            <div className="modal-input-surface rounded-md border border-input p-3">
              {source === 'catalog' ? (
                <Select
                  aria-label={t('banks.catalogBank')}
                  disabled={working}
                  onChange={(event) => setCatalogBankId(event.target.value)}
                  value={catalogBankId}
                >
                  <option disabled value="">
                    {t('banks.chooseCatalogBank')}
                  </option>
                  {catalogGroups.map(({ category, label }) => (
                    <optgroup key={category} label={label}>
                      {dx7BankCatalog
                        .filter((catalogBank) => catalogBank.category === category)
                        .map((catalogBank) => (
                          <option key={catalogBank.id} value={catalogBank.id}>
                            {catalogBank.description
                              ? `${catalogBank.name} — ${catalogBank.description}`
                              : catalogBank.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </Select>
              ) : (
                <label className="modal-input-surface flex min-h-11 cursor-pointer items-center rounded-md border border-dashed border-input px-3 text-sm transition-colors hover:bg-muted/50">
                  <span className="min-w-0 truncate">
                    {file?.name ?? t('banks.chooseSysexFile')}
                  </span>
                  <input
                    accept={sysexFileAccept}
                    className="sr-only"
                    disabled={working}
                    onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                </label>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{t('banks.soundDataHelp')}</span>
          </fieldset>

          {source === 'upload' && fileBanks && fileBanks.length > 1 ? (
            <FileBankPicker
              banks={fileBanks}
              chosen={chosenFileBank}
              disabled={working}
              onChoose={setChosenFileBank}
            />
          ) : null}

          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
          {readerUnavailable ? <LoadFailedNotice message={t('banks.bankFileUnavailable')} /> : null}
        </form>
      </DialogBody>
      <DialogFooter>
        <Button
          disabled={working || !bank || (source === 'catalog' ? !catalogBankId : !fileVoices)}
          form={formId}
          type="submit"
        >
          <Plus />
          <span>{working ? t('banks.creatingBank') : t('banks.createBank')}</span>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
