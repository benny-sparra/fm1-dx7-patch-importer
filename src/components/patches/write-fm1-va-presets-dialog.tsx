import { Download, Send, Square } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Fm1VaReadLeds } from '@/components/patches/fm1-va-read-leds'
import { fm1VaReadErrorMessage } from '@/components/patches/fm1-va-read-error-message'
import { useWorkspaceBankLabel } from '@/components/patches/workspace-bank-label'
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
import {
  RackPanelCollapseToggle,
  RackPanelCollapsibleBody,
  RackPanelTitle,
} from '@/components/ui/rack-panel'
import { useToast } from '@/components/ui/toast'
import { WarningNotice } from '@/components/ui/warning-notice'
import { Select } from '@/components/ui/select'
import { useFm1VaPresetReader } from '@/hooks/use-fm1-va-preset-reader'
import { useFm1VaPresetWriter } from '@/hooks/use-fm1-va-preset-writer'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { dx7BankVoiceCount } from '@/lib/dx7'
import { favouritesBank } from '@/lib/favourites'
import {
  fm1VaPresetCount,
  fm1VaPresetNumber,
  readEveryFm1VaPreset,
  type Fm1VaStoredPreset,
} from '@/lib/fm1-va-preset-read'
import {
  Fm1VaWriteMismatchError,
  fm1VaLibraryBankPatches,
  fm1VaWriteBanks,
  planFm1VaBankWrite,
  planFm1VaPatchesWrite,
  writeFm1VaPlannedPresets,
  type Fm1VaPlannedWrite,
  type Fm1VaPresetPlan,
  type Fm1VaWriteBank,
} from '@/lib/fm1-va-write-plan'

type WriteFm1VaPresetsDialogProps = {
  library: Pick<
    PatchLibrary,
    | 'bankNames'
    | 'effects'
    | 'favourites'
    | 'records'
    | 'virtualAnalog'
    | 'voices'
    | 'workspaceBanks'
  >
  midi: Parameters<typeof useFm1VaPresetReader>[0]
  onClose: () => void
  /**
   * The one library bank, or Favourites, that **Send to FM1** sends, written over an FM1 bank chosen
   * in the dialog. Without it, each FM1 bank chooses the library bank written over it.
   */
  sendBank?: string
}

type Translate = ReturnType<typeof useTranslation>['t']

/** Where the dialog is: reading the FM1, choosing banks, confirming, or writing. */
type Phase = 'choosing' | 'confirming' | 'reading' | 'writing'

/** How a write ended early: a preset that read back differently, or a failed write or read. */
type WriteFailure = { count: number; slot?: number; total: number }

/**
 * Whether an FM1 bank is written, and from which library bank. A bank switched off keeps its
 * source, so switching it on again restores it.
 */
type BankChoice = { source: string; written: boolean }

function writeFailureMessage(t: Translate, { count, slot, total }: WriteFailure) {
  return slot === undefined
    ? t('fm1VaWrite.errors.failed', { count, total })
    : t('fm1VaWrite.errors.mismatch', { count, number: fm1VaPresetNumber(slot), total })
}

type WriteEntry = Extract<Fm1VaPresetPlan, { kind: 'write' }>
const isWrite = (entry: Fm1VaPresetPlan): entry is WriteEntry => entry.kind === 'write'

/**
 * How many presets a plan would change, how many Virtual Analog and 8-Bit presets it keeps on the
 * FM1, how many Virtual Analog patches it cannot write exactly, and how many 8-Bit patches it
 * does not write. A plan that writes nothing says every patch matches only when it keeps no preset
 * for another reason: a bank holding only Baud Girl's 8-Bit and Virtual Analog packs matches none.
 */
