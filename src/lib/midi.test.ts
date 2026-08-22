import { describe, expect, it } from 'vitest'

import {
  makeFm1EffectControlMessage,
  makeFm1ParameterPayload,
  makeFm1ProgramChangeMessage,
} from '@/lib/midi'

describe('makeFm1ParameterPayload', () => {
  it('encodes the documented FM1 transpose parameter message on channel 1', () => {
    expect(Array.from(makeFm1ParameterPayload(144, 36, 1))).toEqual([0x10, 0x01, 0x10, 0x24])
  })

  it('encodes the maximum documented parameter on channel 16', () => {
    expect(Array.from(makeFm1ParameterPayload(155, 127, 16))).toEqual([0x1f, 0x01, 0x1b, 0x7f])
  })

  it.each([
    ['parameter below zero', -1, 0, 1],
    ['parameter above 155', 156, 0, 1],
    ['fractional parameter', 1.5, 0, 1],
    ['value below zero', 0, -1, 1],
    ['value above 127', 0, 128, 1],
    ['fractional value', 0, 1.5, 1],
    ['channel below one', 0, 0, 0],
    ['channel above sixteen', 0, 0, 17],
    ['fractional channel', 0, 0, 1.5],
  ])('rejects %s', (_name, parameter, value, channel) => {
    expect(() => makeFm1ParameterPayload(parameter, value, channel)).toThrow(RangeError)
  })
})

describe('makeFm1EffectControlMessage', () => {
  it('encodes an FM1 chorus depth change on the default FX channel', () => {
    expect(Array.from(makeFm1EffectControlMessage(18, 75))).toEqual([0xb1, 18, 75])
  })

  it('accepts the documented upper bound for filter cutoff', () => {
    expect(Array.from(makeFm1EffectControlMessage(2, 107, 16))).toEqual([0xbf, 2, 107])
  })

  it.each([
    ['controller below zero', -1, 0, 2],
    ['controller above 23', 24, 0, 2],
    ['fractional controller', 1.5, 0, 2],
    ['filter type above 2', 1, 3, 2],
    ['filter Q above 10', 3, 11, 2],
    ['fractional value', 6, 1.5, 2],
    ['channel below one', 0, 0, 0],
    ['channel above sixteen', 0, 0, 17],
  ])('rejects %s', (_name, controller, value, channel) => {
    expect(() => makeFm1EffectControlMessage(controller, value, channel)).toThrow(RangeError)
  })
})

describe('makeFm1ProgramChangeMessage', () => {
  it('maps the first FM1 slot to program zero on channel one', () => {
    expect(Array.from(makeFm1ProgramChangeMessage(0, 1))).toEqual([0xc0, 0x00])
  })

  it('maps the last FM1 slot to program 127 on channel sixteen', () => {
    expect(Array.from(makeFm1ProgramChangeMessage(127, 16))).toEqual([0xcf, 0x7f])
  })

  it.each([
    ['program below zero', -1, 1],
    ['program above 127', 128, 1],
    ['fractional program', 1.5, 1],
    ['channel below one', 0, 0],
    ['channel above sixteen', 0, 17],
  ])('rejects %s', (_name, program, channel) => {
    expect(() => makeFm1ProgramChangeMessage(program, channel)).toThrow(RangeError)
  })
})
