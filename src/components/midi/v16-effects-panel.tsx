import { Sparkles } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { EffectsUnit } from '@/components/editor/effects-unit'
import { RackPanelTitle } from '@/components/ui/rack-panel'
import '@/i18n/voices'
import { useV16EffectOrder } from '@/hooks/use-v16-effect-order'
import type { MidiController } from '@/hooks/use-midi'
import { applyEffectPreset, type EffectPresetId } from '@/lib/effect-presets'
import { getV16Effects, setV16Effects, subscribeV16Effects } from '@/lib/v16-effects'

type V16EffectsPanelProps = {
  midi: Pick<MidiController, 'sendEffectParameter'> & Parameters<typeof useV16EffectOrder>[0]
}

/**
 * The effects of M-VAVE's V16, the body of the Voices bar's Effects tab: the editor's own effects
 * panel on the one FX group the eight Voices share. Opening it sends nothing. An edit sends only
 * the controllers it changed, on the effect channel, and is unsaved on the FM1 until SAVE. There is
 * no undo here: the effects are not part of a patch, which is what the editor's history belongs to.
 */
export function V16EffectsPanel({ midi }: V16EffectsPanelProps) {
  const { t } = useTranslation()
  const effects = useSyncExternalStore(subscribeV16Effects, getV16Effects)
  const chain = useV16EffectOrder(midi)
  const notice =
    chain.status === 'reading'
      ? t('voices.effectOrderReading')
      : chain.status === 'failed'
        ? t('voices.effectOrderFailed')
        : chain.writeFailed
          ? t('voices.effectOrderWriteFailed')
          : chain.status === 'ready'
            ? t('voices.effectOrderUnsaved')
            : undefined

  const change = (next: Uint8Array) => {
    const changed = setV16Effects(next)
    if (!midi.hasMidiOutput) return
    changed.forEach((controller) => midi.sendEffectParameter(controller, next[controller]))
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
        icon={Sparkles}
        id="v16-effects-heading"
        tall
        title={t('voices.effectsTitle')}
      />
      <EffectsUnit
        effectOrder={
          chain.status === 'unavailable'
            ? undefined
            : {
                disabled: chain.status !== 'ready',
                dragTitle: t('voices.effectOrderDragTitle'),
                notice,
                onMove: chain.move,
                order: chain.order,
              }
        }
        onApplyPreset={applyPreset}
        onChange={setParameter}
        onGestureEnd={noGesture}
        onGestureStart={noGesture}
        values={effects}
      />
    </section>
  )
}

function noGesture() {}
