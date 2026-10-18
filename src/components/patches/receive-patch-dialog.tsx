import type { TFunction } from 'i18next'
import { Upload } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
import { InfoNotice } from '@/components/ui/info-notice'
import { WarningNotice } from '@/components/ui/warning-notice'
import type { Patch } from '@/data/patches'
import { useDx7VoiceReceiver } from '@/hooks/use-dx7-voice-receiver'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import '@/i18n/librarian-dialogs'
import type { Dx7Voice } from '@/lib/dx7'
import type { Dx7VoiceFileError } from '@/lib/dx7-voice-file'
import type { Dx7VoiceReceipt } from '@/lib/dx7-voice-receiver'
import { patchSlotCode, type PatchLibrarySnapshot } from '@/lib/patch-library'

type ReceivePatchDialogProps = {
  library: Pick<PatchLibrary, 'replaceVoice'>
  midi: Parameters<typeof useDx7VoiceReceiver>[0]
  onClose: () => void
  onReplaced: (voice: Dx7Voice, changed: PatchLibrarySnapshot | null) => void
  patch: Patch
}

/** Explains a dump that arrived but is not a DX7 patch, in the interface language. */
function receivedErrorMessage(t: TFunction, error: Dx7VoiceFileError) {
  switch (error.problem) {
    case 'bank':
      return t('receivePatch.errors.bank')
    case 'checksum':
    case 'high-bit-data':
      return t('receivePatch.errors.damaged')
    case 'format':
    case 'size':
      return t('receivePatch.errors.format')
  }
}

/**
 * Listens on the selected MIDI input for a DX7 single-voice dump, from Dexed, a DX7, or another
 * editor, and confirms replacing one slot with it. It sends nothing, and listens only while open.
 * It opens as soon as it is rendered and reports closing, so the page can drop it.
 */
export function ReceivePatchDialog({
  library,
  midi,
  onClose,
  onReplaced,
  patch,
}: ReceivePatchDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const statusId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [receipt, setReceipt] = useState<Dx7VoiceReceipt | null>(null)
  const state = useDx7VoiceReceiver(midi, setReceipt)
  const voice = receipt?.kind === 'voice' ? receipt.voice : null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
  }, [])

  const replace = () => {
    if (!voice) return
    const changed = library.replaceVoice(patch.bank, patch.number, voice)
    dialogRef.current?.close()
    onReplaced(voice, changed)
  }

  return (
    <Dialog aria-labelledby={titleId} onClose={onClose} ref={dialogRef} size="md">
      <DialogHeader>
        <DialogTitle id={titleId}>
          {t('receivePatch.title', { patch: patch.name, slot: patchSlotCode(patch) })}
        </DialogTitle>
        <DialogCloseButton label={t('common.close')} onClick={() => dialogRef.current?.close()} />
      </DialogHeader>
      <DialogBody>
        <div className="grid gap-5 p-5">
          {/* Stays mounted, so a screen reader hears each change, and describes the action. */}
          <div className="text-sm" id={statusId} role="status">
            {voice ? (
              <p>{t('receivePatch.received', { patch: voice.name.trim() })}</p>
            ) : state === 'listening' ? (
              <p>{t('receivePatch.listening')}</p>
            ) : (
              <InfoNotice>
                <p>{t(state === 'no-input' ? 'receivePatch.noInput' : 'receivePatch.noSysex')}</p>
              </InfoNotice>
            )}
          </div>
          {voice ? (
            <WarningNotice>
              <p>{t('receivePatch.warning')}</p>
            </WarningNotice>
          ) : null}
          {receipt?.kind === 'error' ? (
            <ErrorNotice>{receivedErrorMessage(t, receipt.error)}</ErrorNotice>
          ) : null}
        </div>
      </DialogBody>
      <DialogFooter>
        {/* Not `disabled` before a patch arrives, so the keyboard can reach it and the status
            that describes it says what it waits for. */}
        <Button
          aria-describedby={statusId}
          aria-disabled={!voice || undefined}
          onClick={replace}
          type="button"
          variant="destructive"
        >
          <Upload aria-hidden="true" />
          <span>{t('receivePatch.action')}</span>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
