import { fm1EffectParameters, type EffectParameterId } from '@/lib/fm1-parameters'

/*
  Starting points for single FM1 effects, offered in that effect's box. The
  device's value scaling and units are unconfirmed (docs/fm1-research.md §7),
  so presets are named by character and keep their values away from the ends
  of each range.

  A preset switches its effect on and sets every one of its controls, so
  applying it always gives the same sound. Other effects are left alone.

  Delay rate is assumed to lengthen the gap between repeats as it rises, as
  the delay scope draws it. Slapback and Echo depend on that direction, which
  still needs confirming on hardware.
*/
type PresetEffect = 'reverb' | 'delay'

export type EffectPresetId = 'smallRoom' | 'largeHall' | 'plate' | 'slapback' | 'echo'

type EffectPreset = {
  effect: PresetEffect
  id: EffectPresetId
  values: Partial<Record<EffectParameterId, number>>
}

const reverbRoom = 0
const reverbHall = 1
const reverbPlate = 2

export const effectPresets: EffectPreset[] = [
  {
    effect: 'reverb',
    id: 'smallRoom',
    values: {
      'effect.reverb.enabled': 1,
      'effect.reverb.space': reverbRoom,
      'effect.reverb.decay': 30,
      'effect.reverb.mix': 25,
    },
  },
  {
    effect: 'reverb',
    id: 'largeHall',
    values: {
      'effect.reverb.enabled': 1,
      'effect.reverb.space': reverbHall,
      'effect.reverb.decay': 70,
      'effect.reverb.mix': 35,
    },
  },
  {
    effect: 'reverb',
    id: 'plate',
    values: {
      'effect.reverb.enabled': 1,
      'effect.reverb.space': reverbPlate,
      'effect.reverb.decay': 50,
      'effect.reverb.mix': 30,
    },
  },
  {
    effect: 'delay',
    id: 'slapback',
    values: {
      'effect.delay.enabled': 1,
      'effect.delay.decay': 10,
      'effect.delay.rate': 15,
      'effect.delay.mix': 30,
    },
  },
  {
    effect: 'delay',
    id: 'echo',
    values: {
      'effect.delay.enabled': 1,
      'effect.delay.decay': 45,
      'effect.delay.rate': 55,
      'effect.delay.mix': 30,
    },
  },
]

/** The effect a parameter belongs to, such as `reverb` for `effect.reverb.decay`. */
export function effectOfParameter(id: EffectParameterId) {
  return id.split('.')[1]
}

export function effectPresetsFor(effect: string) {
  return effectPresets.filter((preset) => preset.effect === effect)
}

/**
 * Returns the effect settings with the preset applied, leaving `settings` unchanged, and the
 * controllers of the preset's effect.
 */
export function applyEffectPreset(settings: Uint8Array, id: EffectPresetId) {
  const preset = effectPresets.find((candidate) => candidate.id === id)
  if (!preset) throw new RangeError(`Unknown effect preset: ${id}`)

  const next = settings.slice()
  const controllers: number[] = []
  for (const { controller, id: parameterId } of fm1EffectParameters) {
    const value = preset.values[parameterId]
    if (value === undefined) continue
    next[controller] = value
    controllers.push(controller)
  }
  return { controllers, settings: next }
}
