import { describe, expect, it } from 'vitest'

import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_OPERATOR_PARAMETER_COUNT,
  resolveOperatorParameterIndex,
} from '@/lib/fm1-parameters'

import { copyOperator, makeOperatorPasteEdits } from './operator-clipboard'

const makeParameters = () =>
  Uint8Array.from({ length: FM1_EDITOR_PARAMETER_COUNT }, (_, index) => index % 4)

const patch = { id: 'a-1', name: 'INIT' }

const operatorBase = (operator: number) =>
  resolveOperatorParameterIndex(operator, 'operator.envelope.rate1')

describe('operator clipboard', () => {
  it('copies all 21 parameters of the chosen operator', () => {
    const parameters = makeParameters()
    parameters[resolveOperatorParameterIndex(2, 'operator.outputLevel')] = 88

    const copied = copyOperator(parameters, 2, patch)

    expect(copied.operator).toBe(2)
    expect(copied.patchId).toBe('a-1')
    expect(copied.patchName).toBe('INIT')
    expect(copied.settings).toHaveLength(FM1_OPERATOR_PARAMETER_COUNT)
    expect(copied.settings[16]).toBe(88)
    expect(Array.from(copied.settings)).toEqual(
      Array.from(parameters.slice(operatorBase(2), operatorBase(2) + 21)),
    )
  })

  it('keeps the copy unchanged when the voice is edited afterwards', () => {
    const parameters = makeParameters()
    const copied = copyOperator(parameters, 1, patch)

    parameters[operatorBase(1)] = 99

    expect(copied.settings[0]).not.toBe(99)
  })

  it('pastes onto only the target operator', () => {
    const source = makeParameters()
    source.fill(50, operatorBase(3), operatorBase(3) + 21)
    const copied = copyOperator(source, 3, patch)

    const edits = makeOperatorPasteEdits(new Uint8Array(FM1_EDITOR_PARAMETER_COUNT), 5, copied)
    const indexes = edits.map(([index]) => index)

    expect(indexes.length).toBeGreaterThan(0)
    expect(indexes.every((index) => index >= operatorBase(5) && index < operatorBase(5) + 21)).toBe(
      true,
    )
  })

  it('leaves out parameters the target already has', () => {
    const parameters = new Uint8Array(FM1_EDITOR_PARAMETER_COUNT)
    const coarse = resolveOperatorParameterIndex(4, 'operator.frequency.coarse')
    parameters[coarse] = 9
    const copied = copyOperator(parameters, 4, patch)

    expect(makeOperatorPasteEdits(parameters, 4, copied)).toEqual([])
    expect(makeOperatorPasteEdits(parameters, 6, copied)).toEqual([
      [resolveOperatorParameterIndex(6, 'operator.frequency.coarse'), 9, 0, 31],
    ])
  })

  it('clamps copied values to each parameter range', () => {
    const copied = copyOperator(new Uint8Array(FM1_EDITOR_PARAMETER_COUNT), 1, patch)
    copied.settings.fill(127)

    const edits = makeOperatorPasteEdits(new Uint8Array(FM1_EDITOR_PARAMETER_COUNT), 2, copied)
    const detune = resolveOperatorParameterIndex(2, 'operator.detune')

    expect(edits.find(([index]) => index === detune)).toEqual([detune, 14, 0, 14])
  })

  it('rejects copied settings of the wrong length', () => {
    const copied = { operator: 1, patchId: 'a-1', patchName: 'INIT', settings: new Uint8Array(20) }

    expect(() =>
      makeOperatorPasteEdits(new Uint8Array(FM1_EDITOR_PARAMETER_COUNT), 1, copied),
    ).toThrow('21 parameters')
  })

  it('rejects operator numbers outside the voice', () => {
    const parameters = makeParameters()

    expect(() => copyOperator(parameters, 7, patch)).toThrow('1 to 6')
  })
})
