export const FM1_OPERATOR_COUNT = 6
export const FM1_OPERATOR_PARAMETER_COUNT = 21
export const FM1_GLOBAL_PARAMETER_START = FM1_OPERATOR_COUNT * FM1_OPERATOR_PARAMETER_COUNT
export const FM1_VOICE_NAME_START = 145
export const FM1_VOICE_NAME_LENGTH = 10
export const FM1_VOICE_PARAMETER_COUNT = FM1_VOICE_NAME_START + FM1_VOICE_NAME_LENGTH
export const FM1_EFFECT_PARAMETER_START = FM1_VOICE_NAME_START + FM1_VOICE_NAME_LENGTH
export const FM1_EFFECT_PARAMETER_COUNT = 24
export const FM1_EDITOR_PARAMETER_COUNT = FM1_EFFECT_PARAMETER_START + FM1_EFFECT_PARAMETER_COUNT

type ValueKind = 'continuous' | 'enumerated' | 'switch'

type NumericDefinition = {
  id: string
  kind: ValueKind
  min: number
  max: number
  optionIds?: readonly string[]
  displayOffset?: number
}

export type OperatorParameterDefinition = NumericDefinition & {
  scope: 'operator'
  offset: number
}

export type GlobalParameterDefinition = NumericDefinition & {
  scope: 'global'
  voiceIndex: number
}

export type EffectParameterDefinition = NumericDefinition & {
  scope: 'effect'
  controller: number
  editorIndex: number
}

type VoiceNameParameterDefinition = {
  id: 'voice.name'
  scope: 'voice-name'
  start: number
  length: number
}

const continuous = <const Id extends string>(id: Id, offset: number, max = 99) =>
  ({ id, kind: 'continuous', min: 0, max, offset, scope: 'operator' }) as const

export const fm1OperatorParameters = [
  continuous('operator.envelope.rate1', 0),
  continuous('operator.envelope.rate2', 1),
  continuous('operator.envelope.rate3', 2),
  continuous('operator.envelope.rate4', 3),
  continuous('operator.envelope.level1', 4),
  continuous('operator.envelope.level2', 5),
  continuous('operator.envelope.level3', 6),
  continuous('operator.envelope.level4', 7),
  continuous('operator.keyboard.breakpoint', 8),
  continuous('operator.keyboard.leftDepth', 9),
  continuous('operator.keyboard.rightDepth', 10),
  {
    id: 'operator.keyboard.leftCurve',
    kind: 'enumerated',
    min: 0,
    max: 3,
    offset: 11,
    optionIds: ['negativeLinear', 'negativeExponential', 'positiveExponential', 'positiveLinear'],
    scope: 'operator',
  },
  {
    id: 'operator.keyboard.rightCurve',
    kind: 'enumerated',
    min: 0,
    max: 3,
    offset: 12,
    optionIds: ['negativeLinear', 'negativeExponential', 'positiveExponential', 'positiveLinear'],
    scope: 'operator',
  },
  continuous('operator.keyboard.rateScaling', 13, 7),
  continuous('operator.ampModSensitivity', 14, 3),
  continuous('operator.velocitySensitivity', 15, 7),
  continuous('operator.outputLevel', 16),
  {
    id: 'operator.oscillatorMode',
    kind: 'enumerated',
    min: 0,
    max: 1,
    offset: 17,
    optionIds: ['ratio', 'fixed'],
    scope: 'operator',
  },
  continuous('operator.frequency.coarse', 18, 31),
  continuous('operator.frequency.fine', 19),
  {
    displayOffset: -7,
    id: 'operator.detune',
    kind: 'continuous',
    min: 0,
    max: 14,
    offset: 20,
    scope: 'operator',
  },
] as const satisfies readonly OperatorParameterDefinition[]

const globalContinuous = <const Id extends string>(id: Id, voiceIndex: number, max = 99) =>
  ({ id, kind: 'continuous', min: 0, max, scope: 'global', voiceIndex }) as const

