import {
  Archive,
  Database,
  Download,
  EllipsisVertical,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
  Upload,
} from 'lucide-react'
import { type ChangeEvent, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { undoToastOptions } from '@/components/patches/undo-toast'
import { PatchGrid } from '@/components/patches/patch-grid'
import {
  WorkspaceBankSelector,
  type WorkspaceBankSelectorBank,
} from '@/components/patches/workspace-bank-selector'
import {
  defaultWorkspaceBankTitle,
  useWorkspaceBankLabel,
} from '@/components/patches/workspace-bank-label'
import { BankInformationDialog } from '@/components/patches/bank-information-dialog'
import { DeleteWorkspaceBankDialog } from '@/components/patches/delete-workspace-bank-dialog'
import { ImportDx7BankDialog } from '@/components/patches/import-dx7-bank-dialog'
import { RestoreFactoryBanksDialog } from '@/components/patches/restore-factory-banks-dialog'
import { Fm1BankSelectionDialog } from '@/components/midi/fm1-bank-selection-dialog'
import { MidiConnectionRequiredDialog } from '@/components/midi/midi-connection-required-dialog'
import {
  SentryVerificationButton,
  sentryVerificationEnabled,
} from '@/components/sentry-verification-button'
import { makeDx7BankFile } from '@/lib/dx7'
import { reportBankTransferFailure } from '@/lib/monitoring'
import {
  getNextWorkspaceBank,
  patchSlotCode,
  workspaceBankAfterDeletion,
} from '@/lib/patch-library'
import { librarianShortcuts } from '@/lib/keyboard-shortcuts'
import { shouldShowFm1BankSelectionDialog } from '@/lib/session'
import { cn } from '@/lib/utils'
import { type MidiController } from '@/hooks/use-midi'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { type Patch } from '@/data/patches'
import { createBankFileSelectionTarget } from '@/lib/bank-file-selection'
import { downloadFile } from '@/lib/download-file'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { LoadFailedNotice } from '@/components/ui/load-failed-notice'
import { useToast } from '@/components/ui/toast'
import { trackAnalyticsEvent } from '@/lib/analytics'

// Adding a bank opens from the bank rack, so its dialog and the sound catalogue it lists load on
// first use rather than with the page.
const AddWorkspaceBankDialog = lazy(() =>
  import('@/components/patches/add-workspace-bank-dialog').then((module) => ({
    default: module.AddWorkspaceBankDialog,
  })),
)

// Saved banks open from a bank menu, so their dialogs load on first use rather than with the page.
const NamedBankLibraryDialog = lazy(() =>
  import('@/components/patches/named-bank-library-dialog').then((module) => ({
    default: module.NamedBankLibraryDialog,
  })),
)

// Copying opens from a slot's menu, so its dialog also loads on first use.
const CopyPatchDialog = lazy(() =>
  import('@/components/patches/copy-patch-dialog').then((module) => ({
    default: module.CopyPatchDialog,
  })),
)

type SavedBanksRequest = { bank: string; closeMenu: () => void; mode: 'load' | 'save' }

type TransferStatus = { kind: 'error' | 'idle' | 'success'; message: string }

type LibrarianPageProps = {
  activePatchId: string
  library: PatchLibrary
  midi: MidiController
  /** Called as a bank is deleted, before later banks move up a letter. */
  onBankDeleted: (bank: string) => void
  onEditPatch: (patch: Patch) => void
  onSelectPatch: (patch: Patch) => void
}

export function LibrarianPage({
  activePatchId,
  library,
  midi,
  onBankDeleted,
  onEditPatch,
  onSelectPatch,
}: LibrarianPageProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { patches } = library
  const banks = library.workspaceBanks
  const nextBank = getNextWorkspaceBank(banks)
  const [search, setSearch] = useState('')
  const [destinationBank, setDestinationBank] = useState('A')
  const [importError, setImportError] = useState('')
  // Explains a dialog whose chunk did not arrive, such as after a newer deployment replaced it.
  const [dialogLoadError, setDialogLoadError] = useState('')
  const [savedBanksRequest, setSavedBanksRequest] = useState<SavedBanksRequest | null>(null)
  // The sound whose menu chose Copy, kept while its dialog is open.
  const [copySource, setCopySource] = useState<Patch | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [transferStatus, setTransferStatus] = useState<TransferStatus>({
    kind: 'idle',
    message: '',
  })
  const importInputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const importTargetRef = useRef(createBankFileSelectionTarget())
  const addBankButtonRef = useRef<HTMLButtonElement>(null)
  const [isAddingBank, setIsAddingBank] = useState(false)
  const importDx7BankDialogRef = useRef<HTMLDialogElement>(null)
  const bankSelectionDialogRef = useRef<HTMLDialogElement>(null)
  const deleteWorkspaceBankDialogRef = useRef<HTMLDialogElement>(null)
  const midiConnectionRequiredDialogRef = useRef<HTMLDialogElement>(null)
  const restoreFactoryBanksDialogRef = useRef<HTMLDialogElement>(null)
  const [bankPendingDeletion, setBankPendingDeletion] = useState<{
    bank: string
    name: string
  } | null>(null)
  const [bankPendingImport, setBankPendingImport] = useState<{
    bank: string
    name: string
  } | null>(null)
  const allBanksMenuRef = useDismissableDetails()
  const bankMenuRef = useDismissableDetails()
  const isDestinationBankLoaded = library.loadedBanks.includes(destinationBank)
  const bankDisplayName = useWorkspaceBankLabel(library)
  const requestSavedBanks = (request: SavedBanksRequest) => {
    setDialogLoadError('')
    setSavedBanksRequest(request)
  }
  const requestCopy = (patch: Patch) => {
    setDialogLoadError('')
    setCopySource(patch)
  }
  const beginImport = (bank: string) => {
    if (library.loadedBanks.includes(bank)) {
      setBankPendingImport({
        bank,
        name: bankDisplayName(bank),
      })
      importDx7BankDialogRef.current?.showModal()
      return
    }
    importTargetRef.current.begin(bank)
    importInputRef.current?.click()
  }

  const downloadBank = (bank: string) => {
    try {
      const bytes = makeDx7BankFile(library.getBankVoices(bank))
      downloadFile(
        new Blob([bytes], { type: 'application/octet-stream' }),
        `fm1-bank-${bank.toLowerCase()}.syx`,
      )
      setImportError('')
      trackAnalyticsEvent({ data: { scope: 'single' }, name: 'bank_exported' })
      toast.success(t('toasts.bankDownloadStarted', { bank: bankDisplayName(bank) }))
    } catch (error) {
      setImportError(bankErrorMessage(t, error, t('banks.exportFailed')))
    }
  }

  const downloadAllBanks = async () => {
    try {
      const { zipSync } = await import('fflate')
      const files = Object.fromEntries(
        library.loadedBanks.map((bank) => [
          `fm1-bank-${bank.toLowerCase()}.syx`,
          makeDx7BankFile(library.getBankVoices(bank)),
        ]),
      )
      downloadFile(new Blob([zipSync(files)], { type: 'application/zip' }), 'fm1-browser-banks.zip')
      setImportError('')
      trackAnalyticsEvent({ data: { scope: 'all' }, name: 'bank_exported' })
      toast.success(t('toasts.banksDownloadStarted'))
    } catch (error) {
      setImportError(bankErrorMessage(t, error, t('banks.bulkExportFailed')))
    }
  }

  const transferSelectedBank = async () => {
    if (!midi.hasMidiOutput) {
      trackAnalyticsEvent({ data: { reason: 'no_output' }, name: 'bank_transfer_failed' })
      return
    }
    if (!midi.sysexAvailable) {
      trackAnalyticsEvent({ data: { reason: 'sysex_unavailable' }, name: 'bank_transfer_failed' })
      return
    }

    setIsSending(true)
    setTransferStatus({ kind: 'idle', message: t('banks.sendingStatus') })
    let voiceCount: number | undefined
    try {
      const voices = library.getBankVoices(destinationBank)
      voiceCount = voices.length
      const result = await midi.sendBank(destinationBank, voices)
      const sentStatus = t('banks.sentStatus', { bank: bankDisplayName(destinationBank) })
      setTransferStatus(
        result.ok
          ? { kind: 'success', message: sentStatus }
          : { kind: 'error', message: t('banks.notSent') },
      )
      if (result.ok) {
        trackAnalyticsEvent({ name: 'bank_transfer_completed' })
        toast.success(sentStatus)
      } else {
        trackAnalyticsEvent({ data: { reason: result.reason }, name: 'bank_transfer_failed' })
      }
    } catch (error) {
      reportBankTransferFailure({
        channel: midi.channel,
        stage: 'page',
        sysexAvailable: midi.sysexAvailable,
        voiceCount,
      })
      trackAnalyticsEvent({ data: { reason: 'transport' }, name: 'bank_transfer_failed' })
      setTransferStatus({
        kind: 'error',
        message: bankErrorMessage(t, error, t('banks.notSent')),
      })
    } finally {
      setIsSending(false)
    }
  }

  const sendSelectedBank = () => {
    if (!midi.hasMidiOutput) {
      trackAnalyticsEvent({
        data: { reason: 'no_output' },
        name: 'bank_transfer_failed',
      })
      midiConnectionRequiredDialogRef.current?.showModal()
      return
    }
    if (!midi.sysexAvailable) {
      trackAnalyticsEvent({ data: { reason: 'sysex_unavailable' }, name: 'bank_transfer_failed' })
      bankSelectionDialogRef.current?.showModal()
      return
    }
    if (shouldShowFm1BankSelectionDialog()) {
      bankSelectionDialogRef.current?.showModal()
      return
    }
    void transferSelectedBank()
  }

  const importSelectedBankFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const importTarget = importTargetRef.current.consume()
    if (!importTarget) return
    setIsImporting(true)
    try {
      await library.importBank(importTarget, file)
      setImportError('')
      trackAnalyticsEvent({ data: { source: 'file' }, name: 'bank_imported' })
      toast.success(t('toasts.bankImported', { bank: bankDisplayName(importTarget) }))
    } catch (error) {
      setImportError(bankErrorMessage(t, error, t('banks.importFailed')))
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  const hasLoadedBank = library.loadedBanks.length > 0
  const isSearching = search.trim() !== ''

  const visiblePatches = useMemo(() => {
    const query = search.trim().toLowerCase()

    // A search looks through every loaded bank, so a result keeps showing while another is played.
    if (query) {
      return patches.filter(
        (patch) =>
          library.loadedBanks.includes(patch.bank) &&
          // Both A1 and the A01 a slot shows find the first slot.
          `${patch.bank}${patch.number} ${patchSlotCode(patch)} ${patch.name} ${patch.family}`
            .toLowerCase()
            .includes(query),
      )
    }
    if (!isDestinationBankLoaded) return []
    return patches.filter((patch) => patch.bank === destinationBank)
  }, [destinationBank, isDestinationBankLoaded, library.loadedBanks, patches, search])

  useEffect(() => {
    if (!hasLoadedBank) setSearch('')
  }, [hasLoadedBank])

  // Choosing a bank asks to see that bank, so it leaves the results.
  const selectDestinationBank = (bank: string) => {
    setSearch('')
    setDestinationBank(bank)
  }

  useEffect(() => {
    if (!banks.includes(destinationBank)) setDestinationBank(banks[0] ?? 'A')
  }, [banks, destinationBank])

  const focusSearch = () => {
    searchRef.current?.focus()
    searchRef.current?.select()
  }

  useKeyboardShortcuts([
    // The change undone may be out of sight, such as a patch saved in the editor, so say so.
    {
      ...librarianShortcuts.redo,
      enabled: library.canRedo,
      onTrigger: () => {
        library.redo()
        toast.success(t('toasts.redone'))
      },
    },
    {
      ...librarianShortcuts.undo,
      enabled: library.canUndo,
      onTrigger: () => {
        library.undo()
        toast.success(t('toasts.undone'))
      },
    },
    // Both are disabled with the field itself, so the browser keeps its own
    // find shortcut in a bank that has nothing to search.
    { ...librarianShortcuts.search, enabled: hasLoadedBank, onTrigger: focusSearch },
    { ...librarianShortcuts.find, enabled: hasLoadedBank, onTrigger: focusSearch },
    {
      ...librarianShortcuts.clearSearch,
      enabled: search !== '',
      onTrigger: () => setSearch(''),
    },
  ])

  const renderBankActions = (
    selectedBank: Pick<WorkspaceBankSelectorBank, 'id'>,
    closeMenu: () => void,
  ) => {
    const bank = selectedBank.id
    const index = banks.indexOf(bank)
    return (
      <>
        <BankInformationDialog
          bank={bank}
          defaultTitle={defaultWorkspaceBankTitle(t, index + 1)}
          library={library}
          onClose={closeMenu}
        />
        <button
          className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          disabled={!library.loadedBanks.includes(bank)}
          onClick={() => requestSavedBanks({ bank, closeMenu, mode: 'save' })}
          title={
            library.loadedBanks.includes(bank)
              ? undefined
              : t('banks.importFirst', { bank: bankDisplayName(bank) })
          }
          type="button"
        >
          <Save className="size-4" />
          {t('namedBanks.save')}
        </button>
        <button
          className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          onClick={() => requestSavedBanks({ bank, closeMenu, mode: 'load' })}
          type="button"
        >
          <Database className="size-4" />
          {t('namedBanks.loadBank')}
        </button>
        <div className="my-1 border-t" />
        <button
          className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          disabled={isImporting}
          onClick={() => {
            closeMenu()
            beginImport(bank)
          }}
          type="button"
        >
          <Upload className="size-4" />
          <span>{isImporting ? t('banks.importing') : t('banks.import')}</span>
        </button>
        <button
          className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          disabled={!library.loadedBanks.includes(bank)}
          onClick={() => {
            closeMenu()
            downloadBank(bank)
          }}
          title={
            library.loadedBanks.includes(bank)
              ? t('banks.downloadTitle', { bank: bankDisplayName(bank) })
              : t('banks.importFirst', { bank: bankDisplayName(bank) })
          }
          type="button"
        >
          <Download className="size-4" />
          {t('banks.download')}
        </button>
        {banks.length > 1 ? (
          <button
            className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => {
              closeMenu()
              setBankPendingDeletion({ bank, name: bankDisplayName(bank) })
              deleteWorkspaceBankDialogRef.current?.showModal()
            }}
            type="button"
          >
            <Trash2 className="size-4" />
            {t('banks.deleteBank')}
          </button>
        ) : null}
      </>
    )
  }

  return (
    <section className="mx-auto grid max-w-7xl min-w-0 gap-5 px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      {sentryVerificationEnabled ? <SentryVerificationButton /> : null}
      <PatchGrid
        activePatchId={activePatchId}
        actions={
          <>
            {/* The selected bank reads back as a lit slot, as on the panel. */}
            {/* The rail drops bank names on narrow screens, so here the name takes
                its own line above the buttons rather than disappearing too. */}
            <span className="flex w-full min-w-0 items-center gap-[9px] md:mr-1.5 md:w-auto md:shrink-0">
              <span className="font-vt323 grid w-[26px] shrink-0 place-items-center border border-[var(--crt-led)] bg-[var(--crt-bg-1)] px-1.5 pt-1.5 pb-1 text-[18px] leading-none text-[var(--crt-led)]">
                {destinationBank}
              </span>
              <span className="font-dot-matrix block min-w-0 truncate text-[13px] font-bold tracking-[0.1em] text-[var(--crt-led)] md:max-w-40">
                {bankDisplayName(destinationBank)}
              </span>
              <details className="group relative ml-auto shrink-0 md:hidden" ref={bankMenuRef}>
                <summary
                  aria-label={t('banks.bankMenu', { bank: bankDisplayName(destinationBank) })}
                  className="grid h-6 w-5 cursor-pointer list-none place-items-center border-t border-r border-b border-l border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] text-[var(--crt-led)] transition-colors group-open:bg-[var(--crt-bg-1)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--crt-led)] [&::-webkit-details-marker]:hidden"
                  title={t('banks.bankMenu', { bank: bankDisplayName(destinationBank) })}
                >
                  <EllipsisVertical className="size-3.5" />
                </summary>
                <div className="menu-surface absolute top-full right-0 z-40 mt-1 min-w-56 border-t-2 border-r-2 border-b-2 border-l-2 border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel2)] p-1 text-[var(--crt-ink)]">
                  {renderBankActions({ id: destinationBank }, () =>
                    bankMenuRef.current?.removeAttribute('open'),
                  )}
                </div>
              </details>
            </span>
            <button
              className="crt-raised-lit inline-flex h-8 flex-auto shrink-0 cursor-pointer items-center justify-center gap-2 bg-[var(--crt-btn)] px-3 text-xs font-semibold tracking-[0.08em] whitespace-nowrap text-white transition-colors hover:bg-[var(--crt-btn-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:pointer-events-none disabled:opacity-50 md:flex-none"
              disabled={isSending || !isDestinationBankLoaded}
              onClick={sendSelectedBank}
              title={
                !midi.hasMidiOutput
                  ? t('midi.connectFirst')
                  : isDestinationBankLoaded
                    ? t('banks.sendTitle')
                    : t('banks.importFirst', { bank: bankDisplayName(destinationBank) })
              }
              type="button"
            >
              <Send aria-hidden="true" className="size-3.5" />
              <span>{isSending ? t('banks.sending') : t('banks.send')}</span>
            </button>
          </>
        }
        headerActions={
          <details className="group relative" ref={allBanksMenuRef}>
            <summary
              aria-label={t('banks.moreActions')}
              className="grid size-6 cursor-pointer list-none place-items-center border-t border-r border-b border-l border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] text-[var(--crt-acc-lt)] transition-colors hover:bg-[var(--crt-sel-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] [&::-webkit-details-marker]:hidden"
              title={t('banks.moreActions')}
            >
              <EllipsisVertical className="size-3.5" />
            </summary>
            <div className="menu-surface absolute top-full right-0 z-50 mt-1 min-w-60 border-t-2 border-r-2 border-b-2 border-l-2 border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel2)] p-1 text-[var(--crt-ink)]">
              <button
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                disabled={library.loadedBanks.length === 0}
                onClick={() => {
                  allBanksMenuRef.current?.removeAttribute('open')
                  void downloadAllBanks()
                }}
                type="button"
              >
                <Archive className="size-4" />
                {t('banks.downloadAll')}
              </button>
              <button
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  allBanksMenuRef.current?.removeAttribute('open')
                  restoreFactoryBanksDialogRef.current?.showModal()
                }}
                type="button"
              >
                <RotateCcw className="size-4" />
                {t('banks.restoreAll')}
              </button>
            </div>
          </details>
        }
        bankLabel={bankDisplayName}
        isBankLoaded={isDestinationBankLoaded || isSearching}
        isPatchDisabled={(patch) => !library.loadedBanks.includes(patch.bank)}
        onImportEmptyBank={() => beginImport(destinationBank)}
        onLoadDemoBank={() => {
          library.loadDemoBank(destinationBank)
          toast.success(t('toasts.demoLoaded', { bank: bankDisplayName(destinationBank) }))
        }}
        onPatchCopy={requestCopy}
        onPatchEdit={onEditPatch}
        onPatchSelect={onSelectPatch}
        onPatchMove={(patch, target) => library.moveVoice(patch.bank, patch.number, target.number)}
        patches={visiblePatches}
        search={search}
        searchDisabled={!hasLoadedBank}
        searchRef={searchRef}
        setSearch={setSearch}
        toolbar={
          <>
            <div className="flex h-full w-16 flex-col border-r-2 border-[var(--crt-shadow)] bg-[var(--crt-bg-panel)] md:w-[226px]">
              <WorkspaceBankSelector
                banks={banks.map((bank) => {
                  const name = bankDisplayName(bank)
                  return {
                    actionsLabel: t('banks.bankMenu', { bank: name }),
                    description: library.bankDescriptions[bank] ?? '',
                    id: bank,
                    name,
                  }
                })}
                label={t('banks.destination')}
                onSelect={selectDestinationBank}
                renderActions={renderBankActions}
                selectedBank={destinationBank}
              />
              {nextBank ? (
                <button
                  aria-label={t('banks.addBank')}
                  className="font-dot-matrix mx-2 mb-2 flex cursor-pointer items-center justify-center gap-2 border-t border-r border-b border-l border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] px-2 py-[7px] text-[14px] font-bold text-[var(--crt-ink-2)] transition-colors hover:bg-[var(--crt-sel-bg)] hover:text-[var(--crt-acc-lt)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--crt-led)] md:justify-start"
                  onClick={() => setIsAddingBank(true)}
                  ref={addBankButtonRef}
                  title={t('banks.addBank')}
                  type="button"
                >
                  <Plus className="size-4 shrink-0" />
                  <span className="hidden md:inline">{t('banks.addBank')}</span>
                </button>
              ) : null}
            </div>
            <input
              accept=".syx,application/octet-stream"
              aria-label={t('banks.importFile')}
              className="sr-only"
              disabled={isImporting}
              onChange={(event) => void importSelectedBankFile(event)}
              ref={importInputRef}
              type="file"
            />
          </>
        }
      />

      {transferStatus.message ? (
        <p
          aria-live="polite"
          className={cn(
            'text-sm',
            transferStatus.kind === 'success' && 'text-emerald-400',
            transferStatus.kind === 'error' && 'text-destructive',
            transferStatus.kind === 'idle' && 'text-muted-foreground',
          )}
          role="status"
        >
          {transferStatus.message}
        </p>
      ) : null}

      {dialogLoadError ? (
        <LoadFailedNotice
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3"
          message={dialogLoadError}
        />
      ) : null}

      {importError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {importError}
        </p>
      ) : null}

      <Fm1BankSelectionDialog
        dialogRef={bankSelectionDialogRef}
        isSending={isSending}
        midi={midi}
        onSend={() => void transferSelectedBank()}
      />
      {isAddingBank ? (
        <ErrorBoundary
          onError={() => {
            setIsAddingBank(false)
            setDialogLoadError(t('banks.addBankOpenFailed'))
          }}
        >
          <Suspense fallback={null}>
            <AddWorkspaceBankDialog
              bank={nextBank}
              library={library}
              onClose={() => {
                setIsAddingBank(false)
                addBankButtonRef.current?.focus()
              }}
              onCreated={selectDestinationBank}
              suggestedName={defaultWorkspaceBankTitle(t, banks.length + 1)}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      <ImportDx7BankDialog
        bank={bankPendingImport?.bank ?? null}
        bankName={bankPendingImport?.name ?? ''}
        dialogRef={importDx7BankDialogRef}
        library={library}
      />
      <MidiConnectionRequiredDialog dialogRef={midiConnectionRequiredDialogRef} />
      <DeleteWorkspaceBankDialog
        bankName={bankPendingDeletion?.name ?? ''}
        dialogRef={deleteWorkspaceBankDialogRef}
        onDelete={() => {
          if (!bankPendingDeletion) return
          const { bank } = bankPendingDeletion
          const replacement = workspaceBankAfterDeletion(banks, bank)
          onBankDeleted(bank)
          const changed = library.deleteBank(bank)
          if (replacement) setDestinationBank(replacement)
          toast.success(
            t('toasts.bankDeleted', { bank: bankPendingDeletion.name }),
            undoToastOptions(t, library, changed),
          )
          setBankPendingDeletion(null)
        }}
      />
      <RestoreFactoryBanksDialog
        dialogRef={restoreFactoryBanksDialogRef}
        onRestore={async () => {
          const changed = await library.resetFactoryBanks()
          toast.success(t('toasts.banksRestored'), undoToastOptions(t, library, changed))
        }}
      />
      {copySource ? (
        <ErrorBoundary
          key={copySource.id}
          onError={() => {
            setCopySource(null)
            setDialogLoadError(t('banks.copyOpenFailed'))
          }}
        >
          <Suspense fallback={null}>
            <CopyPatchDialog
              library={library}
              onClose={() => setCopySource(null)}
              onCopied={(target, changed) =>
                toast.success(
                  t('toasts.patchCopied', {
                    bank: bankDisplayName(target.bank),
                    patch: copySource.name,
                    slot: patchSlotCode(target),
                  }),
                  undoToastOptions(t, library, changed),
                )
              }
              source={copySource}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {savedBanksRequest ? (
        <ErrorBoundary
          key={`${savedBanksRequest.mode}-${savedBanksRequest.bank}`}
          onError={() => {
            savedBanksRequest.closeMenu()
            setSavedBanksRequest(null)
            setDialogLoadError(t('namedBanks.openFailed'))
          }}
        >
          <Suspense fallback={null}>
            <NamedBankLibraryDialog
              destinationBank={savedBanksRequest.bank}
              library={library}
              mode={savedBanksRequest.mode}
              onClose={() => {
                savedBanksRequest.closeMenu()
                setSavedBanksRequest(null)
              }}
              onLoaded={(savedBank, changed) =>
                toast.success(
                  t('namedBanks.loaded', {
                    bank: bankDisplayName(savedBanksRequest.bank),
                    name: savedBank.name,
                  }),
                  undoToastOptions(t, library, changed),
                )
              }
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
    </section>
  )
}
