// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

function installOutput(sendNoteOff = vi.fn()) {
  webMidi.outputs = [
    {
      id: 'fm1-output',
      manufacturer: 'M-VAVE',
      name: 'FM-1 MIDI 1',
      sendNoteOff,
      state: 'connected',
    },
  ]
  return sendNoteOff
}

async function connectMidiOutput() {
  const hook = renderHook(() => useMidi())
  await act(() => hook.result.current.connectMidi())
  await waitFor(() => expect(hook.result.current.hasMidiOutput).toBe(true))
  return hook
}

describe('useMidi MIDI panic', () => {
  it('sends a Note Off for every note on the note channel', async () => {
    const sendNoteOff = installOutput()
    const { result } = await connectMidiOutput()
    act(() => result.current.setChannel(5))

    let sent = false
    act(() => {
      sent = result.current.sendMidiPanic()
    })

    expect(sent).toBe(true)
    expect(sendNoteOff).toHaveBeenCalledTimes(128)
    expect(sendNoteOff).toHaveBeenLastCalledWith(127, { channels: 5, rawRelease: 0 })
  })

  it('counts each MIDI panic', async () => {
    installOutput()
    const { result } = await connectMidiOutput()

    act(() => {
      result.current.sendMidiPanic()
    })

    expect(result.current.midiPanicCount).toBe(1)
  })

  it('sends nothing without an output', () => {
    const { result } = renderHook(() => useMidi())

    let sent = true
    act(() => {
      sent = result.current.sendMidiPanic()
    })

    expect(sent).toBe(false)
    expect(result.current.midiPanicCount).toBe(0)
  })

  it('reports a failed send instead of throwing', async () => {
    installOutput(
      vi.fn(() => {
        throw new Error('Port is disconnected')
      }),
    )
    const { result } = await connectMidiOutput()

    let sent = true
    act(() => {
      sent = result.current.sendMidiPanic()
    })

    expect(sent).toBe(false)
    expect(result.current.midiPanicCount).toBe(0)
  })
})
