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
  the highest rates. Chorus and phaser Frequency were heard to speed up as
  they rise, filter Cutoff to brighten and Resonance to sharpen, and
  distortion Tone to brighten (docs/fx-003-hardware-verification.md §8 and
  §9). Distortion presets lower Level as Gain rises, so the heavier ones are
  not also louder, and resonance stays low outside the Resonant preset.
*/
type PresetEffect = 'filter' | 'reverb' | 'delay' | 'distortion' | 'chorus' | 'phaser'

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
  | 'subtleChorus'
  | 'ensemble'
  | 'chorusWash'
  | 'shimmer'
  | 'gentlePhase'
  | 'slowSweep'
  | 'deepPhase'
  | 'fastSwirl'
  | 'warm'
  | 'muffled'
  | 'telephone'
  | 'thin'
  | 'resonant'
  | 'lightDrive'
  | 'warmDrive'
  | 'crunch'
  | 'fuzz'

type EffectPreset = {
  effect: PresetEffect
  id: EffectPresetId
  values: Partial<Record<EffectParameterId, number>>
}

const filterLowPass = 0
const filterBandPass = 1
const filterHighPass = 2
const reverbRoom = 0
const reverbHall = 1
const reverbPlate = 2

export const effectPresets: EffectPreset[] = [
  {
    effect: 'filter',
    id: 'warm',
    values: {
      'effect.filter.enabled': 1,
      'effect.filter.type': filterLowPass,
      'effect.filter.cutoff': 70,
      'effect.filter.resonance': 2,
    },
  },
  {
    effect: 'filter',
    id: 'muffled',
    values: {
      'effect.filter.enabled': 1,
      'effect.filter.type': filterLowPass,
      'effect.filter.cutoff': 30,
      'effect.filter.resonance': 1,
    },
  },
  {
    effect: 'filter',
    id: 'telephone',
    values: {
      'effect.filter.enabled': 1,
      'effect.filter.type': filterBandPass,
      'effect.filter.cutoff': 60,
      'effect.filter.resonance': 3,
    },
  },
  {
    effect: 'filter',
    id: 'thin',
    values: {
      'effect.filter.enabled': 1,
      'effect.filter.type': filterHighPass,
      'effect.filter.cutoff': 45,
      'effect.filter.resonance': 2,
    },
  },
  {
    effect: 'filter',
    id: 'resonant',
    values: {
      'effect.filter.enabled': 1,
      'effect.filter.type': filterLowPass,
      'effect.filter.cutoff': 55,
      'effect.filter.resonance': 7,
    },
  },
  {
    effect: 'distortion',
    id: 'lightDrive',
    values: {
      'effect.distortion.enabled': 1,
      'effect.distortion.gain': 20,
      'effect.distortion.tone': 50,
      'effect.distortion.level': 60,
    },
  },
  {
    effect: 'distortion',
    id: 'warmDrive',
    values: {
      'effect.distortion.enabled': 1,
      'effect.distortion.gain': 40,
      'effect.distortion.tone': 35,
      'effect.distortion.level': 55,
    },
  },
  {
    effect: 'distortion',
    id: 'crunch',
    values: {
      'effect.distortion.enabled': 1,
      'effect.distortion.gain': 60,
      'effect.distortion.tone': 60,
      'effect.distortion.level': 50,
    },
  },
  {
    effect: 'distortion',
    id: 'fuzz',
    values: {
      'effect.distortion.enabled': 1,
      'effect.distortion.gain': 85,
      'effect.distortion.tone': 45,
      'effect.distortion.level': 40,
    },
  },
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
  {
    effect: 'chorus',
    id: 'subtleChorus',
    values: {
      'effect.chorus.enabled': 1,
      'effect.chorus.frequency': 20,
      'effect.chorus.depth': 25,
      'effect.chorus.mix': 25,
    },
  },
  {
    effect: 'chorus',
    id: 'ensemble',
    values: {
      'effect.chorus.enabled': 1,
      'effect.chorus.frequency': 35,
      'effect.chorus.depth': 45,
      'effect.chorus.mix': 40,
    },
  },
  {
    effect: 'chorus',
    id: 'chorusWash',
    values: {
      'effect.chorus.enabled': 1,
      'effect.chorus.frequency': 25,
      'effect.chorus.depth': 70,
      'effect.chorus.mix': 55,
    },
  },
  {
    effect: 'chorus',
    id: 'shimmer',
    values: {
      'effect.chorus.enabled': 1,
      'effect.chorus.frequency': 70,
      'effect.chorus.depth': 30,
      'effect.chorus.mix': 35,
    },
  },
  {
    effect: 'phaser',
    id: 'gentlePhase',
    values: {
      'effect.phaser.enabled': 1,
      'effect.phaser.frequency': 25,
      'effect.phaser.depth': 35,
      'effect.phaser.mix': 30,
    },
  },
  {
    effect: 'phaser',
    id: 'slowSweep',
    values: {
      'effect.phaser.enabled': 1,
      'effect.phaser.frequency': 10,
      'effect.phaser.depth': 60,
      'effect.phaser.mix': 45,
    },
  },
  {
    effect: 'phaser',
    id: 'deepPhase',
    values: {
      'effect.phaser.enabled': 1,
      'effect.phaser.frequency': 20,
      'effect.phaser.depth': 85,
      'effect.phaser.mix': 60,
    },
  },
  {
    effect: 'phaser',
    id: 'fastSwirl',
    values: {
      'effect.phaser.enabled': 1,
      'effect.phaser.frequency': 70,
      'effect.phaser.depth': 50,
      'effect.phaser.mix': 45,
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
