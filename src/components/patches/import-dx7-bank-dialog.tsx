import { Upload } from 'lucide-react'
import { type FormEvent, useEffect, useEffectEvent, useRef, useState, useId } from 'react'
import { useTranslation } from 'react-i18next'

import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { BankFileScreen, useWizardScreens, WizardFooter } from '@/components/patches/bank-wizard'
import { FileBankPicker, firstReadableBank } from '@/components/patches/file-bank-picker'
import { PreviewPatchButton } from '@/components/patches/preview-patch-button'
import { undoToastOptions } from '@/components/patches/undo-toast'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { ErrorNotice } from '@/components/ui/error-notice'
import { LoadFailedNotice } from '@/components/ui/load-failed-notice'
import { WarningNotice } from '@/components/ui/warning-notice'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import '@/i18n/librarian-dialogs'
import { trackAnalyticsEvent } from '@/lib/analytics'
import type { Dx7Voice } from '@/lib/dx7'

type ImportDx7BankDialogProps = {
  bank: string
  bankName: string
  /** A file already chosen, as when one joining several banks was picked for an empty bank. */
  initialFile?: File
  library: Pick<PatchLibrary, 'importBank' | 'undoChange'>
  onClose: () => void
  /** Plays a patch through the FM1 edit buffer with the default effects, as a search result is. */
  onPlay: (voice: Dx7Voice) => void
  /** Whether the bank has patches the import replaces. */
  replacing: boolean
}

// One screen for each decision: the file, the bank in it when it joins several, and then its
// patches, heard before anything is replaced.
type Screen = 'file' | 'fileBank' | 'preview'

const screenHelpKeys = {
  file: 'banks.addBankFileHelp',
  fileBank: 'banks.addBankFileBankHelp',
  preview: 'overwriteImport.previewHelp',
} as const

