import { Save } from 'lucide-react'
import { type FormEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogCloseButton, DialogHeader } from '@/components/ui/dialog'
import { type NamedBankLibraryDialogProps } from '@/components/patches/named-bank-dialog-types'

export function SaveNamedBankDialog({
  destinationBank,
  library,
  onClose,
}: NamedBankLibraryDialogProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [working, setWorking] = useState(false)
  const currentBankLoaded = library.loadedBanks.includes(destinationBank)

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
      setError(cause instanceof Error ? cause.message : t('namedBanks.operationFailed'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <button
        className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
        disabled={!currentBankLoaded}
        onClick={() => {
          setName(library.bankNames[destinationBank] ?? '')
          dialogRef.current?.showModal()
          window.requestAnimationFrame(() => {
            nameInputRef.current?.focus()
            nameInputRef.current?.select()
          })
        }}
        title={currentBankLoaded ? undefined : t('banks.importFirst', { bank: destinationBank })}
        type="button"
      >
        <Save className="size-4" />
        {t('namedBanks.save')}
      </button>

      <Dialog
        aria-describedby="save-named-bank-description"
        aria-labelledby="save-named-bank-title"
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
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold" id="save-named-bank-title">
              <Save className="size-5 text-primary" />
              {t('namedBanks.saveCurrent', { bank: destinationBank })}
            </h2>
            <p
              className="font-vt323 mt-1 text-lg text-muted-foreground"
              id="save-named-bank-description"
            >
              {t('namedBanks.snapshotHelp')}
            </p>
          </div>
          <DialogCloseButton
            disabled={working}
            label={t('common.close')}
            onClick={() => dialogRef.current?.close()}
          />
        </DialogHeader>

        <form className="grid gap-4 p-5" onSubmit={(event) => void submit(event)}>
          <label className="grid gap-1 text-sm font-semibold">
            {t('namedBanks.name')}
            <input
              autoComplete="off"
              className="h-10 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={80}
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
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('namedBanks.descriptionPlaceholder')}
              value={description}
            />
          </label>
          {error ? (
            <p
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={working} type="submit">
              <Save />
              {t('namedBanks.save')}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
