import { Copy, Database, Download, FolderOpen, Pencil, Save, Trash2 } from 'lucide-react'
import { type FormEvent, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogCloseButton, DialogHeader } from '@/components/ui/dialog'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import {
  makeNamedBankSysexFile,
  makeNamedBankSysexFilename,
  type NamedBank,
} from '@/lib/named-bank'

type NamedBankLibraryDialogProps = {
  destinationBank: string
  library: PatchLibrary
  onClose?: () => void
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function SaveNamedBankDialog({ destinationBank, library, onClose }: NamedBankLibraryDialogProps) {
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

function LoadNamedBankDialog({ destinationBank, library, onClose }: NamedBankLibraryDialogProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const editNameRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [workingId, setWorkingId] = useState('')
  const [status, setStatus] = useState('')

  const visibleBanks = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return library.namedBanks
    return library.namedBanks.filter((bank) =>
      `${bank.name} ${bank.description}`.toLowerCase().includes(normalized),
    )
  }, [library.namedBanks, query])

  const clearForm = () => {
    setDescription('')
    setEditingId('')
    setName('')
  }

  const reset = () => {
    clearForm()
    setError('')
    setQuery('')
    setStatus('')
  }

  const run = async (id: string, operation: () => Promise<unknown>) => {
    setWorkingId(id)
    setError('')
    setStatus('')
    try {
      await operation()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('namedBanks.operationFailed'))
    } finally {
      setWorkingId('')
    }
  }

  const beginEditing = (bank: NamedBank) => {
    setEditingId(bank.id)
    setName(bank.name)
    setDescription(bank.description)
    setError('')
    setStatus('')
    dialogRef.current?.scrollTo({ behavior: 'smooth', top: 0 })
    window.requestAnimationFrame(() => editNameRef.current?.focus())
  }

  return (
    <>
      <button
        className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        onClick={() => {
          dialogRef.current?.showModal()
          window.requestAnimationFrame(() => searchRef.current?.focus())
        }}
        type="button"
      >
        <Database className="size-4" />
        {t('namedBanks.loadBank')}
      </button>

      <Dialog
        aria-labelledby="named-bank-library-title"
        onClose={() => {
          reset()
          onClose?.()
        }}
        ref={dialogRef}
        size="3xl"
      >
        <DialogHeader className="sticky top-0 z-10">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold" id="named-bank-library-title">
              <Database className="size-5 text-primary" />
              {t('namedBanks.title')}
            </h2>
            <p className="font-vt323 mt-1 text-lg text-muted-foreground">
              {t('namedBanks.intro', { bank: destinationBank })}
            </p>
          </div>
          <DialogCloseButton label={t('common.close')} onClick={() => dialogRef.current?.close()} />
        </DialogHeader>

        <div className="grid gap-5 p-5">
          {editingId ? (
            <form
              className="grid gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4"
              onSubmit={(event) => {
                event.preventDefault()
                const bank = library.namedBanks.find((candidate) => candidate.id === editingId)
                if (!bank) {
                  clearForm()
                  return
                }
                void run(editingId, async () => {
                  await library.updateNamedBankDetails(bank, name, description)
                  clearForm()
                  setStatus(t('namedBanks.updated', { name: name.trim() }))
                })
              }}
            >
              <h3 className="font-bold">{t('namedBanks.editDetails')}</h3>
              <label className="grid gap-1 text-sm font-semibold">
                {t('namedBanks.name')}
                <input
                  autoComplete="off"
                  className="h-10 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('namedBanks.namePlaceholder')}
                  ref={editNameRef}
                  required
                  value={name}
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                {t('namedBanks.description')}
                <textarea
                  className="min-h-20 resize-y rounded-md border border-input bg-background px-3 py-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  maxLength={500}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t('namedBanks.descriptionPlaceholder')}
                  value={description}
                />
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  disabled={workingId !== ''}
                  onClick={clearForm}
                  type="button"
                  variant="outline"
                >
                  {t('common.cancel')}
                </Button>
                <Button disabled={workingId !== ''} type="submit">
                  <Save />
                  {t('namedBanks.update')}
                </Button>
              </div>
            </form>
          ) : null}

          <div className="grid gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-bold">{t('namedBanks.savedBanks')}</h3>
                <p className="font-vt323 text-lg text-muted-foreground">
                  {t('namedBanks.count', { count: library.namedBanks.length })}
                </p>
              </div>
              <input
                aria-label={t('namedBanks.search')}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('namedBanks.search')}
                ref={searchRef}
                type="search"
                value={query}
              />
            </div>

            {library.namedBanksLoading ? (
              <p className="rounded-md border p-4 text-sm text-muted-foreground">
                {t('namedBanks.loading')}
              </p>
            ) : visibleBanks.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                {query ? t('namedBanks.noMatches') : t('namedBanks.empty')}
              </p>
            ) : (
              <ul className="grid gap-2">
                {visibleBanks.map((bank) => (
                  <li className="rounded-md border bg-background p-3" key={bank.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{bank.name}</p>
                        {bank.description ? (
                          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                            {bank.description}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('namedBanks.updatedAt', {
                            date: new Date(bank.updatedAt).toLocaleDateString(),
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1">
                        <Button
                          disabled={workingId !== ''}
                          onClick={() => {
                            library.loadSavedBank(bank, destinationBank)
                            dialogRef.current?.close()
                          }}
                          size="sm"
                          type="button"
                        >
                          <FolderOpen />
                          {t('namedBanks.load')}
                        </Button>
                        <Button
                          aria-label={t('namedBanks.rename', { name: bank.name })}
                          disabled={workingId !== ''}
                          onClick={() => beginEditing(bank)}
                          size="icon"
                          title={t('namedBanks.editDetails')}
                          type="button"
                          variant="ghost"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          aria-label={t('namedBanks.download', { name: bank.name })}
                          disabled={workingId !== ''}
                          onClick={() =>
                            void run(bank.id, async () => {
                              const bytes = makeNamedBankSysexFile(bank)
                              downloadBlob(
                                new Blob([bytes], { type: 'application/octet-stream' }),
                                makeNamedBankSysexFilename(bank),
                              )
                              setStatus(t('namedBanks.downloaded', { name: bank.name }))
                            })
                          }
                          size="icon"
                          title={t('namedBanks.downloadAction')}
                          type="button"
                          variant="ghost"
                        >
                          <Download />
                        </Button>
                        <Button
                          aria-label={t('namedBanks.duplicate', { name: bank.name })}
                          disabled={workingId !== ''}
                          onClick={() =>
                            void run(bank.id, async () => {
                              const copy = await library.copyNamedBank(bank)
                              setStatus(t('namedBanks.copied', { name: copy.name }))
                            })
                          }
                          size="icon"
                          title={t('namedBanks.duplicateAction')}
                          type="button"
                          variant="ghost"
                        >
                          <Copy />
                        </Button>
                        <Button
                          aria-label={t('namedBanks.delete', { name: bank.name })}
                          className="text-destructive"
                          disabled={workingId !== ''}
                          onClick={() => {
                            if (!window.confirm(t('namedBanks.deleteConfirm', { name: bank.name })))
                              return
                            void run(bank.id, async () => {
                              await library.deleteNamedBank(bank.id)
                              if (editingId === bank.id) clearForm()
                              setStatus(t('namedBanks.deleted', { name: bank.name }))
                            })
                          }}
                          size="icon"
                          title={t('namedBanks.deleteAction')}
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error || library.namedBanksError ? (
            <p
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {error || library.namedBanksError}
            </p>
          ) : status ? (
            <p aria-live="polite" className="text-sm text-emerald-700" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </Dialog>
    </>
  )
}

export function NamedBankLibraryDialog(props: NamedBankLibraryDialogProps) {
  return (
    <>
      <SaveNamedBankDialog {...props} />
      <LoadNamedBankDialog {...props} />
    </>
  )
}
