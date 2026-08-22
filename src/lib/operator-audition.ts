import {
  FM1_OPERATOR_COUNT,
  FM1_OPERATOR_PARAMETER_COUNT,
  getOperatorParameterDefinition,
  resolveOperatorParameterIndex,
} from '@/lib/fm1-parameters'

export type OperatorAuditionEdit = [parameter: number, value: number]

const outputOffset = getOperatorParameterDefinition('operator.outputLevel').offset

function assertOperator(operator: number) {
  if (!Number.isInteger(operator) || operator < 1 || operator > FM1_OPERATOR_COUNT) {
    throw new RangeError('Operator number must be an integer from 1 to 6.')
  }
}

export function operatorOutputParameter(operator: number) {
  assertOperator(operator)
  return resolveOperatorParameterIndex(operator, 'operator.outputLevel')
}

function outputParameterOperator(parameter: number) {
  if (!Number.isInteger(parameter) || parameter < outputOffset) return null
  if ((parameter - outputOffset) % FM1_OPERATOR_PARAMETER_COUNT !== 0) return null

  const operator = FM1_OPERATOR_COUNT - (parameter - outputOffset) / FM1_OPERATOR_PARAMETER_COUNT
  return operator >= 1 && operator <= FM1_OPERATOR_COUNT ? operator : null
}

export function getOperatorAuditionStatus(
  operator: number,
  mutedOperators: ReadonlySet<number>,
  soloOperator: number | null,
) {
  assertOperator(operator)
  const muted = mutedOperators.has(operator)
  const soloed = soloOperator === operator

  return {
    audible: soloOperator !== null ? soloed : !muted,
    muted,
    soloed,
  }
}

export function auditionedParameterValue(
  parameter: number,
  value: number,
  mutedOperators: ReadonlySet<number>,
  soloOperator: number | null,
) {
  const operator = outputParameterOperator(parameter)
  if (operator === null) return value
  return getOperatorAuditionStatus(operator, mutedOperators, soloOperator).audible ? value : 0
}

export function makeOperatorAuditionEdits(
  parameters: Uint8Array,
  mutedOperators: ReadonlySet<number>,
  soloOperator: number | null,
): OperatorAuditionEdit[] {
  if (parameters.length <= operatorOutputParameter(1)) {
    throw new RangeError('Operator audition requires a complete six-operator voice.')
  }
  for (const operator of mutedOperators) assertOperator(operator)
  if (soloOperator !== null) assertOperator(soloOperator)

  return Array.from({ length: FM1_OPERATOR_COUNT }, (_, index) => {
    const operator = index + 1
    const parameter = operatorOutputParameter(operator)
    const value = getOperatorAuditionStatus(operator, mutedOperators, soloOperator).audible
      ? parameters[parameter]
      : 0
    return [parameter, value]
  })
}
