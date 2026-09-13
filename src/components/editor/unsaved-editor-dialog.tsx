import { type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogBody, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type UnsavedEditorDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>
  isResolving: boolean
  onClose: () => void
  onDiscard: () => void
  onSave: () => void
}

export function UnsavedEditorDialog({
  dialogRef,
  isResolving,
  onClose,
  onDiscard,
  onSave,
}: UnsavedEditorDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog
      aria-labelledby="unsaved-editor-title"
      closeOnBackdrop={false}
      onClose={onClose}
      ref={dialogRef}
      size="2xl"
    >
      <DialogHeader>
        <DialogTitle id="unsaved-editor-title">{t('editor.unsavedTitle')}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]">{t('ui.unsavedBody')}</p>
      </DialogBody>
      <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end">
        <Button
          className="sm:h-auto sm:min-h-10 sm:min-w-0 sm:flex-1 sm:shrink sm:whitespace-normal"
          disabled={isResolving}
          onClick={() => dialogRef.current?.close()}
          type="button"
          variant="ghost"
        >
          {t('editor.keepEditing')}
        </Button>
        <Button
          className="sm:h-auto sm:min-h-10 sm:min-w-0 sm:flex-1 sm:shrink sm:whitespace-normal"
          disabled={isResolving}
          onClick={onDiscard}
          type="button"
          variant="outline"
        >
          {isResolving ? `${t('editor.discard')}…` : t('editor.discard')}
        </Button>
        <Button
          className="sm:h-auto sm:min-h-10 sm:min-w-0 sm:flex-1 sm:shrink sm:whitespace-normal"
          disabled={isResolving}
          onClick={onSave}
          type="button"
        >
          {t('editor.saveAndReturn')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
