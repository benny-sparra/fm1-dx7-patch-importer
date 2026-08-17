import {
  Archive,
  Download,
  EllipsisVertical,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Upload,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PatchGrid } from '@/components/patches/patch-grid'
import { AddWorkspaceBankDialog } from '@/components/patches/add-workspace-bank-dialog'
import { BankInformationDialog } from '@/components/patches/bank-information-dialog'
import { DeleteWorkspaceBankDialog } from '@/components/patches/delete-workspace-bank-dialog'
import { ImportDx7BankDialog } from '@/components/patches/import-dx7-bank-dialog'
import { RestoreFactoryBanksDialog } from '@/components/patches/restore-factory-banks-dialog'
import { Fm1BankSelectionDialog } from '@/components/midi/fm1-bank-selection-dialog'
import { MidiConnectionRequiredDialog } from '@/components/midi/midi-connection-required-dialog'
import { makeDx7BankFile } from '@/lib/dx7'
import { getNextWorkspaceBank } from '@/lib/patch-library'
import { shouldShowFm1BankSelectionDialog } from '@/lib/session'
import { cn } from '@/lib/utils'
import { type MidiController } from '@/hooks/use-midi'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { type Patch } from '@/data/patches'
import { createBankFileSelectionTarget } from '@/lib/bank-file-selection'
import { useToast } from '@/components/ui/toast'

type TransferStatus = { kind: 'error' | 'idle' | 'success'; message: string }

function defaultWorkspaceBankTitle(
  t: ReturnType<typeof useTranslation>['t'],
  bankNumber: number,
) {
  return t(bankNumber < 10 ? 'banks.bank' : 'banks.bankShort', { bank: bankNumber })
}

