// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMidi } from './use-midi'

const webMidi = vi.hoisted(() => ({
  addListener: vi.fn((_event: string, _listener: () => void) => ({ remove: vi.fn() })),
  disable: vi.fn(async () => undefined),
  enable: vi.fn(async () => undefined),
  inputs: [] as unknown[],
  outputs: [] as unknown[],
  sysexEnabled: true,
}))

vi.mock('webmidi', () => ({ WebMidi: webMidi }))
vi.mock('@/lib/monitoring', () => ({ reportBankTransferFailure: vi.fn() }))

type MessageListener = (event: { data: Uint8Array; timestamp: number }) => void

function makeInput(id: string) {
  const listeners = new Set<MessageListener>()
  return {
    addListener: (_event: string, listener: MessageListener) => listeners.add(listener),
    deliver(data: number[], timestamp: number) {
      listeners.forEach((listener) => listener({ data: Uint8Array.from(data), timestamp }))
    },
    id,
    manufacturer: 'Maker',
    name: id,
    removeListener: (_event: string, listener: MessageListener) => listeners.delete(listener),
    state: 'connected',
  }
}

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: vi.fn() })
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
  webMidi.addListener.mockClear()
  webMidi.inputs = []
  webMidi.outputs = []
})

afterEach(cleanup)

async function connectWithInput() {
  const input = makeInput('FM-1 MIDI 1')
  webMidi.inputs = [input]
  const hook = renderHook(() => useMidi())
  await act(() => hook.result.current.connectMidi())
  await waitFor(() => expect(hook.result.current.hasMidiInput).toBe(true))
  return { hook, input }
}

describe('useMidi subscribeToInput', () => {
  it('passes inbound messages to a listener with the time they arrived', async () => {
    const { hook, input } = await connectWithInput()
    const heard: [number[], number][] = []

    act(() => {
      hook.result.current.subscribeToInput((data, atMs) => heard.push([Array.from(data), atMs]))
    })
    act(() => input.deliver([0x90, 0x3c, 0x5a], 1234))

    expect(heard).toEqual([[[0x90, 0x3c, 0x5a], 1234]])
  })

  it('passes on the high-rate messages the log leaves out', async () => {
    const { hook, input } = await connectWithInput()
    const heard: number[][] = []

    act(() => {
      hook.result.current.subscribeToInput((data) => heard.push(Array.from(data)))
    })
    act(() => input.deliver([0xf8], 0))

    expect(heard).toEqual([[0xf8]])
  })

  it('stops delivering once a listener unsubscribes', async () => {
    const { hook, input } = await connectWithInput()
    const heard: number[][] = []
    let unsubscribe = () => {}

    act(() => {
      unsubscribe = hook.result.current.subscribeToInput((data) => heard.push(Array.from(data)))
    })
    act(() => unsubscribe())
    act(() => input.deliver([0x90, 0x3c, 0x5a], 0))

    expect(heard).toEqual([])
  })

  it('serves several listeners at once', async () => {
    const { hook, input } = await connectWithInput()
    const heard: string[] = []

    act(() => {
      hook.result.current.subscribeToInput(() => heard.push('first'))
      hook.result.current.subscribeToInput(() => heard.push('second'))
    })
    act(() => input.deliver([0x90, 0x3c, 0x5a], 0))

    expect(heard).toEqual(['first', 'second'])
  })

  it('still logs the message it passed on', async () => {
    const { hook, input } = await connectWithInput()

    act(() => {
      hook.result.current.subscribeToInput(() => {})
    })
    act(() => input.deliver([0x90, 0x3c, 0x5a], 0))

    expect(hook.result.current.logStore.getSnapshot()[0].message).toContain('Note On')
  })
})