export function ImportDx7BankDialog({
  bank,
  bankName,
  initialFile,
  library,
  onClose,
  onPlay,
  replacing,
}: ImportDx7BankDialogProps) {
  const { i18n, t } = useTranslation()
  // The actions sit in the pinned footer, outside the form, and submit it by its id.
  const formId = useId()
  const toast = useToast()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState('')
  const [readerUnavailable, setReaderUnavailable] = useState(false)
  const [file, setFile] = useState<File | null>(initialFile ?? null)
  // The chosen file's banks, read as soon as it is chosen so they can be heard before anything is
  // replaced, with null for a damaged one. Each voice keeps one object while the dialog is open, so
  // playing a patch twice sends it once.
  const [banks, setBanks] = useState<(Dx7Voice[] | null)[] | null>(null)
  const [chosenBank, setChosenBank] = useState(0)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const readingFile = useRef<File | null>(null)
  const voices = banks?.[chosenBank] ?? null
  // A file not yet read is taken for one that joins several, so its screen offers Next, and the
  // bank screen goes once the file says otherwise.
  const joinsSeveral = banks === null || banks.length > 1

  const screens: Screen[] = ['file', ...(joinsSeveral ? (['fileBank'] as const) : []), 'preview']
  const { focusFirstControl, formRef, goToScreen, isLastScreen, screen, screenIndex } =
    useWizardScreens(screens, {
      // A file chosen before the dialog opened has been chosen already, so it opens on its banks.
      initialIndex: initialFile ? 1 : 0,
      onMove: () => setError(''),
    })
  // The file screen moves on once the file is read, even when every bank in it is damaged, so the
  // bank screen can say so; the later screens need a bank to import.
  const screenReady = screen === 'file' ? banks !== null : voices !== null

  // The librarian mounts this dialog only while it is wanted, so it opens itself as it appears and
  // its state is discarded with it rather than being reset by hand.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
  }, [])

  const readFile = async (chosen: File | null) => {
    readingFile.current = chosen
    setFile(chosen)
    setBanks(null)
    setPlayingIndex(null)
    setError('')
    if (!chosen) return

    let archive: typeof import('@/lib/dx7-bank-archive')
    try {
      archive = await import('@/lib/dx7-bank-archive')
    } catch {
      if (readingFile.current === chosen) setReaderUnavailable(true)
      return
    }
    try {
      const read = (await archive.readDx7BankArchive(chosen)).map((fileBank) => fileBank.voices)
      // A file chosen while this one was being read replaces it.
      if (readingFile.current !== chosen) return
      setBanks(read)
      setChosenBank(firstReadableBank(read))
    } catch (cause) {
      if (readingFile.current === chosen) {
        setError(bankErrorMessage(t, cause, t('banks.importFailed')))
      }
    }
  }

  const readInitialFile = useEffectEvent(() => {
    if (initialFile) void readFile(initialFile)
  })
  useEffect(() => {
    readInitialFile()
  }, [])

  const chooseBank = (index: number) => {
    setChosenBank(index)
    setPlayingIndex(null)
  }

  const play = (index: number) => {
    const voice = voices?.[index]
    if (!voice) return
    onPlay(voice)
    setPlayingIndex(index)
  }

  const importVoices = (imported: Dx7Voice[]) => {
    setError('')
    try {
      const changed = library.importBank(bank, imported)
      trackAnalyticsEvent({ data: { source: 'file' }, name: 'bank_imported' })
      toast.success(
        t('toasts.bankImported', { bank: bankName }),
        undoToastOptions(t, library, changed),
      )
      dialogRef.current?.close()
    } catch (cause) {
      setError(bankErrorMessage(t, cause, t('banks.importFailed')))
    }
  }

  // Enter in a field, like the footer's button, moves on, and imports the bank on the last screen.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!screenReady) return
    if (isLastScreen) importVoices(voices!)
    else goToScreen(screenIndex + 1)
  }

  return (
    <Dialog
      aria-describedby="import-dx7-bank-description"
      aria-labelledby="import-dx7-bank-title"
      onClose={onClose}
      onToggle={(event) => {
        if (!event.currentTarget.open) return
        window.requestAnimationFrame(focusFirstControl)
      }}
      ref={dialogRef}
      size="2xl"
    >
      <DialogHeader>
        <DialogTitle id="import-dx7-bank-title">
          {replacing
            ? t('overwriteImport.title', { bank: bankName })
            : t('overwriteImport.titleEmpty', { bank: bankName })}
        </DialogTitle>
        <DialogCloseButton label={t('common.close')} onClick={() => dialogRef.current?.close()} />
      </DialogHeader>
      <DialogBody>
        <p
          className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]"
          id="import-dx7-bank-description"
        >
          {t(screenHelpKeys[screen])}
        </p>

        <form className="grid gap-5 p-5" id={formId} noValidate onSubmit={submit} ref={formRef}>
          {screen === 'file' ? (
            <BankFileScreen file={file} onChoose={(chosen) => void readFile(chosen)} />
          ) : null}

          {screen === 'fileBank' && banks ? (
            <FileBankPicker banks={banks} chosen={chosenBank} onChoose={chooseBank} />
          ) : null}

          {screen === 'preview' && voices ? (
            <>
              {replacing ? (
                <WarningNotice>
                  <p>{t('overwriteImport.warning')}</p>
                </WarningNotice>
              ) : null}
              <section aria-labelledby="import-dx7-bank-preview-title" className="grid gap-2">
                <h3 className="text-sm font-semibold" id="import-dx7-bank-preview-title">
                  {t('overwriteImport.previewTitle')}
                </h3>
                <ul className="dither-well grid grid-cols-2 gap-1 border border-[var(--crt-line-dk)] p-2 sm:grid-cols-4">
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
            </>
          ) : null}

          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
          {readerUnavailable ? <LoadFailedNotice message={t('banks.bankFileUnavailable')} /> : null}
        </form>
      </DialogBody>
      <WizardFooter
        action={
          isLastScreen
            ? {
                icon: <Upload />,
                label: replacing ? t('overwriteImport.action') : t('overwriteImport.actionEmpty'),
                variant: replacing ? 'destructive' : 'default',
              }
            : null
        }
        disabled={!screenReady}
        formId={formId}
        onBack={() => goToScreen(screenIndex - 1)}
        screenIndex={screenIndex}
        working={false}
      />
    </Dialog>
  )
}
