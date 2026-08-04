import { describe, expect, it } from 'vitest'

import {
  classifyFm1CapabilityResponse,
  makeFm1CapabilityRequest,
  makeFm1EffectControlMessage,
  makeFm1ParameterPayload,
  makeFm1ProgramChangeMessage,
} from '@/lib/midi'

describe('makeFm1ParameterPayload', () => {
  it('encodes the documented FM1 transpose parameter message on channel 1', () => {
    expect(Array.from(makeFm1ParameterPayload(144, 36, 1))).toEqual([
      0x10, 0x01, 0x10, 0x24,
    ])
  })

  it('encodes the maximum documented parameter on channel 16', () => {
    expect(Array.from(makeFm1ParameterPayload(155, 127, 16))).toEqual([
      0x1f, 0x01, 0x1b, 0x7f,
    ])
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
    expect(() => makeFm1ParameterPayload(parameter, value, channel)).toThrow(
      RangeError,
    )
  })
})

describe('makeFm1EffectControlMessage', () => {
  it('encodes an FM1 chorus depth change on the default FX channel', () => {
    expect(Array.from(makeFm1EffectControlMessage(18, 75))).toEqual([
      0xb1, 18, 75,
    ])
  })

  it('accepts the documented upper bound for filter cutoff', () => {
    expect(Array.from(makeFm1EffectControlMessage(2, 107, 16))).toEqual([
      0xbf, 2, 107,
    ])
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
    expect(() => makeFm1EffectControlMessage(controller, value, channel))
      .toThrow(RangeError)
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

describe('makeFm1CapabilityRequest', () => {
  it('encodes the universal non-realtime identity request', () => {
    expect(Array.from(makeFm1CapabilityRequest('identity', 1))).toEqual([
      0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7,
    ])
  })

  it('encodes Yamaha edit-buffer and bank dump requests for the selected channel', () => {
    expect(Array.from(makeFm1CapabilityRequest('voice', 3))).toEqual([
      0xf0, 0x43, 0x22, 0x00, 0xf7,
    ])
    expect(Array.from(makeFm1CapabilityRequest('bank', 16))).toEqual([
      0xf0, 0x43, 0x2f, 0x09, 0xf7,
    ])
  })

  it.each([0, 17, 1.5])('rejects invalid MIDI channel %s', (channel) => {
    expect(() => makeFm1CapabilityRequest('voice', channel)).toThrow(RangeError)
  })
})

describe('classifyFm1CapabilityResponse', () => {
  it('recognizes a universal identity reply', () => {
    expect(classifyFm1CapabilityResponse(Uint8Array.from([
      0xf0, 0x7e, 0x00, 0x06, 0x02, 0x43, 0x01, 0xf7,
    ]))).toEqual({ kind: 'identity', valid: true })
  })

  it('recognizes a checksum-valid DX7 edit-buffer dump', () => {
    const data = new Uint8Array(155)
    data[145] = 0x54
    const checksum = (128 - (data.reduce((sum, byte) => sum + byte, 0) & 0x7f)) & 0x7f
    const response = Uint8Array.from([
      0xf0, 0x43, 0x00, 0x00, 0x01, 0x1b, ...data, checksum, 0xf7,
    ])

    expect(classifyFm1CapabilityResponse(response)).toEqual({
      kind: 'voice',
      valid: true,
    })
  })

  it('reports a malformed edit-buffer dump instead of accepting it', () => {
    const response = new Uint8Array(163)
    response.set([0xf0, 0x43, 0x00, 0x00, 0x01, 0x1b])
    response[6] = 1
    response[162] = 0xf7

    expect(classifyFm1CapabilityResponse(response)).toEqual({
      kind: 'voice',
      valid: false,
    })
  })

  it('recognizes a checksum-valid DX7 bank dump', () => {
    const data = new Uint8Array(4096)
    data[0] = 1
    const checksum = 127
    const response = Uint8Array.from([
      0xf0, 0x43, 0x00, 0x09, 0x20, 0x00, ...data, checksum, 0xf7,
    ])

    expect(classifyFm1CapabilityResponse(response)).toEqual({
      kind: 'bank',
      valid: true,
    })
  })

  it('reports a malformed bank dump instead of accepting it', () => {
    const response = new Uint8Array(4104)
    response.set([0xf0, 0x43, 0x00, 0x09, 0x20, 0x00])
    response[6] = 1
    response[4103] = 0xf7

    expect(classifyFm1CapabilityResponse(response)).toEqual({
      kind: 'bank',
      valid: false,
    })
  })

  it('ignores truncated Yamaha dumps', () => {
    expect(classifyFm1CapabilityResponse(Uint8Array.from([
      0xf0, 0x43, 0x00, 0x09, 0x20, 0x00, 0xf7,
    ]))).toBeNull()
  })

  it('ignores unrelated MIDI traffic', () => {
    expect(classifyFm1CapabilityResponse(Uint8Array.from([0x90, 60, 100])))
      .toBeNull()
  })
})