function planSummary(t: Translate, plan: readonly Fm1VaPresetPlan[]) {
  const count = (kind: Fm1VaPresetPlan['kind']) =>
    plan.filter((entry) => entry.kind === kind).length
  const writeCount = count('write')
  const virtualAnalogCount = count('virtual-analog')
  const eightBitCount = count('eight-bit')
  const inexactCount = count('inexact')
  const eightBitPatchCount = count('eight-bit-patch')
  const keptCount = virtualAnalogCount + eightBitCount + inexactCount + eightBitPatchCount
  return [
    writeCount > 0
      ? t('fm1VaWrite.differs', { count: writeCount })
      : keptCount > 0
        ? t('fm1VaWrite.nothing')
        : t('fm1VaWrite.same'),
    virtualAnalogCount > 0 ? t('fm1VaWrite.virtualAnalogKept', { count: virtualAnalogCount }) : '',
    eightBitCount > 0 ? t('fm1VaWrite.eightBitKept', { count: eightBitCount }) : '',
    inexactCount > 0 ? t('fm1VaWrite.inexact', { count: inexactCount }) : '',
    eightBitPatchCount > 0 ? t('fm1VaWrite.eightBitPatch', { count: eightBitPatchCount }) : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/** The patches **Send to FM1** writes: a workspace bank's 32, or the first 32 favourites. */
function sendPatches(sendBank: string, library: WriteFm1VaPresetsDialogProps['library']) {
  return sendBank === favouritesBank
    ? library.favourites.slice(0, dx7BankVoiceCount)
    : fm1VaLibraryBankPatches(sendBank, library)
}

/**
 * Writes library banks over the FM1's banks A–D on Baud Girl's firmware, preset by preset
 * (docs/feature-backlog.md, FM-1+VA item 4). It reads the FM1 first, so only presets that would
 * change are written, names each one before writing, and reads every write back to confirm it.
 * A write replaces the preset at once and the FM1 has no undo, so the dialog cannot be closed
 * while writing; **Stop after this patch** ends it between writes. A write that ends early reads
 * the FM1 again, so what it shows next matches what the FM1 now holds. Given `sendBank`, it is
 * **Send to FM1** on this firmware: one bank, written over the FM1 bank chosen for it.
 */
export function WriteFm1VaPresetsDialog({
  library,
  midi,
  onClose,
  sendBank,
}: WriteFm1VaPresetsDialogProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const workspaceBankLabel = useWorkspaceBankLabel(library)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const confirmHeadingRef = useRef<HTMLHeadingElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const progressId = useId()
  const reader = useFm1VaPresetReader(midi)
  const writer = useFm1VaPresetWriter(midi)
  const [phase, setPhase] = useState<Phase>('reading')
  const [readFailure, setReadFailure] = useState<unknown>(null)
  const [writeFailure, setWriteFailure] = useState<WriteFailure | null>(null)
  const [readCount, setReadCount] = useState(0)
  const [stored, setStored] = useState<Fm1VaStoredPreset[] | null>(null)
  const [choices, setChoices] = useState<ReadonlyMap<Fm1VaWriteBank, BankChoice>>(new Map())
  // A bank sent on its own starts written over the FM1 bank of the same letter, or bank A.
  const [destination, setDestination] = useState<Fm1VaWriteBank>(
    () => fm1VaWriteBanks.find((bank) => bank === sendBank) ?? 'A',
  )
  const [writtenCount, setWrittenCount] = useState(0)
  const [stopping, setStopping] = useState(false)
  // Asking to read again after a failed read starts a new one.
  const [readAttempt, setReadAttempt] = useState(0)
  const stopWriting = useRef<AbortController | null>(null)
  const { canRead, readPreset } = reader
  const reading = phase === 'reading'

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // The FM1 is read as the dialog opens and after a write ends early. Closing the dialog, or a
  // change of ports, stops the read.
  useEffect(() => {
    if (!reading || !canRead) return
    const read = new AbortController()
    setReadCount(0)
    setReadFailure(null)
    readEveryFm1VaPreset(readPreset, {
      onRead: (count) => {
        if (!read.signal.aborted) setReadCount(count)
      },
      signal: read.signal,
    })
      .then((presets) => {
        if (read.signal.aborted) return
        setStored(presets)
        setPhase('choosing')
      })
      .catch((cause: unknown) => {
        if (!read.signal.aborted) setReadFailure(cause ?? new Error('The read failed.'))
      })
    return () => read.abort()
  }, [canRead, readAttempt, readPreset, reading])

  useEffect(() => {
    if (phase === 'confirming') confirmHeadingRef.current?.focus()
  }, [phase])

  // Each FM1 bank starts written from the library bank of the same letter, when there is one, and
  // otherwise switched off, offering the first library bank.
  const choiceOf = (bank: Fm1VaWriteBank): BankChoice => {
    const chosen = choices.get(bank)
    if (chosen && library.workspaceBanks.includes(chosen.source)) return chosen
    const sameLetter = library.workspaceBanks.includes(bank)
    return { source: sameLetter ? bank : (library.workspaceBanks[0] ?? ''), written: sameLetter }
  }
  const choose = (bank: Fm1VaWriteBank, choice: BankChoice) => {
    setChoices((current) => new Map(current).set(bank, choice))
  }
  const plans = !stored
    ? []
    : sendBank === undefined
      ? fm1VaWriteBanks.map((bank) => {
          const choice = choiceOf(bank)
          return {
            bank,
            choice,
            plan: choice.written ? planFm1VaBankWrite(stored, bank, choice.source, library) : [],
          }
        })
      : [
          {
            bank: destination,
            choice: { source: sendBank, written: true },
            plan: planFm1VaPatchesWrite(stored, destination, sendPatches(sendBank, library)),
          },
        ]
  const writes = plans.flatMap(({ plan }) => plan.filter(isWrite))
  const writing = phase === 'writing'
  const sendLabel =
    sendBank === undefined
      ? undefined
      : sendBank === favouritesBank
        ? t('favourites.title')
        : workspaceBankLabel(sendBank)
  // Favourites fills an FM1 bank only as far as it goes, and only its first 32 fit.
  const favouriteCount = library.favourites.length
  const favouritesNote =
    sendBank !== favouritesBank || favouriteCount === dx7BankVoiceCount
      ? undefined
      : favouriteCount < dx7BankVoiceCount
        ? t('fm1VaSend.favouritesShort', { count: favouriteCount })
        : t('favourites.leftOutNote', { count: favouriteCount - dx7BankVoiceCount })

  const write = async () => {
    const stop = new AbortController()
    stopWriting.current = stop
    setPhase('writing')
    setWriteFailure(null)
    setWrittenCount(0)
    setStopping(false)
    let written = 0
    try {
      written = await writeFm1VaPlannedPresets(writes, {
        onWritten: (count) => {
          written = count
          setWrittenCount(count)
        },
        read: readPreset,
        signal: stop.signal,
        write: writer.writePreset,
      })
      trackAnalyticsEvent({
        name: sendBank === undefined ? 'fm1_va_presets_written' : 'bank_transfer_completed',
      })
      toast.success(
        written === writes.length
          ? t('fm1VaWrite.written', { count: written })
          : t('fm1VaWrite.stopped', { count: written, total: writes.length }),
      )
      dialogRef.current?.close()
    } catch (cause) {
      setWriteFailure({
        count: written,
        slot: cause instanceof Fm1VaWriteMismatchError ? cause.slot : undefined,
        total: writes.length,
      })
      setPhase('reading')
    } finally {
      stopWriting.current = null
    }
  }

  return (
    <Dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      closeOnBackdrop={!writing}
      onCancel={(event) => {
        if (writing) event.preventDefault()
      }}
      onClose={onClose}
      ref={dialogRef}
      size="2xl"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>
          {sendLabel === undefined
            ? t('fm1VaWrite.title')
            : t('fm1VaSend.title', { bank: sendLabel })}
        </DialogTitle>
        <DialogCloseButton
          disabled={writing}
          label={t('common.close')}
          onClick={() => dialogRef.current?.close()}
        />
      </DialogHeader>
      <DialogBody>
        <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]" id={descriptionId}>
          {sendLabel === undefined
            ? t('fm1VaWrite.help')
            : t('fm1VaSend.help', { bank: sendLabel })}
        </p>
        <div className="grid gap-4 p-5">
          {reading && !canRead ? (
            <p className="text-sm">{t('fm1VaImport.readUnavailable')}</p>
          ) : null}
          {reading && canRead && !readFailure ? (
            <div className="grid gap-1">
              <p className="text-xs text-[var(--crt-ink-3)]" id={progressId}>
                {t('fm1VaImport.reading', {
                  number: Math.min(readCount + 1, fm1VaPresetCount),
                  total: fm1VaPresetCount,
                })}
              </p>
              <progress
                aria-labelledby={progressId}
                className="sr-only"
                max={fm1VaPresetCount}
                value={readCount}
              />
              <Fm1VaReadLeds readCount={readCount} />
            </div>
          ) : null}

          {phase === 'choosing' && sendBank !== undefined
            ? plans.map(({ bank, plan }) => (
                <SendBankWrite
                  destination={bank}
                  key={bank}
                  note={favouritesNote}
                  onChooseDestination={setDestination}
                  plan={plan}
                />
              ))
            : null}
          {phase === 'choosing' && sendBank === undefined
            ? plans.map(({ bank, choice, plan }) => (
                <BankWrite
                  bank={bank}
                  choice={choice}
                  key={bank}
                  libraryBanks={library.workspaceBanks.map((value) => ({
                    label: workspaceBankLabel(value),
                    value,
                  }))}
                  onChooseSource={(source) => choose(bank, { source, written: true })}
                  onSwitch={(written) => choose(bank, { ...choice, written })}
                  plan={plan}
                />
              ))
            : null}

          {phase === 'confirming' || writing ? (
            <section aria-labelledby={`${titleId}-confirm`} className="grid gap-3">
              <h3
                className="text-sm font-semibold"
                id={`${titleId}-confirm`}
                ref={confirmHeadingRef}
                tabIndex={-1}
              >
                {t('fm1VaWrite.confirmTitle')}
              </h3>
              <WarningNotice>
                <p>{t('fm1VaWrite.confirmWarning')}</p>
              </WarningNotice>
              <WriteList writes={writes} />
              {writing ? (
                <div className="grid gap-1">
                  <p className="text-xs text-[var(--crt-ink-3)]" id={progressId}>
                    {t('fm1VaWrite.writing', {
                      number: Math.min(writtenCount + 1, writes.length),
                      total: writes.length,
                    })}
                  </p>
                  <progress
                    aria-labelledby={progressId}
                    className="h-2 w-full accent-[var(--crt-led)]"
                    max={writes.length}
                    value={writtenCount}
                  />
                </div>
              ) : null}
            </section>
          ) : null}

          {writeFailure ? <ErrorNotice>{writeFailureMessage(t, writeFailure)}</ErrorNotice> : null}
          {readFailure ? (
            <div className="grid justify-items-start gap-2">
              <ErrorNotice>{fm1VaReadErrorMessage(t, readFailure)}</ErrorNotice>
              <Button
                onClick={() => setReadAttempt((count) => count + 1)}
                type="button"
                variant="outline"
              >
                <Download />
                <span>{t('fm1VaImport.read')}</span>
              </Button>
            </div>
          ) : null}
        </div>
      </DialogBody>
      <DialogFooter>
        {/* Only the confirmation's button, which replaces presets, is in the danger colour. */}
        {phase === 'choosing' ? (
          <Button
            disabled={writes.length === 0}
            onClick={() => {
              setWriteFailure(null)
              setPhase('confirming')
            }}
            type="button"
          >
            <Send />
            <span>{t('fm1VaWrite.action', { count: writes.length })}</span>
          </Button>
        ) : null}
        {phase === 'confirming' ? (
          <>
            <Button onClick={() => setPhase('choosing')} type="button" variant="ghost">
              <span>{t('common.cancel')}</span>
            </Button>
            <Button onClick={() => void write()} type="button" variant="danger">
              <Send />
              <span>{t('fm1VaWrite.confirm', { count: writes.length })}</span>
            </Button>
          </>
        ) : null}
        {writing ? (
          <Button
            disabled={stopping}
            onClick={() => {
              setStopping(true)
              stopWriting.current?.abort()
            }}
            type="button"
            variant="ghost"
          >
            <Square />
            <span>{t('fm1VaWrite.stop')}</span>
          </Button>
        ) : null}
      </DialogFooter>
    </Dialog>
  )
}

/** The presets a write replaces, each with the patch that replaces it. */
function WriteList({ writes }: { writes: readonly Fm1VaPlannedWrite[] }) {
  const { t } = useTranslation()
  return (
    <ul className="grid gap-1 font-mono text-xs sm:grid-cols-2">
      {writes.map((write) => (
        <li key={write.slot}>
          {t('fm1VaWrite.replaces', {
            name: write.name.trim(),
            number: fm1VaPresetNumber(write.slot),
            replaces: write.replaces.trim(),
          })}
        </li>
      ))}
    </ul>
  )
}

type BankWriteProps = {
  bank: Fm1VaWriteBank
  choice: BankChoice
  libraryBanks: { label: string; value: string }[]
  onChooseSource: (source: string) => void
  onSwitch: (written: boolean) => void
  plan: Fm1VaPresetPlan[]
}

/**
 * One FM1 bank: whether it is written, the library bank written over it, and the presets that
 * would change. Its title is the switch, and the library bank waits for it to be switched on.
 */
function BankWrite({ bank, choice, libraryBanks, onChooseSource, onSwitch, plan }: BankWriteProps) {
  const { t } = useTranslation()
  const bodyId = useId()
  const sourceId = useId()
  const [collapsed, setCollapsed] = useState(true)
  const title = t('fm1VaImport.bankHeading', { bank })
  const writes = plan.filter(isWrite)

  return (
    <section aria-label={title} className="synthwave-panel min-w-0">
      <RackPanelTitle
        action={
          <RackPanelCollapseToggle
            collapsed={collapsed}
            controls={bodyId}
            onToggle={() => setCollapsed((current) => !current)}
            panel={title}
          />
        }
        headingLevel={3}
        title={t('fm1VaWrite.bankSwitch', { bank })}
        titleSwitch={{
          checked: choice.written,
          disabled: libraryBanks.length === 0,
          onChange: onSwitch,
        }}
      />
      <div className="grid gap-1 px-[9px] py-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <label className="shrink-0 text-[var(--crt-ink-3)]" htmlFor={sourceId}>
            {t('fm1VaWrite.source')}
          </label>
          <Select
            className="min-w-0 flex-1"
            disabled={!choice.written}
            id={sourceId}
            onChange={(event) => onChooseSource(event.target.value)}
            value={choice.source}
          >
            {libraryBanks.map(({ label, value }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        {choice.written ? (
          <p className="text-xs text-[var(--crt-ink-3)]">{planSummary(t, plan)}</p>
        ) : null}
      </div>
      <RackPanelCollapsibleBody collapsed={collapsed} id={bodyId}>
        <div className="relative p-2">
          <WriteList writes={writes} />
        </div>
      </RackPanelCollapsibleBody>
    </section>
  )
}

type SendBankWriteProps = {
  destination: Fm1VaWriteBank
  /** What the bank becomes on the FM1 when it is not simply 32 patches, as for Favourites. */
  note?: string
  onChooseDestination: (bank: Fm1VaWriteBank) => void
  plan: Fm1VaPresetPlan[]
}

/** The FM1 bank a bank sent on its own is written over, and the presets that would change. */
function SendBankWrite({ destination, note, onChooseDestination, plan }: SendBankWriteProps) {
  const { t } = useTranslation()
  const destinationId = useId()

  return (
    <div className="grid gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <label className="shrink-0 text-[var(--crt-ink-3)]" htmlFor={destinationId}>
          {t('fm1VaSend.destination')}
        </label>
        <Select
          className="min-w-0 flex-1"
          id={destinationId}
          onChange={(event) =>
            onChooseDestination(
              fm1VaWriteBanks.find((bank) => bank === event.target.value) ?? destination,
            )
          }
          value={destination}
        >
          {fm1VaWriteBanks.map((bank) => (
            <option key={bank} value={bank}>
              {t('fm1VaImport.bankHeading', { bank })}
            </option>
          ))}
        </Select>
      </div>
      <p className="text-xs text-[var(--crt-ink-3)]">{planSummary(t, plan)}</p>
      {note ? <p className="text-xs text-[var(--crt-ink-3)]">{note}</p> : null}
    </div>
  )
}
