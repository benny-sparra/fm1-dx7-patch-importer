import { TriangleAlert, Upload } from 'lucide-react'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorNotice } from '@/components/ui/error-notice'
import { useToast } from '@/components/ui/toast'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { trackAnalyticsEvent } from '@/lib/analytics'
import type { Dx7Voice } from '@/lib/dx7'
import {
  Fm1VaPresetFileError,
  type Fm1VaPresetBank,
  type Fm1VaPresetFileBank,
  fm1VaPresetFileSize,
  readFm1VaPresetFile,
} from '@/lib/fm1-va-preset-file'
import { sysexFileAccept } from '@/lib/sysex-file'

type ImportFm1VaPresetsDialogProps = {
  library: Pick<PatchLibrary, 'bankNames' | 'importFetchedBanks' | 'undoChange' | 'workspaceBanks'>
  onClose: () => void
  /** Plays a patch through the FM1 edit buffer with the default effects, as a search result is. */
  onPlay: (voice: Dx7Voice) => void
}

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

/** The banks a file can fill: those with at least one preset that could be read. */
function readableBanks(banks: readonly Fm1VaPresetFileBank[]) {
  return banks.filter(({ voices }) => voices.some(Boolean)).map(({ bank }) => bank)
}

export function ImportFm1VaPresetsDialog({
  library,
  onClose,
  onPlay,
}: ImportFm1VaPresetsDialogProps) {
  const { i18n, t } = useTranslation()
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
  const [chosenBanks, setChosenBanks] = useState<ReadonlySet<Fm1VaPresetBank>>(new Set())
  const [playing, setPlaying] = useState<Dx7Voice | null>(null)
  const readingFile = useRef<File | null>(null)

  // The librarian mounts this dialog only while it is wanted, so it opens itself as it appears and
  // its state is discarded with it rather than being reset by hand.
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const listFormat = new Intl.ListFormat(i18n.resolvedLanguage, { type: 'conjunction' })
  const damagedCount = banks?.flatMap(({ voices }) => voices).filter((voice) => !voice).length ?? 0
  const takenBanks = banks?.filter(({ bank }) => chosenBanks.has(bank)) ?? []

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null
    readingFile.current = chosen
    setFile(chosen)
    setBanks(null)
    setPlaying(null)
    setError('')
    if (!chosen) return

    try {
      const read = await readFm1VaPresetFile(chosen)
      // A file chosen while this one was being read replaces it.
      if (readingFile.current !== chosen) return
      setBanks(read)
      setChosenBanks(new Set(readableBanks(read)))
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

  const play = (voice: Dx7Voice) => {
    onPlay(voice)
    setPlaying(voice)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (takenBanks.length === 0) return

    setError('')
    try {
      const changed = library.importFetchedBanks(takenBanks)
      trackAnalyticsEvent({ data: { source: 'fm1_va_backup' }, name: 'bank_imported' })
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

        <form className="grid gap-5 p-5" onSubmit={submit}>
          <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
            <p>{t('fm1VaImport.warning')}</p>
          </div>

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
            <section aria-labelledby={`${titleId}-preview`} className="grid gap-4">
              <div className="grid gap-1">
                <h3 className="text-sm font-semibold" id={`${titleId}-preview`}>
                  {t('fm1VaImport.previewTitle')}
                </h3>
                <p className="text-xs text-[var(--crt-ink-3)]">{t('fm1VaImport.previewHelp')}</p>
              </div>
              {damagedCount > 0 ? (
                <ErrorNotice>
                  {t('fm1VaImport.damagedPresets', { count: damagedCount })}
                </ErrorNotice>
              ) : null}
              {banks.map(({ bank, voices }) => (
                <PresetFileBank
                  bank={bank}
                  key={bank}
                  libraryBankName={
                    library.workspaceBanks.includes(bank) ? workspaceBankLabel(bank) : null
                  }
                  onPlay={play}
                  onToggle={(taken) => toggleBank(bank, taken)}
                  playing={playing}
                  taken={chosenBanks.has(bank)}
                  voices={voices}
                />
              ))}
            </section>
          ) : null}

          {error ? <ErrorNotice>{error}</ErrorNotice> : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={takenBanks.length === 0} type="submit" variant="destructive">
              <Upload />
              <span>{t('fm1VaImport.action', { count: takenBanks.length })}</span>
            </Button>
          </div>
        </form>
      </DialogBody>
    </Dialog>
  )
}

type PresetFileBankProps = {
  bank: Fm1VaPresetBank
  /** The name of the workspace bank the FM1 bank replaces, or null when it is added. */
  libraryBankName: string | null
  onPlay: (voice: Dx7Voice) => void
  onToggle: (taken: boolean) => void
  playing: Dx7Voice | null
  taken: boolean
  voices: (Dx7Voice | null)[]
}

function PresetFileBank({
  bank,
  libraryBankName,
  onPlay,
  onToggle,
  playing,
  taken,
  voices,
}: PresetFileBankProps) {
  const { i18n, t } = useTranslation()
  const headingId = useId()
  const numberFormat = new Intl.NumberFormat(i18n.resolvedLanguage)
  const readable = voices.some(Boolean)

  return (
    <section aria-labelledby={headingId} className="grid gap-2">
      <div className="grid gap-0.5">
        <h4 className="text-sm font-semibold" id={headingId}>
          {t('fm1VaImport.bankHeading', { bank })}
        </h4>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={taken}
            className="size-4 accent-[var(--crt-acc)]"
            disabled={!readable}
            onChange={(event) => onToggle(event.target.checked)}
            type="checkbox"
          />
          <span>
            {libraryBankName === null
              ? t('fm1VaImport.addBank', { bank })
              : t('fm1VaImport.replaceBank', { name: libraryBankName })}
          </span>
        </label>
      </div>
      <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {voices.map((voice, index) => {
          const number = numberFormat.format(index + 1)
          return (
            <li key={index}>
              {voice ? (
                <PreviewPatchButton
                  isPlaying={voice === playing}
                  label={t('overwriteImport.play', { name: voice.name.trim(), number })}
                  name={voice.name}
                  number={index + 1}
                  onClick={() => onPlay(voice)}
                  playingLabel={t('banks.auditioning')}
                />
              ) : (
                <span className="patch-cell flex min-h-9 w-full items-center gap-1.5 border border-dashed border-[var(--crt-line)] px-1.5 py-1 text-[var(--crt-ink-3)]">
                  <span className="font-vt323 shrink-0 text-[16px] leading-none">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="truncate text-xs">{t('fm1VaImport.damagedPreset')}</span>
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
