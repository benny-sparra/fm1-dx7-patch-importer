import type { EffectParameterId } from '@/lib/fm1-parameters'
import {
  virtualAnalogParameterCount,
  virtualAnalogRow,
  type VirtualAnalogRowId,
} from '@/lib/fm1-va-virtual-analog-editor'
import { switchEffectsOff } from '@/lib/init-voice'
import { replaceEffectChain } from '@/lib/sound-presets'

type Random = () => number

/**
 * Every row a starting point sets: all of them but Level, which keeps the patch as loud beside the
 * others as it was. The Envelope is always on, since without it a note plays operator 6's
 * envelope, which the editor leaves as read, and the same preset would sound different on each
 * patch.
 */
type VirtualAnalogSound = Readonly<Record<Exclude<VirtualAnalogRowId, 'level'>, number>>

/** A plain saw through an open filter, held at full level while a key is down. */
const initSound: VirtualAnalogSound = {
  ampModDepth: 0,
  attack: 0,
  cutoff: 100,
  decay: 50,
  detune: 50,
  drift: 0,
  envelope: 1,
  filterDecay: 0,
  filterEnvelope: 0,
  filterShape: 0,
  filterType: 0,
  filterVelocity: 0,
  keyTracking: 0,
  lfoDelay: 0,
  lfoSpeed: 35,
  lfoSync: 1,
  lfoToCutoff: 0,
  lfoWave: 0,
  mono: 0,
  noise: 0,
  pitchModDepth: 0,
  pitchModSensitivity: 3,
  pwm: 0,
  release: 10,
  resonance: 0,
  sub: 0,
  super: 0,
  sustain: 100,
  velocityToLevel: 0,
  waveform: 1,
}

// Row values are the ones the FM1 shows: Waveform Sine 0, Saw 1, Triangle 2, Square 3; Filter Type
// LP12 0, LP24 1, BP 2, HP 3; Key Tracking 0, 33, 67, 100 as 0–3; LFO Wave Triangle 0 to S&Hold 5.
const sine = 4
const lowPass12 = 0
const lowPass24 = 1
const saw = 1
const square = 3

export type VirtualAnalogPresetId =
  'super-saw' | 'mono-bass' | 'filter-pluck' | 'warm-pad' | 'pulse-strings' | 'vibrato-lead'

export type VirtualAnalogPreset = {
  /** The effect chain it puts in place of the patch's. */
  effects: readonly [id: EffectParameterId, value: number][]
  id: VirtualAnalogPresetId
  /** The rows it sets beyond the plain saw it starts from. */
  sound: Partial<VirtualAnalogSound>
}

const hall: VirtualAnalogPreset['effects'] = [
  ['effect.reverb.enabled', 1],
  ['effect.reverb.space', 1],
  ['effect.reverb.decay', 52],
  ['effect.reverb.mix', 24],
]
const chorus: VirtualAnalogPreset['effects'] = [
  ['effect.chorus.enabled', 1],
  ['effect.chorus.frequency', 18],
  ['effect.chorus.depth', 28],
  ['effect.chorus.mix', 20],
]
const smallRoom: VirtualAnalogPreset['effects'] = [
  ['effect.reverb.enabled', 1],
  ['effect.reverb.space', 0],
  ['effect.reverb.decay', 22],
  ['effect.reverb.mix', 12],
]
const echo: VirtualAnalogPreset['effects'] = [
  ['effect.delay.enabled', 1],
  ['effect.delay.decay', 24],
  ['effect.delay.rate', 30],
  ['effect.delay.mix', 16],
]

export const virtualAnalogPresets: readonly VirtualAnalogPreset[] = [
  {
    effects: [...chorus, ...hall],
    id: 'super-saw',
    sound: {
      attack: 2,
      cutoff: 80,
      detune: 45,
      drift: 10,
      filterType: lowPass24,
      release: 35,
      resonance: 10,
      super: 70,
      sustain: 85,
      velocityToLevel: 2,
      waveform: saw,
    },
  },
  {
    effects: [],
    id: 'mono-bass',
    sound: {
      cutoff: 35,
      decay: 40,
      filterDecay: 25,
      filterEnvelope: 55,
      filterType: lowPass24,
      filterVelocity: 30,
      keyTracking: 1,
      mono: 1,
      release: 5,
      resonance: 25,
      sub: 60,
      sustain: 70,
      velocityToLevel: 3,
      waveform: square,
    },
  },
  {
    effects: [...echo, ...smallRoom],
    id: 'filter-pluck',
    sound: {
      cutoff: 25,
      decay: 45,
      filterDecay: 20,
      filterEnvelope: 70,
      filterType: lowPass24,
      filterVelocity: 40,
      keyTracking: 2,
      release: 30,
      resonance: 30,
      sustain: 0,
      velocityToLevel: 3,
      waveform: saw,
    },
  },
  {
    effects: [...chorus, ...hall],
    id: 'warm-pad',
    sound: {
      attack: 60,
      cutoff: 55,
      decay: 60,
      detune: 30,
      drift: 20,
      filterDecay: 70,
      filterEnvelope: 25,
      filterType: lowPass12,
      lfoSpeed: 20,
      lfoToCutoff: 15,
      release: 70,
      resonance: 10,
      super: 40,
      sustain: 80,
      velocityToLevel: 1,
      waveform: saw,
    },
  },
  {
    effects: [...chorus, ...hall],
    id: 'pulse-strings',
    sound: {
      attack: 40,
      cutoff: 65,
      keyTracking: 1,
      pwm: 60,
      release: 50,
      resonance: 5,
      sustain: 85,
      velocityToLevel: 2,
      waveform: square,
    },
  },
  {
    effects: [...echo, ...smallRoom],
    id: 'vibrato-lead',
    sound: {
      attack: 5,
      cutoff: 70,
      decay: 40,
      filterDecay: 40,
      filterEnvelope: 20,
      filterType: lowPass24,
      lfoDelay: 40,
      lfoSync: 0,
      lfoWave: sine,
      mono: 1,
      pitchModDepth: 10,
      release: 25,
      resonance: 25,
      sub: 20,
      sustain: 80,
      velocityToLevel: 2,
      waveform: saw,
    },
  },
]

