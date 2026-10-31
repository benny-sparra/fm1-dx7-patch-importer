import { Download, Upload } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

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
import { InfoNotice } from '@/components/ui/info-notice'
import type { FxLibrary } from '@/hooks/use-fx-library'
import '@/i18n/fx-presets'
import { hasSharedEffects, resolveFirmwareProfile } from '@/lib/firmware-profile'
import { fxLibraryPresetCopyName } from '@/lib/fx-library-preset'
import { FxLibraryPresetConflictError } from '@/lib/fx-library-storage'
import {
  fxPresetFileAccept,
  fxPresetFileName,
  FxPresetFileError,
  makeFxPresetFile,
  readFxPresetFile,
} from '@/lib/fx-preset-file'
import { downloadFile } from '@/lib/download-file'
import {
  clearV16EffectsLastSent,
  getV16Effects,
  getV16EffectsLastSent,
  getV16EffectsPersistence,
  markV16EffectsSent,
  setV16Effects,
  subscribeV16Effects,
  v16EffectsRouteKey,
} from '@/lib/v16-effects'

type Props = {
  fxLibrary: FxLibrary
  midi: V16EffectsMidi
  onClose: () => void
  onSendingChange: (sending: boolean) => void
}

export function FxPresetLibraryDialog({ fxLibrary, midi, onClose, onSendingChange }: Props) {
  const { i18n, t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const importInput = useRef<HTMLInputElement>(null)
  const current = useSyncExternalStore(subscribeV16Effects, getV16Effects)
  const lastSent = useSyncExternalStore(subscribeV16Effects, getV16EffectsLastSent)
  const { pending: libraryPending, reload: reloadLibrary, status: libraryStatus } = fxLibrary
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'delete' | 'duplicate' | 'rename' | 'save' | 'update' | null>(
    null,
  )
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [sending, setSending] = useState(false)
  const [working, setWorking] = useState(false)
  const mutationInFlight = useRef(false)
  const sendInFlight = useRef(false)
  const saveCapture = useRef<Uint8Array | null>(null)
  const selected = fxLibrary.presets.find((preset) => preset.id === selectedId)
  const duplicateName = selected ? fxLibraryPresetCopyName(selected.name) : ''
  const matchesCurrent = Boolean(
    selected?.effects.every((value, index) => value === current[index]),
  )
  const route = v16EffectsRouteKey(midi.selectedOutputId, midi.effectChannel, midi.firmware)
  const outputName = midi.outputs?.find(({ id }) => id === midi.selectedOutputId)?.name
  const eligible =
    midi.hasMidiOutput &&
    Boolean(midi.sendSharedEffectSettings) &&
    hasSharedEffects(resolveFirmwareProfile(midi.firmware))
  const matchesLastSend = Boolean(
    selected &&
    lastSent?.presetId === selected.id &&
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
  const invalidName = !name.trim() || Array.from(name.trim()).length > 80
  const busy = sending || working

  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  useEffect(() => {
    if (libraryStatus === 'ready' && !libraryPending) {
      void reloadLibrary().catch(() => undefined)
    }
  }, [libraryPending, libraryStatus, reloadLibrary])
  useEffect(() => onSendingChange(sending), [onSendingChange, sending])
  useEffect(() => () => onSendingChange(false), [onSendingChange])

  const run = async (operation: () => Promise<unknown>, success: string) => {
    if (mutationInFlight.current) return false
    mutationInFlight.current = true
    setWorking(true)
    setError('')
    setConflict(false)
    try {
      await operation()
      setMessage(success)
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

  const load = async (sendAgain = false) => {
    if (!selected || sendInFlight.current) return
    setV16Effects(selected.effects)
    setMessage(
      getV16EffectsPersistence() === 'persisted'
        ? t('fxPresets.loadedLocal')
        : t('fxPresets.loadedSessionOnly'),
    )
    if (!eligible || (matchesLastSend && !sendAgain)) return
    sendInFlight.current = true
    setSending(true)
    clearV16EffectsLastSent()
    let result
    try {
      result = await midi.sendSharedEffectSettings?.(selected.effects.slice())
    } catch {
      setError(t('fxPresets.partial'))
      return
    } finally {
      sendInFlight.current = false
      setSending(false)
    }
    if (result?.ok) {
      markV16EffectsSent(selected.id, route)
      setMessage(t('fxPresets.sent'))
    } else if (result) {
      setError(t('fxPresets.partial'))
    }
  }

  const confirm = async () => {
    if (mode === 'save') {
      const captured = saveCapture.current
      if (!captured) return
      await run(() => fxLibrary.save(name, captured), t('fxPresets.saved', { name: name.trim() }))
    } else if (selected && mode === 'rename') {
      await run(
        () => fxLibrary.rename(selected, name),
        t('fxPresets.renamed', { name: name.trim() }),
      )
    } else if (selected && mode === 'duplicate') {
      await run(
        () => fxLibrary.duplicate(selected),
        t('fxPresets.duplicated', { name: duplicateName }),
      )
    } else if (selected && mode === 'update') {
      await run(
        () => fxLibrary.update(selected, getV16Effects().slice()),
        t('fxPresets.updated', { name: selected.name }),
      )
    } else if (selected && mode === 'delete') {
      if (
        await run(() => fxLibrary.delete(selected), t('fxPresets.deleted', { name: selected.name }))
      ) {
        setSelectedId('')
      }
    }
  }

  return (
    <Dialog
      aria-labelledby={titleId}
      closeOnBackdrop={!sending}
      onCancel={(event) => sending && event.preventDefault()}
      onClose={onClose}
      ref={dialog}
      size="3xl"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>{t('fxPresets.dialogTitle')}</DialogTitle>
        <DialogCloseButton
          disabled={sending}
          label={t('common.close')}
          onClick={() => dialog.current?.close()}
        />
      </DialogHeader>
      <DialogBody>
        <div className="grid gap-4 p-4">
          <input
            aria-label={t('fxPresets.search')}
            className="crt-field h-9 px-3 text-sm"
            disabled={sending}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('fxPresets.search')}
            type="search"
            value={search}
          />
          {fxLibrary.status === 'loading' ? <p>{t('fxPresets.loading')}</p> : null}
          {fxLibrary.status === 'error' ? (
            <div className="grid justify-items-start gap-2">
              <ErrorNotice>{t('fxPresets.errors.load')}</ErrorNotice>
              <Button
                onClick={() => void fxLibrary.reload().catch(() => undefined)}
                size="sm"
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
              <div
                className="grid max-h-56 gap-1 overflow-y-auto border border-[var(--crt-line)] p-1"
                role="listbox"
              >
                {visible.map((preset) => (
                  <button
                    aria-selected={preset.id === selectedId}
                    className={
                      preset.id === selectedId
                        ? 'bg-[var(--crt-sel-bg)] px-3 py-2 text-left text-[var(--crt-acc-lt)]'
                        : 'px-3 py-2 text-left text-[var(--crt-ink-2)] hover:bg-[var(--crt-bg-head)]'
                    }
                    disabled={sending}
                    key={preset.id}
                    onClick={() => setSelectedId(preset.id)}
                    role="option"
                    type="button"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            ) : (
              <p>{fxLibrary.presets.length ? t('fxPresets.noMatches') : t('fxPresets.empty')}</p>
            )
          ) : null}
          {selected ? (
            <p className="text-sm text-[var(--crt-ink-3)]">
              {t('fxPresets.selected', { name: selected.name })}
              {matchesCurrent ? ` ${t('fxPresets.localMatch')}` : null}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || fxLibrary.status !== 'ready'}
              onClick={() => {
                saveCapture.current = current.slice()
                setName('')
                setMode('save')
              }}
              type="button"
            >
              {t('fxPresets.saveCurrent')}
            </Button>
            <Button
              disabled={!selected || busy}
              onClick={() => {
                setName(selected?.name ?? '')
                setMode('rename')
              }}
              type="button"
              variant="secondary"
            >
              {t('fxPresets.rename')}
            </Button>
            <Button
              disabled={!selected || busy}
              onClick={() => setMode('duplicate')}
              type="button"
              variant="secondary"
            >
              {t('fxPresets.duplicate')}
            </Button>
            <Button
              disabled={!selected || busy}
              onClick={() => setMode('update')}
              type="button"
              variant="secondary"
            >
              {t('fxPresets.update')}
            </Button>
            <Button
              disabled={!selected || busy}
              onClick={() => setMode('delete')}
              type="button"
              variant="destructive"
            >
              {t('fxPresets.delete')}
            </Button>
          </div>
          {mode ? (
            <div className="grid gap-3 border border-[var(--crt-line)] bg-[var(--crt-bg-panel2)] p-3">
              {mode === 'save' || mode === 'rename' ? (
                <input
                  aria-label={t('fxPresets.name')}
                  className="crt-field h-9 px-3"
                  disabled={busy}
                  onChange={(event) => setName(event.target.value)}
                  value={name}
                />
              ) : (
                <p>
                  {t(`fxPresets.${mode}Confirm`, {
                    name: mode === 'duplicate' ? duplicateName : selected?.name,
                  })}
                </p>
              )}
              {(mode === 'save' || mode === 'rename') && name && invalidName ? (
                <ErrorNotice>{t('fxPresets.errors.name')}</ErrorNotice>
              ) : null}
              <div className="flex gap-2">
                <Button
                  disabled={busy || ((mode === 'save' || mode === 'rename') && invalidName)}
                  onClick={() => void confirm()}
                  type="button"
                >
                  {t(mode === 'save' ? 'fxPresets.save' : `fxPresets.${mode}Action`)}
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => setMode(null)}
                  type="button"
                  variant="secondary"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : null}
          <InfoNotice>
            {eligible && outputName ? (
              <p>
                {t('fxPresets.destination', {
                  channel: midi.effectChannel ?? 1,
                  output: outputName,
                })}
              </p>
            ) : null}
            {!midi.hasMidiOutput ? (
              <p>{t('fxPresets.offline')}</p>
            ) : !eligible ? (
              <p>{t('fxPresets.ineligible')}</p>
            ) : null}
            <p>{t('fxPresets.help')}</p>
            <p>{t('fxPresets.orderHelp')}</p>
            <p>{t('fxPresets.noReadback')}</p>
          </InfoNotice>
          {message ? (
            <p aria-live="polite" className="text-sm text-[var(--crt-led)]">
              {message}
            </p>
          ) : null}
          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
          {conflict ? (
            <Button
              onClick={() => {
                setConflict(false)
                setError('')
                void fxLibrary.reload().catch(() => setError(t('fxPresets.errors.load')))
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {t('fxPresets.reload')}
            </Button>
          ) : null}
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
      </DialogBody>
      <DialogFooter className="flex-wrap justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy || fxLibrary.status !== 'ready'}
            onClick={() => importInput.current?.click()}
            type="button"
            variant="secondary"
          >
            <Upload />
            {t('fxPresets.import')}
          </Button>
          <Button
            disabled={!ordered.length || sending}
            onClick={() =>
              downloadFile(
                new Blob([makeFxPresetFile(ordered)], { type: 'application/json' }),
                fxPresetFileName,
              )
            }
            type="button"
            variant="secondary"
          >
            <Download />
            {t('fxPresets.exportAll')}
          </Button>
          <Button
            disabled={!selected || sending}
            onClick={() => {
              if (!selected) return
              downloadFile(
                new Blob([makeFxPresetFile([selected])], { type: 'application/json' }),
                fxPresetFileName,
              )
            }}
            type="button"
            variant="secondary"
          >
            <Download />
            {t('fxPresets.exportSelected')}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {matchesLastSend ? (
            <Button
              disabled={busy || fxLibrary.pending}
              onClick={() => void load(true)}
              type="button"
              variant="secondary"
            >
              {t('fxPresets.sendAgain')}
            </Button>
          ) : null}
          <Button
            disabled={!selected || busy || matchesLastSend || fxLibrary.pending}
            onClick={() => void load()}
            type="button"
          >
            {sending
              ? t('fxPresets.sending')
              : eligible
                ? t('fxPresets.loadApply')
                : t('fxPresets.loadLocal')}
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  )
}
