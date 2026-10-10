import {
  Database,
  Download,
  EllipsisVertical,
  FileMusic,
  Files,
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
import { PixelHeartIcon } from '@/components/patches/favourite-button'
import { FavouritesTab } from '@/components/patches/favourites-tab'
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
import { RestoreFactoryBanksDialog } from '@/components/patches/restore-factory-banks-dialog'
import { Fm1BankSelectionDialog } from '@/components/midi/fm1-bank-selection-dialog'
import { MidiConnectionRequiredDialog } from '@/components/midi/midi-connection-required-dialog'
import { ErrorNotice } from '@/components/ui/error-notice'
import { dx7BankVoiceCount, makeDx7BankFile, type Dx7Voice } from '@/lib/dx7'
import {
  favouritesBank,
  favouritePatchId,
  makeFavouritesTransfer,
  type FavouriteOrigin,
} from '@/lib/favourites'
import { reportBankTransferFailure } from '@/lib/monitoring'
import {
  bankInitVoiceCount,
  getNextWorkspaceBank,
  patchMatchesSearch,
  patchSlotCode,
  workspaceBankAfterDeletion,
} from '@/lib/patch-library'
import { librarianShortcuts } from '@/lib/keyboard-shortcuts'
import { shouldShowFm1BankSelectionDialog } from '@/lib/session'
import type { Fm1VaPresetSource } from '@/components/patches/import-fm1-va-presets-dialog'
import { hasFm1VaPresetCommands } from '@/lib/fm1-firmware'
import { soundKey } from '@/lib/sound-key'
import { cn } from '@/lib/utils'
import { crtSwitchOff } from '@/lib/crt-switch-off'
import { useChangedSlots } from '@/hooks/use-changed-slots'
import type { MidiController } from '@/hooks/use-midi'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import {
  type BackupLibrary,
  useDownloadWorkspaceBackup,
  useLastBackupTime,
} from '@/hooks/use-workspace-backup'
import { type LibrarianView, useLibrarianView } from '@/hooks/use-librarian-view'
import type { Patch } from '@/data/patches'
import { createBankFileSelectionTarget } from '@/lib/bank-file-selection'
import { downloadFile } from '@/lib/download-file'
import { downloadSysexFile, sysexFileAccept } from '@/lib/sysex-file'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { LoadFailedNotice } from '@/components/ui/load-failed-notice'
import { useToast } from '@/components/ui/toast'
import { trackAnalyticsEvent } from '@/lib/analytics'

/**
 * Whether this build shows the Sentry test control. Only such a build loads it: imported statically,
 * the control's icon stayed in the entry although a normal build never renders it. The flag is
 * checked here, where the control is rendered, because the bundler drops the import only for a
 * constant it can read in this module.
 */
const sentryVerificationEnabled =
  import.meta.env.PROD && import.meta.env.VITE_SENTRY_VERIFY === 'true'

const SentryVerificationButton = sentryVerificationEnabled
  ? lazy(() =>
      import('@/components/sentry-verification-button').then((module) => ({
        default: module.SentryVerificationButton,
      })),
    )
  : null

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
// Changing a Virtual Analog patch to FM opens from its slot menu, with the Init voice, on first use.
const ChangeToFmDialog = lazy(() =>
  import('@/components/patches/change-to-fm-dialog').then((module) => ({
    default: module.ChangeToFmDialog,
  })),
)
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

// Importing a DX7 bank opens from a bank's menu, with the bank picker, on first use; the file
// reader that splits joined banks loads when a file is chosen.
const ImportDx7BankDialog = lazy(() =>
  import('@/components/patches/import-dx7-bank-dialog').then((module) => ({
    default: module.ImportDx7BankDialog,
  })),
)

// Importing FM-1+VA's presets opens from the header menu, with the file reader, on first use.
const ImportFm1VaPresetsDialog = lazy(() =>
  import('@/components/patches/import-fm1-va-presets-dialog').then((module) => ({
    default: module.ImportFm1VaPresetsDialog,
  })),
)
const WriteFm1VaPresetsDialog = lazy(() =>
  import('@/components/patches/write-fm1-va-presets-dialog').then((module) => ({
    default: module.WriteFm1VaPresetsDialog,
  })),
)

// Finding duplicate patches opens from the header menu, with the code that compares them, on first
// use.
const DuplicatePatchesDialog = lazy(() =>
  import('@/components/patches/duplicate-patches-dialog').then((module) => ({
    default: module.DuplicatePatchesDialog,
  })),
)

const menuItemClassName =
  'flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'
// An item with a hint below its label keeps its icon beside the label's line.
const menuItemWithHintClassName =
  'flex w-full cursor-pointer items-start gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'
const menuHintedIconClassName = 'mt-0.5 size-4 shrink-0'
const menuDangerItemClassName =
  'flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground'
const menuHeadingClassName =
  'font-dot-matrix px-3 pt-1.5 pb-0.5 text-[11px] font-bold tracking-[0.1em] text-[var(--crt-ink-3)] uppercase'

/** A bank menu's request, with the menu toggle that focus returns to when its dialog closes. */
type BankMenuRequest = { bank: string; name: string; opener: HTMLElement | null }

/** The toggle of the menu holding `item`, which stays in view once the menu closes. */
function menuToggleOf(item: HTMLElement | undefined) {
  return item?.closest('details')?.querySelector('summary') ?? null
}

type SavedBanksRequest = { bank: string; closeMenu: () => void; mode: 'load' | 'save' }

/** A copy waiting for its dialog: what is copied, how, and the bank to open on. */
type CopyRequest = {
  bank?: string
  copy: ComponentProps<typeof CopyPatchDialog>['onCopy']
  /** Opens the editor on the copy, for a search result someone asked to edit. */
  edit?: boolean
  key: string
  source: ComponentProps<typeof CopyPatchDialog>['source']
  /** Swaps the sound with the chosen slot's, for a sound in a workspace slot. */
  swap?: ComponentProps<typeof CopyPatchDialog>['onSwap']
}

type LibrarianLibrary = BackupLibrary &
  ComponentProps<typeof AddWorkspaceBankDialog>['library'] &
  ComponentProps<typeof BankInformationDialog>['library'] &
  ComponentProps<typeof CopyPatchDialog>['library'] &
  ComponentProps<typeof DuplicatePatchesDialog>['library'] &
  ComponentProps<typeof ImportDx7BankDialog>['library'] &
  ComponentProps<typeof ImportFm1VaPresetsDialog>['library'] &
  ComponentProps<typeof NamedBankLibraryDialog>['library'] &
  ComponentProps<typeof WriteFm1VaPresetsDialog>['library'] &
  ComponentProps<typeof ChangeToFmDialog>['library'] &
  ComponentProps<typeof ReplacePatchDialog>['library'] &
  ComponentProps<typeof RestoreBackupDialog>['library'] &
  Pick<
    PatchLibrary,
    | 'bankDescriptions'
    | 'canRedo'
    | 'canUndo'
    | 'copyVoice'
    | 'deleteBank'
    | 'effects'
    | 'eightBit'
    | 'favouriteKeys'
    | 'favourites'
    | 'getBankVoices'
    | 'hasDamagedNamedBanks'
    | 'importBank'
    | 'loadDemoBank'
    | 'loadedBanks'
    | 'moveFavourite'
    | 'moveVoice'
    | 'namedBanks'
    | 'namedBanksLoadFailed'
    | 'namedBanksLoading'
    | 'patches'
    | 'records'
    | 'redo'
    | 'replaceVoice'
    | 'replaceWithEightBit'
    | 'replaceWithVirtualAnalog'
    | 'resetFactoryBanks'
    | 'swapVoices'
    | 'toggleFavourite'
    | 'toggleFavouriteSound'
    | 'undo'
    | 'undoChange'
    | 'voices'
    | 'workspaceBanks'
  >

type LibrarianMidi = ComponentProps<typeof Fm1BankSelectionDialog>['midi'] &
  ComponentProps<typeof ImportFm1VaPresetsDialog>['midi'] &
  ComponentProps<typeof WriteFm1VaPresetsDialog>['midi'] &
  Pick<MidiController, 'channel' | 'hasMidiOutput' | 'sendBank' | 'sysexAvailable'>

type LibrarianPageProps = {
  activePatchId: string
  library: LibrarianLibrary
  midi: LibrarianMidi
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
  // The Virtual Analog patch a slot menu asked to change to FM, while its dialog is open.
  const [changeToFmTarget, setChangeToFmTarget] = useState<Patch | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [transferError, setTransferError] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const importTargetRef = useRef(createBankFileSelectionTarget())
  const addBankButtonRef = useRef<HTMLButtonElement>(null)
  const [isAddingBank, setIsAddingBank] = useState(false)
  const [isRestoringBackup, setIsRestoringBackup] = useState(false)
  // Which Baud Girl preset import is open: the read from the FM1 or the presets file.
  const [fm1VaImportSource, setFm1VaImportSource] = useState<Fm1VaPresetSource | null>(null)
  const baudGirlMenuHeadingId = useId()
  // The write to an FM1 on Baud Girl's firmware: of every bank from the header menu, or of one bank
  // from Send to FM1.
  const [fm1VaWrite, setFm1VaWrite] = useState<{ sendBank?: string } | null>(null)
  const [isFindingDuplicates, setIsFindingDuplicates] = useState(false)
  // The slot the grid moves focus to once it shows, such as a patch chosen among the duplicates.
  const [slotFocusRequest, setSlotFocusRequest] = useState<{ patchId: string } | null>(null)
  const downloadBackup = useDownloadWorkspaceBackup(library)
  const lastBackupTime = useLastBackupTime()
  const otherFilesMenuHeadingId = useId()
  const backupMenuHeadingId = useId()
  const lastBackupId = useId()
  const sysexContentsId = useId()
  const sendButtonRef = useRef<HTMLButtonElement>(null)
  // The bank a bank menu asked to delete or import over, kept while its dialog is open with the
  // menu toggle that focus returns to.
  const [bankPendingDeletion, setBankPendingDeletion] = useState<BankMenuRequest | null>(null)
  // An import into an empty bank opens the dialog only when its file joins several banks, which
  // arrives with the file chosen.
  const [bankPendingImport, setBankPendingImport] = useState<
    (BankMenuRequest & { file?: File }) | null
  >(null)
  // The bank menu toggle an import into an empty bank was started from, for focus to return to.
  const emptyBankImportOpenerRef = useRef<HTMLElement | null>(null)
  const [isRestoringFactoryBanks, setIsRestoringFactoryBanks] = useState(false)
  // Sending a bank first explains what it needs: a MIDI output, or the destination on the FM1.
  const [sendGuide, setSendGuide] = useState<'bank-selection' | 'midi-required' | null>(null)
  const allBanksMenuRef = useDismissableDetails()
  const bankMenuRef = useDismissableDetails()
  const isDestinationBankLoaded = library.loadedBanks.includes(destinationBank)
  // Baud Girl's firmware stores each preset as written, effects included, so Send to FM1 writes the
  // bank preset by preset over an FM1 bank chosen in the app, rather than sending a DX7 bank.
  const sendsByPresetWrite = hasFm1VaPresetCommands(midi.firmware)
  const workspaceBankLabel = useWorkspaceBankLabel(library)
  // Favourites shows in the bank rail, so its name reads wherever a bank's name would.
  const bankDisplayName = (bank: string) =>
    bank === favouritesBank ? t('favourites.title') : workspaceBankLabel(bank)
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
      // A favourite is a copy kept apart from the banks, with no slot to take the other sound.
      swap:
        patch.bank === favouritesBank
          ? undefined
          : (targetBank, slot) => library.swapVoices(patch.id, targetBank, slot),
    })
  }
  const requestResultCopy = (sound: SearchResultSound, edit: boolean) => {
    setDialogLoadError('')
    setCopyRequest({
      copy: (bank, slot) =>
        'virtualAnalog' in sound
          ? library.replaceWithVirtualAnalog(
              bank,
              slot,
              sound.virtualAnalog,
              sound.effects,
              sound.record,
            )
          : 'eightBit' in sound
            ? library.replaceWithEightBit(bank, slot, sound.eightBit, sound.effects, sound.record)
            : library.replaceVoice(bank, slot, sound.voice, sound.effects, sound.record),
      // A Virtual Analog or 8-Bit preset has no voice editor to open.
      edit: edit && 'voice' in sound,
      key: sound.origin,
      source: { name: sound.name, number: sound.slot, origin: sound.origin },
    })
  }
  const requestReplace = (patch: Patch) => {
    setDialogLoadError('')
    setReplaceTarget(patch)
  }
  const requestChangeToFm = (patch: Patch) => {
    setDialogLoadError('')
    setChangeToFmTarget(patch)
  }
  // The single-voice file format loads with the first download rather than with the page.
  const downloadPatch = async (patch: Patch) => {
    const voice = library.voices[patch.id]
    const presetVoice = library.virtualAnalog[patch.id] ?? library.eightBit[patch.id]
    const record = library.records[patch.id]
    if (presetVoice && record) {
      void downloadPresetFile(patch, presetVoice, record)
      return
    }
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
  // A Virtual Analog or 8-Bit patch is not a DX7 voice, so it downloads as a presets file of one
  // preset, as Baud Girl's Device Manager saves one, which **Import Baud Girl presets file…** reads.
  const downloadPresetFile = async (patch: Patch, voice: Uint8Array, record: Uint8Array) => {
    let presetFile: typeof import('@/lib/fm1-va-preset-download')
    try {
      presetFile = await import('@/lib/fm1-va-preset-download')
    } catch {
      setDialogLoadError(t('banks.patchFileUnavailable'))
      return
    }
    let bytes: Uint8Array<ArrayBuffer>
    try {
      bytes = presetFile.makeFm1VaPresetFile({
        ...patch,
        effects: library.effects[patch.id],
        record,
        voice,
      })
    } catch (error) {
      if (!(error instanceof presetFile.Fm1VaPresetFileInexactError)) throw error
      setImportError(t('banks.presetFileInexact', { name: patch.name }))
      return
    }
    setImportError('')
    downloadSysexFile(bytes, presetFile.makeFm1VaPresetFilename(patch))
    toast.success(t('toasts.presetFileDownloadStarted', { name: patch.name }))
  }
  const beginImport = (bank: string, opener?: HTMLElement) => {
    if (library.loadedBanks.includes(bank)) {
      setBankPendingImport({
        bank,
        name: bankDisplayName(bank),
        opener: menuToggleOf(opener),
      })
      return
    }
    emptyBankImportOpenerRef.current = menuToggleOf(opener)
    importTargetRef.current.begin(bank)
    importInputRef.current?.click()
  }

  // A DX7 bank has no place for a Virtual Analog or 8-Bit preset, so its slot takes INIT VOICE, which comes
  // with the editor's voice code only when a bank needs it.
  const initVoiceCount = (bank: string) => bankInitVoiceCount(library, bank)
  const bankDx7Voices = async (sentBanks: readonly string[]) => {
    const initVoice = sentBanks.some((bank) => initVoiceCount(bank) > 0)
      ? (await import('@/lib/init-voice')).makeInitDx7Voice()
      : undefined
    return sentBanks.map((bank) => library.getBankVoices(bank, initVoice))
  }

  const downloadBank = async (bank: string) => {
    try {
      const [voices] = await bankDx7Voices([bank])
      downloadSysexFile(makeDx7BankFile(voices), `fm1-bank-${bank.toLowerCase()}.syx`)
      setImportError('')
      trackAnalyticsEvent({ data: { scope: 'single' }, name: 'bank_exported' })
      const initCount = initVoiceCount(bank)
      toast.success(
        initCount === 0
          ? t('toasts.bankDownloadStarted', { bank: bankDisplayName(bank) })
          : t('toasts.bankDownloadStartedWithInit', {
              bank: bankDisplayName(bank),
              count: initCount,
            }),
      )
    } catch (error) {
      setImportError(bankErrorMessage(t, error, t('banks.exportFailed')))
    }
  }

  const downloadAllBanks = async () => {
    try {
      const { zipSync } = await import('fflate')
      const { loadedBanks } = library
      const voices = await bankDx7Voices(loadedBanks)
      const files = Object.fromEntries(
        loadedBanks.map((bank, index) => [
          `fm1-bank-${bank.toLowerCase()}.syx`,
          makeDx7BankFile(voices[index]),
        ]),
      )
      downloadFile(new Blob([zipSync(files)], { type: 'application/zip' }), 'fm1-browser-banks.zip')
      setImportError('')
      trackAnalyticsEvent({ data: { scope: 'all' }, name: 'bank_exported' })
      const initCount = loadedBanks.reduce((count, bank) => count + initVoiceCount(bank), 0)
      toast.success(
        initCount === 0
          ? t('toasts.banksDownloadStarted')
          : t('toasts.banksDownloadStartedWithInit', { count: initCount }),
      )
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
    setTransferError('')
    let voiceCount: number | undefined
    try {
      let [voices] = await bankDx7Voices([destinationBank])
      const initCount = initVoiceCount(destinationBank)
      let sentStatus =
        initCount === 0
          ? t('banks.sentStatus', { bank: bankDisplayName(destinationBank) })
          : t('banks.sentStatusWithInit', {
              bank: bankDisplayName(destinationBank),
              count: initCount,
            })
      if (destinationBank === favouritesBank) {
        const transfer = await prepareFavouritesTransfer()
        if (!transfer) return
        voices = transfer.voices
        sentStatus = favouritesSentStatus(transfer)
      }
      voiceCount = voices.length
      const result = await midi.sendBank(destinationBank, voices)
      if (result.ok) {
        trackAnalyticsEvent({ name: 'bank_transfer_completed' })
        toast.success(sentStatus)
      } else {
        setTransferError(t('banks.notSent'))
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
      setTransferError(bankErrorMessage(t, error, t('banks.notSent')))
    } finally {
      setIsSending(false)
    }
  }

  // The Init voice that fills a short Favourites comes with the editor's voice code, on first send.
  const prepareFavouritesTransfer = async () => {
    try {
      const { makeInitDx7Voice } = await import('@/lib/init-voice')
      return makeFavouritesTransfer(library.favourites, makeInitDx7Voice())
    } catch {
      setDialogLoadError(t('favourites.sendUnavailable'))
      return null
    }
  }

  const favouritesSentStatus = ({
    initCount,
    leftOutCount,
  }: ReturnType<typeof makeFavouritesTransfer>) =>
    initCount > 0
      ? t('favourites.sentWithInit', { count: initCount })
      : leftOutCount > 0
        ? t('favourites.sentLeftOut', { count: leftOutCount })
        : t('favourites.sent')

  const closeSendGuide = () => {
    setSendGuide(null)
    sendButtonRef.current?.focus()
  }

  const sendSelectedBank = () => {
    if (!midi.hasMidiOutput) {
      trackAnalyticsEvent({
        data: { reason: 'no_output' },
        name: 'bank_transfer_failed',
      })
      setSendGuide('midi-required')
      return
    }
    if (!midi.sysexAvailable) {
      trackAnalyticsEvent({ data: { reason: 'sysex_unavailable' }, name: 'bank_transfer_failed' })
      setSendGuide('bank-selection')
      return
    }
    if (sendsByPresetWrite) {
      setDialogLoadError('')
      setFm1VaWrite({ sendBank: destinationBank })
      return
    }
    if (shouldShowFm1BankSelectionDialog()) {
      setSendGuide('bank-selection')
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
    let archive: typeof import('@/lib/dx7-bank-archive')
    try {
      archive = await import('@/lib/dx7-bank-archive')
    } catch {
      setIsImporting(false)
      event.target.value = ''
      setDialogLoadError(t('banks.bankFileUnavailable'))
      return
    }
    try {
      const fileBanks = await archive.readDx7BankArchive(file)
      setImportError('')
      const [only] = fileBanks
      if (fileBanks.length > 1 || !only.voices) {
        setBankPendingImport({
          bank: importTarget,
          file,
          name: bankDisplayName(importTarget),
          opener: emptyBankImportOpenerRef.current,
        })
        return
      }
      library.importBank(importTarget, only.voices)
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
  const showsFavourites = !isSearching && destinationBank === favouritesBank
  const favouriteCount = library.favourites.length
  const canSendDestination = showsFavourites ? favouriteCount > 0 : isDestinationBankLoaded
  // A bank holds 32 DX7 voices, so the destination instructions say before sending what Favourites
  // becomes on the FM1, or that a bank's Virtual Analog and 8-Bit presets become INIT VOICE.
  const destinationInitVoiceCount = showsFavourites ? 0 : initVoiceCount(destinationBank)
  const bankTransferNote = showsFavourites
    ? favouriteCount === 0 || favouriteCount === dx7BankVoiceCount
      ? undefined
      : favouriteCount < dx7BankVoiceCount
        ? t('favourites.initNote', { count: dx7BankVoiceCount - favouriteCount })
        : t('favourites.leftOutNote', { count: favouriteCount - dx7BankVoiceCount })
    : destinationInitVoiceCount > 0
      ? t('banks.virtualAnalogInitNote', { count: destinationInitVoiceCount })
      : undefined

  const visiblePatches = useMemo(() => {
    // A search looks through every loaded bank, so a result keeps showing while another is played.
    if (isSearching) {
      return patches.filter(
        (patch) => library.loadedBanks.includes(patch.bank) && patchMatchesSearch(patch, search),
      )
    }
    if (!isDestinationBankLoaded && destinationBank !== favouritesBank) return []
    return patches.filter((patch) => patch.bank === destinationBank)
  }, [destinationBank, isDestinationBankLoaded, isSearching, library.loadedBanks, patches, search])

  // A drag moves every slot it passes, which the user has just watched, so each move starts the
  // comparison afresh rather than lighting them all.
  const [moveCount, setMoveCount] = useState(0)
  const slotSounds = useMemo(
    () =>
      new Map(
        visiblePatches.map((patch) => [
          patch.id,
          [
            library.voices[patch.id],
            library.effects[patch.id],
            library.records[patch.id],
            library.virtualAnalog[patch.id],
            library.eightBit[patch.id],
          ],
        ]),
      ),
    [
      library.effects,
      library.eightBit,
      library.records,
      library.virtualAnalog,
      library.voices,
      visiblePatches,
    ],
  )
  const changedSlots = useChangedSlots(
    `${isSearching ? `search:${search}` : destinationBank}:${moveCount}`,
    slotSounds,
  )

  // Worked out once per change rather than for every card on every render: a search can show 320
  // cards, and each sound key hashes the voice and its record. Only a visible card asks.
  const favouriteSlots = useMemo(
    () =>
      new Set(
        visiblePatches
          .filter(({ id }) => {
            const voice = library.voices[id]
            return (
              voice &&
              library.favouriteKeys.has(soundKey(voice, library.effects[id], library.records[id]))
            )
          })
          .map(({ id }) => id),
      ),
    [library.effects, library.favouriteKeys, library.records, library.voices, visiblePatches],
  )
  const isFavourite = (patch: Patch) => favouriteSlots.has(patch.id)

  // A lit heart is the confirmation of an addition, so only taking a sound out says so, with Undo,
  // since the favourite taken out may be an edited copy found nowhere else.
  const announceFavourite = (
    name: string,
    { added, changed }: ReturnType<LibrarianLibrary['toggleFavourite']>,
  ) => {
    if (changed && !added) {
      toast.success(t('favourites.removed', { patch: name }), undoToastOptions(t, library, changed))
    }
  }

  const toggleFavourite = (patch: Patch) =>
    announceFavourite(patch.name, library.toggleFavourite(patch.id))

  // A slot dropped on Favourites is only ever added, and no heart lights where the drop landed, so a
  // drop always says what it did.
  const dropOnFavourites = (patch: Patch) => {
    if (isFavourite(patch)) {
      toast.success(t('favourites.alreadyAdded', { patch: patch.name }))
      return
    }
    if (library.toggleFavourite(patch.id).added) {
      toast.success(t('favourites.added', { patch: patch.name }))
    }
  }

  const favouriteOrigins = useMemo(
    () =>
      new Map<string, FavouriteOrigin | undefined>(
        library.favourites.map((favourite) => [favouritePatchId(favourite.id), favourite.origin]),
      ),
    [library.favourites],
  )
  const favouriteOrigin = (patch: Patch) => {
    const origin = favouriteOrigins.get(patch.id)
    if (!origin) return undefined
    return 'bankName' in origin
      ? origin.bankName || undefined
      : defaultWorkspaceBankTitle(t, origin.bankNumber)
  }

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
    if (!banks.includes(destinationBank) && destinationBank !== favouritesBank) {
      setDestinationBank(banks[0] ?? 'A')
    }
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
          {t('namedBanks.saveMenu')}
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
          onClick={(event) => {
            closeMenu()
            beginImport(bank, event.currentTarget)
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
            void downloadBank(bank)
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
            className={menuDangerItemClassName}
            onClick={(event) => {
              closeMenu()
              setBankPendingDeletion({
                bank,
                name: bankDisplayName(bank),
                opener: menuToggleOf(event.currentTarget),
              })
            }}
            type="button"
          >
            <Trash2 className="size-4" />
            {t('banks.deleteBankMenu')}
          </button>
        ) : null}
      </>
    )
  }

  return (
    <section className="mx-auto grid max-w-7xl min-w-0 gap-5 px-3 pt-2.5 pb-4 sm:px-5 sm:pb-6 lg:px-8">
      {SentryVerificationButton ? (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <SentryVerificationButton />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      <PatchGrid
        activePatchId={activePatchId}
        actions={
          <>
            {/* The selected bank reads back as a lit slot, as on the panel. */}
            {/* The rail drops bank names on narrow screens, so here the name takes
                its own line above the buttons rather than disappearing too. */}
            <span className="flex w-full min-w-0 items-center gap-[9px] md:mr-1.5 md:w-auto md:shrink-0">
              {/* Results come from every bank, so no bank's letter, name, or menu shows. */}
              {isSearching ? null : showsFavourites ? (
                <span className="grid h-[26px] w-[26px] shrink-0 place-items-center border border-[var(--crt-led)] bg-[var(--crt-bg-1)] text-[var(--crt-led)]">
                  <PixelHeartIcon aria-hidden="true" className="size-3.5" filled />
                </span>
              ) : (
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
              {/* Favourites has no bank actions: it is not a bank a file or saved bank fills. */}
              <details
                className={cn(
                  'group relative ml-auto shrink-0 md:hidden',
                  (isSearching || showsFavourites) && 'hidden',
                )}
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
                  {showsFavourites
                    ? null
                    : renderBankActions({ id: destinationBank }, () =>
                        bankMenuRef.current?.removeAttribute('open'),
                      )}
                </div>
              </details>
            </span>
            <button
              className={cn(
                'crt-raised-lit inline-flex h-8 flex-auto shrink-0 cursor-pointer items-center justify-center gap-2 bg-[var(--crt-btn)] px-3 text-xs font-semibold tracking-[0.08em] whitespace-nowrap text-white transition-colors hover:bg-[var(--crt-btn-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:pointer-events-none md:ml-auto md:flex-none',
                // A barber pole while the bank is on its way, rather than the dimmed look of a
                // button that cannot be used.
                isSending ? 'barber-pole' : 'disabled:opacity-50',
              )}
              disabled={isSending || isSearching || !canSendDestination}
              onClick={sendSelectedBank}
              ref={sendButtonRef}
              title={
                isSearching
                  ? t('banks.sendFromSearch')
                  : !midi.hasMidiOutput
                    ? t('midi.connectFirst')
                    : showsFavourites
                      ? favouriteCount === 0
                        ? t('favourites.addFirst')
                        : sendsByPresetWrite
                          ? t('fm1VaSend.favouritesTooltip')
                          : t('favourites.sendTitle')
                      : !isDestinationBankLoaded
                        ? t('banks.importFirst', { bank: bankDisplayName(destinationBank) })
                        : sendsByPresetWrite
                          ? t('fm1VaSend.bankTooltip')
                          : t('banks.sendTitle')
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
            <div className="menu-surface absolute top-full right-0 z-50 mt-1 w-90 max-w-[calc(100vw-2rem)] border-t-2 border-r-2 border-b-2 border-l-2 border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel2)] p-1 text-[var(--crt-ink)]">
              {/* The backup comes first: it is the only copy of FM1 effects and saved banks. */}
              <div aria-labelledby={backupMenuHeadingId} role="group">
                <p className={menuHeadingClassName} id={backupMenuHeadingId}>
                  {t('backup.menuHeading')}
                </p>
                <button
                  aria-describedby={lastBackupTime ? lastBackupId : undefined}
                  aria-label={t('backup.download')}
                  className={menuItemWithHintClassName}
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
                  <HardDriveDownload className={menuHintedIconClassName} />
                  <span className="grid">
                    <span>{t('backup.download')}</span>
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
                  <HardDriveUpload className="size-4 shrink-0" />
                  {t('backup.restore')}
                </button>
              </div>
              {/* DX7 banks for other tools go out, and FM-1+VA's own file comes in. */}
              <div aria-labelledby={otherFilesMenuHeadingId} className="mt-1" role="group">
                <p className={menuHeadingClassName} id={otherFilesMenuHeadingId}>
                  {t('backup.menuOtherFiles')}
                </p>
                <button
                  aria-describedby={sysexContentsId}
                  aria-label={t('banks.downloadAll')}
                  className={menuItemWithHintClassName}
                  disabled={library.loadedBanks.length === 0}
                  onClick={() => {
                    allBanksMenuRef.current?.removeAttribute('open')
                    void downloadAllBanks()
                  }}
                  type="button"
                >
                  <FileMusic className={menuHintedIconClassName} />
                  <span className="grid">
                    <span>{t('banks.downloadAll')}</span>
                    <span className="text-xs text-[var(--crt-ink-3)]" id={sysexContentsId}>
                      {t('backup.sysexContents')}
                    </span>
                  </span>
                </button>
                <button
                  className={menuItemClassName}
                  onClick={() => {
                    allBanksMenuRef.current?.removeAttribute('open')
                    setDialogLoadError('')
                    setFm1VaImportSource('file')
                  }}
                  type="button"
                >
                  <Upload className="size-4 shrink-0" />
                  {t('fm1VaImport.menuItem')}
                </button>
              </div>
              {/* Reading and writing the FM1's presets need Baud Girl's firmware, so they show only
                  while the FM1 runs it, together under her name. */}
              {hasFm1VaPresetCommands(midi.firmware) ? (
                <div aria-labelledby={baudGirlMenuHeadingId} className="mt-1" role="group">
                  <p className={menuHeadingClassName} id={baudGirlMenuHeadingId}>
                    {t('fm1VaImport.menuHeading')}
                  </p>
                  <button
                    className={menuItemClassName}
                    onClick={() => {
                      allBanksMenuRef.current?.removeAttribute('open')
                      setDialogLoadError('')
                      setFm1VaImportSource('fm1')
                    }}
                    type="button"
                  >
                    <Download className="size-4 shrink-0" />
                    {t('fm1VaImport.menuRead')}
                  </button>
                  <button
                    className={menuItemClassName}
                    onClick={() => {
                      allBanksMenuRef.current?.removeAttribute('open')
                      setDialogLoadError('')
                      setFm1VaWrite({})
                    }}
                    type="button"
                  >
                    <Send className="size-4 shrink-0" />
                    {t('fm1VaWrite.menuItem')}
                  </button>
                </div>
              ) : null}
              <div className="my-1 border-t" />
              <button
                className={menuItemClassName}
                disabled={library.loadedBanks.length === 0}
                onClick={() => {
                  allBanksMenuRef.current?.removeAttribute('open')
                  setDialogLoadError('')
                  setIsFindingDuplicates(true)
                }}
                type="button"
              >
                <Files className="size-4 shrink-0" />
                {t('duplicates.menuItem')}
              </button>
              {/* Last, in the danger colour, as it replaces banks A to D. */}
              <button
                className={menuDangerItemClassName}
                onClick={() => {
                  allBanksMenuRef.current?.removeAttribute('open')
                  setIsRestoringFactoryBanks(true)
                }}
                type="button"
              >
                <RotateCcw className="size-4 shrink-0" />
                {t('banks.restoreAll')}
              </button>
            </div>
          </details>
        }
        bankLabel={bankDisplayName}
        focusRequest={slotFocusRequest}
        emptyState={
          showsFavourites ? (
            <div className="grid min-h-72 place-items-center border border-dashed border-[var(--crt-line)] bg-[var(--crt-bg-well)] p-6 text-center">
              <div className="max-w-md">
                <PixelHeartIcon
                  aria-hidden="true"
                  className="mx-auto size-10 text-[var(--crt-acc-dim)]"
                />
                <h3 className="font-dot-matrix mt-3 text-base font-bold tracking-[0.08em] text-[var(--crt-acc-lt)] uppercase">
                  {t('favourites.empty')}
                </h3>
                <p className="mt-1 text-xs leading-6 text-[var(--crt-ink-3)]">
                  {t('favourites.emptyHelp')}
                </p>
              </div>
            </div>
          ) : undefined
        }
        isBankLoaded={isDestinationBankLoaded || isSearching}
        isFavourite={isFavourite}
        isPatchDisabled={(patch) =>
          patch.bank !== favouritesBank && !library.loadedBanks.includes(patch.bank)
        }
        onImportEmptyBank={() => beginImport(destinationBank)}
        onLoadDemoBank={() => {
          library.loadDemoBank(destinationBank)
          toast.success(t('toasts.demoLoaded', { bank: bankDisplayName(destinationBank) }))
        }}
        onPatchCopy={requestCopy}
        onPatchDropOnBank={(patch, bank) =>
          bank === favouritesBank ? dropOnFavourites(patch) : requestCopy(patch, bank)
        }
        onPatchDownload={(patch) => void downloadPatch(patch)}
        // Importing a file puts it in a bank slot; Favourites takes sounds through their hearts.
        onPatchReplace={showsFavourites ? undefined : requestReplace}
        onPatchChangeToFm={showsFavourites ? undefined : requestChangeToFm}
        onPatchEdit={(patch) => {
          followPlayedPatch(patch)
          onEditPatch(patch)
        }}
        onPatchSelect={(patch) => {
          followPlayedPatch(patch)
          onSelectPatch(patch)
        }}
        onPatchMove={(patch, target) => {
          setMoveCount((count) => count + 1)
          if (patch.bank === favouritesBank) library.moveFavourite(patch.number, target.number)
          else library.moveVoice(patch.bank, patch.number, target.number)
        }}
        onPatchToggleFavourite={toggleFavourite}
        patchOrigin={showsFavourites ? favouriteOrigin : undefined}
        tagsEngines={midi.firmware.kind === 'fm1-va'}
        changedSlots={changedSlots}
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
                  favouriteKeys={library.favouriteKeys}
                  hasDamagedNamedBanks={library.hasDamagedNamedBanks}
                  namedBanks={library.namedBanks}
                  namedBanksLoadFailed={library.namedBanksLoadFailed}
                  onCopy={requestResultCopy}
                  onPlay={onPlaySearchResult}
                  onToggleFavourite={(sound, bankName) =>
                    announceFavourite(
                      sound.voice.name,
                      library.toggleFavouriteSound(sound, { bankName }),
                    )
                  }
                  search={search}
                  tagsEngines={midi.firmware.kind === 'fm1-va'}
                  workspaceEffects={library.effects}
                  workspaceRecords={library.records}
                  workspaceMatches={visiblePatches}
                  workspaceEightBit={library.eightBit}
                  workspaceVirtualAnalog={library.virtualAnalog}
                  workspaceVoices={library.voices}
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
                showsSelection={!isSearching && !showsFavourites}
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
              <FavouritesTab
                count={favouriteCount}
                onSelect={() => selectDestinationBank(favouritesBank)}
                selected={showsFavourites}
              />
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

      {transferError ? <ErrorNotice>{transferError}</ErrorNotice> : null}

      {dialogLoadError ? (
        <LoadFailedNotice
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3"
          message={dialogLoadError}
        />
      ) : null}

      {importError ? <ErrorNotice>{importError}</ErrorNotice> : null}

      {sendGuide === 'bank-selection' ? (
        <Fm1BankSelectionDialog
          isSending={isSending}
          midi={midi}
          note={bankTransferNote}
          onClose={closeSendGuide}
          onSend={() => void transferSelectedBank()}
        />
      ) : null}
      {sendGuide === 'midi-required' ? (
        <MidiConnectionRequiredDialog onClose={closeSendGuide} />
      ) : null}
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
      {isFindingDuplicates ? (
        <ErrorBoundary
          onError={() => {
            setIsFindingDuplicates(false)
            setDialogLoadError(t('duplicates.openFailed'))
          }}
        >
          <Suspense fallback={null}>
            <DuplicatePatchesDialog
              library={library}
              onClose={(chosen) => {
                setIsFindingDuplicates(false)
                if (!chosen) {
                  allBanksMenuRef.current?.querySelector('summary')?.focus()
                  return
                }
                // Going to a patch plays it, as clicking its slot does, so it is lit where it is.
                selectDestinationBank(chosen.bank)
                onSelectPatch(chosen)
                setSlotFocusRequest({ patchId: chosen.id })
              }}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {fm1VaImportSource ? (
        <ErrorBoundary
          onError={() => {
            setFm1VaImportSource(null)
            setDialogLoadError(t('fm1VaImport.openFailed'))
          }}
        >
          <Suspense fallback={null}>
            <ImportFm1VaPresetsDialog
              library={library}
              midi={midi}
              onClose={() => {
                setFm1VaImportSource(null)
                allBanksMenuRef.current?.querySelector('summary')?.focus()
              }}
              onPlay={onPlaySearchResult}
              source={fm1VaImportSource}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {fm1VaWrite ? (
        <ErrorBoundary
          onError={() => {
            setFm1VaWrite(null)
            setDialogLoadError(t('fm1VaWrite.openFailed'))
          }}
        >
          <Suspense fallback={null}>
            <WriteFm1VaPresetsDialog
              library={library}
              midi={midi}
              onClose={() => {
                setFm1VaWrite(null)
                if (fm1VaWrite.sendBank === undefined) {
                  allBanksMenuRef.current?.querySelector('summary')?.focus()
                } else {
                  sendButtonRef.current?.focus()
                }
              }}
              sendBank={fm1VaWrite.sendBank}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {bankPendingImport ? (
        <ErrorBoundary
          onError={() => {
            setBankPendingImport(null)
            setDialogLoadError(t('banks.bankFileUnavailable'))
          }}
        >
          <Suspense fallback={null}>
            <ImportDx7BankDialog
              bank={bankPendingImport.bank}
              bankName={bankPendingImport.name}
              initialFile={bankPendingImport.file}
              library={library}
              onClose={() => {
                setBankPendingImport(null)
                bankPendingImport.opener?.focus()
              }}
              // A file's patch has no FM1 effects, so it plays with the defaults, as a catalog
              // result does.
              onPlay={(voice) => onPlaySearchResult(voice, undefined)}
              replacing={!bankPendingImport.file}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {bankPendingDeletion ? (
        <DeleteWorkspaceBankDialog
          bankName={bankPendingDeletion.name}
          onClose={() => {
            setBankPendingDeletion(null)
            bankPendingDeletion.opener?.focus()
          }}
          onDelete={() => {
            const { bank } = bankPendingDeletion
            const replacement = workspaceBankAfterDeletion(banks, bank)
            crtSwitchOff(document.querySelector('[data-patch-grid]'))
            onBankDeleted(bank)
            const changed = library.deleteBank(bank)
            if (replacement) setDestinationBank(replacement)
            toast.success(
              t('toasts.bankDeleted', { bank: bankPendingDeletion.name }),
              undoToastOptions(t, library, changed),
            )
          }}
        />
      ) : null}
      {isRestoringFactoryBanks ? (
        <RestoreFactoryBanksDialog
          onClose={() => {
            setIsRestoringFactoryBanks(false)
            allBanksMenuRef.current?.querySelector('summary')?.focus()
          }}
          onRestore={async () => {
            const changed = await library.resetFactoryBanks()
            toast.success(t('toasts.banksRestored'), undoToastOptions(t, library, changed))
          }}
        />
      ) : null}
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
              onSwap={copyRequest.swap}
              onSwapped={(target, changed) => {
                toast.success(
                  t('toasts.patchesSwapped', {
                    patch: copyRequest.source.name,
                    target: target.name,
                  }),
                  undoToastOptions(t, library, changed),
                )
              }}
              source={copyRequest.source}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {changeToFmTarget ? (
        <ErrorBoundary
          key={changeToFmTarget.id}
          onError={() => {
            setChangeToFmTarget(null)
            setDialogLoadError(t('changeToFm.openFailed'))
          }}
        >
          <Suspense fallback={null}>
            <ChangeToFmDialog
              library={library}
              onChanged={(voice, changed) =>
                toast.success(
                  t('changeToFm.changed', {
                    patch: voice.name,
                    slot: patchSlotCode(changeToFmTarget),
                  }),
                  undoToastOptions(t, library, changed),
                )
              }
              onClose={() => setChangeToFmTarget(null)}
              patch={changeToFmTarget}
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
