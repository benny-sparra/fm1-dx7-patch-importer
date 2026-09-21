import {
  Database,
  Download,
  EllipsisVertical,
  FileMusic,
  HardDriveDownload,
  HardDriveUpload,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  type ChangeEvent,
  type ComponentProps,
  lazy,
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { undoToastOptions } from '@/components/patches/undo-toast'
import { PatchGrid } from '@/components/patches/patch-grid'
import type { SearchResultSound } from '@/components/patches/search-everywhere-results'
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
import { ErrorNotice } from '@/components/ui/error-notice'
import { makeDx7BankFile, type Dx7Voice } from '@/lib/dx7'
import { reportBankTransferFailure } from '@/lib/monitoring'
import {
  getNextWorkspaceBank,
  patchMatchesSearch,
  patchSlotCode,
  workspaceBankAfterDeletion,
} from '@/lib/patch-library'
import { librarianShortcuts } from '@/lib/keyboard-shortcuts'
import { makePatchShareUrl } from '@/lib/patch-share-link'
import { shouldShowFm1BankSelectionDialog } from '@/lib/session'
import { cn } from '@/lib/utils'
import type { MidiController } from '@/hooks/use-midi'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useSharedPatchLink } from '@/hooks/use-shared-patch-link'
import { useDownloadWorkspaceBackup, useLastBackupTime } from '@/hooks/use-workspace-backup'
import { type LibrarianView, useLibrarianView } from '@/hooks/use-librarian-view'
import type { Patch } from '@/data/patches'
import { createBankFileSelectionTarget } from '@/lib/bank-file-selection'
import { downloadFile } from '@/lib/download-file'
import { downloadSysexFile, sysexFileAccept } from '@/lib/sysex-file'
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

// Results from saved banks and the catalog load, with the catalog's patch names, once the search is
// widened.
const SearchEverywhereResults = lazy(() =>
  import('@/components/patches/search-everywhere-results').then((module) => ({
    default: module.SearchEverywhereResults,
  })),
)

// Replacing a slot from a file opens from its menu, with the file reader, on first use.
const ReplacePatchDialog = lazy(() =>
  import('@/components/patches/replace-patch-dialog').then((module) => ({
    default: module.ReplacePatchDialog,
  })),
)

// Restoring a backup opens from the header menu, with the backup format, on first use.
const RestoreBackupDialog = lazy(() =>
  import('@/components/patches/restore-backup-dialog').then((module) => ({
    default: module.RestoreBackupDialog,
  })),
)

const menuItemClassName =
  'flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'
const menuHeadingClassName =
  'font-dot-matrix px-3 pt-1.5 pb-0.5 text-[11px] font-bold tracking-[0.1em] text-[var(--crt-ink-3)] uppercase'

type SavedBanksRequest = { bank: string; closeMenu: () => void; mode: 'load' | 'save' }

/** A copy waiting for its dialog: what is copied, how, and the bank to open on. */
type CopyRequest = {
  bank?: string
  copy: ComponentProps<typeof CopyPatchDialog>['onCopy']
  /** Explains where a sound from outside the workspace comes from. */
  description?: string
  /** Opens the editor on the copy, for a search result someone asked to edit. */
  edit?: boolean
  key: string
  source: ComponentProps<typeof CopyPatchDialog>['source']
}

type TransferStatus = { kind: 'error' | 'idle' | 'success'; message: string }

type LibrarianPageProps = {
  activePatchId: string
  library: PatchLibrary
  midi: MidiController
  /** Called as a bank is deleted, before later banks move up a letter. */
  onBankDeleted: (bank: string) => void
  /** Closes the editor, for an undo that removes the sound it was opened on. */
  onCloseEditor?: () => void
  onEditPatch: (patch: Patch) => void
  /** Plays a search result from a saved bank or the catalog through the FM1 edit buffer. */
  onPlaySearchResult: (voice: Dx7Voice, effects: Uint8Array | undefined) => void
  onSelectPatch: (patch: Patch) => void
  /** Held by the app so the bank and search survive the editor; the page keeps its own without it. */
  view?: LibrarianView
}

