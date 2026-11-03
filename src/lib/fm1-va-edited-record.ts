import type { Fm1VaEngine } from '@/lib/fm1-va-engine'
import { fm1VaRecordWithKnobChoices } from '@/lib/fm1-va-knob-choices'
import {
  fm1VaRecordWithBitcrush,
  fm1VaRecordWithDistortionType,
  fm1VaRecordWithEffectOrder,
} from '@/lib/fm1-va-record-effects'

/** Compose only the settings the editor owns, retaining all other record bytes. */
export function fm1VaEditedRecord(
  record: Uint8Array,
  engine: Fm1VaEngine,
  settings: {
    bitcrush: number[]
    distortionType: number
    effectOrder: number[]
    knobChoices: number[]
  },
) {
  return fm1VaRecordWithKnobChoices(
    fm1VaRecordWithEffectOrder(
      fm1VaRecordWithBitcrush(
        fm1VaRecordWithDistortionType(record, settings.distortionType),
        settings.bitcrush,
      ),
      settings.effectOrder,
    ),
    settings.knobChoices,
    engine,
  )
}
