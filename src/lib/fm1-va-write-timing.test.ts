import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fm1VaStoredVoice } from '@/lib/fm1-va-preset-message'
import type { Fm1VaStoredPreset } from '@/lib/fm1-va-preset-read'
import { makeStoredPresetData } from '@/test/fm1-va-replies'

import { fm1VaWriteTimings, runFm1VaWriteTiming } from './fm1-va-write-timing'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/** A preset as the FM1 stores it, so its voice holds only the bits a write keeps. */
function storedPreset(slot: number): Fm1VaStoredPreset {
  const { record, voice } = makeStoredPresetData()
  return {
    record: Uint8Array.from(record),
    reply: new Uint8Array(),
    slot,
    voice: fm1VaStoredVoice(Uint8Array.from(voice)),
  }
}

/** An FM1 that stores each write as a write stores it, with every read and write taking `takesMs`. */
function fakeFm1(takesMs = 0) {
  const stored = new Map<number, Fm1VaStoredPreset>()
  const events: string[] = []
  const later = () => new Promise((resolve) => setTimeout(resolve, takesMs))
  return {
    events,
    read: vi.fn(async (slot: number) => {
      await later()
      events.push(`read ${slot} at ${Date.now()}`)
      return stored.get(slot) ?? storedPreset(slot)
    }),
    stored,
    write: vi.fn(async (slot: number, voice: Uint8Array, record: Uint8Array) => {
      events.push(`write ${slot} at ${Date.now()}`)
      await later()
      stored.set(slot, { record, reply: new Uint8Array(), slot, voice: fm1VaStoredVoice(voice) })
    }),
  }
}

describe('runFm1VaWriteTiming', () => {
  it('writes each preset back as read, reads it back at once, and waits the gap before the next', async () => {
    vi.setSystemTime(0)
    const fm1 = fakeFm1(10)

    const run = runFm1VaWriteTiming([storedPreset(96), storedPreset(97)], {
      gapMs: 120,
      read: fm1.read,
      write: fm1.write,
    })
    await vi.runAllTimersAsync()

    expect(fm1.events).toEqual([
      'write 96 at 0',
      'read 96 at 20',
      'write 97 at 140',
      'read 97 at 160',
    ])
    expect(await run).toEqual([
      { matches: true, readBackMs: 20, sentAtMs: 0, slot: 96 },
      { matches: true, readBackMs: 20, sentAtMs: 140, slot: 97 },
    ])
  })

  it('stops after the first preset that does not read back as written', async () => {
    const fm1 = fakeFm1()
    fm1.read.mockImplementationOnce(async (slot) => {
      const preset = storedPreset(slot)
      preset.record[0] ^= 1
      return preset
    })

    const run = runFm1VaWriteTiming([storedPreset(0), storedPreset(1)], {
      gapMs: 0,
      read: fm1.read,
      write: fm1.write,
    })
    await vi.runAllTimersAsync()

    expect((await run).map(({ matches }) => matches)).toEqual([false])
    expect(fm1.write).toHaveBeenCalledOnce()
  })

  it('compares the voice as the FM1 stores it, without bits its layout does not keep', async () => {
    const fm1 = fakeFm1()
    const preset = storedPreset(0)
    // Bits 4 to 6 of a packed voice's byte 11 hold nothing; the FM1 stores them clear.
    preset.voice[11] |= 0x40

    const run = runFm1VaWriteTiming([preset], { gapMs: 0, read: fm1.read, write: fm1.write })
    await vi.runAllTimersAsync()

    expect((await run)[0].matches).toBe(true)
  })

  it('sends no further write once stopped, still reading back the one already sent', async () => {
    const fm1 = fakeFm1()
    const stop = new AbortController()
    const onResult = vi.fn(() => stop.abort())

    const run = runFm1VaWriteTiming([storedPreset(0), storedPreset(1), storedPreset(2)], {
      gapMs: 500,
      onResult,
      read: fm1.read,
      signal: stop.signal,
      write: fm1.write,
    })
    await vi.runAllTimersAsync()

    expect(await run).toHaveLength(1)
    expect(fm1.write).toHaveBeenCalledOnce()
    expect(fm1.read).toHaveBeenCalledOnce()
  })
})

describe('fm1VaWriteTimings', () => {
  it('names each timing once', () => {
    const ids = fm1VaWriteTimings.map(({ id }) => id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('starts from today’s timing, then reads back at once with a shorter gap each run', () => {
    const [today, ...faster] = fm1VaWriteTimings

    expect(today).toMatchObject({ id: 'T1', listenMs: 1500 })
    expect(faster.every(({ listenMs }) => listenMs === 0)).toBe(true)
    expect(faster.map(({ gapMs }) => gapMs)).toEqual([1000, 500, 250, 120, 0])
  })
})
