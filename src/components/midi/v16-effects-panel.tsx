import { Search, Sparkles } from 'lucide-react'
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { EffectsUnit } from '@/components/editor/effects-unit'
import { FxPresetLibrary } from '@/components/midi/fx-preset-library'
import { HelpPopover } from '@/components/ui/help-popover'
import { InfoNotice } from '@/components/ui/info-notice'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import {
  libraryPanelHeaderClassName,
  libraryPanelTitleClassName,
  librarySearchInputClassName,
} from '@/components/patches/library-panel'
import { useFxLibrary, type FxLibrary } from '@/hooks/use-fx-library'
import { useV16EffectOrder } from '@/hooks/use-v16-effect-order'
import type { MidiController } from '@/hooks/use-midi'
import '@/i18n/fx-presets'
import { applyEffectPreset, type EffectPresetId } from '@/lib/effect-presets'
import {
  clearV16EffectsLastSent,
  getV16Effects,
  getV16EffectsPersistence,
  setV16Effects,
  subscribeV16Effects,
  v16EffectsRouteKey,
} from '@/lib/v16-effects'

export type V16EffectsMidi = Pick<
  MidiController,
  | 'effectChannel'
  | 'firmware'
  | 'hasMidiOutput'
  | 'selectedOutputId'
  | 'sendSharedEffectParameter'
  | 'sendSharedEffectSettings'
>

type PanelProps = {
  fxLibrary?: FxLibrary
  midi: V16EffectsMidi & Parameters<typeof useV16EffectOrder>[0]
}

/**
 * The V16 effects rack and its named presets. `fxLibrary` is a test seam; production owns the
 * library behind this lazy-loaded panel, and a library passed in is never opened a second time.
 */
export function V16EffectsPanel({ fxLibrary, midi }: PanelProps) {
  return fxLibrary ? (
    <V16EffectsRack fxLibrary={fxLibrary} midi={midi} />
  ) : (
    <OwnedV16EffectsRack midi={midi} />
  )
}

function OwnedV16EffectsRack({ midi }: Pick<PanelProps, 'midi'>) {
  return <V16EffectsRack fxLibrary={useFxLibrary()} midi={midi} />
}

function V16EffectsRack({ fxLibrary, midi }: Required<PanelProps>) {
  const { t } = useTranslation()
  const headingId = useId()
  const effects = useSyncExternalStore(subscribeV16Effects, getV16Effects)
  const persistence = useSyncExternalStore(subscribeV16Effects, getV16EffectsPersistence)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [menuSlot, setMenuSlot] = useState<HTMLSpanElement | null>(null)
  const route = v16EffectsRouteKey(midi.selectedOutputId, midi.effectChannel, midi.firmware)
  const previousRoute = useRef(route)
  const chain = useV16EffectOrder(midi)
  const orderNotice =
    chain.status === 'reading'
      ? t('fxPresets.effectOrderReading')
      : chain.status === 'failed'
        ? t('fxPresets.effectOrderFailed')
        : chain.writeFailed
          ? t('fxPresets.effectOrderWriteFailed')
          : chain.status === 'ready'
            ? t('fxPresets.effectOrderUnsaved')
            : undefined

  useEffect(() => {
    if (route !== previousRoute.current) clearV16EffectsLastSent()
    previousRoute.current = route
  }, [route])

  const change = (next: Uint8Array) => {
    const changed = setV16Effects(next)
    changed.forEach((controller) => {
      void midi.sendSharedEffectParameter?.(controller, next[controller])
    })
  }
  const setParameter = (controller: number, value: number) => {
    const next = effects.slice()
    next[controller] = value
    change(next)
  }
  const applyPreset = (id: EffectPresetId) => change(applyEffectPreset(effects, id).settings)

  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <Card className="synthwave-panel">
        <CardHeader className={libraryPanelHeaderClassName}>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <CardTitle className={libraryPanelTitleClassName} id={headingId}>
              <Sparkles aria-hidden="true" className="size-4 shrink-0" />
              {t('fxPresets.effectsTitle')}
              <HelpPopover
                className="text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]"
                label={t('fxPresets.effectsTitle')}
                text={[
                  t('fxPresets.help'),
                  t('fxPresets.orderHelp'),
                  t('fxPresets.noReadback'),
                ].join(' ')}
              />
            </CardTitle>
            {/* Below md the preset list is a sheet with its own search. */}
            <label className="relative hidden w-64 md:ml-auto md:block">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[var(--crt-ink-3)]"
              />
              <input
                aria-label={t('fxPresets.search')}
                className={librarySearchInputClassName}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape' || !search) return
                  event.preventDefault()
                  setSearch('')
                }}
                placeholder={t('fxPresets.search')}
                type="search"
                value={search}
              />
            </label>
            <span className="shrink-0 max-md:ml-auto" ref={setMenuSlot} />
          </div>
        </CardHeader>
        <div className="empty:hidden" role="status">
          {persistence === 'session-only' ? (
            <div className="px-2 pt-2">
              <InfoNotice>
                <p>{t('fxPresets.sessionOnly')}</p>
              </InfoNotice>
            </div>
          ) : null}
        </div>
        <FxPresetLibrary
          fxLibrary={fxLibrary}
          midi={midi}
          menuSlot={menuSlot}
          onSearchChange={setSearch}
          onSendingChange={setSending}
          search={search}
        >
          <EffectsUnit
            disabled={sending}
            effectOrder={
              chain.status === 'unavailable'
                ? undefined
                : {
                    disabled: chain.status !== 'ready',
                    dragTitle: t('fxPresets.effectOrderDragTitle'),
                    notice: orderNotice,
                    onMove: chain.move,
                    order: chain.order,
                  }
            }
            onApplyPreset={applyPreset}
            onChange={setParameter}
            onGestureEnd={noGesture}
            onGestureStart={noGesture}
            twoColumns
            values={effects}
          />
        </FxPresetLibrary>
      </Card>
    </section>
  )
}

function noGesture() {}
