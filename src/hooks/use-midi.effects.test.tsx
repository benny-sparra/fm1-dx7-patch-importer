// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fm1EffectMappingFixture } from '@/test/fm1-effect-mapping.fixture'

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
