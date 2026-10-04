import { ChevronDown, Download, Square, TriangleAlert, Upload } from 'lucide-react'
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { Fm1VaReadLeds } from '@/components/patches/fm1-va-read-leds'
import { fm1VaReadErrorMessage } from '@/components/patches/fm1-va-read-error-message'
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
import { fm1VaPresetCount, readEveryFm1VaPreset } from '@/lib/fm1-va-preset-read'
import { type FetchedBank, maximumWorkspaceBanks, voiceId } from '@/lib/patch-library'
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
  /**
   * Where the presets come from: read from the FM1, which starts as the dialog opens, or from the
   * file FM-1+VA's "Save a backup" writes. Each has its own menu item, so neither mode mentions
   * the other.
   */
  source: Fm1VaPresetSource
}

/** Where the banks shown came from. */
export type Fm1VaPresetSource = 'file' | 'fm1'

/** Where an FM1 bank goes: a workspace bank's letter, a new bank, or nowhere. */
type Destination = string
const skipBank: Destination = ''
const newBank: Destination = 'new'

/**
 * A new bank's title: the bank's letter on the FM1. It is the same in every language, since a
 * translated one, such as Spanish's, would not fit a bank title's ten characters.
 */
const newBankTitle = (bank: Fm1VaPresetBank) => `FM1 ${bank}`

