import {
  Archive,
  ChevronDown,
  Download,
  RotateCcw,
  Send,
  Trash2,
  Upload,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PatchGrid } from '@/components/patches/patch-grid'
import { RestoreFactoryBanksDialog } from '@/components/patches/restore-factory-banks-dialog'
import { Fm1BankSelectionDialog } from '@/components/midi/fm1-bank-selection-dialog'
import { MidiConnectionRequiredDialog } from '@/components/midi/midi-connection-required-dialog'
import { makeDx7BankFile } from '@/lib/dx7'
import { shouldShowFm1BankSelectionDialog } from '@/lib/session'
import { cn } from '@/lib/utils'
import { type MidiController } from '@/hooks/use-midi'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { type Patch } from '@/data/patches'
import { makeBankFingerprint } from '@/lib/patch-library'

const banks = ['A', 'B', 'C', 'D']
type TransferStatus = { kind: 'error' | 'idle' | 'success'; message: string }

type LibrarianPageProps = {
  activePatchId: string
  library: PatchLibrary
  midi: MidiController
  onBankTransferred: (bank: string, fingerprint: string) => void
  onEditPatch: (patch: Patch) => void
  onPatchAuditioned: (patch: Patch) => void
  transferredBankFingerprints: Record<string, string>
}

export function LibrarianPage({
  activePatchId,
  library,
  midi,
  onBankTransferred,
  onEditPatch,
  onPatchAuditioned,
  transferredBankFingerprints,
}: LibrarianPageProps) {
  const { t } = useTranslation()
  const { patches } = library
  const [search, setSearch] = useState('')
  const [destinationBank, setDestinationBank] = useState('A')
  const [importError, setImportError] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [transferStatus, setTransferStatus] = useState<TransferStatus>({ kind: 'idle', message: '' })
  const importInputRef = useRef<HTMLInputElement>(null)
  const importMenuRef = useDismissableDetails()
  const bankSelectionDialogRef = useRef<HTMLDialogElement>(null)
  const midiConnectionRequiredDialogRef = useRef<HTMLDialogElement>(null)
  const restoreFactoryBanksDialogRef = useRef<HTMLDialogElement>(null)
  const isDestinationBankLoaded = library.loadedBanks.includes(destinationBank)
  const bankFingerprints = useMemo(
    () => Object.fromEntries(library.loadedBanks.map((bank) => [
      bank,
      makeBankFingerprint(library.getBankVoices(bank)),
    ])),
    [library.getBankVoices, library.loadedBanks, library.voices],
  )

  const bankTransferLabel = (bank: string) => {
    if (!library.loadedBanks.includes(bank)) return t('banks.empty')
    const transferred = transferredBankFingerprints[bank]
    if (!transferred) return t('banks.localOnly')
    return transferred === bankFingerprints[bank] ? t('banks.transferred') : t('banks.changed')
  }

  const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }

  const downloadBank = () => {
    try {
      const bytes = makeDx7BankFile(library.getBankVoices(destinationBank))
      saveBlob(new Blob([bytes], { type: 'application/octet-stream' }), `fm1-bank-${destinationBank.toLowerCase()}.syx`)
      setImportError('')
      importMenuRef.current?.removeAttribute('open')
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
      importMenuRef.current?.removeAttribute('open')
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

  const selectBankFromKeyboard = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % banks.length
      : event.key === 'ArrowLeft' ? (index - 1 + banks.length) % banks.length
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
          <>
            <div className="inline-flex h-10 shrink-0 rounded-md border border-input bg-background">
              <button
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-l-[calc(var(--radius-md)-1px)] px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                disabled={isImporting}
                onClick={() => importInputRef.current?.click()}
                type="button"
              >
                <Upload className="size-4" />
                {isImporting ? t('banks.importing') : t('banks.import')}
              </button>
              <details className="group relative" ref={importMenuRef}>
                <summary
                  aria-label={t('banks.moreActions')}
                  className="flex h-full w-9 cursor-pointer list-none items-center justify-center rounded-r-[calc(var(--radius-md)-1px)] border-l border-input transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
                  title={t('banks.moreActions')}
                >
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="absolute left-0 top-11 z-30 min-w-52 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                    disabled={!isDestinationBankLoaded}
                    onClick={downloadBank}
                    title={isDestinationBankLoaded ? t('banks.downloadTitle', { bank: destinationBank }) : t('banks.importFirst', { bank: destinationBank })}
                    type="button"
                  >
                    <Download className="size-4" />
                    {t('banks.download')}
                  </button>
                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                    disabled={library.loadedBanks.length === 0}
                    onClick={() => void downloadAllBanks()}
                    type="button"
                  >
                    <Archive className="size-4" />
                    {t('banks.downloadAll')}
                  </button>
                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sm border-t px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      importMenuRef.current?.removeAttribute('open')
                      restoreFactoryBanksDialogRef.current?.showModal()
                    }}
                    type="button"
                  >
                    <RotateCcw className="size-4" />
                    {t('banks.restoreFactory')}
                  </button>
                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                    disabled={!isDestinationBankLoaded}
                    onClick={() => {
                      if (window.confirm(t('banks.clearConfirm', { bank: destinationBank }))) {
                        library.clearBank(destinationBank)
                        importMenuRef.current?.removeAttribute('open')
                      }
                    }}
                    type="button"
                  >
                    <RotateCcw className="size-4" />
                    {t('banks.clear')}
                  </button>
                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                    disabled={library.loadedBanks.length === 0}
                    onClick={() => {
                      if (window.confirm(t('banks.clearAllConfirm'))) {
                        void library.clearAllBanks()
                        importMenuRef.current?.removeAttribute('open')
                      }
                    }}
                    type="button"
                  >
                    <Trash2 className="size-4" />
                    {t('banks.clearAll')}
                  </button>
                </div>
              </details>
            </div>
            <button
              className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
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
                  if (sent) {
                    onBankTransferred(destinationBank, bankFingerprints[destinationBank])
                  }
                  setTransferStatus(sent
                    ? { kind: 'success', message: t('banks.sentStatus', { bank: destinationBank }) }
                    : { kind: 'error', message: t('banks.notSent') })
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
          </>
        }
        isBankLoaded={isDestinationBankLoaded}
        isPatchDisabled={(patch) => !library.loadedBanks.includes(patch.bank)}
        onImportEmptyBank={() => importInputRef.current?.click()}
        onLoadDemoBank={() => library.loadDemoBank(destinationBank)}
        onPatchSend={async (patch) => {
          const voice = library.voices[patch.id]
          if (!voice) return
          midi.sendProgramChange(patch.program)
          const sent = await midi.sendVoice(voice)
          if (sent) await midi.sendEffectSettings(library.effects[patch.id])
          if (sent) onPatchAuditioned(patch)
          setTransferStatus(sent
            ? { kind: 'success', message: t('banks.soundSent', { name: patch.name }) }
            : { kind: 'error', message: t('banks.soundNotSent') })
        }}
        onPatchEdit={onEditPatch}
        onPatchMove={(patch, target) => library.moveVoice(patch.bank, patch.number, target.number)}
        patches={visiblePatches}
        search={search}
        searchDisabled={!isDestinationBankLoaded}
        setSearch={setSearch}
        toolbar={
          <>
            <div
              aria-label={t('banks.destination')}
              className="scrollbar-none flex overflow-x-auto border-b"
              role="tablist"
            >
              {banks.map((bank, index) => (
                <button
                  aria-selected={destinationBank === bank}
                  className={cn(
                    'relative -mb-px min-w-24 flex-1 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring',
                    destinationBank === bank
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground',
                  )}
                  id={`bank-tab-${bank}`}
                  key={bank}
                  onClick={() => setDestinationBank(bank)}
                  onKeyDown={(event) => selectBankFromKeyboard(event, index)}
                  role="tab"
                  tabIndex={destinationBank === bank ? 0 : -1}
                  type="button"
                >
                  {t('banks.bank', { bank })}
                  <span className="block text-xs opacity-75">
                    {bankTransferLabel(bank)}
                  </span>
                </button>
              ))}
            </div>
            <input
              accept=".syx,application/octet-stream"
              aria-label={t('banks.importFile')}
              className="sr-only"
              disabled={isImporting}
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                setIsImporting(true)
                try {
                  await library.importBank(destinationBank, file)
                  setImportError('')
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
      <MidiConnectionRequiredDialog dialogRef={midiConnectionRequiredDialogRef} />
      <RestoreFactoryBanksDialog
        dialogRef={restoreFactoryBanksDialogRef}
        onRestore={library.resetFactoryBanks}
      />
    </section>
  )
}
