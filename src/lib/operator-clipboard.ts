import {
  FM1_OPERATOR_PARAMETER_COUNT,
  fm1OperatorParameters,
  resolveOperatorParameterIndex,
} from '@/lib/fm1-parameters'
import { type ParameterEdit } from '@/lib/patch-editor'

/**
 * One operator's settings as copied in the editor: every DX7 operator
 * parameter, output level included, in voice order. It lives only in memory.
 */
export type CopiedOperator = {
  operator: number
  patchId: string
  patchName: string
  settings: Uint8Array
}

const operatorBaseIndex = (operator: number) =>
  resolveOperatorParameterIndex(operator, fm1OperatorParameters[0].id)

export function copyOperator(
  parameters: Uint8Array,
  operator: number,
  patch: { id: string; name: string },
): CopiedOperator {
  const base = operatorBaseIndex(operator)
  return {
    operator,
    patchId: patch.id,
    patchName: patch.name,
    settings: parameters.slice(base, base + FM1_OPERATOR_PARAMETER_COUNT),
  }
}

/** The edits that give `operator` the copied settings, leaving out values it already has. */
export function makeOperatorPasteEdits(
  parameters: Uint8Array,
  operator: number,
  copied: CopiedOperator,
): ParameterEdit[] {
  if (copied.settings.length !== FM1_OPERATOR_PARAMETER_COUNT) {
    throw new RangeError(
      `Copied operator settings must hold ${FM1_OPERATOR_PARAMETER_COUNT} parameters.`,
    )
  }
  const base = operatorBaseIndex(operator)
  return fm1OperatorParameters.flatMap(({ max, min, offset }): ParameterEdit[] => {
    const index = base + offset
    const value = Math.max(min, Math.min(max, copied.settings[offset]))
    return parameters[index] === value ? [] : [[index, value, min, max]]
  })
}
