import { Download, Square, TriangleAlert, Upload } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PreviewPatchButton } from '@/components/patches/preview-patch-button'
import { undoToastOptions } from '@/components/patches/undo-toast'
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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { useFm1VaPresetReader } from '@/hooks/use-fm1-va-preset-reader'
import type { MidiController } from '@/hooks/use-midi'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { trackAnalyticsEvent } from '@/lib/analytics'
import type { Dx7Voice } from '@/lib/dx7'
import {
  differsFromLibrary,
  Fm1VaPresetFileError,
  type Fm1VaPreset,
  type Fm1VaPresetBank,
  type Fm1VaPresetFileBank,
  fm1VaPresetBanksFromRead,
  fm1VaPresetFileSize,
  importableSounds,
  readFm1VaPresetFile,
} from '@/lib/fm1-va-preset-file'
import {
  Fm1VaPresetReadError,
  fm1VaPresetCount,
  readEveryFm1VaPreset,
} from '@/lib/fm1-va-preset-read'
import { voiceId } from '@/lib/patch-library'
import { sysexFileAccept } from '@/lib/sysex-file'

type ImportFm1VaPresetsDialogProps = {
  library: Pick<
    PatchLibrary,
    | 'bankNames'
    | 'effects'
    | 'importFetchedBanks'
    | 'records'
    | 'undoChange'
    | 'voices'
    | 'workspaceBanks'
  >
  midi: Pick<
    MidiController,
    | 'firmware'
    | 'inputs'
    | 'logStore'
    | 'outputs'
    | 'selectedInputId'
    | 'selectedOutputId'
    | 'sysexAvailable'
  >
  onClose: () => void
  /** Plays a patch through the FM1 edit buffer with its effects, as a search result is. */
  onPlay: (voice: Dx7Voice, effects: Uint8Array) => void
}

/** Where the banks shown came from. */
type PresetSource = 'file' | 'fm1'

type Translate = ReturnType<typeof useTranslation>['t']

function presetFileErrorMessage(t: Translate, error: unknown) {
  if (error instanceof Fm1VaPresetFileError) {
    switch (error.problem) {
      case 'damaged':
        return t('fm1VaImport.errors.damaged')
      case 'format':
        return t('fm1VaImport.errors.format')
      case 'size':
        return t('fm1VaImport.errors.size', {
          bytes: error.receivedBytes,
          expected: fm1VaPresetFileSize,
        })
    }
  }
  return t('fm1VaImport.errors.unreadable')
}

function presetReadErrorMessage(t: Translate, error: unknown) {
  if (error instanceof Fm1VaPresetReadError) {
    switch (error.problem) {
      case 'busy':
        return t('fm1VaImport.errors.readBusy')
      case 'no-reply':
      case 'send-failed':
        return t('fm1VaImport.errors.readNoReply')
      // The reader cancels a read itself when the ports change, and refuses one once they cannot
      // read; a read the user stops shows nothing.
      case 'cancelled':
      case 'unavailable':
        return t('fm1VaImport.errors.readStopped')
    }
  }
  return t('fm1VaImport.errors.readFailed')
}

/** Whether a bank holds an FM preset the library can take. */
function hasImportableVoice(bank: Fm1VaPresetFileBank) {
  return importableSounds(bank).some(Boolean)
}

function countPresets(banks: readonly Fm1VaPresetFileBank[] | null, kind: Fm1VaPreset['kind']) {
  return (
    banks?.flatMap(({ presets }) => presets).filter((preset) => preset.kind === kind).length ?? 0
  )
}

