import { ArrowLeft, ArrowRight, Library, Plus, Upload } from 'lucide-react'
import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AddBankCatalogPicker } from '@/components/patches/add-bank-catalog-picker'
import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { FileBankPicker, firstReadableBank } from '@/components/patches/file-bank-picker'
import { BevelRadio } from '@/components/ui/bevel-radio'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorNotice } from '@/components/ui/error-notice'
import { InfoNotice } from '@/components/ui/info-notice'
import { LoadFailedNotice } from '@/components/ui/load-failed-notice'
import { useToast } from '@/components/ui/toast'
import {
  dx7BankCatalog,
  dx7BankCatalogCategories,
  dx7BankCatalogCategoryLabelKey,
} from '@/data/dx7-bank-catalog'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import '@/i18n/librarian-dialogs'
import type { Dx7Voice } from '@/lib/dx7'
import { loadDx7CatalogBank } from '@/lib/dx7-bank-catalog'
import {
  bankDescriptionLength,
  normalizeWorkspaceBankNameForSave,
  workspaceBankTitleLength,
} from '@/lib/patch-library'
import { sysexFileAccept } from '@/lib/sysex-file'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { cn } from '@/lib/utils'

type AddWorkspaceBankDialogProps = {
  bank: string | null
  library: Pick<PatchLibrary, 'addBank'>
  onClose: () => void
  onCreated: (bank: string) => void
  suggestedName: string
}

type Source = 'catalog' | 'upload'
// One screen for each decision. The title comes first, so the source is chosen knowing what the
// bank is called, and the last screen is the one that creates it.
type Screen = 'name' | 'source' | 'catalog' | 'file' | 'fileBank'

const sourceOptions = [
  {
    Icon: Library,
    hint: 'banks.catalogSourceHint',
    title: 'banks.catalogSource',
    value: 'catalog',
  },
  { Icon: Upload, hint: 'banks.uploadSourceHint', title: 'banks.uploadSource', value: 'upload' },
] as const

