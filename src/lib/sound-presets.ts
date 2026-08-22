import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_EFFECT_PARAMETER_START,
  FM1_OPERATOR_COUNT,
  FM1_OPERATOR_PARAMETER_COUNT,
  type EffectParameterId,
  getEffectParameterDefinition,
  getGlobalParameterDefinition,
} from '@/lib/fm1-parameters'

export type SoundPresetId =
  'soft-pad' | 'bright-pluck' | 'steady-organ' | 'gentle-motion' | 'warm-filter' | 'wide-space'

export type SoundPreset = {
  /** Zero-based DX7 algorithm value used by the FM1 edit buffer. */
  algorithm: number
  id: SoundPresetId
}

export const soundPresets: readonly SoundPreset[] = [
  {
    algorithm: 4, // Algorithm 5: three parallel two-operator stacks
    id: 'soft-pad',
  },
  {
    algorithm: 0, // Algorithm 1: deep modulation for a harmonically rich attack
    id: 'bright-pluck',
  },
  {
    algorithm: 31, // Algorithm 32: six additive carriers
    id: 'steady-organ',
  },
  {
    algorithm: 5, // Algorithm 6: three independently moving stacks
    id: 'gentle-motion',
  },
  {
    algorithm: 18, // Algorithm 19: three carriers with shared modulation
    id: 'warm-filter',
  },
  {
    algorithm: 24, // Algorithm 25: five carriers for a broad layered sound
    id: 'wide-space',
  },
]

function setOperatorEnvelopes(
  parameters: Uint8Array,
  rates: readonly number[],
  levels: readonly number[],
) {
  for (let operator = 0; operator < FM1_OPERATOR_COUNT; operator += 1) {
    const base = operator * FM1_OPERATOR_PARAMETER_COUNT
    parameters.set(rates, base)
    parameters.set(levels, base + 4)
  }
}

function setEffect(
  parameters: Uint8Array,
  values: readonly [id: EffectParameterId, value: number][],
) {
  for (const [id, value] of values) {
    parameters[getEffectParameterDefinition(id).editorIndex] = value
  }
}

/** Applies a repeatable starting point without changing identity or operator tuning. */
export function applySoundPreset(parameters: Uint8Array, presetId: SoundPresetId) {
  if (parameters.length !== FM1_EDITOR_PARAMETER_COUNT) {
    throw new RangeError(
      `Sound presets require ${FM1_EDITOR_PARAMETER_COUNT} FM1 editor parameters.`,
    )
  }

  const next = parameters.slice()
  const preset = soundPresets.find(({ id }) => id === presetId)
  if (!preset) throw new RangeError(`Unknown sound preset: ${presetId}`)
  next[getGlobalParameterDefinition('global.algorithm').voiceIndex] = preset.algorithm
  next.fill(0, FM1_EFFECT_PARAMETER_START) // Each starter replaces the complete effect chain.

  switch (presetId) {
    case 'soft-pad':
      setOperatorEnvelopes(next, [42, 32, 24, 34], [99, 92, 82, 0])
      setEffect(next, [
        ['effect.reverb.enabled', 1],
        ['effect.reverb.space', 1],
        ['effect.reverb.decay', 52],
        ['effect.reverb.mix', 24],
        ['effect.chorus.enabled', 1],
        ['effect.chorus.frequency', 18],
        ['effect.chorus.depth', 28],
        ['effect.chorus.mix', 20],
      ])
      break
    case 'bright-pluck':
      setOperatorEnvelopes(next, [99, 74, 56, 78], [99, 68, 24, 0])
      setEffect(next, [
        ['effect.reverb.enabled', 1],
        ['effect.reverb.space', 0],
        ['effect.reverb.decay', 22],
        ['effect.reverb.mix', 12],
        ['effect.delay.enabled', 1],
        ['effect.delay.decay', 18],
        ['effect.delay.rate', 24],
        ['effect.delay.mix', 14],
      ])
      break
    case 'steady-organ':
      setOperatorEnvelopes(next, [99, 99, 99, 99], [99, 99, 99, 99])
      setEffect(next, [
        ['effect.reverb.enabled', 1],
        ['effect.reverb.space', 0],
        ['effect.reverb.decay', 18],
        ['effect.reverb.mix', 10],
        ['effect.chorus.enabled', 1],
        ['effect.chorus.frequency', 12],
        ['effect.chorus.depth', 22],
        ['effect.chorus.mix', 16],
        ['effect.phaser.enabled', 1],
        ['effect.phaser.frequency', 10],
        ['effect.phaser.depth', 24],
        ['effect.phaser.mix', 14],
      ])
      break
    case 'gentle-motion':
      next[getGlobalParameterDefinition('global.lfoSpeed').voiceIndex] = 28
      next[getGlobalParameterDefinition('global.lfoDelay').voiceIndex] = 20
      next[getGlobalParameterDefinition('global.lfoPitchModDepth').voiceIndex] = 12
      next[getGlobalParameterDefinition('global.lfoAmpModDepth').voiceIndex] = 6
      next[getGlobalParameterDefinition('global.lfoKeySync').voiceIndex] = 1
      next[getGlobalParameterDefinition('global.lfoWave').voiceIndex] = 4
      next[getGlobalParameterDefinition('global.pitchModSensitivity').voiceIndex] = 2
      setEffect(next, [
        ['effect.reverb.enabled', 1],
        ['effect.reverb.space', 1],
        ['effect.reverb.decay', 34],
        ['effect.reverb.mix', 16],
        ['effect.chorus.enabled', 1],
        ['effect.chorus.frequency', 16],
        ['effect.chorus.depth', 20],
        ['effect.chorus.mix', 14],
      ])
      break
    case 'warm-filter':
      setEffect(next, [
        ['effect.filter.enabled', 1],
        ['effect.filter.type', 0],
        ['effect.filter.cutoff', 58],
        ['effect.filter.resonance', 1],
        ['effect.reverb.enabled', 1],
        ['effect.reverb.space', 0],
        ['effect.reverb.decay', 32],
        ['effect.reverb.mix', 18],
      ])
      break
    case 'wide-space':
      setEffect(next, [
        ['effect.reverb.enabled', 1],
        ['effect.reverb.space', 1],
        ['effect.reverb.decay', 62],
        ['effect.reverb.mix', 28],
        ['effect.chorus.enabled', 1],
        ['effect.chorus.frequency', 34],
        ['effect.chorus.depth', 46],
        ['effect.chorus.mix', 38],
      ])
      break
    default:
      presetId satisfies never
  }

  return next
}
