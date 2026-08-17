import { Info } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogCloseButton, DialogHeader } from '@/components/ui/dialog'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import {
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
        aria-describedby="bank-information-description"
        aria-labelledby="bank-information-title"
        onClose={() => {
          reset()
          onClose()
        }}
        ref={dialogRef}
        size="xl"
      >
        <DialogHeader>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold" id="bank-information-title">
              <Info className="size-5 text-primary" />
              {t('banks.bankInformation')}
            </h2>
            <p className="font-vt323 mt-1 text-lg text-muted-foreground" id="bank-information-description">
              {t('banks.bankInformationHelp')}
            </p>
          </div>
          <DialogCloseButton
            label={t('common.close')}
            onClick={() => dialogRef.current?.close()}
          />
        </DialogHeader>

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
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('namedBanks.descriptionPlaceholder')}
              value={description}
            />
          </label>
          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit">
              {t('namedBanks.update')}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
