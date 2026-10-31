// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fm1EffectMappingFixture } from '@/test/fm1-effect-mapping.fixture'
import {
  fm1VaIdentityReply,
  feluccaIdentityReply,
  makeFakeFm1Ports,
  mvaveIdentityReply,
  mvaveV16IdentityReply,
  officialOpenIdentityReply,
} from '@/test/fake-fm1-midi'

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

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(navigator, 'requestMIDIAccess', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: true,
  })
  webMidi.enable.mockReset()
  webMidi.enable.mockResolvedValue(undefined)
  webMidi.inputs = []
  webMidi.outputs = []
})

afterEach(() => {
  cleanup()
})

function installOutput() {
  const sendControlChange = vi.fn()
  webMidi.outputs = [
    {
      id: 'fm1-effects-output',
      manufacturer: 'M-VAVE',
      name: 'FM1',
      sendControlChange,
      state: 'connected',
    },
  ]
  return sendControlChange
}

async function connectMidiOutput() {
  const hook = renderHook(() => useMidi())
  await act(() => hook.result.current.connectMidi())
  await waitFor(() => expect(hook.result.current.hasMidiOutput).toBe(true))
  return hook
}

async function connectFirmware(reply?: Uint8Array) {
  const ports = makeFakeFm1Ports({ reply })
  webMidi.inputs = [ports.input]
  webMidi.outputs = [ports.output]
  const hook = renderHook(() => useMidi())
  await act(() => hook.result.current.connectMidi())
  return { ...hook, ports }
}

describe('useMidi FM1 effect transport', () => {
  it('transmits the complete normalized FX state in ascending controller order', async () => {
    const sendControlChange = installOutput()
    const { result } = await connectMidiOutput()
    const settings = Uint8Array.from(fm1EffectMappingFixture, ({ max }) => max)

    await expect(result.current.sendEffectSettings(settings)).resolves.toBe(true)

    expect(sendControlChange.mock.calls).toEqual(
      fm1EffectMappingFixture.map(({ controller, max }) => [controller, max, { channels: 2 }]),
    )
  })

  it('uses the selected FX channel without changing the controller or value', async () => {
    const sendControlChange = installOutput()
    const { result } = await connectMidiOutput()

    expect(result.current.effectChannel).toBe(2)
    expect(result.current.sendEffectParameter(18, 75)).toBe(true)
    await waitFor(() => expect(sendControlChange).toHaveBeenCalledTimes(1))

    act(() => result.current.setEffectChannel(16))
    expect(result.current.sendEffectParameter(18, 75)).toBe(true)
    await waitFor(() => expect(sendControlChange).toHaveBeenCalledTimes(2))

    expect(sendControlChange.mock.calls).toEqual([
      [18, 75, { channels: 2 }],
      [18, 75, { channels: 16 }],
    ])
    expect(result.current.logStore.getSnapshot()[0]?.data).toEqual(Uint8Array.from([0xbf, 18, 75]))
  })

  it('logs a development probe value above the normal FX parameter range', async () => {
    const sendControlChange = installOutput()
    const { result } = await connectMidiOutput()

    expect(result.current.sendEffectDiagnosticControl(3, 127)).toBe(true)
    await waitFor(() => expect(sendControlChange).toHaveBeenCalledWith(3, 127, { channels: 2 }))

    expect(result.current.logStore.getSnapshot()[0]?.data).toEqual(Uint8Array.from([0xb1, 3, 127]))
  })
})

describe('useMidi shared FX transport', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends exactly the 24 V16 controls at CC 70–93 on the Effect channel', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'performance'] })
    const { ports, result } = await connectFirmware(mvaveV16IdentityReply)
    const settings = Uint8Array.from(fm1EffectMappingFixture, ({ max }) => max)

    const sending = result.current.sendSharedEffectSettings(settings)
    await vi.runAllTimersAsync()

    await expect(sending).resolves.toEqual({ ok: true, sent: 24 })
    expect(ports.output.sendControlChange.mock.calls).toEqual(
      fm1EffectMappingFixture.map(({ controller, max }) => [70 + controller, max, { channels: 2 }]),
    )
    expect(ports.output.sendProgramChange).not.toHaveBeenCalled()
    expect(ports.output.sendSysex).not.toHaveBeenCalled()
  })

  it.each([
    ['V15', mvaveIdentityReply],
    ['Baud Girl firmware', fm1VaIdentityReply],
    ['Official Open', officialOpenIdentityReply],
    ['Felucca', feluccaIdentityReply],
    ['firmware still being checked', undefined],
  ])('keeps standalone shared FX sends local on %s', async (_label, reply) => {
    const { ports, result } = await connectFirmware(reply)

    expect(result.current.sendSharedEffectParameter(0, 1)).toBe(false)
    await expect(result.current.sendSharedEffectSettings(new Uint8Array(24))).resolves.toEqual({
      ok: false,
      reason: 'ineligible',
      sent: 0,
    })
    expect(ports.output.sendControlChange).not.toHaveBeenCalled()
  })

  it('cancels unsent controls when the Effect channel changes without redirecting them', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'performance'] })
    const { ports, result } = await connectFirmware(mvaveV16IdentityReply)

    const sending = result.current.sendSharedEffectSettings(new Uint8Array(24).fill(1))
    await vi.advanceTimersByTimeAsync(40)
    act(() => result.current.setEffectChannel(3))
    await vi.runAllTimersAsync()

    await expect(sending).resolves.toMatchObject({ ok: false, reason: 'cancelled' })
    expect(ports.output.sendControlChange.mock.calls.length).toBeGreaterThan(0)
    expect(ports.output.sendControlChange.mock.calls.length).toBeLessThan(24)
    expect(
      ports.output.sendControlChange.mock.calls.every(
        (call) => (call[2] as { channels?: number } | undefined)?.channels === 2,
      ),
    ).toBe(true)
  })

  it('stops the unsent controls after a partial transport failure', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'performance'] })
    const { ports, result } = await connectFirmware(mvaveV16IdentityReply)
    let attempts = 0
    ports.output.sendControlChange.mockImplementation(() => {
      attempts += 1
      if (attempts === 4) throw new Error('port closed')
    })

    const sending = result.current.sendSharedEffectSettings(new Uint8Array(24).fill(1))
    await vi.runAllTimersAsync()

    await expect(sending).resolves.toEqual({ ok: false, reason: 'transport', sent: 3 })
    expect(ports.output.sendControlChange).toHaveBeenCalledTimes(4)
  })
})

describe('useMidi channel settings', () => {
  it('ignores a note channel outside 1 to 16 and keeps the stored channel', () => {
    const { result } = renderHook(() => useMidi())
    act(() => result.current.setChannel(3))

    for (const invalidChannel of [0, 17, 2.5, Number.NaN]) {
      act(() => result.current.setChannel(invalidChannel))
    }

    expect(result.current.channel).toBe(3)
    expect(localStorage.getItem('fm1-midi-channel')).toBe('3')
  })
})
