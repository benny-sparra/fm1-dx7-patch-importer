import { Info } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
import { type PatchLibrary } from '@/hooks/use-patch-library'
import {
  bankDescriptionLength,
  normalizeWorkspaceBankNameForSave,
  workspaceBankTitleLength,
} from '@/lib/patch-library'

type BankInformationDialogProps = {
  bank: string
  defaultTitle: string
  library: PatchLibrary
  onClose: () => void
}

export function BankInformationDialog({
  bank,
  defaultTitle,
  library,
  onClose,
}: BankInformationDialogProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')

  const reset = () => {
    setDescription('')
    setError('')
    setTitle('')
  }

  return (
    <>
      <button
        className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        onClick={() => {
          setDescription(library.bankDescriptions[bank] ?? '')
          setTitle(library.bankNames[bank] ?? defaultTitle)
          dialogRef.current?.showModal()
          window.requestAnimationFrame(() => {
            titleInputRef.current?.focus()
            titleInputRef.current?.select()
          })
        }}
        type="button"
      >
        <Info className="size-4" />
        {t('banks.bankInformation')}
      </button>

      <Dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        onClose={() => {
          reset()
          onClose()
        }}
        ref={dialogRef}
        size="xl"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>{t('banks.bankInformation')}</DialogTitle>
          <DialogCloseButton label={t('common.close')} onClick={() => dialogRef.current?.close()} />
        </DialogHeader>
        <DialogBody>
          <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]" id={descriptionId}>
            {t('banks.bankInformationHelp')}
          </p>

          <form
            className="grid gap-4 p-5"
            onSubmit={(event) => {
              event.preventDefault()
              const normalizedTitle = normalizeWorkspaceBankNameForSave(title)
              if (!normalizedTitle) {
                setError(t('banks.bankNameRequired'))
                return
              }
              library.updateBankInformation(bank, normalizedTitle, description)
              toast.success(t('toasts.bankUpdated', { bank: normalizedTitle }))
              dialogRef.current?.close()
            }}
          >
            <label className="grid gap-1 text-sm font-semibold">
              {t('namedBanks.name')}
              <input
                autoComplete="off"
                className="h-10 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                maxLength={workspaceBankTitleLength}
                onChange={(event) => setTitle(event.target.value)}
                ref={titleInputRef}
                required
                value={title}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {t('namedBanks.description')}
              <textarea
                className="min-h-28 resize-y rounded-md border border-input bg-background px-3 py-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                maxLength={bankDescriptionLength}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('namedBanks.descriptionPlaceholder')}
                value={description}
              />
            </label>
            {error ? <ErrorNotice>{error}</ErrorNotice> : null}
            <div className="flex justify-end">
              <Button type="submit">{t('namedBanks.update')}</Button>
            </div>
          </form>
        </DialogBody>
      </Dialog>
    </>
  )
}