type DestinationOption = { disabled?: boolean; label: string; value: Destination }

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
  source,
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
  const [destinations, setDestinations] = useState<ReadonlyMap<Fm1VaPresetBank, Destination>>(
    new Map(),
  )
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
  const destinationOf = (bank: Fm1VaPresetBank) => destinations.get(bank) ?? skipBank
  const takenBanks = banks?.filter(({ bank }) => destinationOf(bank) !== skipBank) ?? []
  const differsFromBank = (
    workspaceBank: string | null,
    index: number,
    preset: Fm1VaPreset,
  ): boolean => {
    if (workspaceBank === null) return false
    const id = voiceId(workspaceBank, index + 1)
    return differsFromLibrary(preset, {
      effects: library.effects[id],
      record: library.records[id],
      voice: library.voices[id],
    })
  }
  // A bank is compared with the workspace bank it replaces or, while it is not imported, with the
  // one of the same letter. A new bank replaces nothing, so none of its patches is marked.
  const comparedBank = (bank: Fm1VaPresetBank) => {
    const destination = destinationOf(bank)
    if (destination === newBank) return null
    const compared = destination === skipBank ? bank : destination
    return library.workspaceBanks.includes(compared) ? compared : null
  }
  const differs = (bank: Fm1VaPresetBank, index: number, preset: Fm1VaPreset) =>
    differsFromBank(comparedBank(bank), index, preset)

  const destinationOptions = (bank: Fm1VaPresetBank): DestinationOption[] => {
    const others = [...destinations].filter(([other]) => other !== bank).map(([, to]) => to)
    const newBanks = others.filter((to) => to === newBank).length
    return [
      { label: t('fm1VaImport.skipBank'), value: skipBank },
      ...library.workspaceBanks.map((workspaceBank) => ({
        // Two FM1 banks cannot replace the same bank.
        disabled: others.includes(workspaceBank),
        label: t('fm1VaImport.replaceBank', { name: workspaceBankLabel(workspaceBank) }),
        value: workspaceBank,
      })),
      {
        disabled: library.workspaceBanks.length + newBanks >= maximumWorkspaceBanks,
        label: t('fm1VaImport.addBank'),
        value: newBank,
      },
    ]
  }
  const differingCount =
    banks?.reduce(
      (total, { bank, presets }) =>
        total + presets.filter((preset, index) => differs(bank, index, preset)).length,
      0,
    ) ?? 0

  const showBanks = (read: Fm1VaPresetFileBank[], from: Fm1VaPresetSource) => {
    setBanks(read)
    // Each bank starts going to the workspace bank of the same letter: from the FM1, only when it
    // differs from it; from a file, always, as the file is usually chosen to be imported. A bank
    // the workspace does not have starts as a new bank while there is room for one.
    let room = maximumWorkspaceBanks - library.workspaceBanks.length
    setDestinations(
      new Map(
        read.map((fileBank): [Fm1VaPresetBank, Destination] => {
          const { bank, presets } = fileBank
          if (!hasImportableVoice(fileBank)) return [bank, skipBank]
          if (library.workspaceBanks.includes(bank)) {
            const wanted =
              from === 'file' ||
              presets.some((preset, index) => differsFromBank(bank, index, preset))
            return [bank, wanted ? bank : skipBank]
          }
          if (room <= 0) return [bank, skipBank]
          room -= 1
          return [bank, newBank]
        }),
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
      if (presetRead.current === read) setError(fm1VaReadErrorMessage(t, cause))
    } finally {
      if (presetRead.current === read) {
        presetRead.current = null
        setReadCount(null)
      }
    }
  }

  // Reading from the FM1 starts as the dialog opens, when the ports in use can read.
  const readOnOpen = useEffectEvent(() => {
    if (source === 'fm1' && reader.canRead) void readFromFm1()
  })
  useEffect(() => {
    readOnOpen()
  }, [])

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

  const chooseDestination = (bank: Fm1VaPresetBank, destination: Destination) => {
    setDestinations((current) => new Map(current).set(bank, destination))
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
        takenBanks.map((taken): FetchedBank => {
          const sounds = importableSounds(taken)
          const destination = destinationOf(taken.bank)
          return destination === newBank
            ? { newBankTitle: newBankTitle(taken.bank), sounds }
            : { bank: destination, sounds }
        }),
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
      aria-describedby={source === 'file' ? descriptionId : undefined}
      aria-labelledby={titleId}
      onClose={onClose}
      onToggle={(event) => {
        if (!event.currentTarget.open || source !== 'file') return
        window.requestAnimationFrame(() => fileInputRef.current?.focus())
      }}
      ref={dialogRef}
      size="2xl"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>
          {t(source === 'fm1' ? 'fm1VaImport.titleRead' : 'fm1VaImport.title')}
        </DialogTitle>
        <DialogCloseButton label={t('common.close')} onClick={() => dialogRef.current?.close()} />
      </DialogHeader>
      <DialogBody>
        {source === 'file' ? (
          <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]" id={descriptionId}>
            {t('fm1VaImport.help')}
          </p>
        ) : null}

        <form id={formId} className="grid gap-5 p-5" onSubmit={submit}>
          {source === 'fm1' && !reader.canRead ? (
            <p className="text-sm">{t('fm1VaImport.readUnavailable')}</p>
          ) : null}
          {source === 'fm1' && reader.canRead ? (
            readCount === null ? (
              // The read starts as the dialog opens, so this shows only when it left nothing to
              // import from, after a stop or a failure, to read again.
              banks ? null : (
                <Button
                  className="justify-self-start"
                  onClick={() => void readFromFm1()}
                  type="button"
                  variant="outline"
                >
                  <Download />
                  <span>{t('fm1VaImport.read')}</span>
                </Button>
              )
            ) : (
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <p className="text-xs text-[var(--crt-ink-3)]" id={readingId}>
                    {t('fm1VaImport.reading', {
                      number: Math.min(readCount + 1, fm1VaPresetCount),
                      total: fm1VaPresetCount,
                    })}
                  </p>
                  <progress
                    aria-labelledby={readingId}
                    className="sr-only"
                    max={fm1VaPresetCount}
                    value={readCount}
                  />
                  <Fm1VaReadLeds readCount={readCount} />
                </div>
                <Button
                  className="justify-self-start"
                  onClick={stopReading}
                  type="button"
                  variant="ghost"
                >
                  <Square />
                  <span>{t('fm1VaImport.stopReading')}</span>
                </Button>
              </div>
            )
          ) : null}

          {source === 'file' ? (
            <label className="grid gap-2 text-sm font-semibold">
              {t('fm1VaImport.file')}
              <span className="modal-input-surface flex min-h-11 cursor-pointer items-center rounded-md border border-dashed border-input px-3 font-normal transition-colors hover:bg-muted/50">
                <span className="min-w-0 truncate">
                  {file?.name ?? t('fm1VaImport.chooseFile')}
                </span>
                <input
                  accept={sysexFileAccept}
                  className="sr-only"
                  onChange={(event) => void chooseFile(event)}
                  ref={fileInputRef}
                  type="file"
                />
              </span>
            </label>
          ) : null}

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
                {/* A bank going to a new bank is compared with nothing, so it cannot match. */}
                {differingCount > 0 ? (
                  <p className="text-xs text-[var(--crt-ink-3)]">
                    {t('fm1VaImport.differs', { count: differingCount })}
                  </p>
                ) : banks.every(({ bank }) => comparedBank(bank) !== null) ? (
                  <p className="text-xs text-[var(--crt-ink-3)]">{t('fm1VaImport.allMatch')}</p>
                ) : null}
                {virtualAnalogCount > 0 ? (
                  <p className="text-xs text-[var(--crt-ink-3)]">
                    {t(
                      source === 'fm1'
                        ? 'fm1VaImport.virtualAnalogPresets'
                        : 'fm1VaImport.virtualAnalogPresetsFile',
                      { count: virtualAnalogCount },
                    )}
                  </p>
                ) : null}
              </div>
              {/* Nothing is replaced until a bank is chosen, so the warning waits for the banks. */}
              <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 size-5 shrink-0" />
                <p>{t('fm1VaImport.warning')}</p>
              </div>
              {damagedCount > 0 ? (
                <ErrorNotice>
                  {t('fm1VaImport.damagedPresets', { count: damagedCount })}
                </ErrorNotice>
              ) : null}
              {banks.map((fileBank) => (
                <PresetFileBank
                  destination={destinationOf(fileBank.bank)}
                  destinationOptions={destinationOptions(fileBank.bank)}
                  differs={(index, preset) => differs(fileBank.bank, index, preset)}
                  differingId={differingId}
                  fileBank={fileBank}
                  key={fileBank.bank}
                  onChooseDestination={(destination) =>
                    chooseDestination(fileBank.bank, destination)
                  }
                  onPlay={play}
                  playing={playing}
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
  destination: Destination
  destinationOptions: DestinationOption[]
  /** Whether the preset at `index` differs from the patch in the library slot it would replace. */
  differs: (index: number, preset: Fm1VaPreset) => boolean
  /** The id of the text that describes a patch marked as differing. */
  differingId: string
  fileBank: Fm1VaPresetFileBank
  onChooseDestination: (destination: Destination) => void
  onPlay: (voice: Dx7Voice, effects: Uint8Array) => void
  playing: Dx7Voice | null
}

function PresetFileBank({
  destination,
  destinationOptions,
  differs,
  differingId,
  fileBank,
  onChooseDestination,
  onPlay,
  playing,
}: PresetFileBankProps) {
  const { i18n, t } = useTranslation()
  const headingId = useId()
  const bodyId = useId()
  const destinationId = useId()
  // Banks start folded, so the four fit without scrolling; one is opened to hear its patches.
  const [collapsed, setCollapsed] = useState(true)
  const numberFormat = new Intl.NumberFormat(i18n.resolvedLanguage)
  const { bank, presets } = fileBank
  const title = t('fm1VaImport.bankHeading', { bank })

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
        headingLevel={4}
        id={headingId}
        title={title}
      />
      {/* Below the strip rather than on it, so a long bank name fits at every width and choosing
          a destination never folds the bank. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-[9px] py-2 text-sm">
        <label className="shrink-0 text-[var(--crt-ink-3)]" htmlFor={destinationId}>
          {t('fm1VaImport.destination')}
        </label>
        {/* The app's own chevron, as its other dropdowns draw, in place of the native arrow. */}
        <span className="relative min-w-0 flex-1">
          <select
            className="settings-option-select h-9 w-full appearance-none truncate rounded-md border py-0 pr-8 pl-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            disabled={!hasImportableVoice(fileBank)}
            id={destinationId}
            onChange={(event) => onChooseDestination(event.target.value)}
            value={destination}
          >
            {destinationOptions.map((option) => (
              <option disabled={option.disabled} key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground"
          />
        </span>
      </div>
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
