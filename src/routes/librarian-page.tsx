import {
  Archive,
  Download,
  EllipsisVertical,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Upload,
} from 'lucide-react'
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PatchGrid } from '@/components/patches/patch-grid'
import { WorkspaceBankSelector } from '@/components/patches/workspace-bank-selector'
import { AddWorkspaceBankDialog } from '@/components/patches/add-workspace-bank-dialog'
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
import { SentryVerificationButton } from '@/components/sentry-verification-button'
import { makeDx7BankFile } from '@/lib/dx7'
import { reportBankTransferFailure } from '@/lib/monitoring'
import { getNextWorkspaceBank } from '@/lib/patch-library'
import { librarianShortcuts } from '@/lib/keyboard-shortcuts'
import { shouldShowFm1BankSelectionDialog } from '@/lib/session'
import { cn } from '@/lib/utils'
import { type MidiController } from '@/hooks/use-midi'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { type Patch } from '@/data/patches'
import { createBankFileSelectionTarget } from '@/lib/bank-file-selection'
import { useToast } from '@/components/ui/toast'
import { trackAnalyticsEvent } from '@/lib/analytics'

type TransferStatus = { kind: 'error' | 'idle' | 'success'; message: string }

type LibrarianPageProps = {
  activePatchId: string
  library: PatchLibrary
  midi: MidiController
  onEditPatch: (patch: Patch) => void
  onSelectPatch: (patch: Patch) => void
}

