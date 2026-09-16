import { fm1EffectParameters, type EffectParameterId } from '@/lib/fm1-parameters'

/*
  Starting points for single FM1 effects, offered in that effect's box. The
  device's value scaling and units are unconfirmed (docs/fm1-research.md §7),
  so presets are named by character and keep their values away from the ends
  of each range.

  A preset sets every control of its effect, so applying it always gives the
  same sound. Its menu is disabled while the effect is bypassed, but a preset
  still sets the switch on, so applying one can never leave its effect silent.
  Other effects are left alone.

  Listening on an FM1 matched the reverb Space order (room, hall, plate), and
  found that a higher delay Rate repeats faster, so the shortest delays have
  the highest rates (docs/fx-003-hardware-verification.md §8).
*/
type PresetEffect = 'reverb' | 'delay'

export type EffectPresetId =
  | 'smallRoom'
  | 'largeRoom'
  | 'smallHall'
  | 'largeHall'
  | 'plate'
  | 'slapback'
  | 'quickDelay'
  | 'quickRepeats'
  | 'echo'

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
    id: 'largeRoom',
    values: {
      'effect.reverb.enabled': 1,
      'effect.reverb.space': reverbRoom,
      'effect.reverb.decay': 55,
      'effect.reverb.mix': 30,
    },
  },
  {
    effect: 'reverb',
    id: 'smallHall',
    values: {
      'effect.reverb.enabled': 1,
      'effect.reverb.space': reverbHall,
      'effect.reverb.decay': 45,
      'effect.reverb.mix': 30,
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
      'effect.delay.rate': 85,
      'effect.delay.mix': 30,
    },
  },
  {
    effect: 'delay',
    id: 'quickDelay',
    values: {
      'effect.delay.enabled': 1,
      'effect.delay.decay': 20,
      'effect.delay.rate': 75,
      'effect.delay.mix': 30,
    },
  },
  {
    effect: 'delay',
    id: 'quickRepeats',
    values: {
      'effect.delay.enabled': 1,
      'effect.delay.decay': 60,
      'effect.delay.rate': 75,
      'effect.delay.mix': 25,
    },
  },
  {
    effect: 'delay',
    id: 'echo',
    values: {
      'effect.delay.enabled': 1,
      'effect.delay.decay': 45,
      'effect.delay.rate': 45,
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
