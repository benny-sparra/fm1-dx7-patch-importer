import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { packDx7Voice } from '@/lib/dx7'
import {
  capturedOrgan3,
  capturedOrgan3Reply,
  capturedVirtualAnalog,
  capturedVirtualAnalogFilterOnReply,
} from '@/test/fm1-va-captures'
import { makeFm1VaPresetReply, makeFm1VaReply, makeStoredPresetData } from '@/test/fm1-va-replies'

import {
  Fm1VaPresetReadError,
  makeFm1VaPresetReadRequest,
  readFm1VaPreset,
  readsFm1VaPresets,
  type Fm1VaLink,
} from './fm1-va-preset-read'

type Hear = Parameters<Fm1VaLink['listen']>[0]

function makeLink(answer?: (request: Uint8Array) => Uint8Array | undefined) {
  const listeners = new Set<Hear>()
  const receive = (message: Uint8Array) => listeners.forEach((hear) => hear(Array.from(message)))
  const link = {
    listen: vi.fn((hear: Hear) => {
      listeners.add(hear)
      return () => listeners.delete(hear)
    }),
    send: vi.fn<(message: Uint8Array) => void | Promise<void>>((request) => {
      const reply = answer?.(request)
      if (reply) receive(reply)
    }),
  }
  return { link, listeners, receive }
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  )
  expect(error).toBeInstanceOf(Fm1VaPresetReadError)
  return error as Fm1VaPresetReadError
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('makeFm1VaPresetReadRequest', () => {
  it('asks for a slot with a checksum over the command and the slot', () => {
    expect(makeFm1VaPresetReadRequest(0)).toEqual(
      Uint8Array.of(0xf0, 0x43, 0x00, 0x7d, 0x10, 0x00, 0x6e, 0xf7),
    )
    expect(makeFm1VaPresetReadRequest(127)).toEqual(
      Uint8Array.of(0xf0, 0x43, 0x00, 0x7d, 0x10, 0x7f, 0x6f, 0xf7),
    )
  })

  it('refuses a slot outside 0 to 127', () => {
    expect(() => makeFm1VaPresetReadRequest(128)).toThrow(RangeError)
    expect(() => makeFm1VaPresetReadRequest(-1)).toThrow(RangeError)
    expect(() => makeFm1VaPresetReadRequest(1.5)).toThrow(RangeError)
  })
})

/**
 * The record in a backup's preset message, out of its 8-into-7 groups. Each group's first byte
 * carries the high bits of the seven after it, bit k for byte k (docs/fm1-research.md).
 */
function backupRecord(message: Uint8Array) {
  const groups = message.subarray(161, 229)
  return Uint8Array.from({ length: 59 }, (_, index) => {
    const group = Math.floor(index / 7) * 8
    const bit = index % 7
    return groups[group + 1 + bit] | (((groups[group] >> bit) & 1) << 7)
  })
}