export const fm1GlobalParameters = [
  globalContinuous('global.pitchEnvelope.rate1', 126),
  globalContinuous('global.pitchEnvelope.rate2', 127),
  globalContinuous('global.pitchEnvelope.rate3', 128),
  globalContinuous('global.pitchEnvelope.rate4', 129),
  globalContinuous('global.pitchEnvelope.level1', 130),
  globalContinuous('global.pitchEnvelope.level2', 131),
  globalContinuous('global.pitchEnvelope.level3', 132),
  globalContinuous('global.pitchEnvelope.level4', 133),
  globalContinuous('global.algorithm', 134, 31),
  globalContinuous('global.feedback', 135, 7),
  {
    id: 'global.oscillatorSync',
    kind: 'switch',
    min: 0,
    max: 1,
    scope: 'global',
    voiceIndex: 136,
  },
  globalContinuous('global.lfoSpeed', 137),
  globalContinuous('global.lfoDelay', 138),
  globalContinuous('global.lfoPitchModDepth', 139),
  globalContinuous('global.lfoAmpModDepth', 140),
  {
    id: 'global.lfoKeySync',
    kind: 'switch',
    min: 0,
    max: 1,
    scope: 'global',
    voiceIndex: 141,
  },
  {
    id: 'global.lfoWave',
    kind: 'enumerated',
    min: 0,
    max: 5,
    optionIds: ['triangle', 'sawDown', 'sawUp', 'square', 'sine', 'sampleAndHold'],
    scope: 'global',
    voiceIndex: 142,
  },
  globalContinuous('global.pitchModSensitivity', 143, 7),
  {
    displayOffset: -24,
    id: 'global.transpose',
    kind: 'continuous',
    min: 0,
    max: 48,
    scope: 'global',
    voiceIndex: 144,
  },
] as const satisfies readonly GlobalParameterDefinition[]

export const fm1VoiceNameParameter: VoiceNameParameterDefinition = {
  id: 'voice.name',
  length: FM1_VOICE_NAME_LENGTH,
  scope: 'voice-name',
  start: FM1_VOICE_NAME_START,
}

/** Legal maximum for each live Yamaha DX7 parameter-change address in the VCED buffer. */
export const fm1VoiceParameterMaximums = Uint8Array.from([
  ...Array.from({ length: FM1_OPERATOR_COUNT }, () =>
    fm1OperatorParameters.map(({ max }) => max),
  ).flat(),
  ...fm1GlobalParameters.map(({ max }) => max),
  ...Array<number>(FM1_VOICE_NAME_LENGTH).fill(127),
])

const effect = <const Id extends string>(
  id: Id,
  controller: number,
  max: number,
  kind: ValueKind = 'continuous',
  optionIds?: readonly string[],
) =>
  ({
    controller,
    editorIndex: FM1_EFFECT_PARAMETER_START + controller,
    id,
    kind,
    max,
    min: 0,
    optionIds,
    scope: 'effect',
  }) as const

export const fm1EffectParameters = [
  effect('effect.filter.enabled', 0, 1, 'switch'),
  effect('effect.filter.type', 1, 2, 'enumerated', ['lowPass', 'bandPass', 'highPass']),
  effect('effect.filter.cutoff', 2, 107),
  effect('effect.filter.resonance', 3, 10),
  effect('effect.reverb.enabled', 4, 1, 'switch'),
  effect('effect.reverb.space', 5, 2, 'enumerated', ['room', 'hall', 'plate']),
  effect('effect.reverb.decay', 6, 100),
  effect('effect.reverb.mix', 7, 100),
  effect('effect.delay.enabled', 8, 1, 'switch'),
  effect('effect.delay.decay', 9, 100),
  effect('effect.delay.rate', 10, 100),
  effect('effect.delay.mix', 11, 100),
  effect('effect.distortion.enabled', 12, 1, 'switch'),
  effect('effect.distortion.gain', 13, 100),
  effect('effect.distortion.tone', 14, 100),
  effect('effect.distortion.level', 15, 100),
  effect('effect.chorus.enabled', 16, 1, 'switch'),
  effect('effect.chorus.frequency', 17, 100),
  effect('effect.chorus.depth', 18, 100),
  effect('effect.chorus.mix', 19, 100),
  effect('effect.phaser.enabled', 20, 1, 'switch'),
  effect('effect.phaser.frequency', 21, 100),
  effect('effect.phaser.depth', 22, 100),
  effect('effect.phaser.mix', 23, 100),
] as const satisfies readonly EffectParameterDefinition[]

