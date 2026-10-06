import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { packDx7Voice } from '@/lib/dx7'
import { FM1_VOICE_PARAMETER_COUNT } from '@/lib/fm1-parameters'
import { fm1VaPresetPayloadStart, readFm1VaMessageRecord } from '@/lib/fm1-va-preset-message'
import type { Fm1VaLink } from '@/lib/fm1-va-preset-read'
import { capturedOrgan3 } from '@/test/fm1-va-captures'
import { makeFm1VaReply } from '@/test/fm1-va-replies'

import {
  Fm1VaPresetWriteError,
  fm1VaPresetWriteTiming,
  writeFm1VaPreset,
  writesFm1VaPresets,
} from './fm1-va-preset-write'

type Hear = Parameters<Fm1VaLink['listen']>[0]

function makeLink(send?: (message: Uint8Array) => void | Promise<void>) {
  const listeners = new Set<Hear>()
  const receive = (message: Uint8Array) => listeners.forEach((hear) => hear(Array.from(message)))
  const link = {
    listen: vi.fn((hear: Hear) => {
      listeners.add(hear)
      return () => listeners.delete(hear)
    }),
    send: vi.fn<(message: Uint8Array) => void | Promise<void>>(send ?? (() => {})),
  }
  return { link, listeners, receive }
}

// ORGAN 3, preset 001, as FM-1+VA's own backup writes it.
const voice = packDx7Voice(
  capturedOrgan3.slice(
    fm1VaPresetPayloadStart,
    fm1VaPresetPayloadStart + FM1_VOICE_PARAMETER_COUNT,
  ),
).data
const record = readFm1VaMessageRecord(capturedOrgan3)

describe('writesFm1VaPresets', () => {
  it('allows FM-1+VA from FM-1_079, the release that added the write', () => {
    expect(writesFm1VaPresets({ identity: 'FM-1_079', kind: 'fm1-va' })).toBe(true)
    expect(writesFm1VaPresets({ identity: 'FM-1_078', kind: 'fm1-va' })).toBe(false)
  })

  it('refuses M-VAVE’s firmware, Felucca, and an FM1 not yet identified', () => {
    expect(writesFm1VaPresets({ identity: 'FM-1_019', kind: 'mvave' })).toBe(false)
    expect(writesFm1VaPresets({ identity: 'FM-1_904', kind: 'felucca' })).toBe(false)
    expect(writesFm1VaPresets({ kind: 'checking' })).toBe(false)
    expect(writesFm1VaPresets({ kind: 'unidentified' })).toBe(false)
  })
})

describe('fm1VaPresetWriteTiming', () => {
  it('writes without waiting for a reply, 320 ms apart, from FM-1_096, where it was tested', () => {
    expect(fm1VaPresetWriteTiming({ identity: 'FM-1_096', kind: 'fm1-va' })).toEqual({
      listenMs: 0,
      spacingMs: 320,
    })
  })

  it('keeps the Presets page’s 3 s and the 1.5 s reply wait for earlier releases', () => {
    expect(fm1VaPresetWriteTiming({ identity: 'FM-1_094', kind: 'fm1-va' })).toEqual({
      listenMs: 1500,
      spacingMs: 3000,
    })
  })

  it('keeps the slower timing for any firmware not identified as FM-1+VA', () => {
    expect(fm1VaPresetWriteTiming({ kind: 'unidentified' })).toEqual({
      listenMs: 1500,
      spacingMs: 3000,
    })
  })
})

describe('writeFm1VaPreset', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends the preset write once, exactly as FM-1+VA’s backup holds it', async () => {
    const { link } = makeLink()

    const write = writeFm1VaPreset(link, 0, voice, record)
    await vi.advanceTimersByTimeAsync(1500)

    await expect(write).resolves.toEqual([])
    expect(link.send.mock.calls).toEqual([[capturedOrgan3]])
  })

  it('collects the FM-1+VA replies heard after the write, and nothing else', async () => {
    const { link, receive } = makeLink()
    const reply = makeFm1VaReply({ argument: 0 })

    const write = writeFm1VaPreset(link, 0, voice, record)
    await vi.advanceTimersByTimeAsync(0)
    receive(Uint8Array.of(0xf0, 0x43, 0x10, 0x01, 0x02, 0xf7))
    receive(reply)
    await vi.advanceTimersByTimeAsync(1500)

    await expect(write).resolves.toEqual([
      expect.objectContaining({ argument: 0, kind: 0x50, status: 0 }),
    ])
  })

  it('stops listening once the window has passed', async () => {
    const { link, listeners, receive } = makeLink()

    const write = writeFm1VaPreset(link, 0, voice, record, { listenMs: 500 })
    await vi.advanceTimersByTimeAsync(500)
    receive(makeFm1VaReply({ argument: 0 }))

    await expect(write).resolves.toEqual([])
    expect(listeners.size).toBe(0)
  })

  it('sends nothing when cancelled before it starts', async () => {
    const { link } = makeLink()

    const write = writeFm1VaPreset(link, 0, voice, record, { signal: AbortSignal.abort() })

    await expect(write).rejects.toMatchObject({ problem: 'cancelled' })
    expect(link.send).not.toHaveBeenCalled()
  })

  it('resolves with what it heard when cancelled after sending, as the write cannot be undone', async () => {
    const { link, receive } = makeLink()
    const cancel = new AbortController()

    const write = writeFm1VaPreset(link, 0, voice, record, { signal: cancel.signal })
    await vi.advanceTimersByTimeAsync(0)
    receive(makeFm1VaReply({ argument: 0 }))
    cancel.abort()

    await expect(write).resolves.toHaveLength(1)
    expect(link.send).toHaveBeenCalledOnce()
  })

  it('rejects with a typed error when the write cannot be sent', async () => {
    const { link, listeners } = makeLink(() => Promise.reject(new Error('port closed')))

    const write = writeFm1VaPreset(link, 0, voice, record)

    await expect(write).rejects.toBeInstanceOf(Fm1VaPresetWriteError)
    await expect(write).rejects.toMatchObject({ problem: 'send-failed', slot: 0 })
    expect(listeners.size).toBe(0)
  })
})
