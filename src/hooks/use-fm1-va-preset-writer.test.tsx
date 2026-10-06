// @vitest-environment jsdom

import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { packDx7Voice } from '@/lib/dx7'
import type { Fm1Firmware } from '@/lib/fm1-firmware'
import { FM1_VOICE_PARAMETER_COUNT } from '@/lib/fm1-parameters'
import { fm1VaPresetPayloadStart, readFm1VaMessageRecord } from '@/lib/fm1-va-preset-message'
import { Fm1VaPresetWriteError } from '@/lib/fm1-va-preset-write'
import { midiActivity } from '@/lib/midi-activity'
import { MidiLogStore } from '@/lib/midi-log-store'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { capturedOrgan3 } from '@/test/fm1-va-captures'

import { useFm1VaPresetWriter } from './use-fm1-va-preset-writer'

type Midi = Parameters<typeof useFm1VaPresetWriter>[0]

beforeEach(() => {
  // Writes are spaced and listen for a while after sending, so time is simulated.
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// ORGAN 3, preset 001, as FM-1+VA's own backup writes it.
const voice = packDx7Voice(
  capturedOrgan3.slice(
    fm1VaPresetPayloadStart,
    fm1VaPresetPayloadStart + FM1_VOICE_PARAMETER_COUNT,
  ),
).data
const record = readFm1VaMessageRecord(capturedOrgan3)

function makeMidi(
  ports: ReturnType<typeof makeFakeFm1Ports>,
  firmware: Fm1Firmware = { identity: 'FM-1_093', kind: 'fm1-va' },
): Midi {
  return {
    firmware,
    logStore: new MidiLogStore([]),
    sysexAvailable: true,
    ...makeFakeFm1Devices(ports),
  }
}

async function problemOf(write: Promise<unknown>) {
  const error = await write.then(
    () => null,
    (caught: unknown) => caught,
  )
  expect(error).toBeInstanceOf(Fm1VaPresetWriteError)
  return (error as Fm1VaPresetWriteError).problem
}

describe('useFm1VaPresetWriter', () => {
  it('writes a preset through the selected output and logs it', async () => {
    const ports = makeFakeFm1Ports()
    const midi = makeMidi(ports)
    const { result } = renderHook(() => useFm1VaPresetWriter(midi))

    const write = result.current.writePreset(0, voice, record)
    await vi.advanceTimersByTimeAsync(1500)
    await write

    expect(ports.output.send).toHaveBeenCalledExactlyOnceWith(capturedOrgan3)
    expect(midi.logStore.getSnapshot().map(({ message }) => message)).toEqual([
      'Wrote stored preset 001 to the FM1.',
    ])
  })

  it('lights the OUT activity LED as it writes a preset', async () => {
    const signal = vi.spyOn(midiActivity, 'signal')
    const midi = makeMidi(makeFakeFm1Ports())
    const { result } = renderHook(() => useFm1VaPresetWriter(midi))

    const write = result.current.writePreset(0, voice, record)
    await vi.advanceTimersByTimeAsync(1500)
    await write

    expect(signal).toHaveBeenCalledExactlyOnceWith('out')
    signal.mockRestore()
  })

  it('can write only to FM-1+VA FM-1_079 or later', () => {
    const ports = makeFakeFm1Ports()
    const firmwares: [Fm1Firmware, boolean][] = [
      [{ identity: 'FM-1_079', kind: 'fm1-va' }, true],
      [{ identity: 'FM-1_078', kind: 'fm1-va' }, false],
      [{ identity: 'FM-1_015', kind: 'mvave' }, false],
      [{ kind: 'checking' }, false],
    ]

    for (const [firmware, canWrite] of firmwares) {
      const { result } = renderHook(() => useFm1VaPresetWriter(makeMidi(ports, firmware)))
      expect(result.current.canWrite).toBe(canWrite)
    }
  })

  it('sends nothing to firmware other than FM-1+VA', async () => {
    const ports = makeFakeFm1Ports()
    const midi = makeMidi(ports, { identity: 'FM-1_015', kind: 'mvave' })
    const { result } = renderHook(() => useFm1VaPresetWriter(midi))

    expect(await problemOf(result.current.writePreset(0, voice, record))).toBe('unavailable')
    expect(ports.output.send).not.toHaveBeenCalled()
  })

  it('sends nothing without SysEx', async () => {
    const ports = makeFakeFm1Ports()
    const midi = { ...makeMidi(ports), sysexAvailable: false }
    const { result } = renderHook(() => useFm1VaPresetWriter(midi))

    expect(await problemOf(result.current.writePreset(0, voice, record))).toBe('unavailable')
    expect(ports.output.send).not.toHaveBeenCalled()
  })

  it('waits three seconds after one write before sending the next', async () => {
    const ports = makeFakeFm1Ports()
    const { result } = renderHook(() => useFm1VaPresetWriter(makeMidi(ports)))

    const first = result.current.writePreset(0, voice, record)
    await vi.advanceTimersByTimeAsync(1500)
    await first
    const second = result.current.writePreset(1, voice, record)
    await vi.advanceTimersByTimeAsync(1499)

    expect(ports.output.send).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1)
    expect(ports.output.send).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1500)
    await second
  })

  it('sends the next write at once, and resolves without listening, with the timing test’s settings', async () => {
    const ports = makeFakeFm1Ports()
    const { result } = renderHook(() =>
      useFm1VaPresetWriter(makeMidi(ports), { listenMs: 0, spacingMs: 0 }),
    )

    const first = result.current.writePreset(0, voice, record)
    await vi.advanceTimersByTimeAsync(0)
    await first
    const second = result.current.writePreset(1, voice, record)
    await vi.advanceTimersByTimeAsync(0)
    await second

    expect(ports.output.send).toHaveBeenCalledTimes(2)
  })

  it('on FM-1_096 resolves as soon as it sends, and sends the next write 320 ms after the last', async () => {
    const ports = makeFakeFm1Ports()
    const { result } = renderHook(() =>
      useFm1VaPresetWriter(makeMidi(ports, { identity: 'FM-1_096', kind: 'fm1-va' })),
    )

    // The first write goes at 0 ms and, with no reply to wait for, resolves by 1 ms.
    const first = result.current.writePreset(0, voice, record)
    await vi.advanceTimersByTimeAsync(1)
    await first
    const second = result.current.writePreset(1, voice, record)
    await vi.advanceTimersByTimeAsync(318)

    expect(ports.output.send).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1)
    expect(ports.output.send).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    await second
  })

  it('cancels a write still waiting its turn when the selected output changes', async () => {
    const ports = makeFakeFm1Ports()
    const other = makeFakeFm1Ports()
    other.output.id = 'other-out'
    const midi = makeMidi(ports)
    const { rerender, result } = renderHook((props: Midi) => useFm1VaPresetWriter(props), {
      initialProps: midi,
    })
    const first = result.current.writePreset(0, voice, record)
    await vi.advanceTimersByTimeAsync(1500)
    await first

    const waiting = problemOf(result.current.writePreset(1, voice, record))
    const { outputs } = makeFakeFm1Devices(other)
    rerender({ ...midi, outputs, selectedOutputId: 'other-out' })

    expect(await waiting).toBe('cancelled')
    expect(ports.output.send).toHaveBeenCalledOnce()
    expect(other.output.send).not.toHaveBeenCalled()
  })

  it('cancels a write still waiting its turn when unmounted', async () => {
    const ports = makeFakeFm1Ports()
    const { result, unmount } = renderHook(() => useFm1VaPresetWriter(makeMidi(ports)))
    const first = result.current.writePreset(0, voice, record)
    await vi.advanceTimersByTimeAsync(1500)
    await first

    const waiting = problemOf(result.current.writePreset(1, voice, record))
    unmount()

    expect(await waiting).toBe('cancelled')
    expect(ports.output.send).toHaveBeenCalledOnce()
  })
})