describe('readFm1VaPreset', () => {
  it('reads the preset FM-1_093 sent as the backup holds it', async () => {
    const { link } = makeLink(() => capturedOrgan3Reply)

    const preset = await readFm1VaPreset(link, 0)

    expect(preset.voice).toEqual(packDx7Voice(capturedOrgan3.slice(6, 161)).data)
    expect(preset.record).toEqual(backupRecord(capturedOrgan3))
  })

  it('reads a Virtual Analog record as its backup holds it, with each high bit in place', async () => {
    const { link } = makeLink(() => capturedVirtualAnalogFilterOnReply)

    const preset = await readFm1VaPreset(link, 96)

    // Switching the Filter on between the backup and the read set record byte 28 alone.
    const expected = backupRecord(capturedVirtualAnalog)
    expected[28] = 0x01
    expect(preset.record).toEqual(expected)
    expect(preset.voice).toEqual(packDx7Voice(capturedVirtualAnalog.slice(6, 161)).data)
  })

  it('reads record byte 18 of a captured FM preset as 03', async () => {
    const { link } = makeLink(() => capturedOrgan3Reply)

    expect((await readFm1VaPreset(link, 0)).record[18]).toBe(0x03)
  })

  it('resolves with the voice and record exactly as read', async () => {
    const { link } = makeLink(() => makeFm1VaPresetReply(5))

    const preset = await readFm1VaPreset(link, 5)

    const { record, voice } = makeStoredPresetData()
    expect(preset.slot).toBe(5)
    expect(preset.voice).toEqual(Uint8Array.from(voice))
    expect(preset.record).toEqual(Uint8Array.from(record))
    expect(preset.reply).toEqual(makeFm1VaPresetReply(5))
  })

  it('stops listening once the preset arrives', async () => {
    const { link, listeners } = makeLink(() => makeFm1VaPresetReply(5))

    await readFm1VaPreset(link, 5)

    expect(listeners.size).toBe(0)
  })

  it('ignores a reply for another slot', async () => {
    const { link, receive } = makeLink()
    const read = readFm1VaPreset(link, 5)

    receive(makeFm1VaPresetReply(6))
    receive(makeFm1VaPresetReply(5, 1))

    expect((await read).voice[0]).toBe(1)
  })

  it('asks again when no answer comes in time', async () => {
    const { link, receive } = makeLink()
    const read = readFm1VaPreset(link, 5, { timeoutMs: 1000 })

    await vi.advanceTimersByTimeAsync(1000)
    receive(makeFm1VaPresetReply(5))

    await expect(read).resolves.toMatchObject({ slot: 5 })
    expect(link.send).toHaveBeenCalledTimes(2)
  })

  it('gives up after the last attempt goes unanswered', async () => {
    const { link, listeners } = makeLink()
    const read = rejection(readFm1VaPreset(link, 5, { attempts: 3, timeoutMs: 1000 }))

    await vi.advanceTimersByTimeAsync(3000)

    expect((await read).problem).toBe('no-reply')
    expect(link.send).toHaveBeenCalledTimes(3)
    expect(listeners.size).toBe(0)
  })

  it('asks again when the FM1 says the request arrived damaged', async () => {
    let answers = 0
    const { link } = makeLink(() =>
      answers++ === 0 ? makeFm1VaReply({ argument: 5, status: 2 }) : makeFm1VaPresetReply(5),
    )

    await expect(readFm1VaPreset(link, 5)).resolves.toMatchObject({ slot: 5 })
    expect(link.send).toHaveBeenCalledTimes(2)
  })

  it('reports a refused read', async () => {
    const { link } = makeLink(() => makeFm1VaReply({ argument: 5, status: 1 }))

    expect((await rejection(readFm1VaPreset(link, 5))).problem).toBe('refused')
  })

  it('reports an FM1 too busy to read', async () => {
    const { link } = makeLink(() => makeFm1VaReply({ argument: 5, status: 3 }))

    expect((await rejection(readFm1VaPreset(link, 5))).problem).toBe('busy')
  })

  it('reports a preset of a size it does not know rather than asking again', async () => {
    const { link } = makeLink(() => makeFm1VaReply({ argument: 5, data: [1, 2, 3] }))

    expect((await rejection(readFm1VaPreset(link, 5))).problem).toBe('unexpected')
    expect(link.send).toHaveBeenCalledOnce()
  })

  it('reports a request that could not be sent', async () => {
    const { link, listeners } = makeLink()
    link.send.mockRejectedValueOnce(new Error('output gone'))

    expect((await rejection(readFm1VaPreset(link, 5))).problem).toBe('send-failed')
    expect(listeners.size).toBe(0)
  })

  it('stops listening and asking when cancelled', async () => {
    const { link, listeners } = makeLink()
    const controller = new AbortController()
    const read = rejection(readFm1VaPreset(link, 5, { signal: controller.signal }))

    controller.abort()
    await vi.advanceTimersByTimeAsync(5000)

    expect((await read).problem).toBe('cancelled')
    expect(link.send).toHaveBeenCalledOnce()
    expect(listeners.size).toBe(0)
  })

  it('sends nothing when already cancelled', async () => {
    const { link } = makeLink()
    const controller = new AbortController()
    controller.abort()

    expect((await rejection(readFm1VaPreset(link, 5, { signal: controller.signal }))).problem).toBe(
      'cancelled',
    )
    expect(link.send).not.toHaveBeenCalled()
  })
})

describe('readsFm1VaPresets', () => {
  it('reads presets on FM-1+VA from FM-1_079, the release that added the read', () => {
    expect(readsFm1VaPresets({ identity: 'FM-1_079', kind: 'fm1-va' })).toBe(true)
    expect(readsFm1VaPresets({ identity: 'FM-1_093', kind: 'fm1-va' })).toBe(true)
  })

  it('does not read presets on an FM-1+VA release before FM-1_079', () => {
    expect(readsFm1VaPresets({ identity: 'FM-1_078', kind: 'fm1-va' })).toBe(false)
  })

  it('does not read presets on any other firmware, or before the firmware is known', () => {
    expect(readsFm1VaPresets({ identity: 'FM-1_015', kind: 'mvave' })).toBe(false)
    expect(readsFm1VaPresets({ identity: 'FM-1_904', kind: 'unidentified' })).toBe(false)
    expect(readsFm1VaPresets({ kind: 'unidentified' })).toBe(false)
    expect(readsFm1VaPresets({ kind: 'checking' })).toBe(false)
  })
})
