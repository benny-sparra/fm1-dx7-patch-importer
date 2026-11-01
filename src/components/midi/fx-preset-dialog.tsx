import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
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
import '@/i18n/fx-presets'

/** Opens its dialog as it mounts, once, and gives focus back to what opened it on unmount. */
function useOpenDialog() {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement
    if (element && !element.open) element.showModal()
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])
  return dialog
}

/** The phone's FX preset list: a sheet whose children get the element a menu opens inside. */
export function FxPresetSheet({
  children,
  onClose,
  title,
}: {
  children: (menuTarget: HTMLElement | null) => ReactNode
  onClose: () => void
  title: string
}) {
  const { t } = useTranslation()
  const dialog = useOpenDialog()
  const titleId = useId()
  const [menuTarget, setMenuTarget] = useState<HTMLElement | null>(null)
  return (
    <Dialog aria-labelledby={titleId} onClose={onClose} ref={dialog} size="sm">
      <DialogHeader>
        <DialogTitle id={titleId}>{title}</DialogTitle>
        <DialogCloseButton label={t('common.close')} onClick={() => dialog.current?.close()} />
      </DialogHeader>
      <DialogBody ref={setMenuTarget}>{children(menuTarget)}</DialogBody>
    </Dialog>
  )
}

/** The one dialog behind the FX presets' New, Rename, and Delete: a form with a pinned action. */
export function FxPresetDialog({
  busy,
  children,
  confirmDisabled = false,
  confirmLabel,
  destructive = false,
  onClose,
  onConfirm,
  title,
}: {
  busy: boolean
  children: ReactNode
  confirmDisabled?: boolean
  confirmLabel: string
  destructive?: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
}) {
  const { t } = useTranslation()
  const dialog = useOpenDialog()
  const titleId = useId()
  const formId = useId()
  const blocked = busy || confirmDisabled

  return (
    <Dialog
      aria-labelledby={titleId}
      closeOnBackdrop={!busy}
      onCancel={(event) => {
        if (busy) event.preventDefault()
      }}
      onClose={onClose}
      ref={dialog}
      size="sm"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>{title}</DialogTitle>
        <DialogCloseButton
          aria-disabled={busy}
          label={t('common.close')}
          onClick={() => {
            if (!busy) dialog.current?.close()
          }}
        />
      </DialogHeader>
      <DialogBody>
        <form
          className="grid gap-4 p-4"
          id={formId}
          onSubmit={(event) => {
            event.preventDefault()
            if (!blocked) onConfirm()
          }}
        >
          {children}
        </form>
      </DialogBody>
      <DialogFooter className="items-center justify-end gap-3">
        <span className="text-sm text-[var(--crt-ink-3)]" role="status">
          {busy ? t('fxPresets.working') : ''}
        </span>
        <Button
          aria-disabled={blocked}
          form={formId}
          type="submit"
          variant={destructive ? 'destructive' : 'default'}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