export type OperatorParameterId = (typeof fm1OperatorParameters)[number]['id']
export type GlobalParameterId = (typeof fm1GlobalParameters)[number]['id']
export type EffectParameterId = (typeof fm1EffectParameters)[number]['id']
export type Fm1NumericParameterDefinition =
  | (typeof fm1OperatorParameters)[number]
  | (typeof fm1GlobalParameters)[number]
  | (typeof fm1EffectParameters)[number]
export type Fm1ParameterId =
  OperatorParameterId | GlobalParameterId | EffectParameterId | VoiceNameParameterDefinition['id']

const numericParameters: readonly Fm1NumericParameterDefinition[] = [
  ...fm1OperatorParameters,
  ...fm1GlobalParameters,
  ...fm1EffectParameters,
]
const definitionsById = new Map<
  string,
  Fm1NumericParameterDefinition | VoiceNameParameterDefinition
>([...numericParameters, fm1VoiceNameParameter].map((definition) => [definition.id, definition]))

export function getFm1ParameterDefinition(id: Fm1ParameterId) {
  const definition = definitionsById.get(id)
  if (!definition) throw new RangeError(`Unknown FM1 parameter: ${id}`)
  return definition
}

export function getOperatorParameterDefinition(id: OperatorParameterId) {
  const definition = getFm1ParameterDefinition(id)
  if (definition.scope !== 'operator') throw new RangeError(`${id} is not an operator parameter.`)
  return definition
}

export function getGlobalParameterDefinition(id: GlobalParameterId) {
  const definition = getFm1ParameterDefinition(id)
  if (definition.scope !== 'global') throw new RangeError(`${id} is not a global parameter.`)
  return definition
}

export function getEffectParameterDefinition(id: EffectParameterId) {
  const definition = getFm1ParameterDefinition(id)
  if (definition.scope !== 'effect') throw new RangeError(`${id} is not an effect parameter.`)
  return definition
}

export function resolveOperatorParameterIndex(operator: number, id: OperatorParameterId) {
  if (!Number.isInteger(operator) || operator < 1 || operator > FM1_OPERATOR_COUNT) {
    throw new RangeError(`Operator number must be an integer from 1 to ${FM1_OPERATOR_COUNT}.`)
  }
  return (
    (FM1_OPERATOR_COUNT - operator) * FM1_OPERATOR_PARAMETER_COUNT +
    getOperatorParameterDefinition(id).offset
  )
}

export function resolveEffectEditorIndex(controller: number) {
  if (!Number.isInteger(controller) || controller < 0 || controller >= FM1_EFFECT_PARAMETER_COUNT) {
    throw new RangeError(
      `Effect controller must be an integer from 0 to ${FM1_EFFECT_PARAMETER_COUNT - 1}.`,
    )
  }
  return FM1_EFFECT_PARAMETER_START + controller
}

export function resolveEffectController(editorIndex: number) {
  const controller = editorIndex - FM1_EFFECT_PARAMETER_START
  resolveEffectEditorIndex(controller)
  return controller
}

export function storedToDisplayValue(definition: Fm1NumericParameterDefinition, value: number) {
  return value + ('displayOffset' in definition ? definition.displayOffset : 0)
}

export function displayToStoredValue(definition: Fm1NumericParameterDefinition, value: number) {
  return value - ('displayOffset' in definition ? definition.displayOffset : 0)
}

export function clampFm1ParameterValue(definition: Fm1NumericParameterDefinition, value: number) {
  return Math.max(definition.min, Math.min(definition.max, Math.round(value)))
}

export function isValidFm1ParameterValue(definition: Fm1NumericParameterDefinition, value: number) {
  return Number.isInteger(value) && value >= definition.min && value <= definition.max
}
