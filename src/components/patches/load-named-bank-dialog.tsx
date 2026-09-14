import { Copy, Download, FolderOpen, Pencil, Save, Trash2 } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { type NamedBankLibraryDialogProps } from '@/components/patches/named-bank-dialog-types'
import { useWorkspaceBankLabel } from '@/components/patches/workspace-bank-label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { downloadFile } from '@/lib/download-file'
import {
  makeNamedBankSysexFile,
  makeNamedBankSysexFilename,
  type NamedBank,
} from '@/lib/named-bank'

export function LoadNamedBankDialog({
  destinationBank,
  library,
  onClose,
  onLoaded,
}: NamedBankLibraryDialogProps) {
  const { i18n, t } = useTranslation()
  const titleId = useId()
  const bankLabel = useWorkspaceBankLabel(library)
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
  const [confirmingDeleteId, setConfirmingDeleteId] = useState('')
  const [confirmingLoadId, setConfirmingLoadId] = useState('')
  const deleteButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const loadButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const confirmDeleteRef = useRef<HTMLButtonElement>(null)
  const confirmLoadRef = useRef<HTMLButtonElement>(null)
  const destinationLoaded = library.loadedBanks.includes(destinationBank)

  // The dialog opens as soon as the page shows it, with the keyboard in the search field.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    window.requestAnimationFrame(() => searchRef.current?.focus())
  }, [])

  // Move focus onto the confirmation as it opens, so the keyboard lands on the choice it asks for.
  useEffect(() => {
    if (confirmingDeleteId) confirmDeleteRef.current?.focus()
  }, [confirmingDeleteId])

  useEffect(() => {
    if (confirmingLoadId) confirmLoadRef.current?.focus()
  }, [confirmingLoadId])

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
    setConfirmingDeleteId('')
    setConfirmingLoadId('')
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
      setError(bankErrorMessage(t, cause, t('namedBanks.operationFailed')))
    } finally {
      setWorkingId('')
    }
  }

  const loadBank = (bank: NamedBank) => {
    try {
      const changed = library.loadSavedBank(bank, destinationBank)
      dialogRef.current?.close()
      onLoaded?.(bank, changed)
    } catch (cause) {
      setConfirmingLoadId('')
      setError(bankErrorMessage(t, cause, t('namedBanks.operationFailed')))
    }
  }

  const beginEditing = (bank: NamedBank) => {
    setEditingId(bank.id)
    setName(bank.name)
    setDescription(bank.description)
    setError('')
    setStatus('')
    // The dialog scrolls smoothly only when motion is allowed (its motion-safe:scroll-smooth class).
    dialogRef.current?.scrollTo({ top: 0 })
    window.requestAnimationFrame(() => editNameRef.current?.focus())
  }

  return (
    <>
      <Dialog
        aria-labelledby={titleId}
        className="motion-safe:scroll-smooth"
        onClose={() => {
          reset()
          onClose?.()
        }}
        ref={dialogRef}
        size="3xl"
      >
        <DialogHeader className="sticky top-0 z-10 bg-[var(--crt-bg-panel2)]">
          <DialogTitle id={titleId}>{t('namedBanks.title')}</DialogTitle>
          <DialogCloseButton label={t('common.close')} onClick={() => dialogRef.current?.close()} />
        </DialogHeader>
        <DialogBody>
          <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]">
            {t('namedBanks.intro', { bank: bankLabel(destinationBank) })}
          </p>

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

              {library.hasDamagedNamedBanks ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {t('namedBanks.damagedBanks')}
                </p>
              ) : null}

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
                              date: new Date(bank.updatedAt).toLocaleDateString(
                                i18n.resolvedLanguage,
                              ),
                            })}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1">
                          <Button
                            aria-expanded={
                              destinationLoaded ? confirmingLoadId === bank.id : undefined
                            }
                            disabled={workingId !== ''}
                            onClick={() => {
                              setError('')
                              setStatus('')
                              // A bank that already has sounds is replaced only once the user agrees.
                              if (destinationLoaded) {
                                setConfirmingDeleteId('')
                                setConfirmingLoadId(bank.id)
                                return
                              }
                              loadBank(bank)
                            }}
                            ref={(button) => {
                              if (button) loadButtonRefs.current.set(bank.id, button)
                              else loadButtonRefs.current.delete(bank.id)
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
                                downloadFile(
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
                            aria-expanded={confirmingDeleteId === bank.id}
                            aria-label={t('namedBanks.delete', { name: bank.name })}
                            className="text-destructive"
                            disabled={workingId !== ''}
                            onClick={() => {
                              setError('')
                              setStatus('')
                              setConfirmingLoadId('')
                              setConfirmingDeleteId(bank.id)
                            }}
                            ref={(button) => {
                              if (button) deleteButtonRefs.current.set(bank.id, button)
                              else deleteButtonRefs.current.delete(bank.id)
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
                      {confirmingLoadId === bank.id ? (
                        <div
                          aria-label={t('namedBanks.replaceAction')}
                          className="mt-3 flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          role="group"
                        >
                          <p className="text-sm text-destructive">
                            {t('namedBanks.loadConfirm', {
                              bank: bankLabel(destinationBank),
                              name: bank.name,
                            })}
                          </p>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              onClick={() => {
                                setConfirmingLoadId('')
                                loadButtonRefs.current.get(bank.id)?.focus()
                              }}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {t('common.cancel')}
                            </Button>
                            <Button
                              onClick={() => loadBank(bank)}
                              ref={confirmLoadRef}
                              size="sm"
                              type="button"
                              variant="destructive"
                            >
                              <FolderOpen />
                              {t('namedBanks.replaceAction')}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                      {/* Confirmed in place: a browser prompt can be blocked, which would silently
                          cancel the deletion, and a second modal cannot open over this one. */}
                      {confirmingDeleteId === bank.id ? (
                        <div
                          aria-label={t('namedBanks.deleteAction')}
                          className="mt-3 flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          role="group"
                        >
                          <p className="text-sm text-destructive">
                            {t('namedBanks.deleteConfirm', { name: bank.name })}
                          </p>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              onClick={() => {
                                setConfirmingDeleteId('')
                                deleteButtonRefs.current.get(bank.id)?.focus()
                              }}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {t('common.cancel')}
                            </Button>
                            <Button
                              onClick={() => {
                                setConfirmingDeleteId('')
                                void run(bank.id, async () => {
                                  await library.deleteNamedBank(bank.id)
                                  if (editingId === bank.id) clearForm()
                                  setStatus(t('namedBanks.deleted', { name: bank.name }))
                                  searchRef.current?.focus()
                                })
                              }}
                              ref={confirmDeleteRef}
                              size="sm"
                              type="button"
                              variant="destructive"
                            >
                              <Trash2 />
                              {t('namedBanks.deleteAction')}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error || library.namedBanksLoadFailed ? (
              <p
                className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {error || t('namedBanks.loadFailed')}
              </p>
            ) : status ? (
              <p aria-live="polite" className="text-sm text-emerald-400" role="status">
                {status}
              </p>
            ) : null}
          </div>
        </DialogBody>
      </Dialog>
    </>
  )
}
