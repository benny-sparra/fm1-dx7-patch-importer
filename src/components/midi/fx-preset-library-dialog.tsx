import { Download, Plus, Upload } from 'lucide-react'
import { createPortal } from 'react-dom'
import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useTranslation } from 'react-i18next'

import { FxPresetName } from '@/components/midi/fx-preset-name'
import type { V16EffectsMidi } from '@/components/midi/v16-effects-panel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorNotice } from '@/components/ui/error-notice'
import { useToast } from '@/components/ui/toast'
import { PortalMenu } from '@/components/ui/portal-menu'
import type { FxLibrary } from '@/hooks/use-fx-library'
import '@/i18n/fx-presets'
import { hasSharedEffects, resolveFirmwareProfile } from '@/lib/firmware-profile'
import {
  fxLibraryPresetCopyName,
  fxLibraryPresetNameLength,
  type FxLibraryPreset,
} from '@/lib/fx-library-preset'
import { FxLibraryPresetConflictError } from '@/lib/fx-library-storage'
import {
  fxPresetFileAccept,
  fxPresetFileName,
  FxPresetFileError,
  makeFxPresetFile,
  readFxPresetFile,
} from '@/lib/fx-preset-file'
import { cn } from '@/lib/utils'
import { downloadFile } from '@/lib/download-file'
import {
  clearV16EffectsLastSent,
  getV16Effects,
  getV16EffectsLastSent,
  getV16EffectsPersistence,
  getV16EffectsPresetId,
  markV16EffectsSent,
  setV16Effects,
  setV16EffectsPresetId,
  subscribeV16Effects,
  v16EffectsRouteKey,
} from '@/lib/v16-effects'

type FxPresetUndo =
  | { kind: 'delete'; preset: FxLibraryPreset }
  | { kind: 'update'; preset: FxLibraryPreset; updated: FxLibraryPreset }

type Props = {
  children?: ReactNode
  fxLibrary: FxLibrary
  midi: V16EffectsMidi
  menuSlot?: HTMLElement | null
  onSendingChange: (sending: boolean) => void
  search: string
}

