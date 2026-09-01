import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getMidiSupport,
  makeFm1EffectDiagnosticControlMessage,
  makeFm1EffectControlMessage,
  makeFm1ParameterPayload,
  makeFm1ProgramChangeMessage,
  sendFm1EffectControl,
  sendFm1EffectDiagnosticControl,
  sendFm1Parameter,
} from '@/lib/midi'
import { fm1EffectMappingFixture } from '@/test/fm1-effect-mapping.fixture'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getMidiSupport', () => {
  it('identifies an insecure context even when the browser hides the MIDI API', () => {
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('window', { isSecureContext: false })

    expect(getMidiSupport()).toBe('insecure')
  })

  it('identifies a secure browser without Web MIDI support', () => {
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('window', { isSecureContext: true })

    expect(getMidiSupport()).toBe('unsupported')
  })

  it('identifies Web MIDI support in a secure context', () => {
    vi.stubGlobal('navigator', { requestMIDIAccess: vi.fn() })
    vi.stubGlobal('window', { isSecureContext: true })

    expect(getMidiSupport()).toBe('supported')
  })
})

describe('makeFm1ParameterPayload', () => {
  it('encodes the documented FM1 transpose parameter message on channel 1', () => {
    expect(Array.from(makeFm1ParameterPayload(144, 36))).toEqual([0x10, 0x01, 0x10, 0x24])
  })

  it('encodes the final edit-buffer parameter with the fixed FM1 sub-status', () => {
    expect(Array.from(makeFm1ParameterPayload(154, 127))).toEqual([0x10, 0x01, 0x1a, 0x7f])
  })

  it.each([
    [127, 99, [0x10, 0x00, 0x7f, 0x63]],
    [128, 99, [0x10, 0x01, 0x00, 0x63]],
  ])(
    'preserves the address across the 7-bit low-byte boundary at %i',
    (parameter, value, bytes) => {
      expect(Array.from(makeFm1ParameterPayload(parameter, value))).toEqual(bytes)
    },
  )

  it.each([
    ['parameter below zero', -1, 0],
    ['parameter outside the 155-byte edit buffer', 155, 0],
    ['fractional parameter', 1.5, 0],
    ['value below zero', 0, -1],
    ['value above 127', 0, 128],
    ['operator rate above its range', 0, 100],
    ['algorithm above its range', 134, 32],
    ['transpose above its range', 144, 49],
    ['fractional value', 0, 1.5],
  ])('rejects %s', (_name, parameter, value) => {
    expect(() => makeFm1ParameterPayload(parameter, value)).toThrow(RangeError)
  })

  it('sends the standard seven-byte Yamaha parameter-change SysEx encoding', () => {
    const output = { sendSysex: vi.fn() }

    sendFm1Parameter(output as never, 144, 36)

    expect(output.sendSysex).toHaveBeenCalledWith(0x43, Uint8Array.from([0x10, 0x01, 0x10, 0x24]))
  })
})

describe('makeFm1EffectControlMessage', () => {
  it.each(fm1EffectMappingFixture)(
    'encodes $effect $control (CC $controller) at both accepted boundaries',
    ({ controller, max, min }) => {
      expect(Array.from(makeFm1EffectControlMessage(controller, min))).toEqual([
        0xb1,
        controller,
        min,
      ])
      expect(Array.from(makeFm1EffectControlMessage(controller, max))).toEqual([
        0xb1,
        controller,
        max,
      ])
    },
  )

  it.each(fm1EffectMappingFixture)(
    'rejects $effect $control values outside $min–$max',
    ({ controller, max, min }) => {
      expect(() => makeFm1EffectControlMessage(controller, min - 1)).toThrow(RangeError)
      expect(() => makeFm1EffectControlMessage(controller, max + 1)).toThrow(RangeError)
      expect(() => makeFm1EffectControlMessage(controller, min + 0.5)).toThrow(RangeError)
    },
  )

  it('uses channel 2 by default', () => {
    expect(Array.from(makeFm1EffectControlMessage(18, 75))).toEqual([0xb1, 18, 75])
  })

  it('changes only the status byte when the selected FX channel changes', () => {
    expect(Array.from(makeFm1EffectControlMessage(18, 75, 1))).toEqual([0xb0, 18, 75])
    expect(Array.from(makeFm1EffectControlMessage(18, 75, 16))).toEqual([0xbf, 18, 75])
  })

  it.each([
    ['enable', 0, 1],
    ['type', 1, 2],
    ['continuous value', 2, 107],
  ])('sends an effect %s through the Control Change transport', (_name, controller, value) => {
    const output = { sendControlChange: vi.fn() }

    sendFm1EffectControl(output as never, 7, controller, value)

    expect(output.sendControlChange).toHaveBeenCalledWith(controller, value, { channels: 7 })
  })

  it.each([
    ['controller below zero', -1, 0, 2],
    ['controller above 23', 24, 0, 2],
    ['fractional controller', 1.5, 0, 2],
    ['channel below one', 0, 0, 0],
    ['channel above sixteen', 0, 0, 17],
  ])('rejects %s', (_name, controller, value, channel) => {
    expect(() => makeFm1EffectControlMessage(controller, value, channel)).toThrow(RangeError)
  })
})

describe('makeFm1EffectDiagnosticControlMessage', () => {
  it('encodes a raw 7-bit value above the historical editor maximum', () => {
    expect(Array.from(makeFm1EffectDiagnosticControlMessage(3, 127, 16))).toEqual([
      0xbf, 0x03, 0x7f,
    ])
  })

  it('sends the diagnostic control through the selected FX channel', () => {
    const output = { sendControlChange: vi.fn() }

    sendFm1EffectDiagnosticControl(output as never, 2, 3, 126)

    expect(output.sendControlChange).toHaveBeenCalledWith(3, 126, { channels: 2 })
  })

  it.each([
    ['controller below the FX block', -1, 0, 2],
    ['controller above the FX block', 24, 0, 2],
    ['fractional value', 0, 1.5, 2],
    ['value below zero', 0, -1, 2],
    ['value above MIDI 7-bit range', 0, 128, 2],
    ['channel above sixteen', 0, 0, 17],
  ])('rejects %s', (_name, controller, value, channel) => {
    expect(() => makeFm1EffectDiagnosticControlMessage(controller, value, channel)).toThrow(
      RangeError,
    )
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
