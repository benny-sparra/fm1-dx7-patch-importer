import { type RefObject, useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { sequencerNamespace } from '@/i18n/sequencer'

type SequencerSendDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>
  onCancel: () => void
  onConfirm: () => void
  sending: boolean
  stepCount: number
  stepsSent: number
}

/**
 * The pre-flight before a pattern is played into the FM1.
 *
 * It names what the user has to do on the device, because the editor cannot arm recording, choose
 * the pattern or set Step length, and it says plainly that the whole pattern is replaced. While a
 * pass is running the dialog stays open and refuses Escape and backdrop clicks: a transmit that
 * loses its progress and cancel controls halfway through would leave the device half-overwritten
 * with nothing on screen to say so.
 */
export function SequencerSendDialog({
  dialogRef,
  onCancel,
  onConfirm,
  sending,
  stepCount,
  stepsSent,
}: SequencerSendDialogProps) {
  const { t } = useTranslation(sequencerNamespace)
  const titleId = useId()

  return (
    <Dialog
      aria-labelledby={titleId}
      closeOnBackdrop={!sending}
      onCancel={(event) => {
        if (sending) event.preventDefault()
      }}
      ref={dialogRef}
      size="lg"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>{t('send.heading')}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div className="grid gap-3 px-5 py-4 text-sm leading-6">
          <p>{t('send.arm')}</p>
          <ol className="ml-4 grid list-decimal gap-1">
            <li>{t('send.armPattern')}</li>
            <li>{t('send.armStepLength', { steps: stepCount })}</li>
            <li>{t('send.armTranspose')}</li>
            <li>{t('send.armRecord')}</li>
          </ol>
          <p className="text-destructive">{t('send.replaces')}</p>
          <p>{t('send.keys')}</p>
          {sending ? (
            <p aria-live="polite" role="status">
              {t('send.sending', { step: Math.min(stepsSent + 1, stepCount), steps: stepCount })}
            </p>
          ) : null}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onCancel} type="button" variant="outline">
          {sending ? t('send.stop') : t('send.cancel')}
        </Button>
        <Button disabled={sending} onClick={onConfirm} type="button">
          {t('send.confirm')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