type WorkspaceBankTabProps = {
  bank: string
  description: string
  index: number
  name: string
  onSelect: () => void
  onSelectFromKeyboard: (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => void
  renderMenu: (closeMenu: () => void) => ReactNode
  selected: boolean
}

function WorkspaceBankTab({
  bank,
  description,
  index,
  name,
  onSelect,
  onSelectFromKeyboard,
  renderMenu,
  selected,
}: WorkspaceBankTabProps) {
  const { t } = useTranslation()
  const defaultName = defaultWorkspaceBankTitle(t, index + 1)
  const displayName = name || defaultName
  const menuRef = useDismissableDetails()
  const closeMenu = () => menuRef.current?.removeAttribute('open')

  useEffect(() => {
    if (selected) return
    menuRef.current?.removeAttribute('open')
  }, [menuRef, selected])

  return (
    <div
      className={cn(
        'relative -mr-px flex w-full items-center gap-1 whitespace-nowrap border-y border-l-4 border-r px-2 py-2 transition-colors',
        selected
          ? 'bank-tab-active z-10 border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-transparent text-foreground/80 hover:border-y-border hover:border-l-border hover:bg-muted/60 hover:text-foreground',
      )}
      role="presentation"
    >
      <button
        aria-selected={selected}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        id={`bank-tab-${bank}`}
        onClick={onSelect}
        onKeyDown={(event) => onSelectFromKeyboard(event, index)}
        role="tab"
        tabIndex={selected ? 0 : -1}
        title={description || displayName}
        type="button"
      >
        <span className="font-vt323 grid size-8 shrink-0 place-items-center rounded border border-current/50 text-base font-bold">
          {bank}
        </span>
        <span className="font-dot-matrix hidden min-w-0 flex-1 truncate px-2 py-1 text-left text-base font-bold sm:block">
          {displayName}
        </span>
      </button>
      <details className="group relative shrink-0" ref={menuRef}>
        <summary
          aria-label={t('banks.bankMenu', { bank: displayName })}
          className={cn(
            'grid size-8 cursor-pointer list-none place-items-center rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring [&::-webkit-details-marker]:hidden',
            selected ? 'hover:bg-primary-foreground/15' : 'hover:bg-foreground/10',
          )}
          title={t('banks.bankMenu', { bank: displayName })}
        >
          <EllipsisVertical className="size-4" />
        </summary>
        <div className="font-vt323 absolute left-full top-0 z-40 min-w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
          {renderMenu(closeMenu)}
        </div>
      </details>
    </div>
  )
}

type LibrarianPageProps = {
  activePatchId: string
  library: PatchLibrary
  midi: MidiController
  onEditPatch: (patch: Patch) => void
}

export function LibrarianPage({
  activePatchId,
  library,
  midi,
  onEditPatch,
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
  const [transferStatus, setTransferStatus] = useState<TransferStatus>({ kind: 'idle', message: '' })
  const importInputRef = useRef<HTMLInputElement>(null)
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
  const isDestinationBankLoaded = library.loadedBanks.includes(destinationBank)
  const bankDisplayName = (bank: string) => library.bankNames[bank]
    ?? defaultWorkspaceBankTitle(t, banks.indexOf(bank) + 1)
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
      const index = banks.indexOf(bank)
      setBankPendingImport({
        bank,
        name: library.bankNames[bank] ?? defaultWorkspaceBankTitle(t, index + 1),
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
      saveBlob(new Blob([bytes], { type: 'application/octet-stream' }), `fm1-bank-${bank.toLowerCase()}.syx`)
      setImportError('')
      toast.success(t('toasts.bankDownloadStarted', { bank: bankDisplayName(bank) }))
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t('banks.exportFailed'))
    }
  }

  const downloadAllBanks = async () => {
    try {
      const { zipSync } = await import('fflate')
      const files = Object.fromEntries(library.loadedBanks.map((bank) => [
        `fm1-bank-${bank.toLowerCase()}.syx`,
        makeDx7BankFile(library.getBankVoices(bank)),
      ]))
      saveBlob(new Blob([zipSync(files)], { type: 'application/zip' }), 'fm1-browser-banks.zip')
      setImportError('')
      toast.success(t('toasts.banksDownloadStarted'))
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t('banks.bulkExportFailed'))
    }
  }

  const visiblePatches = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!isDestinationBankLoaded) return []
    return patches.filter((patch) => patch.bank === destinationBank && (
      !query || `${patch.bank}${patch.number} ${patch.name} ${patch.family}`
        .toLowerCase()
        .includes(query)
    ))
  }, [destinationBank, isDestinationBankLoaded, patches, search])

  useEffect(() => {
    if (!isDestinationBankLoaded) setSearch('')
  }, [isDestinationBankLoaded])

  useEffect(() => {
    if (!banks.includes(destinationBank)) setDestinationBank(banks[0] ?? 'A')
  }, [banks, destinationBank])

  const selectBankFromKeyboard = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const nextIndex = event.key === 'ArrowDown' ? (index + 1) % banks.length
      : event.key === 'ArrowUp' ? (index - 1 + banks.length) % banks.length
        : event.key === 'Home' ? 0
          : event.key === 'End' ? banks.length - 1
            : null

    if (nextIndex === null) return
    event.preventDefault()
    setDestinationBank(banks[nextIndex])
    document.getElementById(`bank-tab-${banks[nextIndex]}`)?.focus()
  }

  return (
    <section
      className="mx-auto grid min-w-0 max-w-7xl gap-5 px-3 py-4 sm:px-5 sm:py-6 lg:px-8"
    >
      <PatchGrid
        activePatchId={activePatchId}
        actions={
          <button
              className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-black bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              disabled={isSending || !isDestinationBankLoaded}
              onClick={async () => {
                if (!midi.hasMidiOutput) {
                  midiConnectionRequiredDialogRef.current?.showModal()
                  return
                }
                if (shouldShowFm1BankSelectionDialog()) {
                  bankSelectionDialogRef.current?.showModal()
                }
                setIsSending(true)
                setTransferStatus({ kind: 'idle', message: t('banks.sendingStatus') })
                try {
                  const sent = await midi.sendBank(destinationBank, library.getBankVoices(destinationBank))
                  setTransferStatus(sent
                    ? { kind: 'success', message: t('banks.sentStatus', { bank: destinationBank }) }
                    : { kind: 'error', message: t('banks.notSent') })
                  if (sent) toast.success(t('banks.sentStatus', { bank: destinationBank }))
                } finally {
                  setIsSending(false)
                }
              }}
              title={!midi.hasMidiOutput ? t('midi.connectFirst') : isDestinationBankLoaded ? t('banks.sendTitle') : t('banks.importFirst', { bank: destinationBank })}
              type="button"
            >
              <Send className="size-4" />
              {isSending ? t('banks.sending') : t('banks.send')}
          </button>
        }
        headerActions={(
          <details className="group relative" ref={allBanksMenuRef}>
            <summary
              aria-label={t('banks.moreActions')}
              className="grid size-9 cursor-pointer list-none place-items-center rounded text-black/75 transition-colors hover:bg-black/10 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black [&::-webkit-details-marker]:hidden"
              title={t('banks.moreActions')}
            >
              <EllipsisVertical className="size-5" />
            </summary>
            <div className="font-vt323 absolute right-0 top-full z-50 mt-1 min-w-60 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
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
        )}
        isBankLoaded={isDestinationBankLoaded}
        isPatchDisabled={(patch) => !library.loadedBanks.includes(patch.bank)}
        onImportEmptyBank={() => beginImport(destinationBank)}
        onLoadDemoBank={() => {
          library.loadDemoBank(destinationBank)
          toast.success(t('toasts.demoLoaded', { bank: bankDisplayName(destinationBank) }))
        }}
        onPatchEdit={onEditPatch}
        onPatchMove={(patch, target) => library.moveVoice(patch.bank, patch.number, target.number)}
        patches={visiblePatches}
        search={search}
        searchDisabled={!isDestinationBankLoaded}
        setSearch={setSearch}
        toolbar={
          <>
            <div className="flex h-full w-16 flex-col bg-muted/30 sm:w-72">
              <div
                aria-label={t('banks.destination')}
                aria-orientation="vertical"
                className="flex flex-col"
                role="tablist"
              >
                {banks.map((bank, index) => (
                  <WorkspaceBankTab
                    bank={bank}
                    description={library.bankDescriptions[bank] ?? ''}
                    index={index}
                    key={bank}
                    name={library.bankNames[bank] ?? ''}
                    onSelect={() => setDestinationBank(bank)}
                    onSelectFromKeyboard={selectBankFromKeyboard}
                    renderMenu={(closeMenu) => (
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
                          title={library.loadedBanks.includes(bank) ? t('banks.downloadTitle', { bank }) : t('banks.importFirst', { bank })}
                          type="button"
                        >
                          <Download className="size-4" />
                          {t('banks.download')}
                        </button>
                        {banks.length > 1 ? (
                          <button
                            className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-accent"
                            onClick={() => {
                              closeMenu()
                              const name = library.bankNames[bank] ?? defaultWorkspaceBankTitle(t, index + 1)
                              setBankPendingDeletion({
                                bank,
                                name,
                                nextBank: banks[index + 1] ? bank : banks[index - 1],
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
                    )}
                    selected={destinationBank === bank}
                  />
                ))}
              </div>
              {nextBank ? (
                <button
                  aria-label={t('banks.addBank')}
                  className="font-vt323 flex w-full cursor-pointer items-center justify-center gap-2 border-t border-dashed px-2 py-3 text-base text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring sm:justify-start sm:px-4"
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
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                const importTarget = importTargetRef.current.consume()
                if (!importTarget) return
                setIsImporting(true)
                try {
                  await library.importBank(importTarget, file)
                  setImportError('')
                  toast.success(t('toasts.bankImported', { bank: bankDisplayName(importTarget) }))
                } catch (error) {
                  setImportError(error instanceof Error ? error.message : t('banks.importFailed'))
                } finally {
                  setIsImporting(false)
                  event.target.value = ''
                }
              }}
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
            transferStatus.kind === 'success' && 'text-emerald-700',
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

      <Fm1BankSelectionDialog dialogRef={bankSelectionDialogRef} />
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
        onRestore={() => {
          library.resetFactoryBanks()
          toast.success(t('toasts.banksRestored'))
        }}
      />
    </section>
  )
}
