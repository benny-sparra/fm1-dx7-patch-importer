// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { unpackDx7Voice } from '@/lib/dx7'
import { fm1IdentityQuery } from '@/lib/fm1-firmware'
import { makeFm1ParameterPayload } from '@/lib/midi'
import { makeDemoVoices } from '@/lib/patch-library'
import { fm1VaIdentityReply, makeFakeFm1Ports, mvaveIdentityReply } from '@/test/fake-fm1-midi'

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

beforeEach(() => {
  // The identity query waits a second for each answer and a patch sent as parameter changes takes
  // several seconds through the transfer queue, so time is simulated.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  localStorage.clear()
  Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: vi.fn() })
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
  webMidi.addListener.mockClear()
  webMidi.inputs = []
  webMidi.outputs = []
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  delete window.umami
})

async function connect(ports: { input?: unknown; output: unknown }) {
  webMidi.inputs = ports.input ? [ports.input] : []
  webMidi.outputs = [ports.output]
  const hook = renderHook(() => useMidi())
  await act(() => hook.result.current.connectMidi())
  return hook
}

function identityQueries(output: ReturnType<typeof makeFakeFm1Ports>['output']) {
  return output.send.mock.calls.filter(([data]) => data[1] === 0x00 && data[2] === 0x32)
}

function logMessages(result: { current: ReturnType<typeof useMidi> }) {
  return result.current.logStore.getSnapshot().map(({ direction, message }) => [direction, message])
}

describe('useMidi firmware identification', () => {
  it('asks the FM1 which firmware it runs with the identity query', async () => {
    const ports = makeFakeFm1Ports({ reply: mvaveIdentityReply })

    await connect(ports)

    expect(ports.output.send).toHaveBeenCalledExactlyOnceWith(fm1IdentityQuery)
  })

  it('identifies M-VAVE firmware from its answer', async () => {
    const { result } = await connect(makeFakeFm1Ports({ reply: mvaveIdentityReply }))

    expect(result.current.firmware).toEqual({ identity: 'FM-1_015', kind: 'mvave' })
    expect(logMessages(result)).toContainEqual([
      'system',
      'The FM1 runs M-VAVE firmware FM-1_015. Patches go to its edit buffer.',
    ])
  })

  it('identifies FM-1+VA firmware from its answer', async () => {
    const { result } = await connect(makeFakeFm1Ports({ reply: fm1VaIdentityReply }))

    expect(result.current.firmware).toEqual({ identity: 'FM-1_089', kind: 'fm1-va' })
  })

  it('stays checking until the FM1 answers', async () => {
    const { result } = await connect(makeFakeFm1Ports())

    expect(result.current.firmware).toEqual({ kind: 'checking' })
  })

  it('asks three times, a second apart, then leaves an FM1 that does not answer unidentified', async () => {
    const ports = makeFakeFm1Ports()
    const { result } = await connect(ports)

    await act(() => vi.advanceTimersByTimeAsync(3000))

    expect(identityQueries(ports.output)).toHaveLength(3)
    expect(result.current.firmware).toEqual({ kind: 'unidentified' })
  })

  it('does not ask without an input to hear the answer', async () => {
    const { output } = makeFakeFm1Ports({ reply: mvaveIdentityReply })
    const { result } = await connect({ output })

    expect(output.send).not.toHaveBeenCalled()
    expect(result.current.firmware).toEqual({ kind: 'unidentified' })
  })

  it('asks again when the FM1 reconnects, as it may have been updated while away', async () => {
    const { result } = await connect(makeFakeFm1Ports({ reply: mvaveIdentityReply }))
    const updated = makeFakeFm1Ports({ reply: fm1VaIdentityReply })
    webMidi.inputs = [updated.input]
    webMidi.outputs = [updated.output]
    const portsChanged = webMidi.addListener.mock.calls.findLast(
      ([event]) => event === 'portschanged',
    )

    act(() => portsChanged?.[1]())

    expect(updated.output.send).toHaveBeenCalledWith(fm1IdentityQuery)
    expect(result.current.firmware).toEqual({ identity: 'FM-1_089', kind: 'fm1-va' })
  })
})

