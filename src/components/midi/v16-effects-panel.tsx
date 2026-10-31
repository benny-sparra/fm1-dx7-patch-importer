import { SlidersHorizontal, Sparkles } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { EffectsUnit } from '@/components/editor/effects-unit'
import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { LoadFailedNotice } from '@/components/ui/load-failed-notice'
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

const FxPresetLibraryDialog = lazy(() =>
  import('@/components/midi/fx-preset-library-dialog').then((module) => ({
    default: module.FxPresetLibraryDialog,
  })),
)

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
  const [managing, setManaging] = useState(false)
  const [sending, setSending] = useState(false)
  const [dialogLoadFailed, setDialogLoadFailed] = useState(false)
  const manageButton = useRef<HTMLButtonElement>(null)
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
          <Button
            onClick={() => {
              setDialogLoadFailed(false)
              setManaging(true)
            }}
            ref={manageButton}
            size="sm"
            type="button"
            variant="secondary"
          >
            <SlidersHorizontal aria-hidden="true" />
            {t('fxPresets.manage')}
          </Button>
        }
        icon={Sparkles}
        id="v16-effects-heading"
        title={t('fxPresets.effectsTitle')}
      />
      <EffectsUnit
        disabled={sending}
        onApplyPreset={applyPreset}
        onChange={setParameter}
        onGestureEnd={noGesture}
        onGestureStart={noGesture}
        values={effects}
      />
      {dialogLoadFailed ? <LoadFailedNotice message={t('fxPresets.errors.load')} /> : null}
      {managing ? (
        <ErrorBoundary
          onError={() => {
            setManaging(false)
            setDialogLoadFailed(true)
            manageButton.current?.focus()
          }}
        >
          <Suspense fallback={null}>
            <FxPresetLibraryDialog
              fxLibrary={library}
              midi={midi}
              onClose={() => {
                setManaging(false)
                manageButton.current?.focus()
              }}
              onSendingChange={setSending}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
    </section>
  )
}

function noGesture() {}