const screenHelpKeys = {
  name: 'banks.addBankHelp',
  source: 'banks.addBankSourceHelp',
  catalog: 'banks.addBankCatalogHelp',
  file: 'banks.addBankFileHelp',
  fileBank: 'banks.addBankFileBankHelp',
} as const

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
  const formRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  // Whether the user has moved between screens, since only then does focus follow.
  const movedRef = useRef(false)
  const [screenIndex, setScreenIndex] = useState(0)
  const [name, setName] = useState(suggestedName)
  const [description, setDescription] = useState('')
  const [source, setSource] = useState<Source>('catalog')
  const [error, setError] = useState('')
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
  const [collection, setCollection] = useState(catalogGroups[0].category)
  // The bank last chosen in each collection, kept while the dialog is open so returning to one
  // finds its choice. A collection not yet chosen from has its first bank selected.
  const [bankChoices, setBankChoices] = useState<Record<string, string>>({})
  const catalogBankId =
    bankChoices[collection] ??
    dx7BankCatalog.find((catalogBank) => catalogBank.category === collection)?.id ??
    ''
  const [file, setFile] = useState<File | null>(null)
  // The chosen file's banks, read as soon as it is chosen so a file joining several can offer a
  // choice, with null for a damaged one.
  const [fileBanks, setFileBanks] = useState<(Dx7Voice[] | null)[] | null>(null)
  const [chosenFileBank, setChosenFileBank] = useState(0)
  const [readerUnavailable, setReaderUnavailable] = useState(false)
  const readingFile = useRef<File | null>(null)
  const fileVoices = fileBanks?.[chosenFileBank] ?? null
  // A file not yet read is taken for one that joins several, so its screen offers Next rather
  // than creating the bank, and changes once the file says otherwise.
  const joinsSeveral = fileBanks === null || fileBanks.length > 1

  const screens: Screen[] = [
    'name',
    'source',
    ...(source === 'catalog'
      ? (['catalog'] as const)
      : (['file', ...(joinsSeveral ? (['fileBank'] as const) : [])] as const)),
  ]
  const screen = screens[screenIndex]
  const isLastScreen = screenIndex === screens.length - 1
  // Once the bank has a name, the title carries it, so every later screen says what is being made.
  const bankTitle = normalizeWorkspaceBankNameForSave(name)
  const dialogTitle =
    screen === 'name' || !bankTitle
      ? t('banks.addBankTitle')
      : t('banks.addBankNamedTitle', { name: bankTitle })
  const screenReady = screen === 'file' || screen === 'fileBank' ? fileVoices !== null : true

  // The librarian mounts this dialog only while it is wanted, so it opens itself as it appears and
  // its state is discarded with it rather than being reset by hand.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
  }, [])

  // Moving to another screen puts focus on its first control, as a change of page would.
  useEffect(() => {
    if (!movedRef.current) return
    formRef.current
      ?.querySelector<HTMLElement>('input:checked, input, textarea')
      ?.focus({ preventScroll: true })
  }, [screen])

  const goToScreen = (index: number) => {
    movedRef.current = true
    setError('')
    setScreenIndex(index)
  }

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

  // Says where the patches came from, which the bank's own name need not.
  const createdMessage = (bankName: string) => {
    if (source === 'catalog') {
      const catalogBank = dx7BankCatalog.find((candidate) => candidate.id === catalogBankId)
      return t('toasts.bankCreatedFromCatalog', {
        bank: bankName,
        collection: catalogGroups.find((group) => group.category === collection)?.label,
        source: catalogBank?.name,
      })
    }
    const fileName = file?.name
    return fileBanks && fileBanks.length > 1
      ? t('toasts.bankCreatedFromFileBank', {
          bank: bankName,
          file: fileName,
          number: new Intl.NumberFormat(i18n.resolvedLanguage).format(chosenFileBank + 1),
        })
      : t('toasts.bankCreatedFromFile', { bank: bankName, file: fileName })
  }

  const createBank = async (normalizedName: string) => {
    setWorking(true)
    setError('')
    try {
      const imported = source === 'catalog' ? await loadDx7CatalogBank(catalogBankId) : fileVoices!
      library.addBank(bank!, normalizedName, description, imported)
      trackAnalyticsEvent({
        data: { source: source === 'catalog' ? 'catalog' : 'file' },
        name: 'bank_imported',
      })
      onCreated(bank!)
      toast.success(createdMessage(normalizedName))
      dialogRef.current?.close()
    } catch (cause) {
      setError(bankErrorMessage(t, cause, t('banks.addBankFailed')))
    } finally {
      setWorking(false)
    }
  }

  // Enter in a field, like the footer's button, moves on, and creates the bank on the last screen.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!bank || !screenReady) return
    const normalizedName = normalizeWorkspaceBankNameForSave(name)
    if (!normalizedName) {
      // Only the first screen can leave the title empty, so go back to it.
      if (screen !== 'name') goToScreen(0)
      setError(t('banks.bankNameRequired'))
      return
    }
    if (!isLastScreen) {
      goToScreen(screenIndex + 1)
      return
    }
    void createBank(normalizedName)
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
        window.requestAnimationFrame(() => {
          nameInputRef.current?.focus()
          nameInputRef.current?.select()
        })
      }}
      // Each screen is as tall as its content, except the one choosing a bank: its list can be long,
      // so it has a height of its own and scrolls inside its pane.
      className={screen === 'catalog' ? 'h-[min(34rem,calc(100svh-2rem))]' : undefined}
      ref={dialogRef}
      size="2xl"
    >
      <DialogHeader>
        <DialogTitle id="add-workspace-bank-title">{dialogTitle}</DialogTitle>
        <DialogCloseButton
          disabled={working}
          label={t('common.close')}
          onClick={() => dialogRef.current?.close()}
        />
      </DialogHeader>
      <DialogBody className="flex flex-1 flex-col">
        <p
          className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]"
          id="add-workspace-bank-description"
        >
          {t(screenHelpKeys[screen])}
        </p>

        <form
          className={cn(
            'grid min-h-0 flex-1 content-start gap-5 p-5',
            // The two panes fill the screen and scroll inside themselves.
            screen === 'catalog' && 'grid-rows-[minmax(0,1fr)]',
          )}
          id={formId}
          noValidate
          onSubmit={submit}
          ref={formRef}
        >
          {screen === 'name' ? (
            <>
              <label className="grid gap-1 text-sm font-semibold">
                {t('banks.bankName')}
                <input
                  autoComplete="off"
                  className="name-caret h-10 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  maxLength={workspaceBankTitleLength}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={suggestedName}
                  ref={nameInputRef}
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
            </>
          ) : null}

          {screen === 'source' ? (
            <fieldset className="grid gap-2">
              <legend className="sr-only">{t('banks.soundSource')}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {sourceOptions.map(({ Icon, hint, title, value }) => (
                  <BevelRadio
                    aria-describedby={`${formId}${value}`}
                    aria-label={t(title)}
                    checked={source === value}
                    className="grid h-full content-start justify-items-start gap-2 p-5"
                    key={value}
                    name="sound-source"
                    onChange={() => setSource(value)}
                  >
                    <Icon aria-hidden="true" className="size-7 text-[var(--crt-acc-lt)]" />
                    <span aria-hidden="true" className="text-base font-semibold">
                      {t(title)}
                    </span>
                    <span className="text-sm text-[var(--crt-ink-3)]" id={`${formId}${value}`}>
                      {t(hint)}
                    </span>
                  </BevelRadio>
                ))}
              </div>
            </fieldset>
          ) : null}

          {screen === 'catalog' ? (
            <AddBankCatalogPicker
              bankId={catalogBankId}
              collection={collection}
              disabled={working}
              groups={catalogGroups}
              onChooseBank={(chosen) =>
                setBankChoices((current) => ({ ...current, [collection]: chosen }))
              }
              onChooseCollection={setCollection}
            />
          ) : null}

          {screen === 'file' ? (
            <>
              <label className="modal-input-surface flex min-h-11 cursor-pointer items-center rounded-md border border-dashed border-input px-3 text-sm transition-colors focus-within:outline-2 focus-within:outline-[var(--crt-led)] hover:bg-muted/50">
                <span className="min-w-0 truncate">{file?.name ?? t('banks.chooseSysexFile')}</span>
                <input
                  accept={sysexFileAccept}
                  className="sr-only"
                  disabled={working}
                  onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>
              <InfoNotice>
                <ul className="list-disc space-y-1 pl-4">
                  <li>{t('banks.addBankFileNoteFormat')}</li>
                  <li>{t('banks.addBankFileNoteSeveral')}</li>
                  <li>{t('banks.addBankFileNotePrivacy')}</li>
                </ul>
              </InfoNotice>
            </>
          ) : null}

          {screen === 'fileBank' && fileBanks ? (
            <FileBankPicker
              banks={fileBanks}
              chosen={chosenFileBank}
              disabled={working}
              onChoose={setChosenFileBank}
            />
          ) : null}

          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
          {readerUnavailable && screen === 'file' ? (
            <LoadFailedNotice message={t('banks.bankFileUnavailable')} />
          ) : null}
        </form>
      </DialogBody>
      <DialogFooter className="justify-between gap-2">
        {screenIndex > 0 ? (
          <Button disabled={working} onClick={() => goToScreen(screenIndex - 1)} variant="ghost">
            <ArrowLeft />
            <span>{t('banks.wizardBack')}</span>
          </Button>
        ) : null}
        <Button
          className="ml-auto"
          disabled={working || !bank || !screenReady}
          form={formId}
          type="submit"
        >
          {isLastScreen ? <Plus /> : null}
          <span>
            {isLastScreen
              ? working
                ? t('banks.creatingBank')
                : t('banks.createBank')
              : t('banks.wizardNext')}
          </span>
          {isLastScreen ? null : <ArrowRight />}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