export function LibrarianPage({
  activePatchId,
  library,
  midi,
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
  const [isImporting, setIsImporting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [transferStatus, setTransferStatus] = useState<TransferStatus>({
    kind: 'idle',
    message: '',
  })
  const importInputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const importTargetRef = useRef(createBankFileSelectionTarget())
  const addWorkspaceBankDialogRef = useRef<HTMLDialogElement>(null)
  const importDx7BankDialogRef = useRef<HTMLDialogElement>(null)
  const bankSelectionDialogRef = useRef<HTMLDialogElement>(null)
  const deleteWorkspaceBankDialogRef = useRef<HTMLDialogElement>(null)
  const midiConnectionRequiredDialogRef = useRef<HTMLDialogElement>(null)
  const restoreFactoryBanksDialogRef = useRef<HTMLDialogElement>(null)
  const [bankPendingDeletion, setBankPendingDeletion] = useState<{
    bank: string
    name: string
    nextBank: string
  } | null>(null)
  const [bankPendingImport, setBankPendingImport] = useState<{
    bank: string
    name: string
  } | null>(null)
  const allBanksMenuRef = useDismissableDetails()
  // EDIT acts on the slot lit in the grid, which a click has already played on the FM1.
  const auditionedPatch = patches.find((patch) => patch.id === activePatchId)
  const isDestinationBankLoaded = library.loadedBanks.includes(destinationBank)
  const bankDisplayName = useWorkspaceBankLabel(library)
  const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
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
      saveBlob(
        new Blob([bytes], { type: 'application/octet-stream' }),
        `fm1-bank-${bank.toLowerCase()}.syx`,
      )
      setImportError('')
      trackAnalyticsEvent({ data: { scope: 'single' }, name: 'bank_exported' })
      toast.success(t('toasts.bankDownloadStarted', { bank: bankDisplayName(bank) }))
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t('banks.exportFailed'))
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
      saveBlob(new Blob([zipSync(files)], { type: 'application/zip' }), 'fm1-browser-banks.zip')
      setImportError('')
      trackAnalyticsEvent({ data: { scope: 'all' }, name: 'bank_exported' })
      toast.success(t('toasts.banksDownloadStarted'))
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t('banks.bulkExportFailed'))
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
        message: error instanceof Error ? error.message : t('banks.notSent'),
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
      setImportError(error instanceof Error ? error.message : t('banks.importFailed'))
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  const visiblePatches = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!isDestinationBankLoaded) return []
    return patches.filter(
      (patch) =>
        patch.bank === destinationBank &&
        (!query ||
          `${patch.bank}${patch.number} ${patch.name} ${patch.family}`
            .toLowerCase()
            .includes(query)),
    )
  }, [destinationBank, isDestinationBankLoaded, patches, search])

  useEffect(() => {
    if (!isDestinationBankLoaded) setSearch('')
  }, [isDestinationBankLoaded])

  useEffect(() => {
    if (!banks.includes(destinationBank)) setDestinationBank(banks[0] ?? 'A')
  }, [banks, destinationBank])

  const focusSearch = () => {
    searchRef.current?.focus()
    searchRef.current?.select()
  }

  useKeyboardShortcuts([
    // Both are disabled with the field itself, so the browser keeps its own
    // find shortcut in a bank that has nothing to search.
    { ...librarianShortcuts.search, enabled: isDestinationBankLoaded, onTrigger: focusSearch },
    { ...librarianShortcuts.find, enabled: isDestinationBankLoaded, onTrigger: focusSearch },
    {
      ...librarianShortcuts.clearSearch,
      enabled: search !== '',
      onTrigger: () => setSearch(''),
    },
  ])

  return (
    <section className="mx-auto grid max-w-7xl min-w-0 gap-5 px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <SentryVerificationButton />
      <PatchGrid
        activePatchId={activePatchId}
        actions={
          <>
            {/* The selected bank reads back as a lit slot, as on the panel. */}
            <span className="mr-1.5 flex shrink-0 items-center gap-[9px]">
              <span className="font-dot-matrix grid h-6 w-[26px] place-items-center border border-[var(--crt-led)] bg-[var(--crt-bg-1)] text-sm font-bold text-[var(--crt-led)]">
                {destinationBank}
              </span>
              <span className="font-dot-matrix hidden max-w-40 truncate text-[13px] font-bold tracking-[0.1em] text-[var(--crt-led)] sm:block">
                {bankDisplayName(destinationBank)}
              </span>
            </span>
            <button
              className="crt-raised-lit inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 bg-[var(--crt-btn)] px-3 text-xs font-semibold tracking-[0.08em] text-white transition-colors hover:bg-[var(--crt-btn-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:pointer-events-none disabled:opacity-50"
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
              {isSending ? t('banks.sending') : t('banks.send')}
            </button>
            {/* EDIT burns in the slot LED's amber and names the lit slot, so it reads
                as acting on that sound rather than on the bank like its neighbours. */}
            <button
              className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 border border-[var(--crt-led)] bg-[var(--crt-bg-1)] px-3 text-xs font-semibold tracking-[0.08em] text-[var(--crt-led)] shadow-[0_0_8px_var(--crt-led-glow)] transition-colors hover:bg-[var(--crt-led)] hover:text-[var(--crt-bg-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:pointer-events-none disabled:border-[var(--crt-line-lt2)] disabled:text-[var(--crt-ink-2)] disabled:opacity-50 disabled:shadow-none"
              disabled={!auditionedPatch}
              onClick={() => auditionedPatch && onEditPatch(auditionedPatch)}
              title={
                auditionedPatch
                  ? t('banks.openEditor', { name: auditionedPatch.name })
                  : t('banks.editNone')
              }
              type="button"
            >
              <Pencil aria-hidden="true" className="size-3.5" />
              {t('banks.editSelected')}
              {auditionedPatch && ' '}
              {/* The slot code keeps its width while nothing is lit, so selecting a
                  slot cannot rewrap the toolbar and move the grid under the pointer
                  between the two clicks of a double click. */}
              <span
                aria-hidden={auditionedPatch ? undefined : true}
                className={cn(
                  'font-dot-matrix text-[13px] font-bold tracking-[0.1em]',
                  !auditionedPatch && 'invisible',
                )}
              >
                {auditionedPatch
                  ? `${auditionedPatch.bank}${auditionedPatch.number.toString().padStart(2, '0')}`
                  : 'A00'}
              </span>
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
        isBankLoaded={isDestinationBankLoaded}
        isPatchDisabled={(patch) => !library.loadedBanks.includes(patch.bank)}
        onImportEmptyBank={() => beginImport(destinationBank)}
        onLoadDemoBank={() => {
          library.loadDemoBank(destinationBank)
          toast.success(t('toasts.demoLoaded', { bank: bankDisplayName(destinationBank) }))
        }}
        onPatchEdit={onEditPatch}
        onPatchSelect={onSelectPatch}
        onPatchMove={(patch, target) => library.moveVoice(patch.bank, patch.number, target.number)}
        patches={visiblePatches}
        search={search}
        searchDisabled={!isDestinationBankLoaded}
        searchRef={searchRef}
        setSearch={setSearch}
        toolbar={
          <>
            <div className="flex h-full w-16 flex-col border-r-2 border-[var(--crt-shadow)] bg-[var(--crt-bg-panel)] sm:w-[226px]">
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
                onSelect={setDestinationBank}
                renderActions={(selectedBank, closeMenu) => {
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
                        {isImporting ? t('banks.importing') : t('banks.import')}
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
                            const name = bankDisplayName(bank)
                            const replacementBank = banks[index + 1] ?? banks[index - 1]
                            if (!replacementBank) return
                            setBankPendingDeletion({
                              bank,
                              name,
                              nextBank: replacementBank,
                            })
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
                }}
                selectedBank={destinationBank}
              />
              {nextBank ? (
                <button
                  aria-label={t('banks.addBank')}
                  className="font-dot-matrix mx-2 mb-2 flex cursor-pointer items-center justify-center gap-2 border-t border-r border-b border-l border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] px-2 py-[7px] text-[14px] font-bold text-[var(--crt-ink-2)] transition-colors hover:bg-[var(--crt-sel-bg)] hover:text-[var(--crt-acc-lt)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--crt-led)] sm:justify-start"
                  onClick={() => addWorkspaceBankDialogRef.current?.showModal()}
                  title={t('banks.addBank')}
                  type="button"
                >
                  <Plus className="size-4 shrink-0" />
                  <span className="hidden sm:inline">{t('banks.addBank')}</span>
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
      <AddWorkspaceBankDialog
        bank={nextBank}
        dialogRef={addWorkspaceBankDialogRef}
        library={library}
        onCreated={setDestinationBank}
        suggestedName={defaultWorkspaceBankTitle(t, banks.length + 1)}
      />
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
          setDestinationBank(bankPendingDeletion.nextBank)
          library.deleteBank(bankPendingDeletion.bank)
          toast.success(t('toasts.bankDeleted', { bank: bankPendingDeletion.name }))
          setBankPendingDeletion(null)
        }}
      />
      <RestoreFactoryBanksDialog
        dialogRef={restoreFactoryBanksDialogRef}
        onRestore={async () => {
          await library.resetFactoryBanks()
          toast.success(t('toasts.banksRestored'))
        }}
      />
    </section>
  )
}
