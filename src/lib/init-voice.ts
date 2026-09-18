import {
  FM1_EDITOR_PARAMETER_COUNT,
  DX7_TRANSPOSE_C3,
  FM1_OPERATOR_COUNT,
  fm1EffectParameters,
  getGlobalParameterDefinition,
  resolveOperatorParameterIndex,
  type GlobalParameterId,
  type OperatorParameterId,
} from '@/lib/fm1-parameters'

// Yamaha's DX7 INIT VOICE: a single sine carrier on operator 1 with an organ envelope, which is
// the usual starting point for building a sound from scratch.

/** Stored operator detune for no detune; the editor displays it as 0. */
export const DX7_DETUNE_CENTRE = 7
/** Pitch envelope rates 1–4 then levels 1–4 that leave the pitch unchanged. */
export const DX7_NEUTRAL_PITCH_ENVELOPE = [99, 99, 99, 99, 50, 50, 50, 50] as const

const BREAKPOINT_C3 = 39
const LFO_SPEED = 35
const PITCH_MOD_SENSITIVITY = 3

// Every operator parameter except output level, which differs between operator 1 and the rest.
const initOperator: Readonly<Record<Exclude<OperatorParameterId, 'operator.outputLevel'>, number>> =
  {
    'operator.envelope.rate1': 99,
    'operator.envelope.rate2': 99,
    'operator.envelope.rate3': 99,
    'operator.envelope.rate4': 99,
    'operator.envelope.level1': 99,
    'operator.envelope.level2': 99,
    'operator.envelope.level3': 99,
    'operator.envelope.level4': 0,
    'operator.keyboard.breakpoint': BREAKPOINT_C3,
    'operator.keyboard.leftDepth': 0,
    'operator.keyboard.rightDepth': 0,
    'operator.keyboard.leftCurve': 0,
    'operator.keyboard.rightCurve': 0,
    'operator.keyboard.rateScaling': 0,
    'operator.ampModSensitivity': 0,
    'operator.velocitySensitivity': 0,
    'operator.oscillatorMode': 0,
    'operator.frequency.coarse': 1,
    'operator.frequency.fine': 0,
    'operator.detune': DX7_DETUNE_CENTRE,
  }

const globalIndex = (id: GlobalParameterId) => getGlobalParameterDefinition(id).voiceIndex

/**
 * Replaces the DX7 voice with the INIT VOICE and switches every FM1 effect off, so the plain sine
 * is heard dry. The patch name and each effect's settings are kept, ready to switch back on.
 */
export function initializeVoice(parameters: Uint8Array) {
  if (parameters.length !== FM1_EDITOR_PARAMETER_COUNT) {
    throw new RangeError(
      `Voice initialisation requires ${FM1_EDITOR_PARAMETER_COUNT} FM1 editor parameters.`,
    )
  }

  const next = parameters.slice()

  for (let operator = 1; operator <= FM1_OPERATOR_COUNT; operator += 1) {
    for (const [id, value] of Object.entries(initOperator)) {
      next[resolveOperatorParameterIndex(operator, id as OperatorParameterId)] = value
    }
    next[resolveOperatorParameterIndex(operator, 'operator.outputLevel')] = operator === 1 ? 99 : 0
  }

  next.set(DX7_NEUTRAL_PITCH_ENVELOPE, globalIndex('global.pitchEnvelope.rate1'))
  next[globalIndex('global.algorithm')] = 0
  next[globalIndex('global.feedback')] = 0
  next[globalIndex('global.oscillatorSync')] = 1
  next[globalIndex('global.lfoSpeed')] = LFO_SPEED
  next[globalIndex('global.lfoDelay')] = 0
  next[globalIndex('global.lfoPitchModDepth')] = 0
  next[globalIndex('global.lfoAmpModDepth')] = 0
  next[globalIndex('global.lfoKeySync')] = 1
  next[globalIndex('global.lfoWave')] = 0
  next[globalIndex('global.pitchModSensitivity')] = PITCH_MOD_SENSITIVITY
  next[globalIndex('global.transpose')] = DX7_TRANSPOSE_C3

  for (const { editorIndex, kind } of fm1EffectParameters) {
    if (kind === 'switch') next[editorIndex] = 0
  }

  return next
}
