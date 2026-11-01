import { ChevronDown, Download, Search, Send, Upload } from 'lucide-react'
import { createPortal } from 'react-dom'
import { type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { FxPresetDialog, FxPresetSheet } from '@/components/midi/fx-preset-dialog'
import type { V16EffectsMidi } from '@/components/midi/v16-effects-panel'
import { Button } from '@/components/ui/button'
import { ErrorNotice } from '@/components/ui/error-notice'
import { InfoNotice } from '@/components/ui/info-notice'
import { PortalMenu } from '@/components/ui/portal-menu'
import { useToast } from '@/components/ui/toast'
import type { FxLibrary } from '@/hooks/use-fx-library'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
  libraryContentClassName,
  libraryRailClassName,
  librarySendButtonClassName,
  libraryStripClassName,
  libraryStripNameClassName,
} from '@/components/patches/library-panel'
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
  onSearchChange: (search: string) => void
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
  onSearchChange,
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
  const [sheetOpen, setSheetOpen] = useState(false)
  // Below md the list is a sheet opened from the title strip, not a sidebar.
  const narrow = useMediaQuery('(max-width: 767.98px)')
  const mutationInFlight = useRef(false)
  const sendInFlight = useRef(false)
  const sendAbort = useRef<AbortController | null>(null)
  const saveCapture = useRef<Uint8Array | null>(null)
  const loaded = fxLibrary.presets.find((preset) => preset.id === loadedId)
  const modified = Boolean(loaded && !sameBytes(loaded.effects, current))
  const route = v16EffectsRouteKey(midi.selectedOutputId, midi.effectChannel, midi.firmware)
  const sharedEffects = resolveFirmwareProfile(midi.firmware).capabilities.sharedEffects
  const eligible = midi.hasMidiOutput && sharedEffects
  const isSent = (presetId: string, effects: Uint8Array) =>
    lastSent?.presetId === presetId &&
    lastSent.route === route &&
    sameBytes(lastSent.effects, effects)
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

  /** Puts `effects` in the rack as `presetId`, and sends them when the FM1 can take them. */
  const recall = async (effects: Uint8Array, presetId: string, sendAgain: boolean) => {
    if (sendInFlight.current || mutationInFlight.current) return
    setError('')
    setV16Effects(effects)
    setV16EffectsPresetId(presetId)
    setLoadedOnly(!eligible)
    if (!eligible || (isSent(presetId, effects) && !sendAgain)) return
    const controller = new AbortController()
    sendAbort.current = controller
    sendInFlight.current = true
    setSending(true)
    clearV16EffectsLastSent()
    let sent = false
    try {
      sent = (await midi.sendSharedEffectSettings(effects.slice(), controller.signal)).ok
    } catch {
      // A thrown send is reported like a partial one.
    } finally {
      sendInFlight.current = false
      sendAbort.current = null
      setSending(false)
    }
    if (controller.signal.aborted) return
    if (sent) {
      // What was sent is the snapshot; the rack may have been edited while it went out.
      markV16EffectsSent(presetId, route, effects)
    } else {
      setError(t('fxPresets.partial'))
    }
  }

  /** One click recalls a preset; Undo, for one step only, puts the previous rack back. */
  const load = (preset: FxLibraryPreset) => {
    if (sendInFlight.current || mutationInFlight.current) return
    const before = { effects: current.slice(), id: loadedId }
    const changed = preset.id !== loadedId || !sameBytes(preset.effects, current)
    const done = recall(preset.effects, preset.id, false)
    if (changed) {
      toast.success(t('fxPresets.loaded', { name: preset.name }), {
        action: {
          label: t('toasts.undo'),
          onAction: () => void recall(before.effects, before.id, true),
        },
      })
    }
    return done
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

  const renderList = (menuTarget?: HTMLElement | null) => (
    <>
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
        <ErrorNotice>{t('fxPresets.unreadable', { count: fxLibrary.damagedCount })}</ErrorNotice>
      ) : null}
      {fxLibrary.status === 'ready' ? (
        visible.length ? (
          <ul
            aria-label={t('fxPresets.dialogTitle')}
            className="-m-0.5 flex max-h-36 flex-col gap-1.5 overflow-y-auto p-0.5 md:max-h-[50dvh]"
          >
            {visible.map((preset) => (
              <li
                className={cn(
                  'bank-tab flex min-w-0 items-center gap-[9px] border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] px-2 py-[7px] transition-colors',
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
                    'font-dot-matrix min-h-[30px] min-w-0 flex-1 cursor-pointer truncate text-left text-[14px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]',
                    preset.id === loadedId ? 'text-[var(--crt-led)]' : 'text-[var(--crt-ink-2)]',
                  )}
                  onClick={() => {
                    if (blocked) return
                    void load(preset)
                    setSheetOpen(false)
                  }}
                  title={preset.name}
                  type="button"
                >
                  {preset.name}
                </button>
                <PortalMenu
                  portalTarget={menuTarget}
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
    </>
  )

  const searchField = (
    <label className="relative block min-w-0">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[var(--crt-ink-3)]"
      />
      <input
        aria-label={t('fxPresets.search')}
        className="patch-search-input crt-field h-8 w-full pr-2.5 pl-8 text-xs tracking-[0.06em] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)]"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={t('fxPresets.search')}
        type="search"
        value={search}
      />
    </label>
  )

  const rackName = loaded ? loaded.name : t('fxPresets.unsavedEffects')

  return (
    <section
      aria-label={t('fxPresets.dialogTitle')}
      aria-busy={sending}
      className="patch-area-surface flex min-w-0 flex-col items-stretch md:flex-row"
    >
      {menuSlot ? createPortal(menu, menuSlot) : null}
      {narrow ? null : (
        <div className={cn('w-[226px] shrink-0', libraryRailClassName)}>
          {!menuSlot ? menu : null}
          <div className="flex min-w-0 flex-col gap-1.5 p-2 text-sm break-words">
            {renderList()}
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className={libraryStripClassName}>
          <h3
            className={cn(
              'flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 break-words',
              libraryStripNameClassName,
            )}
          >
            {narrow ? (
              <button
                aria-haspopup="dialog"
                className="inline-flex min-h-6 max-w-full min-w-0 cursor-pointer items-center gap-1 text-left font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
                onClick={() => setSheetOpen(true)}
                type="button"
              >
                <span className="break-words">{rackName}</span>
                <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
              </button>
            ) : (
              <span>{rackName}</span>
            )}
            {loaded && modified ? (
              <span className="text-xs font-normal text-[var(--crt-ink-3)]">
                {t('fxPresets.edited')}
              </span>
            ) : null}
          </h3>
          <div className="flex min-w-0 flex-wrap items-center gap-2 md:ml-auto">
            {loaded && modified ? (
              <Button
                aria-disabled={unavailable || mode !== null}
                onClick={() => {
                  if (!unavailable && mode === null) void updateCurrent()
                }}
                type="button"
                variant="outline"
              >
                {t('fxPresets.saveButton')}
              </Button>
            ) : null}
            <Button
              aria-disabled={unavailable || mode !== null}
              onClick={startSave}
              type="button"
              variant="outline"
            >
              {t('fxPresets.saveAs')}
            </Button>
            {/* Sends the whole rack, as it is, to the shared FX group: after the FM1's own knobs
                changed it, a power cycle, or a send that failed. */}
            <Button
              aria-disabled={unavailable || mode !== null}
              // A barber pole while the effects are on their way, as the bank's Send shows.
              className={cn(librarySendButtonClassName, sending && 'barber-pole')}
              onClick={() => {
                if (!unavailable && mode === null) void recall(current.slice(), loadedId, true)
              }}
              size="bare"
              type="button"
              variant="bare"
            >
              <Send aria-hidden="true" className="size-3.5" />
              {/* Both labels share one cell, so the button keeps the longer one's width. */}
              <span className="grid">
                <span
                  aria-hidden={sending || undefined}
                  className={cn('[grid-area:1/1]', sending && 'invisible')}
                >
                  {t('banks.send')}
                </span>
                <span
                  aria-hidden={!sending || undefined}
                  className={cn('[grid-area:1/1]', !sending && 'invisible')}
                >
                  {t('banks.sending')}
                </span>
              </span>
            </Button>
          </div>
        </div>
        <div className="empty:hidden" role="status">
          {/* Read aloud only: the Send button shows the send, so nothing below the strip moves. */}
          {sending ? (
            <span className="sr-only">{t('fxPresets.sending')}</span>
          ) : notReached ? (
            <div className="px-2 pt-2">
              <InfoNotice>
                <p>{t(`fxPresets.${notReached}`)}</p>
              </InfoNotice>
            </div>
          ) : null}
        </div>
        <div className="grid gap-2 px-2 pt-2 empty:hidden">{!mode ? failureNotice : null}</div>
        <div className={libraryContentClassName}>{children}</div>
      </div>
      {narrow && sheetOpen ? (
        <FxPresetSheet onClose={() => setSheetOpen(false)} title={t('fxPresets.dialogTitle')}>
          {(target) => (
            <div className="grid min-w-0 gap-2 p-2 text-sm break-words">
              {searchField}
              {renderList(target)}
            </div>
          )}
        </FxPresetSheet>
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
            <p className="text-sm">{t('fxPresets.deleteConfirm', { name: modePreset?.name })}</p>
          )}
          {(mode === 'save' || mode === 'rename') && name && invalidName ? (
            <ErrorNotice>
              {t('fxPresets.errors.name', { max: fxLibraryPresetNameLength })}
            </ErrorNotice>
          ) : null}
          {failureNotice}
        </FxPresetDialog>
      ) : null}
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
    </section>
  )
}
