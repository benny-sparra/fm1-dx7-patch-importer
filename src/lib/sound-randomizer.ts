import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_OPERATOR_COUNT,
  fm1EffectParameters,
  fm1GlobalParameters,
  fm1OperatorParameters,
} from '@/lib/fm1-parameters'

function randomInteger(maximum: number, random: () => number) {
  return Math.floor(random() * (maximum + 1))
}

/** Randomises every editable sound parameter while preserving the patch name. */
export function randomizeSound(parameters: Uint8Array, random: () => number = Math.random) {
  if (parameters.length !== FM1_EDITOR_PARAMETER_COUNT) {
    throw new RangeError(
      `Sound randomisation requires ${FM1_EDITOR_PARAMETER_COUNT} FM1 editor parameters.`,
    )
  }

  const next = parameters.slice()

  for (let block = 0; block < FM1_OPERATOR_COUNT; block += 1) {
    fm1OperatorParameters.forEach(({ max, offset }) => {
      next[block * fm1OperatorParameters.length + offset] = randomInteger(max, random)
    })
  }
  fm1GlobalParameters.forEach(({ max, voiceIndex }) => {
    next[voiceIndex] = randomInteger(max, random)
  })
  fm1EffectParameters.forEach(({ editorIndex, max }) => {
    next[editorIndex] = randomInteger(max, random)
  })

  return next
}
