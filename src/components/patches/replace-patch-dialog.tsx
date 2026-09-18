import type { TFunction } from 'i18next'
import { TriangleAlert, Upload } from 'lucide-react'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type Patch } from '@/data/patches'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { type Dx7Voice } from '@/lib/dx7'
import { Dx7VoiceFileError, readDx7VoiceFile } from '@/lib/dx7-voice-file'
import { patchSlotCode, type PatchLibrarySnapshot } from '@/lib/patch-library'

type ReplacePatchDialogProps = {
  library: Pick<PatchLibrary, 'replaceVoice'>
  onClose: () => void
  onReplaced: (voice: Dx7Voice, changed: PatchLibrarySnapshot | null) => void
  patch: Patch
}

/** Explains a single-voice file that cannot be imported, in the interface language. */
function voiceFileErrorMessage(t: TFunction, error: unknown) {
  if (error instanceof Dx7VoiceFileError) {
    switch (error.problem) {
      case 'bank':
        return t('banks.fileErrors.voiceGotBank')
      case 'checksum':
      case 'high-bit-data':
        return t('banks.fileErrors.damaged')
      // A file of the wrong size or shape is, either way, not a patch file.
      case 'format':
      case 'size':
        return t('banks.fileErrors.voiceFormat')
    }
  }
  return bankErrorMessage(t, error, t('banks.importFailed'))
}

/**
 * Confirms replacing one slot with the voice in a DX7 single-voice file, and reads the file.
 * It opens as soon as it is rendered and reports closing, so the page can drop it.
 */
export function ReplacePatchDialog({
  library,
  onClose,
  onReplaced,
  patch,
}: ReplacePatchDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const warningId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    window.requestAnimationFrame(() => fileInputRef.current?.focus())
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) return

    setWorking(true)
    setError('')
    try {
      const voice = await readDx7VoiceFile(file)
      const changed = library.replaceVoice(patch.bank, patch.number, voice)
      dialogRef.current?.close()
      onReplaced(voice, changed)
    } catch (cause) {
      setError(voiceFileErrorMessage(t, cause))
      setWorking(false)
    }
  }

  return (
    <Dialog
      aria-describedby={warningId}
      aria-labelledby={titleId}
      closeOnBackdrop={!working}
      onCancel={(event) => {
        if (working) event.preventDefault()
      }}
      onClose={onClose}
      ref={dialogRef}
      size="md"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>
          {t('replacePatch.title', { patch: patch.name, slot: patchSlotCode(patch) })}
        </DialogTitle>
        <DialogCloseButton
          disabled={working}
          label={t('common.close')}
          onClick={() => dialogRef.current?.close()}
        />
      </DialogHeader>
      <DialogBody>
        <form className="grid gap-5 p-5" onSubmit={(event) => void submit(event)}>
          <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
            <p id={warningId}>{t('replacePatch.warning')}</p>
          </div>

          <label className="modal-input-surface flex min-h-11 cursor-pointer items-center rounded-md border border-dashed border-input px-3 text-sm transition-colors hover:bg-muted/50">
            <span className="min-w-0 truncate">{file?.name ?? t('banks.chooseSysexFile')}</span>
            <input
              accept=".syx,application/octet-stream"
              aria-label={t('banks.chooseSysexFile')}
              className="sr-only"
              disabled={working}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null)
                setError('')
              }}
              ref={fileInputRef}
              type="file"
            />
          </label>

          {error ? (
            <p
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={working || !file} type="submit" variant="destructive">
              <Upload />
              <span>{t('replacePatch.action')}</span>
            </Button>
          </div>
        </form>
      </DialogBody>
    </Dialog>
  )
}
