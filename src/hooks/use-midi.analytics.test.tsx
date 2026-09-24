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
    expect(result.current.error).toBe('permission_denied')
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

describe('useMidi connection in a browser that cannot use MIDI', () => {
  const unusableBrowsers = [
    [
      'outside a secure context',
      'insecure_context',
      () => Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false }),
    ],
    [
      'in a browser without Web MIDI',
      'unsupported_browser',
      () =>
        Object.defineProperty(navigator, 'requestMIDIAccess', {
          configurable: true,
          value: undefined,
        }),
    ],
  ] as const

  it.each(unusableBrowsers)(
    'refuses to connect %s without asking for MIDI access',
    async (_name, reason, makeBrowserUnusable) => {
      makeBrowserUnusable()
      const { result } = renderHook(() => useMidi())

      await act(() => result.current.connectMidi())

      expect(result.current.error).toBe(reason)
      expect(result.current.midiAccess).toBe(false)
      expect(result.current.isConnecting).toBe(false)
      expect(webMidi.enable).not.toHaveBeenCalled()
    },
  )

  it.each(unusableBrowsers)(
    'reports a connection refused %s as a fixed category',
    async (_name, reason, makeBrowserUnusable) => {
      makeBrowserUnusable()
      const track = vi.fn()
      window.umami = { track }
      const { result } = renderHook(() => useMidi())

      await act(() => result.current.connectMidi())

      expect(track).toHaveBeenCalledExactlyOnceWith('midi_connection_failed', {
        method: 'manual',
        reason,
      })
    },
  )

  it('reports an automatic reconnection refused outside a secure context as automatic', async () => {
    unusableBrowsers[0][2]()
    localStorage.setItem('fm1-midi-auto-connect', 'true')
    const track = vi.fn()
    window.umami = { track }

    const { result } = renderHook(() => useMidi())

    await waitFor(() => expect(result.current.error).toBe('insecure_context'))
    expect(track).toHaveBeenCalledExactlyOnceWith('midi_connection_failed', {
      method: 'automatic',
      reason: 'insecure_context',
    })
    expect(webMidi.enable).not.toHaveBeenCalled()
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

  it('logs the bank SysEx message once for a successful transfer', async () => {
    webMidi.outputs = [
      {
        id: 'fm1-output',
        manufacturer: 'M-VAVE',
        name: 'FM1',
        sendSysex: vi.fn(),
        state: 'connected',
      },
    ]
    const { result } = renderHook(() => useMidi())

    await act(() => result.current.connectMidi())
    await waitFor(() => expect(result.current.hasMidiOutput).toBe(true))

    await expect(result.current.sendBank('A', makeDemoVoices())).resolves.toEqual({ ok: true })

    const [sent, sending] = result.current.logStore.getSnapshot()
    expect(sent.message).toBe('Sent bank A. Choose its destination on the FM1.')
    expect(sent.data).toBeUndefined()
    expect(sending.message).toBe('Sending DX7 bank A (32 voices)…')
    expect(sending.data).toHaveLength(4104)
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
