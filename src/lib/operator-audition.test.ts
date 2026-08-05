import { describe, expect, it } from 'vitest'

import {
  auditionedParameterValue,
  makeOperatorAuditionEdits,
  operatorOutputParameter,
} from './operator-audition'

const makeParameters = () => {
  const parameters = new Uint8Array(155)
  parameters[121] = 91
  parameters[100] = 82
  parameters[79] = 73
  parameters[58] = 64
  parameters[37] = 55
  parameters[16] = 46
  return parameters
}

describe('operator audition parameter mapping', () => {
  it('maps DX7 operator numbers onto their output parameters', () => {
    expect(operatorOutputParameter(1)).toBe(121)
    expect(operatorOutputParameter(6)).toBe(16)
  })

  it('rejects operator numbers outside the six-operator voice', () => {
    expect(() => operatorOutputParameter(0)).toThrow('1 to 6')
    expect(() => operatorOutputParameter(7)).toThrow('1 to 6')
  })

  it('zeros every muted operator while retaining other output levels', () => {
    expect(makeOperatorAuditionEdits(makeParameters(), new Set([2, 5]), null)).toEqual([
      [121, 91], [100, 0], [79, 73], [58, 64], [37, 0], [16, 46],
    ])
  })

  it('isolates the soloed operator and temporarily overrides its mute', () => {
    expect(makeOperatorAuditionEdits(makeParameters(), new Set([2]), 2)).toEqual([
      [121, 0], [100, 82], [79, 0], [58, 0], [37, 0], [16, 0],
    ])
  })

  it('keeps a muted output silent when its stored value is edited', () => {
    expect(auditionedParameterValue(100, 96, new Set([2]), null)).toBe(0)
  })

  it('does not alter non-output parameters', () => {
    expect(auditionedParameterValue(99, 64, new Set([2]), null)).toBe(64)
  })
})