export function ImportFm1VaPresetsDialog({
  library,
  midi,
  onClose,
  onPlay,
}: ImportFm1VaPresetsDialogProps) {
  const { i18n, t } = useTranslation()
  // The actions sit in the pinned footer, outside the form, and submit it by its id.
  const formId = useId()
  const toast = useToast()
  const workspaceBankLabel = useWorkspaceBankLabel(library)
  const descriptionId = useId()
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  // The chosen file's banks, read as soon as it is chosen so they can be heard before anything is
  // replaced. Each voice keeps one object while the dialog is open, so playing a patch twice sends
  // it once.
  const [banks, setBanks] = useState<Fm1VaPresetFileBank[] | null>(null)
  const [source, setSource] = useState<PresetSource>('file')
  const [chosenBanks, setChosenBanks] = useState<ReadonlySet<Fm1VaPresetBank>>(new Set())
  const [playing, setPlaying] = useState<Dx7Voice | null>(null)
  const readingFile = useRef<File | null>(null)
  const reader = useFm1VaPresetReader(midi)
  // The read from the FM1 in progress, and how many presets it has read.
  const presetRead = useRef<AbortController | null>(null)
  const [readCount, setReadCount] = useState<number | null>(null)
  const readingId = useId()
  const differingId = useId()

  // The librarian mounts this dialog only while it is wanted, so it opens itself as it appears and
  // its state is discarded with it rather than being reset by hand.
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Closing the dialog stops a read; the reader also stops it when the ports change.
  useEffect(
    () => () => {
      presetRead.current?.abort()
      presetRead.current = null
    },
    [],
  )

  const listFormat = new Intl.ListFormat(i18n.resolvedLanguage, { type: 'conjunction' })
  const damagedCount = countPresets(banks, 'damaged')
  const virtualAnalogCount = countPresets(banks, 'virtual-analog')
  const takenBanks = banks?.filter(({ bank }) => chosenBanks.has(bank)) ?? []
  const differs = (bank: Fm1VaPresetBank, index: number, preset: Fm1VaPreset) => {
    const id = voiceId(bank, index + 1)
    return differsFromLibrary(preset, {
      effects: library.effects[id],
      record: library.records[id],
      voice: library.voices[id],
    })
  }
  const differingCount =
    banks?.reduce(
      (total, { bank, presets }) =>
        total + presets.filter((preset, index) => differs(bank, index, preset)).length,
      0,
    ) ?? 0

  const showBanks = (read: Fm1VaPresetFileBank[], from: PresetSource) => {
    setBanks(read)
    setSource(from)
    // From the FM1, the banks that differ from the library start switched on; from a file, every
    // bank it can import does, as the file is usually chosen to be imported.
    setChosenBanks(
      new Set(
        read
          .filter(
            (fileBank) =>
              hasImportableVoice(fileBank) &&
              (from === 'file' ||
                fileBank.presets.some((preset, index) => differs(fileBank.bank, index, preset))),
          )
          .map(({ bank }) => bank),
      ),
    )
  }

  const clearBanks = () => {
    setBanks(null)
    setPlaying(null)
    setError('')
  }

  const stopReading = () => {
    presetRead.current?.abort()
    presetRead.current = null
    setReadCount(null)
  }

  const readFromFm1 = async () => {
    stopReading()
    readingFile.current = null
    setFile(null)
    clearBanks()
    const read = new AbortController()
    presetRead.current = read
    setReadCount(0)
    try {
      const presets = await readEveryFm1VaPreset(reader.readPreset, {
        onRead: (count) => {
          if (presetRead.current === read) setReadCount(count)
        },
        signal: read.signal,
      })
      if (presetRead.current !== read) return
      showBanks(fm1VaPresetBanksFromRead(presets), 'fm1')
    } catch (cause) {
      if (presetRead.current === read) setError(presetReadErrorMessage(t, cause))
    } finally {
      if (presetRead.current === read) {
        presetRead.current = null
        setReadCount(null)
      }
    }
  }

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null
    stopReading()
    readingFile.current = chosen
    setFile(chosen)
    clearBanks()
    if (!chosen) return

    try {
      const read = await readFm1VaPresetFile(chosen)
      // A file chosen while this one was being read replaces it.
      if (readingFile.current !== chosen) return
      showBanks(read, 'file')
    } catch (cause) {
      if (readingFile.current === chosen) setError(presetFileErrorMessage(t, cause))
    }
  }

  const toggleBank = (bank: Fm1VaPresetBank, taken: boolean) => {
    setChosenBanks((current) => {
      const next = new Set(current)
      if (taken) next.add(bank)
      else next.delete(bank)
      return next
    })
  }

  const play = (voice: Dx7Voice, effects: Uint8Array) => {
    onPlay(voice, effects)
    setPlaying(voice)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (takenBanks.length === 0) return

    setError('')
    try {
      const changed = library.importFetchedBanks(
        takenBanks.map((taken) => ({ bank: taken.bank, sounds: importableSounds(taken) })),
      )
      trackAnalyticsEvent({
        data: { source: source === 'fm1' ? 'fm1_va_read' : 'fm1_va_backup' },
        name: 'bank_imported',
      })
      toast.success(
        t('fm1VaImport.imported', {
          banks: listFormat.format(takenBanks.map(({ bank }) => bank)),
          count: takenBanks.length,
        }),
        undoToastOptions(t, library, changed),
      )
      dialogRef.current?.close()
    } catch {
      setError(t('banks.importFailed'))
    }
  }

  return (
    <Dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      onClose={onClose}
      onToggle={(event) => {
        if (!event.currentTarget.open) return
        window.requestAnimationFrame(() => fileInputRef.current?.focus())
      }}
      ref={dialogRef}
      size="2xl"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>{t('fm1VaImport.title')}</DialogTitle>
        <DialogCloseButton label={t('common.close')} onClick={() => dialogRef.current?.close()} />
      </DialogHeader>
      <DialogBody>
        <div
          className="grid gap-2 px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]"
          id={descriptionId}
        >
          <p>{t('fm1VaImport.help')}</p>
          <p>{t('fm1VaImport.effectsNote')}</p>
        </div>

        <form id={formId} className="grid gap-5 p-5" onSubmit={submit}>
          <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
            <p>{t('fm1VaImport.warning')}</p>
          </div>

          {reader.canRead ? (
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={readCount !== null}
                  onClick={() => void readFromFm1()}
                  type="button"
                  variant="outline"
                >
                  <Download />
                  <span>{t('fm1VaImport.read')}</span>
                </Button>
                {readCount === null ? null : (
                  <Button onClick={stopReading} type="button" variant="ghost">
                    <Square />
                    <span>{t('fm1VaImport.stopReading')}</span>
                  </Button>
                )}
              </div>
              {readCount === null ? (
                <p className="text-xs text-[var(--crt-ink-3)]">{t('fm1VaImport.readHelp')}</p>
              ) : (
                <div className="grid gap-1">
                  <p className="text-xs text-[var(--crt-ink-3)]" id={readingId}>
                    {t('fm1VaImport.reading', {
                      number: Math.min(readCount + 1, fm1VaPresetCount),
                      total: fm1VaPresetCount,
                    })}
                  </p>
                  <progress
                    aria-labelledby={readingId}
                    className="h-2 w-full accent-[var(--crt-led)]"
                    max={fm1VaPresetCount}
                    value={readCount}
                  />
                </div>
              )}
            </div>
          ) : midi.firmware.kind === 'fm1-va' ? (
            <p className="text-xs text-[var(--crt-ink-3)]">{t('fm1VaImport.readUnavailable')}</p>
          ) : null}

          <label className="grid gap-2 text-sm font-semibold">
            {t('fm1VaImport.file')}
            <span className="modal-input-surface flex min-h-11 cursor-pointer items-center rounded-md border border-dashed border-input px-3 font-normal transition-colors hover:bg-muted/50">
              <span className="min-w-0 truncate">{file?.name ?? t('fm1VaImport.chooseFile')}</span>
              <input
                accept={sysexFileAccept}
                className="sr-only"
                onChange={(event) => void chooseFile(event)}
                ref={fileInputRef}
                type="file"
              />
            </span>
          </label>

          {banks ? (
            <section aria-labelledby={`${titleId}-preview`} className="grid gap-3">
              <div className="grid gap-1">
                <h3 className="text-sm font-semibold" id={`${titleId}-preview`}>
                  {t(source === 'fm1' ? 'fm1VaImport.previewTitleFm1' : 'fm1VaImport.previewTitle')}
                </h3>
                <p className="text-xs text-[var(--crt-ink-3)]">{t('fm1VaImport.previewHelp')}</p>
                {/* Describes each marked patch, which a screen reader reads after its name. */}
                <span hidden id={differingId}>
                  {t('fm1VaImport.differingPatch')}
                </span>
                <p className="text-xs text-[var(--crt-ink-3)]">
                  {differingCount === 0
                    ? t('fm1VaImport.allMatch')
                    : t('fm1VaImport.differs', { count: differingCount })}
                </p>
                {virtualAnalogCount > 0 ? (
                  <p className="text-xs text-[var(--crt-ink-3)]">
                    {t('fm1VaImport.virtualAnalogPresets', { count: virtualAnalogCount })}
                  </p>
                ) : null}
              </div>
              {damagedCount > 0 ? (
                <ErrorNotice>
                  {t('fm1VaImport.damagedPresets', { count: damagedCount })}
                </ErrorNotice>
              ) : null}
              {banks.map((fileBank) => (
                <PresetFileBank
                  differs={(index, preset) => differs(fileBank.bank, index, preset)}
                  differingId={differingId}
                  fileBank={fileBank}
                  key={fileBank.bank}
                  libraryBankName={
                    library.workspaceBanks.includes(fileBank.bank)
                      ? workspaceBankLabel(fileBank.bank)
                      : null
                  }
                  onPlay={play}
                  onToggle={(taken) => toggleBank(fileBank.bank, taken)}
                  playing={playing}
                  taken={chosenBanks.has(fileBank.bank)}
                />
              ))}
            </section>
          ) : null}

          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
        </form>
      </DialogBody>
      <DialogFooter>
        <Button
          disabled={takenBanks.length === 0}
          form={formId}
          type="submit"
          variant="destructive"
        >
          <Upload />
          <span>{t('fm1VaImport.action', { count: takenBanks.length })}</span>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

type PresetFileBankProps = {
  /** Whether the preset at `index` differs from the patch in the library slot it would replace. */
  differs: (index: number, preset: Fm1VaPreset) => boolean
  /** The id of the text that describes a patch marked as differing. */
  differingId: string
  fileBank: Fm1VaPresetFileBank
  /** The name of the workspace bank the FM1 bank replaces, or null when it is added. */
  libraryBankName: string | null
  onPlay: (voice: Dx7Voice, effects: Uint8Array) => void
  onToggle: (taken: boolean) => void
  playing: Dx7Voice | null
  taken: boolean
}

function PresetFileBank({
  differs,
  differingId,
  fileBank,
  libraryBankName,
  onPlay,
  onToggle,
  playing,
  taken,
}: PresetFileBankProps) {
  const { i18n, t } = useTranslation()
  const headingId = useId()
  const bodyId = useId()
  // Banks start folded, so the four fit without scrolling; one is opened to hear its patches.
  const [collapsed, setCollapsed] = useState(true)
  const numberFormat = new Intl.NumberFormat(i18n.resolvedLanguage)
  const { bank, presets } = fileBank
  const title = t('fm1VaImport.bankHeading', { bank })

  return (
    <section aria-labelledby={headingId} className="synthwave-panel min-w-0">
      <RackPanelTitle
        action={
          <span className="flex shrink-0 items-center gap-2">
            {/* Above the strip's fold overlay, so switching a bank does not also fold it. */}
            <Switch
              checked={taken}
              className="relative z-10 inline-flex min-h-6 items-center gap-2 px-2 text-[11px] tracking-[0.1em] uppercase transition-colors"
              disabled={!hasImportableVoice(fileBank)}
              onChange={onToggle}
            >
              <span>
                {libraryBankName === null
                  ? t('fm1VaImport.addBank', { bank })
                  : t('fm1VaImport.replaceBank', { name: libraryBankName })}
              </span>
            </Switch>
            <RackPanelCollapseToggle
              collapsed={collapsed}
              controls={bodyId}
              onToggle={() => setCollapsed((current) => !current)}
              panel={title}
            />
          </span>
        }
        headingLevel={4}
        id={headingId}
        title={title}
      />
      <RackPanelCollapsibleBody collapsed={collapsed} id={bodyId}>
        {/* Positioned, so the cells' visually hidden text folds away with the bank rather than
            stretching the dialog's scrolling body. */}
        <ul className="relative grid grid-cols-2 gap-1 p-2 sm:grid-cols-4">
          {presets.map((preset, index) => (
            <li key={index}>
              {preset.kind === 'fm' ? (
                <PreviewPatchButton
                  isPlaying={preset.voice === playing}
                  label={t('overwriteImport.play', {
                    name: preset.voice.name.trim(),
                    number: numberFormat.format(index + 1),
                  })}
                  markId={differs(index, preset) ? differingId : undefined}
                  name={preset.voice.name}
                  number={index + 1}
                  onClick={() => onPlay(preset.voice, preset.effects)}
                  playingLabel={t('banks.auditioning')}
                />
              ) : (
                <KeptPresetCell number={index + 1} preset={preset} />
              )}
            </li>
          ))}
        </ul>
      </RackPanelCollapsibleBody>
    </section>
  )
}

/** A preset the import leaves out, so its slot keeps the patch it has. */
function KeptPresetCell({
  number,
  preset,
}: {
  number: number
  preset: Exclude<Fm1VaPreset, { kind: 'fm' }>
}) {
  const { t } = useTranslation()
  return (
    <span className="patch-cell flex min-h-9 w-full items-center gap-1.5 border border-dashed border-[var(--crt-line)] px-1.5 py-1 text-[var(--crt-ink-3)]">
      <span className="font-vt323 shrink-0 text-[16px] leading-none">
        {String(number).padStart(2, '0')}
      </span>
      {preset.kind === 'virtual-analog' ? (
        <>
          <span className="font-dot-matrix min-w-0 flex-1 truncate text-[13px] font-bold whitespace-pre">
            {preset.name}
          </span>
          <span aria-hidden="true" className="shrink-0 text-[11px] font-semibold">
            {t('fm1VaImport.virtualAnalogTag')}
          </span>
          <span className="sr-only">{t('fm1VaImport.virtualAnalogPreset')}</span>
        </>
      ) : (
        <span className="truncate text-xs">{t('fm1VaImport.damagedPreset')}</span>
      )}
    </span>
  )
}