export function LibrarianPage({
  activePatchId,
  library,
  midi,
  onBankDeleted,
  onCloseEditor,
  onEditPatch,
  onPlaySearchResult,
  onSelectPatch,
  view,
}: LibrarianPageProps) {
  const { i18n, t } = useTranslation()
  const toast = useToast()
  const { patches } = library
  const banks = library.workspaceBanks
  const nextBank = getNextWorkspaceBank(banks)
  const ownView = useLibrarianView()
  const { bank: destinationBank, search, setBank: setDestinationBank, setSearch } = view ?? ownView
  const [importError, setImportError] = useState('')
  // Explains a dialog whose chunk did not arrive, such as after a newer deployment replaced it.
  const [dialogLoadError, setDialogLoadError] = useState('')
  const [savedBanksRequest, setSavedBanksRequest] = useState<SavedBanksRequest | null>(null)
  // The sound whose menu chose Copy, or that was dropped on a bank's tab, or a search result from
  // outside the workspace, kept while its dialog is open with the bank it was dropped on.
  const [copyRequest, setCopyRequest] = useState<CopyRequest | null>(null)
  // The slot whose menu chose to replace it from a file, kept while its dialog is open.
  const [replaceTarget, setReplaceTarget] = useState<Patch | null>(null)
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
  const [isRestoringBackup, setIsRestoringBackup] = useState(false)
  const downloadBackup = useDownloadWorkspaceBackup(library)
  const lastBackupTime = useLastBackupTime()
  const sysexMenuHeadingId = useId()
  const backupMenuHeadingId = useId()
  const lastBackupId = useId()
  const backupContentsId = useId()
  const sysexContentsId = useId()
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
  const requestCopy = (patch: Patch, bank?: string) => {
    setDialogLoadError('')
    setCopyRequest({
      bank,
      copy: (targetBank, slot) => library.copyVoice(patch.id, targetBank, slot),
      key: patch.id,
      source: patch,
    })
  }
  const requestResultCopy = (sound: SearchResultSound, edit: boolean) => {
    setDialogLoadError('')
    setCopyRequest({
      copy: (bank, slot) => library.replaceVoice(bank, slot, sound.voice, sound.effects),
      edit,
      key: sound.origin,
      source: { name: sound.name, number: sound.slot, origin: sound.origin },
    })
  }
  // Each opened link gets its own dialog, even when the same link is opened twice.
  const sharedLinkCount = useRef(0)
  useSharedPatchLink({
    onError: (problem) => {
      setCopyRequest(null)
      if (problem === 'unavailable') setDialogLoadError(t('share.errors.unavailable'))
      else setImportError(t(`share.errors.${problem}`))
    },
    onOpen: ({ effects, voice }) => {
      trackAnalyticsEvent({ name: 'patch_link_opened' })
      setDialogLoadError('')
      if (library.loadedBanks.length === 0) {
        setImportError(t('share.errors.noBank'))
        return
      }
      setImportError('')
      sharedLinkCount.current += 1
      setCopyRequest({
        copy: (bank, slot) => library.replaceVoice(bank, slot, voice, effects),
        description: t('share.openHint'),
        key: `shared-link-${sharedLinkCount.current}`,
        source: { name: voice.name, number: 1, origin: t('share.origin') },
      })
    },
  })
  const copyShareLink = async (patch: Patch) => {
    const voice = library.voices[patch.id]
    if (!voice) return
    try {
      if (typeof navigator.clipboard?.writeText !== 'function') {
        throw new Error('The Clipboard API is unavailable.')
      }
      await navigator.clipboard.writeText(makePatchShareUrl(voice, library.effects[patch.id]))
    } catch {
      setImportError(t('share.errors.copyFailed'))
      return
    }
    setImportError('')
    trackAnalyticsEvent({ name: 'patch_link_copied' })
    toast.success(t('share.copied', { patch: patch.name }))
  }
  const requestReplace = (patch: Patch) => {
    setDialogLoadError('')
    setReplaceTarget(patch)
  }
  // The single-voice file format loads with the first download rather than with the page.
  const downloadPatch = async (patch: Patch) => {
    const voice = library.voices[patch.id]
    if (!voice) return
    let voiceFile: typeof import('@/lib/dx7-voice-file')
    try {
      voiceFile = await import('@/lib/dx7-voice-file')
    } catch {
      setDialogLoadError(t('banks.patchFileUnavailable'))
      return
    }
    downloadSysexFile(voiceFile.makeDx7VoiceFile(voice), voiceFile.makeDx7VoiceFilename(patch))
    toast.success(t('toasts.bankDownloadStarted', { bank: patch.name }))
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
      downloadSysexFile(
        makeDx7BankFile(library.getBankVoices(bank)),
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
    // A search looks through every loaded bank, so a result keeps showing while another is played.
    if (isSearching) {
      return patches.filter(
        (patch) => library.loadedBanks.includes(patch.bank) && patchMatchesSearch(patch, search),
      )
    }
    if (!isDestinationBankLoaded) return []
    return patches.filter((patch) => patch.bank === destinationBank)
  }, [destinationBank, isDestinationBankLoaded, isSearching, library.loadedBanks, patches, search])

  useEffect(() => {
    if (!hasLoadedBank) setSearch('')
  }, [hasLoadedBank, setSearch])

  // No bank shows as selected during a search, so the played result's bank is the one that
  // clearing the search returns to.
  const followPlayedPatch = (patch: Patch) => setDestinationBank(patch.bank)

  // Choosing a bank asks to see that bank, so it leaves the results.
  const selectDestinationBank = (bank: string) => {
    setSearch('')
    setDestinationBank(bank)
  }

  useEffect(() => {
    if (!banks.includes(destinationBank)) setDestinationBank(banks[0] ?? 'A')
  }, [banks, destinationBank, setDestinationBank])

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
              {/* Results come from every bank, so no bank's letter, name, or menu shows. */}
              {isSearching ? null : (
                <span className="font-vt323 grid w-[26px] shrink-0 place-items-center border border-[var(--crt-led)] bg-[var(--crt-bg-1)] px-1.5 pt-1.5 pb-1 text-[18px] leading-none text-[var(--crt-led)]">
                  {destinationBank}
                </span>
              )}
              <span
                className={cn(
                  'font-dot-matrix block min-w-0 truncate text-[13px] font-bold tracking-[0.1em] text-[var(--crt-led)]',
                  !isSearching && 'md:max-w-40',
                )}
              >
                {isSearching
                  ? t('banks.searchResults', { search: search.trim() })
                  : bankDisplayName(destinationBank)}
              </span>
              <details
                className={cn('group relative ml-auto shrink-0 md:hidden', isSearching && 'hidden')}
                ref={bankMenuRef}
              >
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
              className="crt-raised-lit inline-flex h-8 flex-auto shrink-0 cursor-pointer items-center justify-center gap-2 bg-[var(--crt-btn)] px-3 text-xs font-semibold tracking-[0.08em] whitespace-nowrap text-white transition-colors hover:bg-[var(--crt-btn-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:pointer-events-none disabled:opacity-50 md:ml-auto md:flex-none"
              disabled={isSending || isSearching || !isDestinationBankLoaded}
              onClick={sendSelectedBank}
              title={
                isSearching
                  ? t('banks.sendFromSearch')
                  : !midi.hasMidiOutput
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
            <div className="menu-surface absolute top-full right-0 z-50 mt-1 w-80 max-w-[calc(100vw-2rem)] border-t-2 border-r-2 border-b-2 border-l-2 border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel2)] p-1 text-[var(--crt-ink)]">
              {/* The backup comes first: it is the only copy of FM1 effects and saved banks. */}
              <div aria-labelledby={backupMenuHeadingId} role="group">
                <p className={menuHeadingClassName} id={backupMenuHeadingId}>
                  {t('backup.menuHeading')}
                </p>
                <button
                  aria-describedby={
                    lastBackupTime ? `${backupContentsId} ${lastBackupId}` : backupContentsId
                  }
                  aria-label={t('backup.download')}
                  className={menuItemClassName}
                  // Saved banks are read as the page opens; a backup waits for them.
                  disabled={library.namedBanksLoading}
                  onClick={() => {
                    allBanksMenuRef.current?.removeAttribute('open')
                    void downloadBackup().then((downloaded) => {
                      if (!downloaded) setDialogLoadError(t('backup.unavailable'))
                    })
                  }}
                  type="button"
                >
                  <HardDriveDownload className="size-4 shrink-0" />
                  <span className="grid">
                    <span>{t('backup.download')}</span>
                    <span className="text-xs text-[var(--crt-ink-3)]" id={backupContentsId}>
                      {t('backup.backupContents')}
                    </span>
                    {lastBackupTime ? (
                      <span className="text-xs text-[var(--crt-ink-3)]" id={lastBackupId}>
                        {t('backup.lastBackup', {
                          date: new Date(lastBackupTime).toLocaleDateString(i18n.resolvedLanguage),
                        })}
                      </span>
                    ) : null}
                  </span>
                </button>
                <button
                  className={menuItemClassName}
                  onClick={() => {
                    allBanksMenuRef.current?.removeAttribute('open')
                    setDialogLoadError('')
                    setIsRestoringBackup(true)
                  }}
                  type="button"
                >
                  <HardDriveUpload className="size-4" />
                  {t('backup.restore')}
                </button>
              </div>
              <div aria-labelledby={sysexMenuHeadingId} className="mt-1" role="group">
                <p className={menuHeadingClassName} id={sysexMenuHeadingId}>
                  {t('backup.menuSysex')}
                </p>
                <button
                  aria-describedby={sysexContentsId}
                  aria-label={t('banks.downloadAll')}
                  className={menuItemClassName}
                  disabled={library.loadedBanks.length === 0}
                  onClick={() => {
                    allBanksMenuRef.current?.removeAttribute('open')
                    void downloadAllBanks()
                  }}
                  type="button"
                >
                  <FileMusic className="size-4 shrink-0" />
                  <span className="grid">
                    <span>{t('banks.downloadAll')}</span>
                    <span className="text-xs text-[var(--crt-ink-3)]" id={sysexContentsId}>
                      {t('backup.sysexContents')}
                    </span>
                  </span>
                </button>
              </div>
              <div className="my-1 border-t" />
              <button
                className={menuItemClassName}
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
        onPatchDropOnBank={requestCopy}
        onPatchDownload={(patch) => void downloadPatch(patch)}
        onPatchReplace={requestReplace}
        onPatchShare={(patch) => void copyShareLink(patch)}
        onPatchEdit={(patch) => {
          followPlayedPatch(patch)
          onEditPatch(patch)
        }}
        onPatchSelect={(patch) => {
          followPlayedPatch(patch)
          onSelectPatch(patch)
        }}
        onPatchMove={(patch, target) => library.moveVoice(patch.bank, patch.number, target.number)}
        patches={visiblePatches}
        reorderable={!isSearching}
        extraResults={
          isSearching ? (
            <ErrorBoundary
              fallback={<LoadFailedNotice message={t('banks.everywhere.loadFailed')} />}
            >
              {/* The results show their own loading line while the search code arrives. */}
              <Suspense fallback={null}>
                <SearchEverywhereResults
                  activePatchId={activePatchId}
                  hasDamagedNamedBanks={library.hasDamagedNamedBanks}
                  namedBanks={library.namedBanks}
                  namedBanksLoadFailed={library.namedBanksLoadFailed}
                  onCopy={requestResultCopy}
                  onPlay={onPlaySearchResult}
                  search={search}
                  workspaceMatchCount={visiblePatches.length}
                />
              </Suspense>
            </ErrorBoundary>
          ) : undefined
        }
        resultsHeading={isSearching ? t('banks.everywhere.workspace') : undefined}
        search={search}
        searchDisabled={!hasLoadedBank}
        searchRef={searchRef}
        setSearch={setSearch}
        toolbar={
          <>
            <div className="flex h-full w-16 flex-col border-r-2 border-[var(--crt-shadow)] bg-[var(--crt-bg-panel)] md:w-[226px]">
              <WorkspaceBankSelector
                acceptsDrop={(bank) => library.loadedBanks.includes(bank)}
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
                showsSelection={!isSearching}
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
              accept={sysexFileAccept}
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

      {importError ? <ErrorNotice>{importError}</ErrorNotice> : null}

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
      {isRestoringBackup ? (
        <ErrorBoundary
          onError={() => {
            setIsRestoringBackup(false)
            setDialogLoadError(t('backup.unavailable'))
          }}
        >
          <Suspense fallback={null}>
            <RestoreBackupDialog
              library={library}
              onClose={() => {
                setIsRestoringBackup(false)
                allBanksMenuRef.current?.querySelector('summary')?.focus()
              }}
              onRestored={(savedAt, changed) => {
                trackAnalyticsEvent({ name: 'backup_restored' })
                toast.success(
                  t('backup.restored', {
                    date: new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(savedAt)),
                  }),
                  undoToastOptions(t, library, changed),
                )
              }}
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
      {copyRequest ? (
        <ErrorBoundary
          key={copyRequest.key}
          onError={() => {
            setCopyRequest(null)
            setDialogLoadError(t('banks.copyOpenFailed'))
          }}
        >
          <Suspense fallback={null}>
            <CopyPatchDialog
              description={copyRequest.description}
              initialBank={copyRequest.bank}
              library={library}
              onClose={() => setCopyRequest(null)}
              onCopy={copyRequest.copy}
              opensEditor={copyRequest.edit}
              onCopied={(target, changed) => {
                toast.success(
                  t('toasts.patchCopied', {
                    bank: bankDisplayName(target.bank),
                    patch: copyRequest.source.name,
                    slot: patchSlotCode(target),
                  }),
                  // Undoing a copy that is open in the editor would leave the editor on a sound
                  // the slot no longer holds, so the undo closes it first.
                  undoToastOptions(
                    t,
                    library,
                    changed,
                    copyRequest.edit ? onCloseEditor : undefined,
                  ),
                )
                if (copyRequest.edit) {
                  followPlayedPatch(target)
                  onEditPatch(target)
                }
              }}
              source={copyRequest.source}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {replaceTarget ? (
        <ErrorBoundary
          key={replaceTarget.id}
          onError={() => {
            setReplaceTarget(null)
            setDialogLoadError(t('banks.patchFileUnavailable'))
          }}
        >
          <Suspense fallback={null}>
            <ReplacePatchDialog
              library={library}
              onClose={() => setReplaceTarget(null)}
              onReplaced={(voice, changed) =>
                toast.success(
                  t('toasts.patchReplaced', {
                    patch: voice.name,
                    slot: patchSlotCode(replaceTarget),
                  }),
                  undoToastOptions(t, library, changed),
                )
              }
              patch={replaceTarget}
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
