export type SoundPresetId =
  | 'soft-pad'
  | 'bright-pluck'
  | 'steady-organ'
  | 'gentle-motion'
  | 'warm-filter'
  | 'wide-space'

export type SoundPreset = {
  /** Zero-based DX7 algorithm value used by the FM1 edit buffer. */
  algorithm: number
  description: string
  id: SoundPresetId
  name: string
}

export const soundPresets: readonly SoundPreset[] = [
  {
    algorithm: 4, // Algorithm 5: three parallel two-operator stacks
    description: 'Slow envelopes, gentle chorus, and a soft hall reverb.',
    id: 'soft-pad',
    name: 'Soft pad',
  },
  {
    algorithm: 0, // Algorithm 1: deep modulation for a harmonically rich attack
    description: 'A crisp decay with a short room and a light echo.',
    id: 'bright-pluck',
    name: 'Bright pluck',
  },
  {
    algorithm: 31, // Algorithm 32: six additive carriers
    description: 'Even sustain with subtle chorus and phaser movement.',
    id: 'steady-organ',
    name: 'Steady organ',
  },
  {
    algorithm: 5, // Algorithm 6: three independently moving stacks
    description: 'A delayed sine LFO, light chorus, and soft hall ambience.',
    id: 'gentle-motion',
    name: 'Gentle motion',
  },
  {
    algorithm: 18, // Algorithm 19: three carriers with shared modulation
    description: 'Low-pass filtering and a small room soften the edges.',
    id: 'warm-filter',
    name: 'Warm filter',
  },
  {
    algorithm: 24, // Algorithm 25: five carriers for a broad layered sound
    description: 'Chorus and hall reverb create a broad ambient layer.',
    id: 'wide-space',
    name: 'Wide space',
  },
]

const editorParameterCount = 179

function setOperatorEnvelopes(
  parameters: Uint8Array,
  rates: readonly number[],
  levels: readonly number[],
) {
  for (let operator = 0; operator < 6; operator += 1) {
    const base = operator * 21
    parameters.set(rates, base)
    parameters.set(levels, base + 4)
  }
}

/** Applies a repeatable starting point without changing identity or operator tuning. */
export function applySoundPreset(
  parameters: Uint8Array,
  presetId: SoundPresetId,
) {
  if (parameters.length !== editorParameterCount) {
    throw new RangeError(`Sound presets require ${editorParameterCount} FM1 editor parameters.`)
  }

  const next = parameters.slice()
  const preset = soundPresets.find(({ id }) => id === presetId)
  if (!preset) throw new RangeError(`Unknown sound preset: ${presetId}`)
  next[134] = preset.algorithm
  next.fill(0, 155) // Each starter replaces the complete effect chain.

  switch (presetId) {
    case 'soft-pad':
      setOperatorEnvelopes(next, [42, 32, 24, 34], [99, 92, 82, 0])
      next.set([1, 1, 52, 24], 159) // soft hall reverb
      next.set([1, 18, 28, 20], 171) // gentle chorus
      break
    case 'bright-pluck':
      setOperatorEnvelopes(next, [99, 74, 56, 78], [99, 68, 24, 0])
      next.set([1, 0, 22, 12], 159) // short room reverb
      next.set([1, 18, 24, 14], 163) // quiet, quick echo
      break
    case 'steady-organ':
      setOperatorEnvelopes(next, [99, 99, 99, 99], [99, 99, 99, 99])
      next.set([1, 0, 18, 10], 159) // restrained room reverb
      next.set([1, 12, 22, 16], 171) // slow chorus
      next.set([1, 10, 24, 14], 175) // subtle rotary-like motion
      break
    case 'gentle-motion':
      next[137] = 28 // LFO speed
      next[138] = 20 // LFO delay
      next[139] = 12 // pitch modulation depth
      next[140] = 6 // amplitude modulation depth
      next[141] = 1 // LFO key sync
      next[142] = 4 // sine wave
      next[143] = 2 // pitch modulation sensitivity
      next.set([1, 1, 34, 16], 159) // soft hall reverb
      next.set([1, 16, 20, 14], 171) // light chorus
      break
    case 'warm-filter':
      next.set([1, 0, 58, 1], 155) // low-pass filter
      next.set([1, 0, 32, 18], 159) // small room reverb
      break
    case 'wide-space':
      next.set([1, 1, 62, 28], 159) // hall reverb
      next.set([1, 34, 46, 38], 171) // chorus
      break
    default:
      presetId satisfies never
  }

  return next
}
