// @vitest-environment jsdom

import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { OfficialOpenTrackStatus } from '@/components/midi/official-open-track-status'
import { ToastProvider } from '@/components/ui/toast'
import { makeDx7SingleVoicePayload } from '@/lib/dx7'
import { makeDemoVoices } from '@/lib/patch-library'
import { makeFakeFm1Ports, officialOpenIdentityReply } from '@/test/fake-fm1-midi'

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

const voice = makeDemoVoices()[0]

// Engine numbers, track 1 first: 303, 808, DX7, then five PSG, as the FM1 answered on 2026-10-16.
const capturedEngines = [1, 2, 0, 3, 3, 3, 3, 3]

// The send loads its module on first use. Loading it here keeps that real wait out of the tests,
// whose timers are simulated.
beforeAll(() => import('@/lib/official-open-track-send'))

beforeEach(() => {
  // The identity query and the track read each wait for an answer, so time is simulated.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  localStorage.clear()
  Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: vi.fn() })
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
  webMidi.inputs = []
  webMidi.outputs = []
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function officialOpenFm1(trackEngines?: readonly number[]) {
  const ports = makeFakeFm1Ports({ reply: officialOpenIdentityReply, trackEngines })
  webMidi.inputs = [ports.input]
  webMidi.outputs = [ports.output]
  return ports
}

async function connect(channel: number) {
  localStorage.setItem('fm1-midi-channel', String(channel))
  const hook = renderHook(() => useMidi())
  await act(() => hook.result.current.connectMidi())
  expect(hook.result.current.firmware.kind).toBe('official-open')
  return hook
}

/**
 * Sends `voice` and lets the transfer queue and the read run for `ms`, resolving whether it was
 * sent once the send has settled.
 */
async function send(result: { current: ReturnType<typeof useMidi> }, ms = 100) {
  let sent: Promise<boolean> | undefined
  act(() => {
    sent = result.current.sendVoice(voice)
  })
  await act(() => vi.advanceTimersByTimeAsync(ms))
  return act(async () => sent)
}

function infoRequests(output: ReturnType<typeof makeFakeFm1Ports>['output']) {
  return output.send.mock.calls.filter(([data]) => data[1] === 0x7d)
}

describe('useMidi on Official Open', () => {
  it('reads the track engines, then sends the patch to the DX7 track on the note channel', async () => {
    const ports = officialOpenFm1(capturedEngines)
    const { result } = await connect(3)

    await expect(send(result)).resolves.toBe(true)
    expect(infoRequests(ports.output)).toHaveLength(1)
    expect(ports.output.sendSysex).toHaveBeenCalledExactlyOnceWith(
      0x43,
      makeDx7SingleVoicePayload(voice, 3),
    )
    expect(result.current.trackDelivery).toEqual({
      announce: true,
      delivery: { channel: 3, name: voice.name, track: 3, type: 'sent' },
    })
  })

  it('reads the engines afresh with a new token for every patch', async () => {
    const ports = officialOpenFm1(capturedEngines)
    const { result } = await connect(3)

    await send(result)
    await send(result)

    const [first, second] = infoRequests(ports.output).map(([data]) => Array.from(data))
    expect(first.slice(6, 8)).not.toEqual(second.slice(6, 8))
    expect(ports.output.sendSysex).toHaveBeenCalledTimes(2)
  })

  it('sends channel 10’s patch to track 8 as a dump on channel 10', async () => {
    const ports = officialOpenFm1([1, 2, 3, 3, 3, 3, 3, 0])
    const { result } = await connect(10)

    await send(result)

    expect(ports.output.sendSysex).toHaveBeenCalledExactlyOnceWith(
      0x43,
      makeDx7SingleVoicePayload(voice, 10),
    )
  })

  it('sends nothing to a track on another engine, and says so in translated text', async () => {
    const ports = officialOpenFm1(capturedEngines)
    localStorage.setItem('fm1-midi-channel', '1')
    function Harness() {
      const midi = useMidi()
      return (
        <>
          <button type="button" onClick={() => void midi.connectMidi()}>
            connect
          </button>
          <button type="button" onClick={() => void midi.sendVoice(voice)}>
            send
          </button>
          <OfficialOpenTrackStatus midi={midi} />
        </>
      )
    }
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    )

    await act(async () => screen.getByRole('button', { name: 'connect' }).click())
    await act(async () => screen.getByRole('button', { name: 'send' }).click())
    await act(() => vi.advanceTimersByTimeAsync(100))

    expect(infoRequests(ports.output)).toHaveLength(1)
    expect(ports.output.sendSysex).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toBe(
      'Track 1 runs 303, which cannot take a patch, so nothing was sent. Set track 1 to DX7 on the FM1, or choose the note channel of a track that runs DX7.',
    )
  })

  it('sends nothing, and reads nothing, on a channel that reaches no track', async () => {
    const ports = officialOpenFm1(capturedEngines)
    const { result } = await connect(8)

    await expect(send(result)).resolves.toBe(false)

    expect(infoRequests(ports.output)).toHaveLength(0)
    expect(ports.output.sendSysex).not.toHaveBeenCalled()
    expect(result.current.trackDelivery?.delivery).toEqual({ channel: 8, type: 'no-track' })
  })

  it('sends nothing when the FM1 does not say which engine the track runs', async () => {
    const ports = officialOpenFm1()
    const { result } = await connect(3)

    await expect(send(result, 2_100)).resolves.toBe(false)
    expect(infoRequests(ports.output)).toHaveLength(2)
    expect(ports.output.sendSysex).not.toHaveBeenCalled()
    expect(result.current.trackDelivery?.delivery).toEqual({
      channel: 3,
      track: 3,
      type: 'unread',
    })
  })

  it('cancels a read in flight, and sends nothing, when the output changes', async () => {
    const ports = officialOpenFm1()
    const { result } = await connect(3)

    let sent: Promise<boolean> | undefined
    act(() => {
      sent = result.current.sendVoice(voice)
    })
    await act(() => vi.advanceTimersByTimeAsync(100))
    act(() => result.current.setSelectedOutputId(''))
    await act(() => vi.advanceTimersByTimeAsync(2_000))

    await expect(act(async () => sent)).resolves.toBe(false)
    expect(infoRequests(ports.output)).toHaveLength(1)
    expect(ports.output.sendSysex).not.toHaveBeenCalled()
    expect(result.current.trackDelivery).toBeNull()
  })

  it('sends no parameter changes, which Official Open drops', async () => {
    const ports = officialOpenFm1(capturedEngines)
    const { result } = await connect(3)

    await send(result)

    expect(ports.output.sendSysex.mock.calls.filter(([, payload]) => payload[0] === 0x10)).toEqual(
      [],
    )
  })
})
