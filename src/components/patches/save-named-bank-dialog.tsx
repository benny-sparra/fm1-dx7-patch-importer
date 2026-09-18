import { Save } from 'lucide-react'
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
import { type NamedBankLibraryDialogProps } from '@/components/patches/named-bank-dialog-types'
import { useWorkspaceBankLabel } from '@/components/patches/workspace-bank-label'
import { ErrorNotice } from '@/components/ui/error-notice'
import { savedBankNameLength } from '@/lib/named-bank'
import { bankDescriptionLength } from '@/lib/patch-library'

export function SaveNamedBankDialog({
  destinationBank,
  library,
  onClose,
}: NamedBankLibraryDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [name, setName] = useState(() => library.bankNames[destinationBank] ?? '')
  const [working, setWorking] = useState(false)
  const bankLabel = useWorkspaceBankLabel(library)

  // The dialog opens as soon as the page shows it, with the bank name ready to type over.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    window.requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
  }, [])

  const reset = () => {
    setDescription('')
    setError('')
    setName('')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setWorking(true)
    setError('')
    try {
      await library.saveNamedBank(destinationBank, name, description)
      dialogRef.current?.close()
    } catch (cause) {
      setError(bankErrorMessage(t, cause, t('namedBanks.operationFailed')))
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <Dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        closeOnBackdrop={!working}
        onCancel={(event) => {
          if (working) event.preventDefault()
        }}
        onClose={() => {
          reset()
          onClose?.()
        }}
        ref={dialogRef}
        size="xl"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>
            {t('namedBanks.saveCurrent', { bank: bankLabel(destinationBank) })}
          </DialogTitle>
          <DialogCloseButton
            disabled={working}
            label={t('common.close')}
            onClick={() => dialogRef.current?.close()}
          />
        </DialogHeader>
        <DialogBody>
          <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]" id={descriptionId}>
            {t('namedBanks.snapshotHelp')}
          </p>

          <form className="grid gap-4 p-5" onSubmit={(event) => void submit(event)}>
            <label className="grid gap-1 text-sm font-semibold">
              {t('namedBanks.name')}
              <input
                autoComplete="off"
                className="h-10 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                maxLength={savedBankNameLength}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('namedBanks.namePlaceholder')}
                ref={nameInputRef}
                required
                value={name}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {t('namedBanks.description')}
              <textarea
                className="min-h-24 resize-y rounded-md border border-input bg-background px-3 py-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                maxLength={bankDescriptionLength}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('namedBanks.descriptionPlaceholder')}
                value={description}
              />
            </label>
            {error ? <ErrorNotice>{error}</ErrorNotice> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button disabled={working} type="submit">
                <Save />
                {t('namedBanks.save')}
              </Button>
            </div>
          </form>
        </DialogBody>
      </Dialog>
    </>
  )
}
