import { Search, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { EffectsUnit } from '@/components/editor/effects-unit'
import { HelpPopover } from '@/components/ui/help-popover'
import { RackPanelTitle } from '@/components/ui/rack-panel'
import { useFxLibrary, type FxLibrary } from '@/hooks/use-fx-library'
import type { MidiController } from '@/hooks/use-midi'
import '@/i18n/fx-presets'
import { applyEffectPreset, type EffectPresetId } from '@/lib/effect-presets'
import {
  clearV16EffectsLastSent,
  getV16Effects,
  setV16Effects,
  subscribeV16Effects,
  v16EffectsRouteKey,
} from '@/lib/v16-effects'

import { FxPresetLibraryDialog } from '@/components/midi/fx-preset-library-dialog'

export type V16EffectsMidi = Pick<MidiController, 'firmware' | 'hasMidiOutput'> &
  Partial<
    Pick<
      MidiController,
      | 'effectChannel'
      | 'outputs'
      | 'selectedOutputId'
      | 'sendSharedEffectParameter'
      | 'sendSharedEffectSettings'
    >
  >

export function V16EffectsPanel({
  fxLibrary,
  midi,
}: {
  /** A test seam; production owns the library behind this lazy-loaded panel. */
  fxLibrary?: FxLibrary
  midi: V16EffectsMidi
}) {
  const { t } = useTranslation()
  const ownedFxLibrary = useFxLibrary()
  const library = fxLibrary ?? ownedFxLibrary
  const effects = useSyncExternalStore(subscribeV16Effects, getV16Effects)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [menuSlot, setMenuSlot] = useState<HTMLSpanElement | null>(null)
  const route = v16EffectsRouteKey(midi.selectedOutputId, midi.effectChannel, midi.firmware)
  const previousRoute = useRef(route)

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
    <section aria-labelledby="v16-effects-heading" className="synthwave-panel min-w-0">
      <RackPanelTitle
        action={
          <div className="flex min-w-0 items-center gap-2">
            <label className="relative block w-40 min-w-0 sm:w-64">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[var(--crt-ink-3)]"
              />
              <input
                aria-label={t('fxPresets.search')}
                className="patch-search-input crt-field h-7 w-full pr-2.5 pl-8 text-xs tracking-[0.06em] transition outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={sending}
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
            <span ref={setMenuSlot} />
          </div>
        }
        help={
          <HelpPopover
            className="text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]"
            label={t('fxPresets.effectsTitle')}
            text={t('fxPresets.help')}
          />
        }
        icon={Sparkles}
        id="v16-effects-heading"
        title={t('fxPresets.effectsTitle')}
      />
      <FxPresetLibraryDialog
        fxLibrary={library}
        midi={midi}
        menuSlot={menuSlot}
        onSendingChange={setSending}
        search={search}
      >
        <EffectsUnit
          disabled={sending}
          onApplyPreset={applyPreset}
          onChange={setParameter}
          onGestureEnd={noGesture}
          onGestureStart={noGesture}
          twoColumns
          values={effects}
        />
      </FxPresetLibraryDialog>
    </section>
  )
}

function noGesture() {}
