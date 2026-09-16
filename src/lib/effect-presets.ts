import { fm1EffectParameters, type EffectParameterId } from '@/lib/fm1-parameters'

/*
  Starting points for the FM1 effects chain. The device's value scaling and
  units are unconfirmed (docs/fm1-research.md §7), so presets are named by
  character and keep their values away from the ends of each range.

  A preset turns on only the effects it lists, and sets every control of
  each, so applying it always gives the same sound. The other effects are
  bypassed but keep their settings.

  Delay rate is assumed to lengthen the gap between repeats as it rises, as
  the delay scope draws it. Slapback and Echo depend on that direction, which
  still needs confirming on hardware.
*/
export type EffectPresetId = 'dry' | 'smallRoom' | 'largeHall' | 'plate' | 'slapback' | 'echo'

type EffectPreset = {
  id: EffectPresetId
  values: Partial<Record<EffectParameterId, number>>
}

const reverbRoom = 0
const reverbHall = 1
const reverbPlate = 2

export const effectPresets: EffectPreset[] = [
  { id: 'dry', values: {} },
  {
    id: 'smallRoom',
    values: {
      'effect.reverb.enabled': 1,
      'effect.reverb.space': reverbRoom,
      'effect.reverb.decay': 30,
      'effect.reverb.mix': 25,
    },
  },
  {
    id: 'largeHall',
    values: {
      'effect.reverb.enabled': 1,
      'effect.reverb.space': reverbHall,
      'effect.reverb.decay': 70,
      'effect.reverb.mix': 35,
    },
  },
  {
    id: 'plate',
    values: {
      'effect.reverb.enabled': 1,
      'effect.reverb.space': reverbPlate,
      'effect.reverb.decay': 50,
      'effect.reverb.mix': 30,
    },
  },
  {
    id: 'slapback',
    values: {
      'effect.delay.enabled': 1,
      'effect.delay.decay': 10,
      'effect.delay.rate': 15,
      'effect.delay.mix': 30,
    },
  },
  {
    id: 'echo',
    values: {
      'effect.delay.enabled': 1,
      'effect.delay.decay': 45,
      'effect.delay.rate': 55,
      'effect.delay.mix': 30,
    },
  },
]

/** Returns the effect settings with the preset applied, leaving `settings` unchanged. */
export function applyEffectPreset(settings: Uint8Array, id: EffectPresetId) {
  const preset = effectPresets.find((candidate) => candidate.id === id)
  if (!preset) throw new RangeError(`Unknown effect preset: ${id}`)

  const next = settings.slice()
  for (const { controller, id: parameterId, kind } of fm1EffectParameters) {
    if (kind === 'switch') next[controller] = 0
    const value = preset.values[parameterId]
    if (value !== undefined) next[controller] = value
  }
  return next
}
