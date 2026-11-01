import { Download, Plus, Upload } from 'lucide-react'
import { createPortal } from 'react-dom'
import { type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { FxPresetDialog } from '@/components/midi/fx-preset-dialog'
import type { V16EffectsMidi } from '@/components/midi/v16-effects-panel'
import { Button } from '@/components/ui/button'
import { ErrorNotice } from '@/components/ui/error-notice'
import { InfoNotice } from '@/components/ui/info-notice'
import { PortalMenu } from '@/components/ui/portal-menu'
import { useToast } from '@/components/ui/toast'
import type { FxLibrary } from '@/hooks/use-fx-library'
import '@/i18n/fx-presets'
import { resolveFirmwareProfile } from '@/lib/firmware-profile'
import {
  fxLibraryPresetCopyName,
  FxLibraryPresetNameError,
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

const sameBytes = (left: Uint8Array, right: Uint8Array) =>
  left.length === right.length && left.every((value, index) => value === right[index])

function downloadPresets(presets: readonly FxLibraryPreset[]) {
  downloadFile(
    new Blob([makeFxPresetFile(presets)], { type: 'application/json' }),
    fxPresetFileName,
  )
}

/** The named FX presets beside the live rack: a list to load from and the actions on the rack. */
export function FxPresetLibrary({
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
  const loadedId = useSyncExternalStore(subscribeV16Effects, getV16EffectsPresetId)
  const [modePreset, setModePreset] = useState<FxLibraryPreset | null>(null)
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'delete' | 'rename' | 'save' | null>(null)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [sending, setSending] = useState(false)
  const [working, setWorking] = useState(false)
  // A load that changed only the rack, because the FM1 could not take it, and one that failed.
  const [loadedOnly, setLoadedOnly] = useState(false)
  const [failedSendId, setFailedSendId] = useState('')
  const mutationInFlight = useRef(false)
  const sendInFlight = useRef(false)
  const sendAbort = useRef<AbortController | null>(null)
  const saveCapture = useRef<Uint8Array | null>(null)
  const loaded = fxLibrary.presets.find((preset) => preset.id === loadedId)
  const modified = Boolean(loaded && !sameBytes(loaded.effects, current))
  const route = v16EffectsRouteKey(midi.selectedOutputId, midi.effectChannel, midi.firmware)
  const sharedEffects = resolveFirmwareProfile(midi.firmware).capabilities.sharedEffects
  const eligible = midi.hasMidiOutput && sharedEffects
  const isSent = (preset: FxLibraryPreset, effects: Uint8Array) =>
    lastSent?.presetId === preset.id &&
    lastSent.route === route &&
    sameBytes(lastSent.effects, effects)
  const offerSendAgain =
    loaded !== undefined && !modified && (isSent(loaded, current) || failedSendId === loaded.id)
  const ordered = useMemo(() => {
    const collator = new Intl.Collator(i18n.resolvedLanguage, { sensitivity: 'base' })
    return fxLibrary.presets.toSorted(
      (left, right) => collator.compare(left.name, right.name) || left.id.localeCompare(right.id),
    )
  }, [fxLibrary.presets, i18n.resolvedLanguage])
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(i18n.resolvedLanguage)
    return ordered.filter((preset) =>
      preset.name.toLocaleLowerCase(i18n.resolvedLanguage).includes(query),
    )
  }, [i18n.resolvedLanguage, ordered, search])
  const invalidName = !name.trim() || Array.from(name.trim()).length > fxLibraryPresetNameLength
  const busy = sending || working || fxLibrary.pending
  const unavailable = busy || fxLibrary.status !== 'ready'
  const blocked = busy || mode !== null
  const notReached = loadedOnly && !eligible ? (sharedEffects ? 'offline' : 'ineligible') : null

  useEffect(() => {
    if (mode === 'save' || mode === 'rename') nameInput.current?.focus()
  }, [mode])

  useEffect(() => onSendingChange(sending), [onSendingChange, sending])
  useEffect(
    () => () => {
      // Leaving the view drops the sends still waiting their turn, so none reaches the FM1 unseen.
      sendAbort.current?.abort()
      onSendingChange(false)
    },
    [onSendingChange],
  )

  const run = async (operation: () => Promise<unknown>) => {
    if (mutationInFlight.current) return false
    mutationInFlight.current = true
    setWorking(true)
    setError('')
    setConflict(false)
    try {
      await operation()
      setMode(null)
      return true
    } catch (caughtError) {
      const changedElsewhere = caughtError instanceof FxLibraryPresetConflictError
      setConflict(changedElsewhere)
      setError(
        changedElsewhere
          ? t('fxPresets.errors.conflict')
          : caughtError instanceof FxLibraryPresetNameError
            ? t('fxPresets.errors.name', { max: fxLibraryPresetNameLength })
            : t('fxPresets.errors.write'),
      )
      return false
    } finally {
      mutationInFlight.current = false
      setWorking(false)
    }
  }

  const startSave = () => {
    if (unavailable || mode !== null) return
    saveCapture.current = current.slice()
    setName('')
    setMode('save')
  }

  const duplicatePreset = async (preset: FxLibraryPreset) => {
    if (await run(() => fxLibrary.duplicate(preset))) {
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
    })
  }

  const undoChange = async (entry: FxPresetUndo, successMessage: string) => {
    const { preset } = entry
    const undone = await run(() =>
      entry.kind === 'delete'
        ? fxLibrary.restorePresets([preset])
        : fxLibrary.update(entry.updated, preset.effects),
    )
    if (undone) toast.success(t('fxPresets.restored', { name: preset.name }))
    else showUndoToast(entry, successMessage)
  }

  const load = async (preset: FxLibraryPreset, sendAgain = false) => {
    if (sendInFlight.current || mutationInFlight.current) return
    setError('')
    setV16Effects(preset.effects)
    setV16EffectsPresetId(preset.id)
    setLoadedOnly(!eligible)
    if (!eligible || (isSent(preset, preset.effects) && !sendAgain)) return
    const controller = new AbortController()
    sendAbort.current = controller
    sendInFlight.current = true
    setSending(true)
    clearV16EffectsLastSent()
    let sent = false
    try {
      sent = (await midi.sendSharedEffectSettings(preset.effects.slice(), controller.signal)).ok
    } catch {
      // A thrown send is reported like a partial one.
    } finally {
      sendInFlight.current = false
      sendAbort.current = null
      setSending(false)
    }
    if (controller.signal.aborted) return
    if (sent) {
      // What was sent is the preset's snapshot; the rack may have been edited while it went out.
      markV16EffectsSent(preset.id, route, preset.effects)
      setFailedSendId('')
    } else {
      setFailedSendId(preset.id)
      setError(t('fxPresets.partial'))
    }
  }

  const confirm = async () => {
    if (mode === 'save') {
      const captured = saveCapture.current
      if (!captured) return
      const saved = await run(async () => {
        const record = await fxLibrary.save(name, captured)
        setV16EffectsPresetId(record.id)
      })
      if (saved) toast.success(t('fxPresets.saved', { name: name.trim() }))
    } else if (modePreset && mode === 'rename') {
      if (await run(() => fxLibrary.rename(modePreset, name))) {
        toast.success(t('fxPresets.renamed', { name: name.trim() }))
      }
    } else if (modePreset && mode === 'delete') {
      if (await run(() => fxLibrary.delete(modePreset))) {
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
      triggerLabel={t('fxPresets.actions')}
      triggerClassName="size-7 border-t border-r border-b border-l border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] text-[var(--crt-acc-lt)] hover:bg-[var(--crt-sel-bg)]"
      menuLabel={t('fxPresets.actions')}
      items={[
        {
          label: t('fxPresets.import'),
          Icon: Upload,
          disabled: unavailable || mode !== null,
          onSelect: () => importInput.current?.click(),
        },
        {
          label: t('fxPresets.downloadAll'),
          Icon: Download,
          disabled: !ordered.length || sending,
          onSelect: () => downloadPresets(ordered),
        },
      ]}
    />
  )

  const currentItems = [
    ...(modified
      ? [
          {
            label: t('fxPresets.updateNamed', { name: loaded?.name }),
            disabled: unavailable || mode !== null,
            onSelect: () => void updateCurrent(),
          },
        ]
      : []),
    ...(offerSendAgain && loaded
      ? [
          {
            label: t('fxPresets.sendAgain'),
            disabled: unavailable || mode !== null,
            onSelect: () => void load(loaded, true),
          },
        ]
      : []),
  ]

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
            aria-disabled={unavailable || mode !== null}
            className="font-dot-matrix flex w-full min-w-0 cursor-pointer items-center gap-2 border-t border-r border-b border-l border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] px-2 py-[7px] text-left text-[14px] font-bold text-[var(--crt-ink-2)] transition-colors hover:bg-[var(--crt-sel-bg)] hover:text-[var(--crt-acc-lt)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)]"
            onClick={startSave}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4 shrink-0" />
            <span>{t('fxPresets.newPreset')}</span>
          </button>
          <div className="empty:hidden" role="status">
            {fxLibrary.status === 'loading' ? <p>{t('fxPresets.loading')}</p> : null}
          </div>
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
                className="grid max-h-36 content-start gap-2 overflow-y-auto p-0.5 md:max-h-[50dvh]"
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
                      aria-disabled={blocked}
                      aria-pressed={preset.id === loadedId}
                      className={cn(
                        'font-dot-matrix min-h-6 min-w-0 flex-1 cursor-pointer truncate text-left text-[14px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]',
                        preset.id === loadedId
                          ? 'text-[var(--crt-led)]'
                          : 'text-[var(--crt-ink-2)]',
                      )}
                      onClick={() => {
                        if (!blocked) void load(preset)
                      }}
                      title={preset.name}
                      type="button"
                    >
                      {preset.name}
                    </button>
                    <PortalMenu
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
                          label: t('fxPresets.downloadPreset'),
                          Icon: Download,
                          disabled: busy,
                          onSelect: () => downloadPresets([preset]),
                        },
                        {
                          label: t('fxPresets.delete'),
                          danger: true,
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
            ) : (
              <p className="text-[var(--crt-ink-3)]">
                {t(fxLibrary.presets.length ? 'fxPresets.noMatches' : 'fxPresets.empty')}
              </p>
            )
          ) : null}
          {mode ? (
            <FxPresetDialog
              busy={working || fxLibrary.pending}
              confirmDisabled={(mode === 'save' || mode === 'rename') && invalidName}
              confirmLabel={t(
                mode === 'save'
                  ? 'fxPresets.save'
                  : mode === 'rename'
                    ? 'fxPresets.renameAction'
                    : 'fxPresets.deleteAction',
              )}
              destructive={mode === 'delete'}
              onClose={() => setMode(null)}
              onConfirm={() => void confirm()}
              title={
                mode === 'save'
                  ? t('fxPresets.saveTitle')
                  : mode === 'rename'
                    ? t('fxPresets.renameTitle', { name: modePreset?.name })
                    : t('fxPresets.deleteAction')
              }
            >
              {mode === 'save' || mode === 'rename' ? (
                <label className="grid gap-2 text-sm font-semibold">
                  {t('fxPresets.name')}
                  <input
                    ref={nameInput}
                    className="crt-field h-9 w-full min-w-0 px-3 font-normal"
                    onChange={(event) => setName(event.target.value)}
                    readOnly={working}
                    value={name}
                  />
                </label>
              ) : (
                <p className="text-sm">
                  {t('fxPresets.deleteConfirm', { name: modePreset?.name })}
                </p>
              )}
              {(mode === 'save' || mode === 'rename') && name && invalidName ? (
                <ErrorNotice>
                  {t('fxPresets.errors.name', { max: fxLibraryPresetNameLength })}
                </ErrorNotice>
              ) : null}
              {failureNotice}
            </FxPresetDialog>
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
                .then(async (presets) => {
                  if (!presets.length) {
                    setError(t('fxPresets.importEmpty'))
                    return
                  }
                  if (await run(() => fxLibrary.importPresets(presets))) {
                    toast.success(t('fxPresets.imported', { count: presets.length }))
                  }
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
          <h3 className="font-dot-matrix flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-sm font-bold break-words text-[var(--crt-acc-lt)]">
            <span>{loaded ? loaded.name : t('fxPresets.unsavedEffects')}</span>
            {loaded && modified ? (
              <span className="text-xs font-normal text-[var(--crt-ink-3)]">
                {t('fxPresets.edited')}
              </span>
            ) : null}
          </h3>
          {currentItems.length ? (
            <PortalMenu
              triggerLabel={t('fxPresets.currentActions')}
              menuLabel={t('fxPresets.currentActions')}
              items={currentItems}
            />
          ) : null}
        </div>
        <div className="empty:hidden" role="status">
          {sending ? (
            <p className="px-2 pt-2 text-sm text-[var(--crt-ink-3)]">{t('fxPresets.sending')}</p>
          ) : notReached ? (
            <div className="px-2 pt-2">
              <InfoNotice>
                <p>{t(`fxPresets.${notReached}`)}</p>
              </InfoNotice>
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  )
}
