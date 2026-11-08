import { Save } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import '@/i18n/librarian-dialogs'
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
import { useToast } from '@/components/ui/toast'
import { WarningNotice } from '@/components/ui/warning-notice'
import type { Patch } from '@/data/patches'
import { useSmk37PresetWrite, type Smk37PresetWriteResult } from '@/hooks/use-smk37-preset-write'
import type { Dx7Voice } from '@/lib/dx7'
import { patchSlotCode } from '@/lib/patch-library'

type WriteSmk37PatchDialogProps = {
  midi: Parameters<typeof useSmk37PresetWrite>[0]
  onClose: () => void
  patch: Patch
  voice: Dx7Voice
}

type FailureReason = Extract<Smk37PresetWriteResult, { ok: false }>['reason']

const failureKeys = {
  no_output: 'smk37Write.noOutput',
  sysex_unavailable: 'smk37Write.sysexUnavailable',
  transport: 'smk37Write.failed',
  unsupported: 'smk37Write.failed',
} as const satisfies Record<FailureReason, string>

/**
 * Writes one patch over the preset selected on the SMK-37, which saves a DX7 single-voice dump for
 * good and cannot be told which preset to replace or back its presets up
 * (docs/hardware-runs/smk37-2026-11-08.md). So the user selects the preset on the keyboard first,
 * and the dialog says the write cannot be undone before anything is sent. It opens as soon as it
 * is rendered and reports closing, so the page can drop it.
 */
export function WriteSmk37PatchDialog({ midi, onClose, patch, voice }: WriteSmk37PatchDialogProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const writeSelectedPreset = useSmk37PresetWrite(midi)
  const titleId = useId()
  const stepId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState<FailureReason | null>(null)
  const [writing, setWriting] = useState(false)
  const closeDialog = () => dialogRef.current?.close()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
  }, [])

  const write = async () => {
    if (writing) return
    setError(null)
    setWriting(true)
    const result = await writeSelectedPreset(voice)
    setWriting(false)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    closeDialog()
    toast.success(t('smk37Write.written', { patch: patch.name }))
  }

  return (
    <Dialog
      aria-describedby={stepId}
      aria-labelledby={titleId}
      closeOnBackdrop={!writing}
      onCancel={(event) => {
        if (writing) event.preventDefault()
      }}
      onClose={onClose}
      ref={dialogRef}
      size="md"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>
          {t('smk37Write.title', { patch: patch.name, slot: patchSlotCode(patch) })}
        </DialogTitle>
        <DialogCloseButton disabled={writing} label={t('common.close')} onClick={closeDialog} />
      </DialogHeader>
      <DialogBody>
        <div className="grid gap-4 p-5">
          <p className="text-sm leading-6 text-[var(--crt-ink-2)]" id={stepId}>
            {t('smk37Write.step')}
          </p>
          <WarningNotice>
            <p>{t('smk37Write.warning')}</p>
          </WarningNotice>
          {error ? <ErrorNotice>{t(failureKeys[error])}</ErrorNotice> : null}
        </div>
      </DialogBody>
      <DialogFooter>
        <span className="sr-only" role="status">
          {writing ? t('smk37Write.writing') : ''}
        </span>
        <Button
          aria-disabled={writing || undefined}
          onClick={() => void write()}
          type="button"
          variant="danger"
        >
          <Save />
          <span>{writing ? t('smk37Write.writing') : t('smk37Write.action')}</span>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
