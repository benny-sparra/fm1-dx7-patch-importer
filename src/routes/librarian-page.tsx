import { motion } from 'motion/react'
import { ChevronDown, Download, Send, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { PatchGrid } from '@/components/patches/patch-grid'
import { Fm1BankSelectionDialog } from '@/components/midi/fm1-bank-selection-dialog'
import { MidiConnectionRequiredDialog } from '@/components/midi/midi-connection-required-dialog'
import { makeDx7BankFile } from '@/lib/dx7'
import { shouldShowFm1BankSelectionDialog } from '@/lib/session'
import { cn } from '@/lib/utils'
import { type MidiController } from '@/hooks/use-midi'
import { type PatchLibrary } from '@/hooks/use-patch-library'

const banks = ['A', 'B', 'C', 'D']

type LibrarianPageProps = {
  library: PatchLibrary
  midi: MidiController
}

export function LibrarianPage({ library, midi }: LibrarianPageProps) {
  const { patches } = library
  const [search, setSearch] = useState('')
  const [destinationBank, setDestinationBank] = useState('A')
  const [importError, setImportError] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const importMenuRef = useRef<HTMLDetailsElement>(null)
  const bankSelectionDialogRef = useRef<HTMLDialogElement>(null)
  const midiConnectionRequiredDialogRef = useRef<HTMLDialogElement>(null)
  const isDestinationBankLoaded = library.loadedBanks.includes(destinationBank)

  const downloadBank = () => {
    try {
      const bytes = makeDx7BankFile(library.getBankVoices(destinationBank))
      const blob = new Blob([bytes], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `fm1-bank-${destinationBank.toLowerCase()}.syx`
      link.click()
      URL.revokeObjectURL(url)
      setImportError('')
      importMenuRef.current?.removeAttribute('open')
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Export failed.')
    }
  }

  const visiblePatches = useMemo(() => {
    const query = search.trim().toLowerCase()

    return patches.filter((patch) => patch.bank === destinationBank && (
      !query || `${patch.bank}${patch.number} ${patch.name} ${patch.family}`
        .toLowerCase()
        .includes(query)
    ))
  }, [destinationBank, patches, search])

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
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:px-8"
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <PatchGrid
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
                    Download
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
                try {
                  await midi.sendBank(destinationBank, library.getBankVoices(destinationBank))
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
        isPatchDisabled={(patch) => !library.loadedBanks.includes(patch.bank)}
        onPatchMove={(patch, target) => library.moveVoice(patch.bank, patch.number, target.number)}
        onPatchRename={library.renameVoice}
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
                    {library.loadedBanks.includes(bank) ? 'Loaded' : 'Empty'}
                  </span>
                </button>
              ))}
            </div>
            <input
              accept=".syx,application/octet-stream"
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

      {importError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {importError}
        </p>
      ) : null}

      <Fm1BankSelectionDialog dialogRef={bankSelectionDialogRef} />
      <MidiConnectionRequiredDialog dialogRef={midiConnectionRequiredDialogRef} />
    </motion.section>
  )
}