function checkParameters(parameters: Uint8Array) {
  if (parameters.length !== virtualAnalogParameterCount) {
    throw new RangeError(
      `Virtual Analog presets require ${virtualAnalogParameterCount} editor parameters.`,
    )
  }
}

function setSound(parameters: Uint8Array, sound: VirtualAnalogSound) {
  for (const [id, value] of Object.entries(sound)) {
    parameters[virtualAnalogRow(id as VirtualAnalogRowId).index] = value
  }
}

/**
 * The plain saw every preset starts from, with every effect switched off. The name, Level, and
 * each effect's settings are kept, ready to switch back on.
 */
export function initializeVirtualAnalog(parameters: Uint8Array) {
  checkParameters(parameters)
  const next = parameters.slice()
  setSound(next, initSound)
  switchEffectsOff(next)
  return next
}

/** Applies a repeatable starting point, keeping the name and Level. */
export function applyVirtualAnalogPreset(parameters: Uint8Array, presetId: VirtualAnalogPresetId) {
  checkParameters(parameters)
  const preset = virtualAnalogPresets.find(({ id }) => id === presetId)
  if (!preset) throw new RangeError(`Unknown Virtual Analog preset: ${presetId}`)
  const next = parameters.slice()
  setSound(next, { ...initSound, ...preset.sound })
  replaceEffectChain(next, preset.effects)
  return next
}

function randomInteger(minimum: number, maximum: number, random: Random) {
  return minimum + Math.floor(random() * (maximum - minimum + 1))
}

/** True with probability 1 / `outcomes`. */
function oneIn(outcomes: number, random: Random) {
  return randomInteger(0, outcomes - 1, random) === 0
}

/**
 * A random sound that stays playable: the filter is kept open far enough to hear for its type, a
 * held note sustains, and noise, LFO movement, and Mono turn up only sometimes. The name, Level,
 * and effects are kept.
 */
export function randomizeVirtualAnalog(parameters: Uint8Array, random: Random = Math.random) {
  checkParameters(parameters)
  const next = parameters.slice()
  const pick = (id: VirtualAnalogRowId) => randomInteger(0, virtualAnalogRow(id).max, random)
  const waveform = pick('waveform')
  const filterType = pick('filterType')
  // A high pass or band pass with its cutoff at the top leaves almost nothing to hear.
  const [lowestCutoff, highestCutoff] =
    filterType === 3 ? [0, 60] : filterType === 2 ? [30, 80] : [25, 100]
  const lfoToCutoff = oneIn(3, random) ? randomInteger(0, 50, random) : 0
  const sound: VirtualAnalogSound = {
    ampModDepth: oneIn(4, random) ? randomInteger(0, 30, random) : 0,
    attack: oneIn(2, random) ? 0 : randomInteger(0, 70, random),
    cutoff: randomInteger(lowestCutoff, highestCutoff, random),
    decay: pick('decay'),
    detune: pick('detune'),
    drift: randomInteger(0, 30, random),
    envelope: 1,
    filterDecay: pick('filterDecay'),
    filterEnvelope: pick('filterEnvelope'),
    filterShape: pick('filterShape'),
    filterType,
    filterVelocity: pick('filterVelocity'),
    keyTracking: pick('keyTracking'),
    lfoDelay: 0,
    lfoSpeed: pick('lfoSpeed'),
    lfoSync: pick('lfoSync'),
    lfoToCutoff,
    lfoWave: pick('lfoWave'),
    mono: oneIn(4, random) ? 1 : 0,
    noise: oneIn(3, random) ? randomInteger(0, 40, random) : 0,
    pitchModDepth: oneIn(4, random) ? randomInteger(0, 20, random) : 0,
    pitchModSensitivity: randomInteger(0, 3, random),
    pwm: waveform === square ? pick('pwm') : 0,
    release: randomInteger(0, 70, random),
    resonance: randomInteger(0, 70, random),
    sub: oneIn(2, random) ? 0 : pick('sub'),
    super: oneIn(2, random) ? 0 : pick('super'),
    sustain: randomInteger(30, 100, random),
    velocityToLevel: pick('velocityToLevel'),
    waveform,
  }
  setSound(next, sound)
  return next
}
