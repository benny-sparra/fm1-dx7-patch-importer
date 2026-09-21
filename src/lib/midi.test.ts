import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  formatMidiBytes,
  getMidiSupport,
  isHighRateMidiMessage,
  makeFm1EffectDiagnosticControlMessage,
  makeFm1EffectControlMessage,
  makeFm1ParameterPayload,
  makeFm1ProgramChangeMessage,
  resolveMidiPortSelection,
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

describe('isHighRateMidiMessage', () => {
  it.each([
    ['timing clock', 0xf8],
    ['active sensing', 0xfe],
  ])('filters %s out of the monitor', (_name, status) => {
    expect(isHighRateMidiMessage(Uint8Array.from([status]))).toBe(true)
  })

  it.each([
    ['note on', [0x90, 60, 96]],
    ['control change', [0xb1, 12, 64]],
    ['program change', [0xc0, 3]],
    ['system exclusive', [0xf0, 0x43, 0x10, 0xf7]],
    ['start', [0xfa]],
    ['stop', [0xfc]],
    ['system reset', [0xff]],
  ])('keeps %s', (_name, bytes) => {
    expect(isHighRateMidiMessage(Uint8Array.from(bytes))).toBe(false)
  })

  it('keeps an empty message', () => {
    expect(isHighRateMidiMessage(new Uint8Array())).toBe(false)
  })
})

describe('formatMidiBytes', () => {
  it('names a note on with its channel, note and velocity', () => {
    expect(formatMidiBytes(Uint8Array.from([0x92, 60, 100]))).toBe(
      'Ch 3 Note On: C4 (velocity 100)',
    )
  })

  it('names a note off', () => {
    expect(formatMidiBytes(Uint8Array.from([0x80, 69, 64]))).toBe('Ch 1 Note Off: A4 (velocity 64)')
  })

  it('treats a note on with no velocity as a note off', () => {
    expect(formatMidiBytes(Uint8Array.from([0x9f, 0, 0]))).toBe('Ch 16 Note Off: C-1 (velocity 0)')
  })

  it('shows any other message as upper-case hex bytes', () => {
    expect(formatMidiBytes(Uint8Array.from([0xf0, 0x43, 0x10, 0x0a, 0xf7]))).toBe('F0 43 10 0A F7')
    expect(formatMidiBytes([0xb1, 12, 64])).toBe('B1 0C 40')
  })

  it('shows a truncated note message as bytes rather than a note', () => {
    expect(formatMidiBytes(Uint8Array.from([0x90, 60]))).toBe('90 3C')
  })
})

describe('resolveMidiPortSelection', () => {
  const port = (id: string, name = id) => ({ id, name })

  it('keeps the chosen port while it is available', () => {
    expect(resolveMidiPortSelection([port('other'), port('fm1')], 'fm1', 'changed')).toBe('fm1')
  })

  it('uses the first port when the remembered one is missing as MIDI connects', () => {
    const ports = [port('first', 'USB MIDI Interface'), port('second', 'Keyboard')]

    expect(resolveMidiPortSelection(ports, 'old-port', 'connected')).toBe('first')
  })

  it('selects nothing rather than another device when the chosen port disconnects', () => {
    expect(resolveMidiPortSelection([port('other')], 'fm1', 'changed')).toBe('')
  })

  it('uses the first port that appears when none was chosen', () => {
    expect(resolveMidiPortSelection([port('fm1')], '', 'changed')).toBe('fm1')
  })

  it('passes over the Linux MIDI Through loopback when choosing a port automatically', () => {
    const ports = [port('14:0', 'Midi Through Port-0'), port('20:0', 'USB Composite Device')]

    expect(resolveMidiPortSelection(ports, '', 'connected')).toBe('20:0')
  })

  it('passes over the Windows software synth when choosing a port automatically', () => {
    const ports = [port('gs', 'Microsoft GS Wavetable Synth'), port('fm1', 'USB Composite Device')]

    expect(resolveMidiPortSelection(ports, '', 'connected')).toBe('fm1')
  })

  it('uses a built-in port when it is the only one available', () => {
    expect(resolveMidiPortSelection([port('14:0', 'Midi Through Port-0')], '', 'connected')).toBe(
      '14:0',
    )
  })

  it('prefers a port named for the FM1 over other devices when choosing automatically', () => {
    const ports = [
      port('14:0', 'Midi Through Port-0'),
      port('20:0', 'USB MIDI Interface'),
      port('24:0', 'FM-1 MIDI 1'),
    ]

    expect(resolveMidiPortSelection(ports, '', 'connected')).toBe('24:0')
  })

  it('keeps a remembered port rather than switching to one named for the FM1', () => {
    const ports = [port('20:0', 'USB MIDI Interface'), port('24:0', 'FM-1 MIDI 1')]

    expect(resolveMidiPortSelection(ports, '20:0', 'connected')).toBe('20:0')
  })

  it('does not move to a port named for the FM1 when the chosen port disconnects', () => {
    expect(resolveMidiPortSelection([port('24:0', 'FM-1 MIDI 1')], '20:0', 'changed')).toBe('')
  })

  it('keeps a built-in port the user chose', () => {
    const ports = [port('14:0', 'Midi Through Port-0'), port('fm1', 'USB Composite Device')]

    expect(resolveMidiPortSelection(ports, '14:0', 'connected')).toBe('14:0')
  })
})
