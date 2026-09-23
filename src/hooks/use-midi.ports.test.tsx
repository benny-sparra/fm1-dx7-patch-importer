// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fm1EffectParameterCount } from '@/lib/fm1-effects'
import { makeDemoVoices } from '@/lib/patch-library'

import { useMidi } from './use-midi'

const reportBankTransferFailure = vi.hoisted(() => vi.fn())

const webMidi = vi.hoisted(() => ({
  addListener: vi.fn((_event: string, _listener: () => void) => ({ remove: vi.fn() })),
  disable: vi.fn(async () => undefined),
  enable: vi.fn(async () => undefined),
  inputs: [] as unknown[],
  outputs: [] as unknown[],
  sysexEnabled: true,
}))

vi.mock('webmidi', () => ({ WebMidi: webMidi }))
vi.mock('@/lib/monitoring', () => ({ reportBankTransferFailure }))

function makeOutput(id: string, name = id) {
  return {
    id,
    manufacturer: 'Maker',
    name,
    sendControlChange: vi.fn(),
    sendNoteOn: vi.fn(),
    sendSysex: vi.fn(),
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
  reportBankTransferFailure.mockReset()
})

afterEach(cleanup)

async function connect() {
  const hook = renderHook(() => useMidi())
  await act(() => hook.result.current.connectMidi())
  await waitFor(() => expect(hook.result.current.hasMidiOutput).toBe(true))
  return hook
}

function changePorts(outputs: unknown[]) {
  webMidi.outputs = outputs
  const listener = webMidi.addListener.mock.calls.findLast(([event]) => event === 'portschanged')
  act(() => listener?.[1]())
}

describe('useMidi port changes', () => {
  it('sends notes to the instrument rather than the Linux MIDI Through port on first connection', async () => {
    const through = makeOutput('14:0', 'Midi Through Port-0')
    const fm1 = makeOutput('20:0', 'USB Composite Device')
    webMidi.outputs = [through, fm1]
    const { result } = await connect()

    act(() => result.current.startNote(60, 'C4'))

    expect(result.current.selectedOutputId).toBe('20:0')
    expect(fm1.sendNoteOn).toHaveBeenCalled()
    expect(through.sendNoteOn).not.toHaveBeenCalled()
  })

  it('does not move notes to another output when the selected output disconnects', async () => {
    const fm1 = makeOutput('fm1')
    const other = makeOutput('other')
    webMidi.outputs = [fm1, other]
    const { result } = await connect()

    changePorts([other])
    act(() => result.current.startNote(60, 'C4'))

    expect(result.current.selectedOutputId).toBe('')
    expect(result.current.hasMidiOutput).toBe(false)
    expect(other.sendNoteOn).not.toHaveBeenCalled()
  })

  it('selects the output again when it reconnects', async () => {
    const fm1 = makeOutput('fm1')
    const other = makeOutput('other')
    webMidi.outputs = [fm1, other]
    const { result } = await connect()

    changePorts([other])
    changePorts([other, fm1])

    expect(result.current.selectedOutputId).toBe('fm1')
  })
})

describe('useMidi queued messages', () => {
  it('drops effect messages still waiting when MIDI is switched off', async () => {
    const fm1 = makeOutput('fm1')
    webMidi.outputs = [fm1]
    const { result } = await connect()

    const sent = result.current.sendEffectSettings(new Uint8Array(fm1EffectParameterCount))
    await act(() => result.current.disconnectMidi())

    await expect(sent).resolves.toBe(false)
    expect(fm1.sendControlChange.mock.calls.length).toBeLessThan(fm1EffectParameterCount)
  })

  it('does not send waiting messages to a newly selected output', async () => {
    const fm1 = makeOutput('fm1')
    const other = makeOutput('other')
    webMidi.outputs = [fm1, other]
    const { result } = await connect()

    const sent = result.current.sendEffectSettings(new Uint8Array(fm1EffectParameterCount))
    act(() => result.current.setSelectedOutputId('other'))

    await expect(sent).resolves.toBe(false)
    expect(other.sendControlChange).not.toHaveBeenCalled()
  })

  it('keeps a bank dropped by switching MIDI off out of monitoring', async () => {
    const fm1 = makeOutput('fm1')
    webMidi.outputs = [fm1]
    const { result } = await connect()

    void result.current.sendEffectSettings(new Uint8Array(fm1EffectParameterCount))
    const bank = result.current.sendBank('A', makeDemoVoices())
    await act(() => result.current.disconnectMidi())

    await expect(bank).resolves.toEqual({ ok: false, reason: 'no_output' })
    expect(fm1.sendSysex).not.toHaveBeenCalled()
    expect(reportBankTransferFailure).not.toHaveBeenCalled()
  })

  it('logs a patch dropped by switching MIDI off as not sent', async () => {
    const fm1 = makeOutput('fm1')
    webMidi.outputs = [fm1]
    const { result } = await connect()
    const [voice] = makeDemoVoices()

    void result.current.sendEffectSettings(new Uint8Array(fm1EffectParameterCount))
    const sent = result.current.sendVoice(voice)
    await act(() => result.current.disconnectMidi())

    await expect(sent).resolves.toBe(false)
    expect(fm1.sendSysex).not.toHaveBeenCalled()
    expect(result.current.logStore.getSnapshot().map(({ message }) => message)).toContain(
      `${voice.name} was not sent. Queued MIDI messages were dropped because MIDI was switched off.`,
    )
  })
})