describe('useMidi firmware analytics', () => {
  function trackFirmwareEvents() {
    const track = vi.fn()
    window.umami = { track }
    return () => track.mock.calls.filter(([name]) => name === 'fm1_identified')
  }

  it('reports M-VAVE firmware by its family, without its name', async () => {
    const firmwareEvents = trackFirmwareEvents()

    await connect(makeFakeFm1Ports({ reply: mvaveIdentityReply }))

    expect(firmwareEvents()).toEqual([['fm1_identified', { firmware: 'mvave' }]])
  })

  it('reports FM-1+VA firmware by its family, without its name', async () => {
    const firmwareEvents = trackFirmwareEvents()

    await connect(makeFakeFm1Ports({ reply: fm1VaIdentityReply }))

    expect(firmwareEvents()).toEqual([['fm1_identified', { firmware: 'fm1-va' }]])
  })

  it('reports nothing while the FM1 has not answered', async () => {
    const firmwareEvents = trackFirmwareEvents()

    await connect(makeFakeFm1Ports())

    expect(firmwareEvents()).toEqual([])
  })

  it('reports an FM1 that never answers as unidentified, once', async () => {
    const firmwareEvents = trackFirmwareEvents()

    await connect(makeFakeFm1Ports())
    await act(() => vi.advanceTimersByTimeAsync(3000))

    expect(firmwareEvents()).toEqual([['fm1_identified', { firmware: 'unidentified' }]])
  })

  it('reports each firmware family once per page load, however often the FM1 reconnects', async () => {
    const firmwareEvents = trackFirmwareEvents()
    await connect(makeFakeFm1Ports({ reply: mvaveIdentityReply }))
    const portsChanged = webMidi.addListener.mock.calls.findLast(
      ([event]) => event === 'portschanged',
    )

    for (const reply of [mvaveIdentityReply, fm1VaIdentityReply, mvaveIdentityReply]) {
      const reconnected = makeFakeFm1Ports({ reply })
      webMidi.inputs = [reconnected.input]
      webMidi.outputs = [reconnected.output]
      act(() => portsChanged?.[1]())
    }

    expect(firmwareEvents()).toEqual([
      ['fm1_identified', { firmware: 'mvave' }],
      ['fm1_identified', { firmware: 'fm1-va' }],
    ])
  })

  it('reports nothing without an input, as the FM1 was never asked', async () => {
    const firmwareEvents = trackFirmwareEvents()
    const { output } = makeFakeFm1Ports({ reply: mvaveIdentityReply })

    await connect({ output })

    expect(firmwareEvents()).toEqual([])
  })
})

describe('useMidi patch sends by firmware', () => {
  it('sends a patch to FM-1+VA as its 155 parameter changes, not a single-voice dump', async () => {
    const ports = makeFakeFm1Ports({ reply: fm1VaIdentityReply })
    const { result } = await connect(ports)

    const sent = result.current.sendVoice(voice)
    await act(() => vi.advanceTimersByTimeAsync(10_000))

    await expect(sent).resolves.toBe(true)
    const values = unpackDx7Voice(voice)
    expect(ports.output.sendSysex.mock.calls).toEqual(
      Array.from(values, (value, parameter) => [0x43, makeFm1ParameterPayload(parameter, value)]),
    )
    expect(logMessages(result)).toContainEqual([
      'out',
      `Sent ${voice.name} as parameter changes, an unsaved edit of the selected preset. Save on the FM1 to store it.`,
    ])
  })

  it('sends a patch as parameter changes while the firmware is still being checked', async () => {
    const ports = makeFakeFm1Ports()
    const { result } = await connect(ports)

    const sent = result.current.sendVoice(voice)
    await act(() => vi.advanceTimersByTimeAsync(10_000))

    await expect(sent).resolves.toBe(true)
    expect(ports.output.sendSysex).toHaveBeenCalledTimes(155)
    expect(ports.output.sendSysex.mock.calls.every(([, payload]) => payload[0] === 0x10)).toBe(true)
  })

  it('sends a patch as parameter changes to an FM1 that could not be identified', async () => {
    const { output } = makeFakeFm1Ports()
    const { result } = await connect({ output })

    const sent = result.current.sendVoice(voice)
    await act(() => vi.advanceTimersByTimeAsync(10_000))

    await expect(sent).resolves.toBe(true)
    expect(output.sendSysex).toHaveBeenCalledTimes(155)
  })

  it('lets a newer patch replace the parameter changes of one still waiting to be sent', async () => {
    const ports = makeFakeFm1Ports({ reply: fm1VaIdentityReply })
    const { result } = await connect(ports)
    const [first, second] = makeDemoVoices()

    const sentFirst = result.current.sendVoice(first)
    const sentSecond = result.current.sendVoice(second)
    await act(() => vi.advanceTimersByTimeAsync(20_000))

    await expect(Promise.all([sentFirst, sentSecond])).resolves.toEqual([true, true])
    // Only the first patch's first parameter went out before the second patch arrived. The second
    // replaced every change still waiting, so the FM1 ends with the second patch, not a mixture.
    expect(ports.output.sendSysex.mock.calls.length).toBeLessThan(2 * 155)
    const last = new Map(
      ports.output.sendSysex.mock.calls.map(([, payload]) => [
        payload[1] * 128 + payload[2],
        payload[3],
      ]),
    )
    expect(Array.from({ length: 155 }, (_, parameter) => last.get(parameter))).toEqual([
      ...unpackDx7Voice(second),
    ])
  })
})
