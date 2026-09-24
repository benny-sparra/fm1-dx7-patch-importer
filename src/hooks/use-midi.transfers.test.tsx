// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeDx7SingleVoicePayload } from '@/lib/dx7'
import { makeFm1ParameterPayload } from '@/lib/midi'
import { makeDemoVoices } from '@/lib/patch-library'

import { useMidi } from './use-midi'

const webMidi = vi.hoisted(() => ({
  addListener: vi.fn(() => ({ remove: vi.fn() })),
  disable: vi.fn(async () => undefined),
  enable: vi.fn(async () => undefined),
  inputs: [] as unknown[],
  outputs: [] as unknown[],
  sysexEnabled: true,
}))

vi.mock('webmidi', () => ({ WebMidi: webMidi }))
vi.mock('@/lib/monitoring', () => ({ reportBankTransferFailure: vi.fn() }))

const voice = makeDemoVoices()[0]

function makeOutput() {
  return {
    id: 'fm1-out',
    manufacturer: 'M-VAVE',
    name: 'FM-1 MIDI 1',
    sendControlChange: vi.fn(),
    sendProgramChange: vi.fn(),
    sendSysex: vi.fn(),
    state: 'connected',
  }
}

function makeInput() {
  const listeners = new Map<string, (event: { data: Uint8Array }) => void>()
  return {
    addListener: vi.fn((event: string, listener: (event: { data: Uint8Array }) => void) => {
      listeners.set(event, listener)
    }),
    id: 'fm1-in',
    manufacturer: 'M-VAVE',
    name: 'FM-1 MIDI 1',
    receive: (bytes: number[]) => listeners.get('midimessage')?.({ data: Uint8Array.from(bytes) }),
    removeListener: vi.fn((event: string) => listeners.delete(event)),
    state: 'connected',
  }
}

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: vi.fn() })
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
  webMidi.inputs = []
  webMidi.outputs = []
  webMidi.sysexEnabled = true
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

async function connect() {
  const hook = renderHook(() => useMidi())
  await act(() => hook.result.current.connectMidi())
  return hook
}

async function connectOutput(output = makeOutput()) {
  webMidi.outputs = [output]
  const hook = await connect()
  await waitFor(() => expect(hook.result.current.hasMidiOutput).toBe(true))
  return { ...hook, output }
}

function logMessages(result: { current: ReturnType<typeof useMidi> }) {
  return result.current.logStore.getSnapshot().map(({ direction, message }) => [direction, message])
}

describe('useMidi edit-buffer voice transfer', () => {
  it('sends a voice to the FM1 edit buffer as single-voice SysEx on the note channel', async () => {
    const { output, result } = await connectOutput()
    act(() => result.current.setChannel(4))

    await expect(result.current.sendVoice(voice)).resolves.toBe(true)

    expect(output.sendSysex).toHaveBeenCalledExactlyOnceWith(
      0x43,
      makeDx7SingleVoicePayload(voice, 4),
    )
    expect(logMessages(result)).toContainEqual([
      'out',
      `Sent ${voice.name}. Hold SAVE on the FM1 to store it.`,
    ])
  })

  it('does not send a voice without SysEx access', async () => {
    const { output, result } = await connectOutput()
    webMidi.sysexEnabled = false

    await expect(result.current.sendVoice(voice)).resolves.toBe(false)

    expect(output.sendSysex).not.toHaveBeenCalled()
  })

  it('reports a voice the port refused as not sent', async () => {
    const output = makeOutput()
    output.sendSysex.mockImplementation(() => {
      throw new Error('The port is closed.')
    })
    const { result } = await connectOutput(output)

    await expect(result.current.sendVoice(voice)).resolves.toBe(false)

    expect(logMessages(result)).toContainEqual(['system', 'The port is closed.'])
  })

  it('does not send a voice before an output is chosen', async () => {
    const { result } = await connect()

    await expect(result.current.sendVoice(voice)).resolves.toBe(false)
  })
})

describe('useMidi program selection', () => {
  it('selects an FM1 program on the note channel', async () => {
    const { output, result } = await connectOutput()
    act(() => result.current.setChannel(2))

    expect(result.current.sendProgramChange(37)).toBe(true)

    expect(output.sendProgramChange).toHaveBeenCalledExactlyOnceWith(37, { channels: 2 })
  })

  it('refuses a program outside 0 to 127 without sending it', async () => {
    const { output, result } = await connectOutput()

    expect(result.current.sendProgramChange(128)).toBe(false)

    expect(output.sendProgramChange).not.toHaveBeenCalled()
  })
})