export function FxPresetLibraryDialog({
  children,
  fxLibrary,
  midi,
  menuSlot,
  onSendingChange,
  search,
}: Props) {
  const { i18n, t } = useTranslation()
  const toast = useToast()
  const nameInput = useRef<HTMLInputElement>(null)
  const importInput = useRef<HTMLInputElement>(null)
  const current = useSyncExternalStore(subscribeV16Effects, getV16Effects)
  const lastSent = useSyncExternalStore(subscribeV16Effects, getV16EffectsLastSent)
  const { pending: libraryPending, reload: reloadLibrary, status: libraryStatus } = fxLibrary
  const loadedId = useSyncExternalStore(subscribeV16Effects, getV16EffectsPresetId)
  const [modePreset, setModePreset] = useState<FxLibraryPreset | null>(null)
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'delete' | 'rename' | 'save' | null>(null)
  const [message, setMessage] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [sending, setSending] = useState(false)
  const [working, setWorking] = useState(false)
  const mutationInFlight = useRef(false)
  const sendInFlight = useRef(false)
  const saveCapture = useRef<Uint8Array | null>(null)
  const loaded = fxLibrary.presets.find((preset) => preset.id === loadedId)
  const modified = Boolean(
    loaded && !loaded.effects.every((value, index) => value === current[index]),
  )
  const route = v16EffectsRouteKey(midi.selectedOutputId, midi.effectChannel, midi.firmware)
  const eligible =
    midi.hasMidiOutput &&
    Boolean(midi.sendSharedEffectSettings) &&
    hasSharedEffects(resolveFirmwareProfile(midi.firmware))
  const matchesLastSend = Boolean(
    loaded &&
    lastSent?.presetId === loaded.id &&
    lastSent.route === route &&
    lastSent.effects.every((value, index) => value === current[index]),
  )
  const ordered = useMemo(() => {
    const collator = new Intl.Collator(i18n.language, { sensitivity: 'base' })
    return fxLibrary.presets.toSorted(
      (left, right) => collator.compare(left.name, right.name) || left.id.localeCompare(right.id),
    )
  }, [fxLibrary.presets, i18n.language])
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(i18n.language)
    return ordered.filter((preset) => preset.name.toLocaleLowerCase(i18n.language).includes(query))
  }, [i18n.language, ordered, search])
  const invalidName = !name.trim() || Array.from(name.trim()).length > fxLibraryPresetNameLength
  const busy = sending || working || fxLibrary.pending
  const unavailable = busy || fxLibrary.status !== 'ready'

  useEffect(() => {
    if (libraryStatus === 'ready' && !libraryPending) {
      void reloadLibrary().catch(() => undefined)
    }
  }, [libraryPending, libraryStatus, reloadLibrary])
  useEffect(() => {
    if (mode === 'save' || mode === 'rename') nameInput.current?.focus()
  }, [mode])

  useEffect(() => onSendingChange(sending), [onSendingChange, sending])
  useEffect(() => () => onSendingChange(false), [onSendingChange])

  const run = async (operation: () => Promise<unknown>, success: string, showModal = false) => {
    if (mutationInFlight.current) return false
    mutationInFlight.current = true
    setWorking(true)
    setError('')
    setConflict(false)
    try {
      await operation()
      if (showModal) {
        setMessage('')
        setSavedMessage(success)
      } else setMessage(success)
      setMode(null)
      return true
    } catch (caughtError) {
      const changedElsewhere = caughtError instanceof FxLibraryPresetConflictError
      setConflict(changedElsewhere)
      setError(t(changedElsewhere ? 'fxPresets.errors.conflict' : 'fxPresets.errors.write'))
      return false
    } finally {
      mutationInFlight.current = false
      setWorking(false)
    }
  }

  const startSave = () => {
    saveCapture.current = current.slice()
    setName('')
    setMode('save')
  }

  const duplicatePreset = async (preset: FxLibraryPreset) => {
    if (await run(() => fxLibrary.duplicate(preset), '')) {
      toast.success(t('fxPresets.duplicated', { name: fxLibraryPresetCopyName(preset.name) }))
    }
  }

  const showUndoToast = (entry: FxPresetUndo, successMessage: string) => {
    toast.success(successMessage, {
      action: { label: t('toasts.undo'), onAction: () => void undoChange(entry, successMessage) },
    })
  }

  const updateCurrent = async () => {
    if (!loaded) return
    const preset = loaded
    const effects = current.slice()
    await run(async () => {
      const updated = await fxLibrary.update(preset, effects)
      showUndoToast(
        { kind: 'update', preset, updated },
        t('fxPresets.updated', { name: preset.name }),
      )
    }, '')
  }

  const undoChange = async (entry: FxPresetUndo, successMessage: string) => {
    const { preset } = entry
    if (
      await run(
        () =>
          entry.kind === 'delete'
            ? fxLibrary.restorePresets([preset])
            : fxLibrary.update(entry.updated, preset.effects),
        '',
      )
    )
      toast.success(t('fxPresets.restored', { name: preset.name }))
    else showUndoToast(entry, successMessage)
  }

  const load = async (preset: FxLibraryPreset, sendAgain = false) => {
    if (sendInFlight.current || mutationInFlight.current) return
    setError('')
    setV16Effects(preset.effects)
    setV16EffectsPresetId(preset.id)
    setMessage(getV16EffectsPersistence() === 'persisted' ? '' : t('fxPresets.loadedSessionOnly'))
    const alreadySent =
      lastSent?.presetId === preset.id &&
      lastSent.route === route &&
      lastSent.effects.every((value, index) => value === preset.effects[index])
    if (!eligible || (alreadySent && !sendAgain)) return
    sendInFlight.current = true
    setSending(true)
    clearV16EffectsLastSent()
    let result
    try {
      result = await midi.sendSharedEffectSettings?.(preset.effects.slice())
    } catch {
      setError(t('fxPresets.partial'))
      return
    } finally {
      sendInFlight.current = false
      setSending(false)
    }
    if (result?.ok) {
      markV16EffectsSent(preset.id, route)
    } else if (result) {
      setError(t('fxPresets.partial'))
    }
  }

  const confirm = async () => {
    if (mode === 'save') {
      const captured = saveCapture.current
      if (!captured) return
      await run(
        async () => {
          const saved = await fxLibrary.save(name, captured)
          setV16EffectsPresetId(saved.id)
        },
        t('fxPresets.saved', { name: name.trim() }),
        true,
      )
    } else if (modePreset && mode === 'rename') {
      await run(
        () => fxLibrary.rename(modePreset, name),
        t('fxPresets.renamed', { name: name.trim() }),
      )
    } else if (modePreset && mode === 'delete') {
      if (await run(() => fxLibrary.delete(modePreset), '')) {
        showUndoToast(
          { kind: 'delete', preset: modePreset },
          t('fxPresets.deleted', { name: modePreset.name }),
        )
        if (loadedId === modePreset.id) setV16EffectsPresetId('')
      }
    }
  }

  const failureNotice = (
    <>
      {error ? <ErrorNotice>{error}</ErrorNotice> : null}
      {conflict ? (
        <Button
          className="min-h-8 w-full min-w-0 px-2 py-1 text-xs font-semibold break-words"
          size="bare"
          onClick={() => {
            setMode(null)
            setConflict(false)
            setError('')
            void fxLibrary.reload().catch(() => setError(t('fxPresets.errors.load')))
          }}
          type="button"
          variant="outline"
        >
          {t('fxPresets.reload')}
        </Button>
      ) : null}
    </>
  )

  const menu = (
    <PortalMenu
      triggerLabel={t('fxPresets.dialogTitle')}
      triggerClassName="size-7 border-t border-r border-b border-l border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] text-[var(--crt-acc-lt)] hover:bg-[var(--crt-sel-bg)]"
      menuLabel={t('fxPresets.dialogTitle')}
      items={[
        {
          label: t('fxPresets.saveCurrent'),
          disabled: unavailable || mode !== null,
          onSelect: startSave,
        },
        {
          label: t('fxPresets.import'),
          Icon: Upload,
          disabled: unavailable || mode !== null,
          onSelect: () => importInput.current?.click(),
        },
        {
          label: t('fxPresets.exportAll'),
          Icon: Download,
          disabled: !ordered.length || sending,
          onSelect: () =>
            downloadFile(
              new Blob([makeFxPresetFile(ordered)], { type: 'application/json' }),
              fxPresetFileName,
            ),
        },
      ]}
    />
  )

  return (
    <section
      aria-label={t('fxPresets.dialogTitle')}
      aria-busy={sending}
      className="patch-area-surface flex min-w-0 flex-col items-stretch md:flex-row"
    >
      {menuSlot ? createPortal(menu, menuSlot) : null}
      <div className="min-w-0 shrink-0 border-b-2 border-[var(--crt-shadow)] bg-[var(--crt-bg-panel)] md:w-[226px] md:border-r-2 md:border-b-0">
        {!menuSlot ? menu : null}
        <div className="grid min-w-0 gap-2 p-2 text-sm break-words">
          <button
            className="font-dot-matrix flex w-full min-w-0 cursor-pointer items-center gap-2 border-t border-r border-b border-l border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] px-2 py-[7px] text-left text-[14px] font-bold text-[var(--crt-ink-2)] transition-colors hover:bg-[var(--crt-sel-bg)] hover:text-[var(--crt-acc-lt)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={unavailable || mode !== null}
            onClick={startSave}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4 shrink-0" />
            <span>{t('fxPresets.newPreset')}</span>
          </button>
          {fxLibrary.status === 'loading' ? <p>{t('fxPresets.loading')}</p> : null}
          {fxLibrary.status === 'error' ? (
            <div className="grid justify-items-start gap-2">
              <ErrorNotice>{t('fxPresets.errors.load')}</ErrorNotice>
              <Button
                className="min-h-8 w-full min-w-0 px-2 py-1 text-xs font-semibold break-words"
                size="bare"
                onClick={() => void fxLibrary.reload().catch(() => undefined)}
                type="button"
                variant="outline"
              >
                {t('fxPresets.retry')}
              </Button>
            </div>
          ) : null}
          {fxLibrary.damagedCount ? (
            <ErrorNotice>
              {t('fxPresets.unreadable', { count: fxLibrary.damagedCount })}
            </ErrorNotice>
          ) : null}
          {fxLibrary.status === 'ready' ? (
            visible.length ? (
              <ul
                aria-label={t('fxPresets.dialogTitle')}
                className="grid max-h-[50dvh] content-start gap-2 overflow-y-auto p-0.5"
              >
                {visible.map((preset) => (
                  <li
                    className={cn(
                      'bank-tab flex min-w-0 items-center gap-2 border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] px-2 py-[7px] transition-colors',
                      preset.id === loadedId
                        ? 'bank-tab-active border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-sel-bg)]'
                        : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] hover:bg-[var(--crt-bg-head)]',
                    )}
                    key={preset.id}
                  >
                    <button
                      aria-pressed={preset.id === loadedId}
                      className={cn(
                        'font-dot-matrix min-h-6 min-w-0 flex-1 cursor-pointer truncate text-left text-[14px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:opacity-50',
                        preset.id === loadedId
                          ? 'text-[var(--crt-led)]'
                          : 'text-[var(--crt-ink-2)]',
                      )}
                      disabled={busy || mode !== null}
                      onClick={() => void load(preset)}
                      title={preset.name}
                      type="button"
                    >
                      {preset.name}
                    </button>
                    <PortalMenu
                      alignOffset={8}
                      triggerLabel={t('fxPresets.presetActions', { name: preset.name })}
                      menuLabel={t('fxPresets.presetActions', { name: preset.name })}
                      items={[
                        {
                          label: t('fxPresets.rename'),
                          disabled: unavailable || mode !== null,
                          onSelect: () => {
                            setModePreset(preset)
                            setName(preset.name)
                            setMode('rename')
                          },
                        },
                        {
                          label: t('fxPresets.duplicate'),
                          disabled: unavailable || mode !== null,
                          onSelect: () => void duplicatePreset(preset),
                        },
                        {
                          label: t('fxPresets.exportSelected'),
                          Icon: Download,
                          disabled: busy,
                          onSelect: () =>
                            downloadFile(
                              new Blob([makeFxPresetFile([preset])], { type: 'application/json' }),
                              fxPresetFileName,
                            ),
                        },
                        {
                          label: t('fxPresets.delete'),
                          disabled: unavailable || mode !== null,
                          onSelect: () => {
                            setModePreset(preset)
                            setMode('delete')
                          },
                        },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            ) : fxLibrary.presets.length ? (
              <p>{t('fxPresets.noMatches')}</p>
            ) : null
          ) : null}
          {mode ? (
            <FxPresetDialog
              busy={busy}
              confirmDisabled={(mode === 'save' || mode === 'rename') && invalidName}
              confirmLabel={t(mode === 'save' ? 'fxPresets.save' : `fxPresets.${mode}Action`)}
              onClose={() => setMode(null)}
              onConfirm={() => void confirm()}
              title={t(
                mode === 'save'
                  ? 'fxPresets.saveTitle'
                  : mode === 'rename'
                    ? 'fxPresets.renameTitle'
                    : `fxPresets.${mode}Action`,
                { name: modePreset?.name },
              )}
            >
              {mode === 'save' ? (
                <p className="text-sm text-[var(--crt-ink-3)]">{t('fxPresets.saveHelp')}</p>
              ) : null}
              {mode === 'save' || mode === 'rename' ? (
                <label className="grid gap-2 text-sm font-semibold">
                  {t('fxPresets.name')}
                  <input
                    ref={nameInput}
                    className="crt-field h-9 w-full min-w-0 px-3 font-normal"
                    disabled={busy}
                    onChange={(event) => setName(event.target.value)}
                    value={name}
                  />
                </label>
              ) : (
                <p className="text-sm">
                  {t(`fxPresets.${mode}Confirm`, {
                    name: modePreset?.name,
                  })}
                </p>
              )}
              {(mode === 'save' || mode === 'rename') && name && invalidName ? (
                <ErrorNotice>{t('fxPresets.errors.name')}</ErrorNotice>
              ) : null}
              {failureNotice}
            </FxPresetDialog>
          ) : null}
          {savedMessage ? (
            <FxPresetDialog
              busy={false}
              title={t('fxPresets.dialogTitle')}
              onClose={() => setSavedMessage('')}
            >
              <p className="text-sm">{savedMessage}</p>
            </FxPresetDialog>
          ) : null}
          {message ? (
            <p aria-live="polite" className="text-sm text-[var(--crt-led)]">
              {message}
            </p>
          ) : null}
          {!mode ? failureNotice : null}
          <input
            accept={fxPresetFileAccept}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              void readFxPresetFile(file)
                .then((presets) => {
                  if (!presets.length) {
                    setMessage(t('fxPresets.importEmpty'))
                    return
                  }
                  return run(
                    () => fxLibrary.importPresets(presets),
                    t('fxPresets.imported', { count: presets.length }),
                  )
                })
                .catch((caughtError) => {
                  const problem =
                    caughtError instanceof FxPresetFileError ? caughtError.problem : 'read'
                  const key = {
                    damaged: 'fxPresets.errors.fileDamaged',
                    format: 'fxPresets.errors.fileFormat',
                    newer: 'fxPresets.errors.fileNewer',
                    read: 'fxPresets.errors.fileRead',
                    size: 'fxPresets.errors.fileSize',
                  } as const
                  setError(t(key[problem]))
                })
            }}
            ref={importInput}
            type="file"
          />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="crt-hatch flex min-h-[49px] min-w-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--crt-line)] px-2 py-2">
          <div className="min-w-0 flex-1">
            {loaded ? (
              <FxPresetName
                disabled={unavailable || mode !== null}
                key={loaded.id}
                onRename={(preset, nextName) => run(() => fxLibrary.rename(preset, nextName), '')}
                preset={loaded}
              />
            ) : (
              <h3 className="font-dot-matrix text-sm font-bold break-words text-[var(--crt-acc-lt)]">
                {t('fxPresets.customSettings')}
              </h3>
            )}
          </div>
          <div className="flex max-w-full min-w-0 flex-wrap gap-2">
            <PortalMenu
              triggerLabel={t('fxPresets.currentActions')}
              menuLabel={t('fxPresets.currentActions')}
              items={[
                ...(modified
                  ? [
                      {
                        label: t('fxPresets.updateNamed', { name: loaded?.name }),
                        disabled: unavailable || mode !== null,
                        onSelect: () => void updateCurrent(),
                      },
                    ]
                  : []),
                ...(matchesLastSend && loaded
                  ? [
                      {
                        label: t('fxPresets.sendAgain'),
                        disabled: unavailable || mode !== null,
                        onSelect: () => void load(loaded, true),
                      },
                    ]
                  : []),
                {
                  label: t('fxPresets.saveCurrent'),
                  disabled: unavailable || mode !== null,
                  onSelect: startSave,
                },
              ]}
            />
          </div>
        </div>
        {children}
      </div>
    </section>
  )
}

function FxPresetDialog({
  busy,
  children,
  confirmDisabled = false,
  confirmLabel,
  onClose,
  onConfirm,
  title,
}: {
  busy: boolean
  children: ReactNode
  confirmDisabled?: boolean
  confirmLabel?: string
  onClose: () => void
  onConfirm?: () => void
  title: string
}) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const formId = useId()

  useEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement
    if (element && !element.open) element.showModal()
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

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
          disabled={busy}
          label={t('common.close')}
          onClick={() => dialog.current?.close()}
        />
      </DialogHeader>
      <DialogBody>
        <form
          className="grid gap-4 p-4"
          id={formId}
          onSubmit={(event) => {
            event.preventDefault()
            if (!busy && !confirmDisabled) onConfirm?.()
          }}
        >
          {children}
        </form>
      </DialogBody>
      {confirmLabel ? (
        <DialogFooter>
          <Button disabled={busy || confirmDisabled} form={formId} type="submit">
            {confirmLabel}
          </Button>
        </DialogFooter>
      ) : null}
    </Dialog>
  )
}
