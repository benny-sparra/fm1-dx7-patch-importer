import { Send, Square, TriangleAlert } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
import { useFm1VaPresetReader } from '@/hooks/use-fm1-va-preset-reader'
import { useFm1VaPresetWriter } from '@/hooks/use-fm1-va-preset-writer'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { trackAnalyticsEvent } from '@/lib/analytics'
import {
  fm1VaPresetCount,
  fm1VaPresetNumber,
  readEveryFm1VaPreset,
  type Fm1VaStoredPreset,
} from '@/lib/fm1-va-preset-read'
import {
  Fm1VaWriteMismatchError,
  fm1VaWriteBanks,
  planFm1VaBankWrite,
  writeFm1VaPlannedPresets,
  type Fm1VaPlannedWrite,
  type Fm1VaPresetPlan,
  type Fm1VaWriteBank,
} from '@/lib/fm1-va-write-plan'

type WriteFm1VaPresetsDialogProps = {
  library: Pick<PatchLibrary, 'bankNames' | 'effects' | 'records' | 'voices' | 'workspaceBanks'>
  midi: Parameters<typeof useFm1VaPresetReader>[0]
  onClose: () => void
}

type Translate = ReturnType<typeof useTranslation>['t']

/** Where the dialog is: reading the FM1, choosing banks, confirming, or writing. */
type Phase = 'choosing' | 'confirming' | 'reading' | 'writing'

/** How a write ended early: a preset that read back differently, or a failed write or read. */
type WriteFailure = { count: number; slot?: number; total: number }

/** An FM1 bank written from no library bank. */
const skipBank = ''

function writeFailureMessage(t: Translate, { count, slot, total }: WriteFailure) {
  return slot === undefined
    ? t('fm1VaWrite.errors.failed', { count, total })
    : t('fm1VaWrite.errors.mismatch', { count, number: fm1VaPresetNumber(slot), total })
}

type WriteEntry = Extract<Fm1VaPresetPlan, { kind: 'write' }>
const isWrite = (entry: Fm1VaPresetPlan): entry is WriteEntry => entry.kind === 'write'

/**
 * Writes library banks over the FM1's banks A–D on Baud Girl's firmware, preset by preset
 * (docs/feature-backlog.md, FM-1+VA item 4). It reads the FM1 first, so only presets that would
 * change are written, names each one before writing, and reads every write back to confirm it.
 * A write replaces the preset at once and the FM1 has no undo, so the dialog cannot be closed
 * while writing; **Stop after this patch** ends it between writes. A write that ends early reads
 * the FM1 again, so what it shows next matches what the FM1 now holds.
 */
export function WriteFm1VaPresetsDialog({ library, midi, onClose }: WriteFm1VaPresetsDialogProps) {
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
  const [sources, setSources] = useState<ReadonlyMap<Fm1VaWriteBank, string>>(new Map())
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

  // Each FM1 bank starts written from the library bank of the same letter, when there is one.
  const sourceOf = (bank: Fm1VaWriteBank) =>
    sources.get(bank) ?? (library.workspaceBanks.includes(bank) ? bank : skipBank)
  const plans = stored
    ? fm1VaWriteBanks.map((bank) => {
        const source = sourceOf(bank)
        return {
          bank,
          plan: source === skipBank ? [] : planFm1VaBankWrite(stored, bank, source, library),
          source,
        }
      })
    : []
  const writes = plans.flatMap(({ plan }) => plan.filter(isWrite))
  const writing = phase === 'writing'

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
      trackAnalyticsEvent({ name: 'fm1_va_presets_written' })
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
        <DialogTitle id={titleId}>{t('fm1VaWrite.title')}</DialogTitle>
        <DialogCloseButton
          disabled={writing}
          label={t('common.close')}
          onClick={() => dialogRef.current?.close()}
        />
      </DialogHeader>
      <DialogBody>
        <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]" id={descriptionId}>
          {t('fm1VaWrite.help')}
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
                className="h-2 w-full accent-[var(--crt-led)]"
                max={fm1VaPresetCount}
                value={readCount}
              />
            </div>
          ) : null}

          {phase === 'choosing'
            ? plans.map(({ bank, plan, source }) => (
                <BankWrite
                  bank={bank}
                  key={bank}
                  libraryBanks={library.workspaceBanks.map((value) => ({
                    label: workspaceBankLabel(value),
                    value,
                  }))}
                  onChooseSource={(value) =>
                    setSources((current) => new Map(current).set(bank, value))
                  }
                  plan={plan}
                  source={source}
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
              <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 size-5 shrink-0" />
                <p>{t('fm1VaWrite.confirmWarning')}</p>
              </div>
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
                <span>{t('fm1VaImport.read')}</span>
              </Button>
            </div>
          ) : null}
        </div>
      </DialogBody>
      <DialogFooter>
        {phase === 'choosing' ? (
          <Button
            disabled={writes.length === 0}
            onClick={() => {
              setWriteFailure(null)
              setPhase('confirming')
            }}
            type="button"
            variant="destructive"
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
            <Button onClick={() => void write()} type="button" variant="destructive">
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
  libraryBanks: { label: string; value: string }[]
  onChooseSource: (source: string) => void
  plan: Fm1VaPresetPlan[]
  source: string
}

/** One FM1 bank: the library bank written over it, and the presets that would change. */
function BankWrite({ bank, libraryBanks, onChooseSource, plan, source }: BankWriteProps) {
  const { t } = useTranslation()
  const headingId = useId()
  const bodyId = useId()
  const sourceId = useId()
  const [collapsed, setCollapsed] = useState(true)
  const title = t('fm1VaImport.bankHeading', { bank })
  const writes = plan.filter(isWrite)
  const keepsVirtualAnalog = plan.some(({ kind }) => kind === 'virtual-analog')

  return (
    <section aria-labelledby={headingId} className="synthwave-panel min-w-0">
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
        id={headingId}
        title={title}
      />
      <div className="grid gap-1 px-[9px] py-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <label className="shrink-0 text-[var(--crt-ink-3)]" htmlFor={sourceId}>
            {t('fm1VaWrite.source')}
          </label>
          <select
            className="settings-option-select h-9 min-w-0 flex-1 truncate rounded-md border px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id={sourceId}
            onChange={(event) => onChooseSource(event.target.value)}
            value={source}
          >
            <option value={skipBank}>{t('fm1VaWrite.skipBank')}</option>
            {libraryBanks.map(({ label, value }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {source === skipBank ? null : (
          <p className="text-xs text-[var(--crt-ink-3)]">
            {writes.length === 0
              ? t('fm1VaWrite.same')
              : t('fm1VaWrite.differs', { count: writes.length })}
            {keepsVirtualAnalog ? ` ${t('fm1VaWrite.virtualAnalogKept')}` : null}
          </p>
        )}
      </div>
      <RackPanelCollapsibleBody collapsed={collapsed} id={bodyId}>
        <div className="relative p-2">
          <WriteList writes={writes} />
        </div>
      </RackPanelCollapsibleBody>
    </section>
  )
}
