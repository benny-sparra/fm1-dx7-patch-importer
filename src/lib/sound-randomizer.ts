import { dx7Algorithms, getDx7OperatorRole } from '@/lib/dx7-algorithms'
import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_OPERATOR_COUNT,
  FM1_OPERATOR_PARAMETER_COUNT,
  getGlobalParameterDefinition,
  getOperatorParameterDefinition,
  type GlobalParameterId,
  type OperatorParameterId,
} from '@/lib/fm1-parameters'

// An independent implementation of the "Android-1" voice generator from Tom Bajoras's DX Android,
// following the algorithm as reverse engineered and documented by Christian Zietz (czietz):
// https://www.chzsoft.de/site/hardware/dx-android-an-intelligent-random-dx7-voice-generator/dx-android-algorithm/
//
// Only DX7 voice bytes 0–144 are generated. The patch name and FM1 effect settings are kept.
// The original never randomises pitch-modulation sensitivity because of a control-flow bug; this
// implementation follows the documented intent instead.

const NEUTRAL_PITCH_ENVELOPE = [99, 99, 99, 99, 50, 50, 50, 50] as const
const TRANSPOSE_C3 = 24
const DETUNE_CENTRE = 7

type Random = () => number

function randomInteger(minimum: number, maximum: number, random: Random) {
  return minimum + Math.floor(random() * (maximum - minimum + 1))
}

const globalIndex = (id: GlobalParameterId) => getGlobalParameterDefinition(id).voiceIndex

/** Any legal value of a global parameter, from its minimum to its maximum. */
function randomGlobal(id: GlobalParameterId, random: Random) {
  const { max, min } = getGlobalParameterDefinition(id)
  return randomInteger(min, max, random)
}

/** True with probability 1 / `outcomes`. */
function oneIn(outcomes: number, random: Random) {
  return randomInteger(0, outcomes - 1, random) === 0
}

function carrierOperatorIds(algorithm: number) {
  return new Set(
    dx7Algorithms[algorithm]
      .filter((operator) => getDx7OperatorRole(operator) === 'carrier')
      .map(({ id }) => id),
  )
}

function generateOperator(isCarrier: boolean, random: Random) {
  const values = new Map<OperatorParameterId, number>()
  const set = (id: OperatorParameterId, value: number) => values.set(id, value)

  set('operator.envelope.rate1', oneIn(2, random) ? 99 : randomInteger(68, 99, random))
  set('operator.envelope.rate2', randomInteger(0, 99, random))
  set('operator.envelope.rate3', randomInteger(0, 99, random))
  set('operator.envelope.rate4', randomInteger(36, 99, random))

  // The attack, decay and sustain levels are raised together so the loudest one reaches 99.
  const levels = [0, 1, 2].map(() => randomInteger(0, 99, random))
  const headroom = 99 - Math.max(...levels)
  set('operator.envelope.level1', levels[0] + headroom)
  set('operator.envelope.level2', levels[1] + headroom)
  set('operator.envelope.level3', levels[2] + headroom)
  set('operator.envelope.level4', 0)

  set('operator.keyboard.breakpoint', 0)
  set('operator.keyboard.leftDepth', 0)
  set('operator.keyboard.rightDepth', 0)
  set('operator.keyboard.leftCurve', 0)
  set('operator.keyboard.rightCurve', 0)
  set('operator.keyboard.rateScaling', 0)
  set('operator.ampModSensitivity', oneIn(2, random) ? 0 : randomInteger(0, 3, random))
  set('operator.velocitySensitivity', 0)
  set('operator.detune', DETUNE_CENTRE)

  set('operator.outputLevel', randomInteger(isCarrier ? 68 : 36, 99, random))

  const isFixed = oneIn(8, random)
  set('operator.oscillatorMode', isFixed ? 1 : 0)
  // Carriers stay near the fundamental (0.5, 1 or 2). Modulators mostly use ratios up to 7.
  const coarse = isCarrier
    ? randomInteger(0, 1, random) + randomInteger(0, 1, random)
    : randomInteger(0, oneIn(4, random) ? 31 : 7, random)
  set('operator.frequency.coarse', coarse)
  set('operator.frequency.fine', isFixed ? randomInteger(0, 99, random) : 0)

  return values
}

/**
 * Generates a musically constrained random DX7 voice, keeping the patch name and FM1 effects.
 */
export function randomizeSound(parameters: Uint8Array, random: Random = Math.random) {
  if (parameters.length !== FM1_EDITOR_PARAMETER_COUNT) {
    throw new RangeError(
      `Sound randomisation requires ${FM1_EDITOR_PARAMETER_COUNT} FM1 editor parameters.`,
    )
  }

  const next = parameters.slice()
  const algorithm = randomGlobal('global.algorithm', random)
  const carriers = carrierOperatorIds(algorithm)

  // DX7 voice data stores operator 6 first.
  for (let block = 0; block < FM1_OPERATOR_COUNT; block += 1) {
    const operator = FM1_OPERATOR_COUNT - block
    generateOperator(carriers.has(operator as 1 | 2 | 3 | 4 | 5 | 6), random).forEach(
      (value, id) => {
        next[block * FM1_OPERATOR_PARAMETER_COUNT + getOperatorParameterDefinition(id).offset] =
          value
      },
    )
  }

  const pitchEnvelope = oneIn(8, random)
    ? Array.from({ length: 8 }, () => randomInteger(0, 99, random))
    : NEUTRAL_PITCH_ENVELOPE
  next.set(pitchEnvelope, globalIndex('global.pitchEnvelope.rate1'))

  next[globalIndex('global.algorithm')] = algorithm
  next[globalIndex('global.feedback')] = randomGlobal('global.feedback', random)
  next[globalIndex('global.oscillatorSync')] = randomGlobal('global.oscillatorSync', random)
  next[globalIndex('global.lfoSpeed')] = randomGlobal('global.lfoSpeed', random)
  next[globalIndex('global.lfoDelay')] = 0
  next[globalIndex('global.lfoPitchModDepth')] = randomGlobal('global.lfoPitchModDepth', random)
  next[globalIndex('global.lfoAmpModDepth')] = randomGlobal('global.lfoAmpModDepth', random)
  next[globalIndex('global.lfoKeySync')] = randomGlobal('global.lfoKeySync', random)
  next[globalIndex('global.lfoWave')] = randomGlobal('global.lfoWave', random)
  next[globalIndex('global.pitchModSensitivity')] = oneIn(4, random)
    ? randomGlobal('global.pitchModSensitivity', random)
    : 0
  next[globalIndex('global.transpose')] = TRANSPOSE_C3

  return next
}
