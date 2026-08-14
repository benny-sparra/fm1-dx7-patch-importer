import { Copy, Database, Download, FolderOpen, Pencil, Save, Trash2 } from 'lucide-react'
import { type SVGProps, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import {
  makeNamedBankSysexFile,
  makeNamedBankSysexFilename,
  type NamedBank,
} from '@/lib/named-bank'

type NamedBankLibraryDialogProps = {
  destinationBank: string
  library: PatchLibrary
}

function PixelCloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 18 18" {...props}>
      <path
        d="M2 2h4v4h2v2h2V6h2V2h4v4h-2v2h-2v2h2v2h2v4h-4v-4h-2v-2H8v2H6v4H2v-4h2v-2h2V8H4V6H2V2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function SaveNamedBankDialog({
  destinationBank,
  library,
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

  return (
    <>
      <Button
        className="h-full rounded-l-[calc(var(--radius-md)-1px)] rounded-r-none border-0 bg-transparent px-4 font-medium hover:bg-primary/15"
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
        variant="outline"
      >
        <Save />
        {t('namedBanks.save')}
      </Button>

      <dialog
        aria-describedby="save-named-bank-description"
        aria-labelledby="save-named-bank-title"
        className="fixed inset-0 z-50 m-auto w-[min(620px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-primary/30 bg-card p-0 text-card-foreground shadow-2xl"
        onCancel={(event) => {
          if (working) event.preventDefault()
        }}
        onClick={(event) => {
          if (!working && event.target === event.currentTarget) event.currentTarget.close()
        }}
        onClose={reset}
        ref={dialogRef}
      >
        <div className="flex items-start justify-between gap-4 border-b bg-card px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold" id="save-named-bank-title">
              <Save className="size-5 text-primary" />
              {t('namedBanks.saveCurrent', { bank: destinationBank })}
            </h2>
            <p className="font-vt323 mt-1 text-lg text-muted-foreground" id="save-named-bank-description">
              {t('namedBanks.snapshotHelp')}
            </p>
          </div>
          <Button
            aria-label={t('common.close')}
            className="shrink-0"
            disabled={working}
            onClick={() => dialogRef.current?.close()}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PixelCloseIcon className="!size-5" />
          </Button>
        </div>

        <form
          className="grid gap-4 p-5"
          onSubmit={async (event) => {
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
          }}
        >
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
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={working} onClick={() => dialogRef.current?.close()} type="button" variant="outline">
              {t('common.cancel')}
            </Button>
            <Button disabled={working} type="submit">
              <Save />
              {t('namedBanks.save')}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  )
}

function LoadNamedBankDialog({
  destinationBank,
  library,
}: NamedBankLibraryDialogProps) {
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
    return library.namedBanks.filter((bank) => (
      `${bank.name} ${bank.description}`.toLowerCase().includes(normalized)
    ))
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
      <Button
        className="h-full rounded-none border-0 border-l border-input bg-transparent px-4 font-medium hover:bg-primary/15"
        onClick={() => {
          dialogRef.current?.showModal()
          window.requestAnimationFrame(() => searchRef.current?.focus())
        }}
        type="button"
        variant="outline"
      >
        <Database />
        {t('namedBanks.loadBank')}
      </Button>

      <dialog
        aria-labelledby="named-bank-library-title"
        className="fixed inset-0 z-50 m-auto max-h-[calc(100svh-2rem)] w-[min(760px,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-primary/30 bg-card p-0 text-card-foreground shadow-2xl"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        onClose={reset}
        ref={dialogRef}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-card px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold" id="named-bank-library-title">
              <Database className="size-5 text-primary" />
              {t('namedBanks.title')}
            </h2>
            <p className="font-vt323 mt-1 text-lg text-muted-foreground">
              {t('namedBanks.intro', { bank: destinationBank })}
            </p>
          </div>
          <Button
            aria-label={t('common.close')}
            className="shrink-0"
            onClick={() => dialogRef.current?.close()}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PixelCloseIcon className="!size-5" />
          </Button>
        </div>

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
                <Button disabled={workingId !== ''} onClick={clearForm} type="button" variant="outline">
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
              <p className="rounded-md border p-4 text-sm text-muted-foreground">{t('namedBanks.loading')}</p>
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
                          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{bank.description}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('namedBanks.updatedAt', { date: new Date(bank.updatedAt).toLocaleDateString() })}
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
                          onClick={() => void run(bank.id, async () => {
                            const bytes = makeNamedBankSysexFile(bank)
                            downloadBlob(
                              new Blob([bytes], { type: 'application/octet-stream' }),
                              makeNamedBankSysexFilename(bank),
                            )
                            setStatus(t('namedBanks.downloaded', { name: bank.name }))
                          })}
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
                          onClick={() => void run(bank.id, async () => {
                            const copy = await library.copyNamedBank(bank)
                            setStatus(t('namedBanks.copied', { name: copy.name }))
                          })}
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
                            if (!window.confirm(t('namedBanks.deleteConfirm', { name: bank.name }))) return
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
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {error || library.namedBanksError}
            </p>
          ) : status ? (
            <p aria-live="polite" className="text-sm text-emerald-700" role="status">{status}</p>
          ) : null}
        </div>
      </dialog>
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
