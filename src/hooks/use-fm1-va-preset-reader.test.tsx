// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Fm1VaPresetReadError, makeFm1VaPresetReadRequest } from '@/lib/fm1-va-preset-read'
import type { Fm1Firmware } from '@/lib/fm1-firmware'
import { MidiLogStore } from '@/lib/midi-log-store'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { makeFm1VaPresetReply } from '@/test/fm1-va-replies'

import { useFm1VaPresetReader } from './use-fm1-va-preset-reader'

type Midi = Parameters<typeof useFm1VaPresetReader>[0]

beforeEach(() => {
  // A read waits for its answer and asks again after a timeout, so time is simulated.
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

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

async function problemOf(read: Promise<unknown>) {
  const error = await read.then(
    () => null,
    (caught: unknown) => caught,
  )
  expect(error).toBeInstanceOf(Fm1VaPresetReadError)
  return (error as Fm1VaPresetReadError).problem
}

describe('useFm1VaPresetReader', () => {
  it('reads a stored preset through the selected ports and logs it', async () => {
    const ports = makeFakeFm1Ports({ presetReply: makeFm1VaPresetReply })
    const midi = makeMidi(ports)
    const { result } = renderHook(() => useFm1VaPresetReader(midi))

    const preset = await result.current.readPreset(96)

    expect(ports.output.send).toHaveBeenCalledExactlyOnceWith(makeFm1VaPresetReadRequest(96))
    expect(preset.slot).toBe(96)
    // The log lists the newest entry first.
    expect(midi.logStore.getSnapshot().map(({ message }) => message)).toEqual([
      'Read stored preset 097 from the FM1.',
      'Asked the FM1 for stored preset 097.',
    ])
  })

  it('can read only from FM-1+VA FM-1_079 or later', () => {
    const ports = makeFakeFm1Ports()
    const firmwares: [Fm1Firmware, boolean][] = [
      [{ identity: 'FM-1_079', kind: 'fm1-va' }, true],
      [{ identity: 'FM-1_078', kind: 'fm1-va' }, false],
      [{ identity: 'FM-1_015', kind: 'mvave' }, false],
      [{ kind: 'checking' }, false],
    ]

    for (const [firmware, canRead] of firmwares) {
      const { result } = renderHook(() => useFm1VaPresetReader(makeMidi(ports, firmware)))
      expect(result.current.canRead).toBe(canRead)
    }
  })

  it('sends nothing to firmware other than FM-1+VA', async () => {
    const ports = makeFakeFm1Ports({ presetReply: makeFm1VaPresetReply })
    const midi = makeMidi(ports, { identity: 'FM-1_015', kind: 'mvave' })
    const { result } = renderHook(() => useFm1VaPresetReader(midi))

    expect(await problemOf(result.current.readPreset(0))).toBe('unavailable')
    expect(ports.output.send).not.toHaveBeenCalled()
  })

  it('sends nothing without SysEx', async () => {
    const ports = makeFakeFm1Ports({ presetReply: makeFm1VaPresetReply })
    const midi = { ...makeMidi(ports), sysexAvailable: false }
    const { result } = renderHook(() => useFm1VaPresetReader(midi))

    expect(await problemOf(result.current.readPreset(0))).toBe('unavailable')
    expect(ports.output.send).not.toHaveBeenCalled()
  })

  it('cancels a read when the selected output changes', async () => {
    const ports = makeFakeFm1Ports()
    const other = makeFakeFm1Ports()
    other.output.id = 'other-out'
    const midi = makeMidi(ports)
    const { rerender, result } = renderHook((props: Midi) => useFm1VaPresetReader(props), {
      initialProps: midi,
    })

    const read = problemOf(result.current.readPreset(0))
    const { outputs } = makeFakeFm1Devices(other)
    rerender({ ...midi, outputs, selectedOutputId: 'other-out' })

    expect(await read).toBe('cancelled')
    expect(ports.input.removeListener).toHaveBeenCalled()
  })

  it('cancels a read when unmounted', async () => {
    const ports = makeFakeFm1Ports()
    const { result, unmount } = renderHook(() => useFm1VaPresetReader(makeMidi(ports)))

    const read = problemOf(result.current.readPreset(0))
    unmount()

    expect(await read).toBe('cancelled')
  })

  it('cancels a read when the caller aborts it', async () => {
    const ports = makeFakeFm1Ports()
    const { result } = renderHook(() => useFm1VaPresetReader(makeMidi(ports)))
    const controller = new AbortController()

    const read = problemOf(result.current.readPreset(0, controller.signal))
    act(() => controller.abort())

    expect(await read).toBe('cancelled')
    expect(ports.output.send).toHaveBeenCalledOnce()
  })

  it('logs why a read failed', async () => {
    const ports = makeFakeFm1Ports()
    const midi = makeMidi(ports)
    const { result } = renderHook(() => useFm1VaPresetReader(midi))

    const read = problemOf(result.current.readPreset(0))
    await act(() => vi.advanceTimersByTimeAsync(4500))

    expect(await read).toBe('no-reply')
    expect(midi.logStore.getSnapshot()[0].message).toBe(
      'The FM1 did not answer the read of preset 001.',
    )
  })
})
