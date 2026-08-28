// @vitest-environment jsdom

import { StrictMode, type ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeDemoVoices } from '@/lib/patch-library'

import { useMidi } from './use-midi'

const reportBankTransferFailure = vi.hoisted(() => vi.fn())

const webMidi = vi.hoisted(() => ({
  addListener: vi.fn(() => ({ remove: vi.fn() })),
  disable: vi.fn(async () => undefined),
  enable: vi.fn(async () => undefined),
  inputs: [] as unknown[],
  outputs: [] as unknown[],
  sysexEnabled: true,
}))

vi.mock('webmidi', () => ({ WebMidi: webMidi }))
vi.mock('@/lib/monitoring', () => ({ reportBankTransferFailure }))

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
  webMidi.sysexEnabled = true
  reportBankTransferFailure.mockReset()
})

afterEach(() => {
  cleanup()
  delete window.umami
})

describe('useMidi connection analytics', () => {
  it('reports a successful manual connection without exposing port identity', async () => {
    const track = vi.fn()
    window.umami = { track }
    const { result } = renderHook(() => useMidi())

    await act(() => result.current.connectMidi())

    expect(track).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('midi_connected', {
      method: 'manual',
      output: 'missing',
      sysex: 'enabled',
    })
  })

  it('exposes when a successful MIDI connection has no SysEx access', async () => {
    webMidi.sysexEnabled = false
    const { result } = renderHook(() => useMidi())

    await act(() => result.current.connectMidi())

    expect(result.current.midiAccess).toBe(true)
    expect(result.current.sysexAvailable).toBe(false)
  })

  it('reports permission denial as a fixed category instead of sending the browser error', async () => {
    const denied = new Error('The user denied a site-specific MIDI permission prompt')
    denied.name = 'NotAllowedError'
    webMidi.enable.mockRejectedValueOnce(denied)
    const track = vi.fn()
    window.umami = { track }
    const { result } = renderHook(() => useMidi())

    await act(() => result.current.connectMidi())

    expect(track).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('midi_connection_failed', {
      method: 'manual',
      reason: 'permission_denied',
    })
  })

  it('attempts and reports automatic reconnection only once in Strict Mode', async () => {
    localStorage.setItem('fm1-midi-auto-connect', 'true')
    const track = vi.fn()
    window.umami = { track }
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>

    renderHook(() => useMidi(), { wrapper })

    await waitFor(() => expect(track).toHaveBeenCalledOnce())
    expect(webMidi.enable).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('midi_connected', {
      method: 'automatic',
      output: 'missing',
      sysex: 'enabled',
    })
  })
})

describe('useMidi transfer monitoring', () => {
  it('keeps an expected missing-output failure out of Sentry', async () => {
    const { result } = renderHook(() => useMidi())

    await expect(result.current.sendBank('A', makeDemoVoices())).resolves.toEqual({
      ok: false,
      reason: 'no_output',
    })
    expect(reportBankTransferFailure).not.toHaveBeenCalled()
  })

  it('reports a rejected bank transport with safe operational context', async () => {
    const transportError = new Error('Private FM1 output disconnected')
    webMidi.outputs = [
      {
        id: 'private-port-id',
        manufacturer: 'Private manufacturer',
        name: 'Private FM1 output',
        sendSysex: vi.fn(() => {
          throw transportError
        }),
        state: 'connected',
      },
    ]
    const { result } = renderHook(() => useMidi())

    await act(() => result.current.connectMidi())
    await waitFor(() => expect(result.current.hasMidiOutput).toBe(true))

    await expect(result.current.sendBank('A', makeDemoVoices())).resolves.toEqual({
      ok: false,
      reason: 'transport',
    })
    expect(reportBankTransferFailure).toHaveBeenCalledOnce()
    expect(reportBankTransferFailure).toHaveBeenCalledWith({
      channel: 1,
      stage: 'controller',
      sysexAvailable: true,
      voiceCount: 32,
    })
  })
})

describe('useMidi note transport failures', () => {
  it('contains a disconnected transport error when starting a note', async () => {
    const transportError = new Error('The FM1 LAN bridge is disconnected.')
    webMidi.outputs = [
      {
        id: 'lan-bridge',
        manufacturer: 'FM1',
        name: 'LAN bridge',
        sendNoteOn: vi.fn(() => {
          throw transportError
        }),
        state: 'connected',
      },
    ]
    const { result } = renderHook(() => useMidi())

    await act(() => result.current.connectMidi())
    await waitFor(() => expect(result.current.hasMidiOutput).toBe(true))

    expect(() => result.current.startNote(48, 'C3')).not.toThrow()
    expect(result.current.logStore.getSnapshot()[0]?.message).toBe(
      'The FM1 LAN bridge is disconnected.',
    )
  })

  it('contains a disconnected transport error when stopping a note', async () => {
    const transportError = new Error('The FM1 LAN bridge is disconnected.')
    webMidi.outputs = [
      {
        id: 'lan-bridge',
        manufacturer: 'FM1',
        name: 'LAN bridge',
        sendNoteOff: vi.fn(() => {
          throw transportError
        }),
        state: 'connected',
      },
    ]
    const { result } = renderHook(() => useMidi())

    await act(() => result.current.connectMidi())
    await waitFor(() => expect(result.current.hasMidiOutput).toBe(true))

    expect(() => result.current.stopNote(48)).not.toThrow()
    expect(result.current.logStore.getSnapshot()[0]?.message).toBe(
      'The FM1 LAN bridge is disconnected.',
    )
  })
})
