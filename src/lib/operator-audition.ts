export type OperatorAuditionEdit = [parameter: number, value: number]

const operatorCount = 6
const operatorParameterCount = 21
const outputOffset = 16

function assertOperator(operator: number) {
  if (!Number.isInteger(operator) || operator < 1 || operator > operatorCount) {
    throw new RangeError('Operator number must be an integer from 1 to 6.')
  }
}

export function operatorOutputParameter(operator: number) {
  assertOperator(operator)
  return (operatorCount - operator) * operatorParameterCount + outputOffset
}

function outputParameterOperator(parameter: number) {
  if (!Number.isInteger(parameter) || parameter < outputOffset) return null
  if ((parameter - outputOffset) % operatorParameterCount !== 0) return null

  const operator = operatorCount - (parameter - outputOffset) / operatorParameterCount
  return operator >= 1 && operator <= operatorCount ? operator : null
}

function operatorIsAudible(
  operator: number,
  mutedOperators: ReadonlySet<number>,
  soloOperator: number | null,
) {
  if (soloOperator !== null) return operator === soloOperator
  return !mutedOperators.has(operator)
}

export function auditionedParameterValue(
  parameter: number,
  value: number,
  mutedOperators: ReadonlySet<number>,
  soloOperator: number | null,
) {
  const operator = outputParameterOperator(parameter)
  if (operator === null) return value
  return operatorIsAudible(operator, mutedOperators, soloOperator) ? value : 0
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

  return Array.from({ length: operatorCount }, (_, index) => {
    const operator = index + 1
    const parameter = operatorOutputParameter(operator)
    const value = operatorIsAudible(operator, mutedOperators, soloOperator)
      ? parameters[parameter]
      : 0
    return [parameter, value]
  })
}