describe('useMidi live parameter writes', () => {
  it('refuses a parameter value outside its range without queuing it', async () => {
    const { output, result } = await connectOutput()

    expect(result.current.sendParameter(0, 100)).toBe(false)

    expect(output.sendSysex).not.toHaveBeenCalled()
  })

  it('does not send parameters without SysEx access', async () => {
    const { output, result } = await connectOutput()
    webMidi.sysexEnabled = false

    expect(result.current.sendParameter(144, 36)).toBe(false)

    expect(output.sendSysex).not.toHaveBeenCalled()
  })

  it('sends the latest value of a parameter changed faster than the FM1 accepts it', async () => {
    const { output, result } = await connectOutput()

    for (const value of [10, 20, 30, 40]) result.current.sendParameter(144, value)

    await waitFor(() =>
      expect(output.sendSysex).toHaveBeenLastCalledWith(0x43, makeFm1ParameterPayload(144, 40)),
    )
    expect(output.sendSysex.mock.calls.map(([, payload]) => payload[3])).toEqual([10, 40])
  })

  it('logs a parameter the port refused', async () => {
    const output = makeOutput()
    output.sendSysex.mockImplementation(() => {
      throw new Error('The port is closed.')
    })
    const { result } = await connectOutput(output)

    expect(result.current.sendParameter(144, 36)).toBe(true)

    await waitFor(() =>
      expect(logMessages(result)).toContainEqual(['system', 'The port is closed.']),
    )
  })
})

describe('useMidi sends before an output is chosen', () => {
  type Midi = ReturnType<typeof useMidi>
  it.each<[string, (midi: Midi) => boolean | Promise<boolean>, string]>([
    ['a program change', (midi) => midi.sendProgramChange(37), 'select an FM1 program'],
    ['a voice parameter', (midi) => midi.sendParameter(144, 36), 'send FM1 parameter'],
    ['an effect control', (midi) => midi.sendEffectParameter(3, 64), 'send FM1 effect'],
    ['the effect unit', (midi) => midi.sendEffectSettings(new Uint8Array(24)), 'send FM1 effects'],
    [
      'a development FX probe',
      (midi) => midi.sendEffectDiagnosticControl(3, 127),
      'send development FX probe',
    ],
  ])('sends %s nowhere and logs that no output is selected', async (_, send, action) => {
    const { result } = await connect()

    expect(await send(result.current)).toBe(false)

    expect(logMessages(result)).toContainEqual([
      'system',
      `Could not ${action}; no MIDI output selected.`,
    ])
  })
})

describe('useMidi bank transfer guards', () => {
  it('does not send a bank without SysEx access', async () => {
    const { output, result } = await connectOutput()
    webMidi.sysexEnabled = false

    await expect(result.current.sendBank('A', makeDemoVoices())).resolves.toEqual({
      ok: false,
      reason: 'sysex_unavailable',
    })

    expect(output.sendSysex).not.toHaveBeenCalled()
    expect(logMessages(result)).toContainEqual([
      'system',
      'Enable SysEx before connecting MIDI to send a bank.',
    ])
  })

  it('does not send a bank that does not hold 32 voices', async () => {
    const { output, result } = await connectOutput()

    await expect(result.current.sendBank('A', makeDemoVoices().slice(1))).resolves.toEqual({
      ok: false,
      reason: 'invalid_bank',
    })

    expect(output.sendSysex).not.toHaveBeenCalled()
    expect(logMessages(result)).toContainEqual(['system', 'Bank A is not loaded with 32 voices.'])
  })
})

describe('useMidi development FX probe', () => {
  it('sends no probe in a production build', async () => {
    vi.stubEnv('DEV', false)
    const { output, result } = await connectOutput()

    expect(result.current.sendEffectDiagnosticControl(3, 127)).toBe(false)

    expect(output.sendControlChange).not.toHaveBeenCalled()
  })
})

describe('useMidi incoming message log', () => {
  it('logs a note from the selected input by name', async () => {
    const input = makeInput()
    webMidi.inputs = [input]
    const { result } = await connect()
    await waitFor(() => expect(result.current.hasMidiInput).toBe(true))

    act(() => input.receive([0x90, 60, 100]))

    expect(logMessages(result)[0]).toEqual(['in', 'Ch 1 Note On: C4 (velocity 100)'])
  })

  it('keeps timing clock out of the log', async () => {
    const input = makeInput()
    webMidi.inputs = [input]
    const { result } = await connect()
    await waitFor(() => expect(result.current.hasMidiInput).toBe(true))
    const before = result.current.logStore.getSnapshot().length

    act(() => input.receive([0xf8]))

    expect(result.current.logStore.getSnapshot()).toHaveLength(before)
  })

  it('stops listening to the input when MIDI is switched off', async () => {
    const input = makeInput()
    webMidi.inputs = [input]
    const { result } = await connect()
    await waitFor(() => expect(result.current.hasMidiInput).toBe(true))

    await act(() => result.current.disconnectMidi())

    expect(input.removeListener).toHaveBeenCalledWith('midimessage', expect.any(Function))
  })
})
