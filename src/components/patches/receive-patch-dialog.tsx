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
import { Dx7BankFileError, type Dx7Voice } from '@/lib/dx7'
import type { Dx7VoiceFileError } from '@/lib/dx7-voice-file'
import type { Dx7VoiceReceipt } from '@/lib/dx7-voice-receiver'
import { patchSlotCode, type PatchLibrarySnapshot } from '@/lib/patch-library'

type ReceivePatchDialogProps = {
  /** The name of the slot's bank, which a received 32-voice bank is offered to. */
  bankName: string
  library: Pick<PatchLibrary, 'replaceVoice'>
  midi: Parameters<typeof useDx7VoiceReceiver>[0]
  onClose: () => void
  /** Hands a received bank on to the DX7 bank import, which shows it and asks before replacing. */
  onImportBank: (voices: Dx7Voice[]) => void
  onReplaced: (voice: Dx7Voice, changed: PatchLibrarySnapshot | null) => void
  patch: Patch
}

/** Explains a dump that arrived but is not a DX7 patch or bank, in the interface language. */
function receivedErrorMessage(t: TFunction, error: Dx7BankFileError | Dx7VoiceFileError) {
  const isBank = error instanceof Dx7BankFileError
  switch (error.problem) {
    case 'checksum':
    case 'high-bit-data':
      return t(isBank ? 'receivePatch.errors.bankDamaged' : 'receivePatch.errors.damaged')
    case 'bank':
    case 'format':
    case 'size':
    case 'too-large':
      return t('receivePatch.errors.format')
  }
}

/**
 * Listens on the selected MIDI input for a DX7 single-voice dump, from Dexed, a DX7, or another
 * editor, and confirms replacing one slot with it. A 32-voice bank, such as a stock FM1 on V16
 * sends with Export, is offered to the slot's bank through the DX7 bank import instead. It sends
 * nothing, and listens only while open. It opens as soon as it is rendered and reports closing, so
 * the page can drop it.
 */
export function ReceivePatchDialog({
  bankName,
  library,
  midi,
  onClose,
  onImportBank,
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
  const bank = receipt?.kind === 'bank' ? receipt.voices : null

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

  const importBank = () => {
    if (!bank) return
    dialogRef.current?.close()
    onImportBank(bank)
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
            ) : bank ? (
              <p>{t('receivePatch.receivedBank', { patch: bank[0].name.trim() })}</p>
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
            that describes it says what it waits for. A bank replaces nothing here: the import it
            opens shows the bank and asks first. */}
        {bank ? (
          <Button
            aria-describedby={statusId}
            key="bank"
            onClick={importBank}
            type="button"
            variant="default"
          >
            <Upload aria-hidden="true" />
            <span>{t('receivePatch.importBank', { bank: bankName })}</span>
          </Button>
        ) : (
          <Button
            aria-describedby={statusId}
            aria-disabled={!voice || undefined}
            key="voice"
            onClick={replace}
            type="button"
            variant="destructive"
          >
            <Upload aria-hidden="true" />
            <span>{t('receivePatch.action')}</span>
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  )
}
