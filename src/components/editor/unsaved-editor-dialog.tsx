import { type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader } from '@/components/ui/dialog'

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
      <DialogHeader className="block">
        <h2 className="text-lg font-bold" id="unsaved-editor-title">
          {t('editor.unsavedTitle')}
        </h2>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{t('ui.unsavedBody')}</p>
      </DialogHeader>
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
