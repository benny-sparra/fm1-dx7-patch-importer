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
import { zipSync } from 'fflate'

import { PatchGrid } from '@/components/patches/patch-grid'
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
  const isDestinationBankLoaded = library.loadedBanks.includes(destinationBank)
  const bankFingerprints = useMemo(
    () => Object.fromEntries(library.loadedBanks.map((bank) => [
      bank,
      makeBankFingerprint(library.getBankVoices(bank)),
    ])),
    [library.getBankVoices, library.loadedBanks, library.voices],
  )

  const bankTransferLabel = (bank: string) => {
    if (!library.loadedBanks.includes(bank)) return 'Empty'
    const transferred = transferredBankFingerprints[bank]
    if (!transferred) return 'Local only'
    return transferred === bankFingerprints[bank] ? 'Transferred' : 'Changed'
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
      setImportError(error instanceof Error ? error.message : 'Export failed.')
    }
  }

  const downloadAllBanks = () => {
    try {
      const files = Object.fromEntries(library.loadedBanks.map((bank) => [
        `fm1-bank-${bank.toLowerCase()}.syx`,
        makeDx7BankFile(library.getBankVoices(bank)),
      ]))
      saveBlob(new Blob([zipSync(files)], { type: 'application/zip' }), 'fm1-browser-banks.zip')
      setImportError('')
      importMenuRef.current?.removeAttribute('open')
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Bulk export failed.')
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
      <div className="rounded-md border border-primary/25 bg-primary/10 px-4 py-3 text-sm leading-6">
        <span className="font-semibold">Browser banks are the source of truth.</span>{' '}
        The FM1 accepts voices and banks but cannot send its stored banks back. Import or restore sounds here, edit them, then transfer them to the FM1.
      </div>
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
                {isImporting ? 'Importing…' : 'Import DX7 bank'}
              </button>
              <details className="group relative" ref={importMenuRef}>
                <summary
                  aria-label="More bank file actions"
                  className="flex h-full w-9 cursor-pointer list-none items-center justify-center rounded-r-[calc(var(--radius-md)-1px)] border-l border-input transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
                  title="More bank file actions"
                >
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="absolute left-0 top-11 z-30 min-w-52 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                    disabled={!isDestinationBankLoaded}
                    onClick={downloadBank}
                    title={isDestinationBankLoaded ? `Download browser bank ${destinationBank} as SysEx` : `Import bank ${destinationBank} first`}
                    type="button"
                  >
                    <Download className="size-4" />
                    Download this bank
                  </button>
                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                    disabled={library.loadedBanks.length === 0}
                    onClick={downloadAllBanks}
                    type="button"
                  >
                    <Archive className="size-4" />
                    Download all banks (.zip)
                  </button>
                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                    disabled={!isDestinationBankLoaded}
                    onClick={() => {
                      if (window.confirm(`Clear browser bank ${destinationBank}? You can undo this action.`)) {
                        library.clearBank(destinationBank)
                        importMenuRef.current?.removeAttribute('open')
                      }
                    }}
                    type="button"
                  >
                    <RotateCcw className="size-4" />
                    Clear this bank
                  </button>
                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                    disabled={library.loadedBanks.length === 0}
                    onClick={() => {
                      if (window.confirm('Clear every locally saved browser bank? Download anything you want to keep first.')) {
                        void library.clearAllBanks()
                        importMenuRef.current?.removeAttribute('open')
                      }
                    }}
                    type="button"
                  >
                    <Trash2 className="size-4" />
                    Clear all local banks
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
                setTransferStatus({ kind: 'idle', message: 'Sending 32 patches to the FM1…' })
                try {
                  const sent = await midi.sendBank(destinationBank, library.getBankVoices(destinationBank))
                  if (sent) {
                    onBankTransferred(destinationBank, bankFingerprints[destinationBank])
                  }
                  setTransferStatus(sent
                    ? { kind: 'success', message: `Browser bank ${destinationBank} was sent. Choose its destination on the FM1.` }
                    : { kind: 'error', message: 'The bank was not sent. Open the MIDI log for details, then retry.' })
                } finally {
                  setIsSending(false)
                }
              }}
              title={!midi.hasMidiOutput ? 'Connect a MIDI output first' : isDestinationBankLoaded ? 'Send all 32 voices; choose the destination bank on the FM1' : `Import bank ${destinationBank} first`}
              type="button"
            >
              <Send className="size-4" />
              {isSending ? 'Sending…' : 'Send to FM1'}
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
            ? { kind: 'success', message: `${patch.name} is in the FM1 edit buffer. Hold SAVE on the FM1 to store it in the current slot.` }
            : { kind: 'error', message: 'The sound was not sent. Connect a SysEx-capable MIDI output and retry.' })
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
              aria-label="Destination browser bank"
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
                  Bank {bank}
                  <span className="block text-xs opacity-75">
                    {bankTransferLabel(bank)}
                  </span>
                </button>
              ))}
            </div>
            <input
              accept=".syx,application/octet-stream"
              aria-label="Import DX7 bank file"
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
                  setImportError(error instanceof Error ? error.message : 'Import failed.')
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
            transferStatus.kind === 'success' && 'text-emerald-700 dark:text-emerald-300',
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
    </section>
  )
}
