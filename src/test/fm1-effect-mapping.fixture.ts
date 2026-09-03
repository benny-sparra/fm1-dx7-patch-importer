import type { EffectParameterId } from '@/lib/fm1-parameters'

export type Fm1EffectMappingFixture = {
  control: string
  controller: number
  effect: string
  id: EffectParameterId
  kind: 'continuous' | 'enumerated' | 'switch'
  max: number
  min: 0
}

export const fm1EffectMappingFixture = [
  ['Filter', 'Enabled', 'effect.filter.enabled', 0, 1, 'switch'],
  ['Filter', 'Type', 'effect.filter.type', 1, 2, 'enumerated'],
  ['Filter', 'Cutoff', 'effect.filter.cutoff', 2, 107, 'continuous'],
  ['Filter', 'Resonance', 'effect.filter.resonance', 3, 10, 'continuous'],
  ['Reverb', 'Enabled', 'effect.reverb.enabled', 4, 1, 'switch'],
  ['Reverb', 'Space', 'effect.reverb.space', 5, 2, 'enumerated'],
  ['Reverb', 'Decay', 'effect.reverb.decay', 6, 100, 'continuous'],
  ['Reverb', 'Mix', 'effect.reverb.mix', 7, 100, 'continuous'],
  ['Delay', 'Enabled', 'effect.delay.enabled', 8, 1, 'switch'],
  ['Delay', 'Decay', 'effect.delay.decay', 9, 100, 'continuous'],
  ['Delay', 'Rate', 'effect.delay.rate', 10, 100, 'continuous'],
  ['Delay', 'Mix', 'effect.delay.mix', 11, 100, 'continuous'],
  ['Distortion', 'Enabled', 'effect.distortion.enabled', 12, 1, 'switch'],
  ['Distortion', 'Gain', 'effect.distortion.gain', 13, 100, 'continuous'],
  ['Distortion', 'Tone', 'effect.distortion.tone', 14, 100, 'continuous'],
  ['Distortion', 'Level', 'effect.distortion.level', 15, 100, 'continuous'],
  ['Chorus', 'Enabled', 'effect.chorus.enabled', 16, 1, 'switch'],
  ['Chorus', 'Frequency', 'effect.chorus.frequency', 17, 100, 'continuous'],
  ['Chorus', 'Depth', 'effect.chorus.depth', 18, 100, 'continuous'],
  ['Chorus', 'Mix', 'effect.chorus.mix', 19, 100, 'continuous'],
  ['Phaser', 'Enabled', 'effect.phaser.enabled', 20, 1, 'switch'],
  ['Phaser', 'Frequency', 'effect.phaser.frequency', 21, 100, 'continuous'],
  ['Phaser', 'Depth', 'effect.phaser.depth', 22, 100, 'continuous'],
  ['Phaser', 'Mix', 'effect.phaser.mix', 23, 100, 'continuous'],
].map(([effect, control, id, controller, max, kind]) => ({
  control,
  controller,
  effect,
  id,
  kind,
  max,
  min: 0,
})) as Fm1EffectMappingFixture[]
