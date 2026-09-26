import { TriangleAlert, Upload } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { undoToastOptions } from '@/components/patches/undo-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { ErrorNotice } from '@/components/ui/error-notice'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { readDx7BankFile, type Dx7Voice } from '@/lib/dx7'
import { sysexFileAccept } from '@/lib/sysex-file'
import { cn } from '@/lib/utils'

type ImportDx7BankDialogProps = {
  bank: string
  bankName: string
  library: Pick<PatchLibrary, 'importBank' | 'undoChange'>
  onClose: () => void
  /** Plays a patch through the FM1 edit buffer with the default effects, as a search result is. */
  onPlay: (voice: Dx7Voice) => void
}

export function ImportDx7BankDialog({
  bank,
  bankName,
  library,
  onClose,
  onPlay,
}: ImportDx7BankDialogProps) {
  const { i18n, t } = useTranslation()
  const toast = useToast()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [working, setWorking] = useState(false)
  // The chosen file's patches, read as soon as it is chosen so they can be heard before anything
  // is replaced. Each voice keeps one object while the dialog is open, so playing a patch twice
  // sends it once.
  const [voices, setVoices] = useState<Dx7Voice[] | null>(null)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const readingFile = useRef<File | null>(null)

  // The librarian mounts this dialog only while it is wanted, so it opens itself as it appears and
  // its state is discarded with it rather than being reset by hand.
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null
    readingFile.current = chosen
    setFile(chosen)
    setVoices(null)
    setPlayingIndex(null)
    setError('')
    if (!chosen) return

    try {
      const read = await readDx7BankFile(chosen)
      // A file chosen while this one was being read replaces it.
      if (readingFile.current === chosen) setVoices(read)
    } catch (cause) {
      if (readingFile.current === chosen) {
        setError(bankErrorMessage(t, cause, t('banks.importFailed')))
      }
    }
  }

  const play = (index: number) => {
    const voice = voices?.[index]
    if (!voice) return
    onPlay(voice)
    setPlayingIndex(index)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file || !voices) return

    setWorking(true)
    setError('')
    try {
      const changed = await library.importBank(bank, file)
      trackAnalyticsEvent({ data: { source: 'file' }, name: 'bank_imported' })
      toast.success(
        t('toasts.bankImported', { bank: bankName }),
        undoToastOptions(t, library, changed),
      )
      dialogRef.current?.close()
    } catch (cause) {
      setError(bankErrorMessage(t, cause, t('banks.importFailed')))
    } finally {
      setWorking(false)
    }
  }

  return (
    <Dialog
      aria-describedby="import-dx7-bank-description"
      aria-labelledby="import-dx7-bank-title"
      closeOnBackdrop={!working}
      onCancel={(event) => {
        if (working) event.preventDefault()
      }}
      onClose={onClose}
      onToggle={(event) => {
        if (!event.currentTarget.open) return
        window.requestAnimationFrame(() => fileInputRef.current?.focus())
      }}
      ref={dialogRef}
      size="2xl"
    >
      <DialogHeader>
        <DialogTitle id="import-dx7-bank-title">
          {t('overwriteImport.title', { bank: bankName })}
        </DialogTitle>
        <DialogCloseButton
          disabled={working}
          label={t('common.close')}
          onClick={() => dialogRef.current?.close()}
        />
      </DialogHeader>
      <DialogBody>
        <p
          className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]"
          id="import-dx7-bank-description"
        >
          {t('overwriteImport.help')}
        </p>

        <form className="grid gap-5 p-5" onSubmit={(event) => void submit(event)}>
          <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
            <p>{t('overwriteImport.warning')}</p>
          </div>

          <label className="grid gap-2 text-sm font-semibold">
            {t('banks.soundData')}
            <span className="modal-input-surface flex min-h-11 cursor-pointer items-center rounded-md border border-dashed border-input px-3 font-normal transition-colors hover:bg-muted/50">
              <span className="min-w-0 truncate">{file?.name ?? t('banks.chooseSysexFile')}</span>
              <input
                accept={sysexFileAccept}
                className="sr-only"
                disabled={working}
                onChange={(event) => void chooseFile(event)}
                ref={fileInputRef}
                type="file"
              />
            </span>
          </label>

          {voices ? (
            <section aria-labelledby="import-dx7-bank-preview-title" className="grid gap-2">
              <h3 className="text-sm font-semibold" id="import-dx7-bank-preview-title">
                {t('overwriteImport.previewTitle')}
              </h3>
              <p className="text-xs text-[var(--crt-ink-3)]">{t('overwriteImport.previewHelp')}</p>
              <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                {voices.map((voice, index) => (
                  <li key={index}>
                    <PreviewPatchButton
                      isPlaying={index === playingIndex}
                      label={t('overwriteImport.play', {
                        name: voice.name.trim(),
                        number: new Intl.NumberFormat(i18n.resolvedLanguage).format(index + 1),
                      })}
                      name={voice.name}
                      number={index + 1}
                      onClick={() => play(index)}
                      playingLabel={t('banks.auditioning')}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {error ? <ErrorNotice>{error}</ErrorNotice> : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={working || !voices} type="submit" variant="destructive">
              <Upload />
              <span>{working ? t('banks.importing') : t('overwriteImport.action')}</span>
            </Button>
          </div>
        </form>
      </DialogBody>
    </Dialog>
  )
}

type PreviewPatchButtonProps = {
  isPlaying: boolean
  label: string
  name: string
  number: number
  onClick: () => void
  playingLabel: string
}

function PreviewPatchButton({
  isPlaying,
  label,
  name,
  number,
  onClick,
  playingLabel,
}: PreviewPatchButtonProps) {
  return (
    <button
      aria-current={isPlaying ? 'true' : undefined}
      aria-label={label}
      className={cn(
        'patch-cell flex min-h-9 w-full cursor-pointer items-center gap-1.5 border px-1.5 py-1 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)]',
        isPlaying
          ? 'border-[var(--crt-acc)] bg-[var(--crt-sel-bg)]'
          : 'border-[var(--crt-line)] bg-[var(--crt-bg-panel3)] hover:bg-[var(--crt-bg-head)]',
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          'font-vt323 shrink-0 text-[16px] leading-none',
          isPlaying ? 'text-[var(--crt-acc-br)]' : 'text-[var(--crt-acc-lt)]',
        )}
      >
        {String(number).padStart(2, '0')}
      </span>
      <span
        className={cn(
          'font-dot-matrix min-w-0 truncate text-[13px] font-bold whitespace-pre',
          isPlaying ? 'text-white' : 'text-[var(--crt-ink)]',
        )}
      >
        {name}
      </span>
      {isPlaying ? <span className="sr-only">{playingLabel}</span> : null}
    </button>
  )
}
