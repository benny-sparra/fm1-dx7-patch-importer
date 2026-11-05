import { describe, expect, it, vi } from 'vitest'

import { capturedReplies, capturedReply, sentRack } from '@/test/v16-live-effects-captures'
import { frame, table, values } from '@/test/v16-live-effects-replies'
import { makeSettingsBlockReply } from '@/test/v16-settings-replies'
import {
  candidateEffectValues,
  makeV16LiveEffectsReadRequest,
  parseV16LiveEffectsReply,
  readV16LiveEffects,
  V16LiveEffectsReadError,
} from '@/lib/v16-live-effects'

// Every reply here is SYNTHETIC, made up from the research's layout, except those from
// `@/test/v16-live-effects-captures`, captured on the FM1 in the run of 2026-11-05.
const prefix = [5, 0x9c, 0, 0, 0, 54, 0, 0]

// The request's bytes worked out by hand with a separate packer, not by the module.
const REQUEST = [
  0xf0, 0x00, 0x32, 0x0d, 0x41, 0x00, 0x00, 0x40, 0x02, 0x1c, 0x01, 0x00, 0x00, 0x60, 0x06, 0x00,
  0x00, 0x28, 0x00, 0xf7,
]
const bare = frame([...values, ...table])
const echoed = frame([...prefix, ...values, ...table])

describe('the live FX read request', () => {
  it('is the one fixed command 0x23 on object 5 at offset 0x9C for 54 bytes', () => {
    expect(makeV16LiveEffectsReadRequest()).toEqual(frame(prefix))
    // F0, then 00 59 23 08 00 00 | 05 9C 00 00 00 36 00 00 | checksum, packed seven bits at a time.
    expect(Array.from(makeV16LiveEffectsReadRequest())).toEqual(REQUEST)
  })
})

describe('parseV16LiveEffectsReply', () => {
  it.each([
    ['bare', bare],
    ['echoed', echoed],
  ])('reads a %s reply, keeping every byte as sent', (_name, message) => {
    const answer = parseV16LiveEffectsReply(message)
    expect(answer?.type).toBe('reading')
    if (answer?.type !== 'reading') return
    expect(Array.from(answer.reading.values)).toEqual(values)
    expect(Array.from(answer.reading.table)).toEqual(table)
  })

  it('ignores messages that are not this read’s', () => {
    expect(parseV16LiveEffectsReply([0xf0, 0x7e, 0xf7])).toBeNull()
    expect(parseV16LiveEffectsReply(makeSettingsBlockReply(Array(176).fill(0)))).toBeNull()
    expect(parseV16LiveEffectsReply(frame([...values, ...table], 0x11))).toBeNull()
    expect(parseV16LiveEffectsReply(frame([...values, ...table].slice(0, 40)))).toBeNull()
    expect(parseV16LiveEffectsReply(Uint8Array.of(0xf0, ...Array(200).fill(0), 0xf7))).toBeNull()
  })

  it('refuses a reply that echoes this read but is the wrong length', () => {
    expect(parseV16LiveEffectsReply(frame([...prefix, ...values]))).toEqual({
      problem: 'length',
      type: 'invalid',
    })
  })

  it('refuses a truncated frame, a bad checksum, and a byte above seven bits', () => {
    const truncated = Uint8Array.of(...bare.slice(0, 40), 0xf7)
    expect(parseV16LiveEffectsReply(truncated)).toEqual({ problem: 'length', type: 'invalid' })
    const wrongSum = Uint8Array.from(bare)
    wrongSum[20] ^= 1
    expect(parseV16LiveEffectsReply(wrongSum)).toEqual({ problem: 'checksum', type: 'invalid' })
    const wide = Uint8Array.from(bare)
    wide[20] = 0x80
    expect(parseV16LiveEffectsReply(wide)).toEqual({ problem: 'seven-bit', type: 'invalid' })
  })

  it('refuses a table the firmware itself would reject', () => {
    const duplicate = [...table]
    duplicate[3] = 0
    expect(parseV16LiveEffectsReply(frame([...values, ...duplicate]))).toEqual({
      problem: 'table',
      type: 'invalid',
    })
    const badType = [...table]
    badType[2] = 3
    expect(parseV16LiveEffectsReply(frame([...values, ...badType]))).toEqual({
      problem: 'table',
      type: 'invalid',
    })
  })
})

describe('the replies captured on 2026-11-05', () => {
  it.each(Object.keys(capturedReplies) as (keyof typeof capturedReplies)[])(
    'decodes the reply read after sending %s to exactly that rack',
    (name) => {
      const answer = parseV16LiveEffectsReply(capturedReply(name))
      expect(answer?.type).toBe('reading')
      if (answer?.type !== 'reading') return
      expect(candidateEffectValues(answer.reading)).toEqual({
        type: 'values',
        values: sentRack(name),
      })
    },
  )
})

describe('candidateEffectValues', () => {
  const answer = parseV16LiveEffectsReply(bare)
  const reading = answer?.type === 'reading' ? answer.reading : null

  it('puts each effect’s switch, type, and three values in the editor’s controller order', () => {
    expect(reading).not.toBeNull()
    expect(candidateEffectValues(reading!)).toEqual({
      type: 'values',
      values: [
        1, 2, 50, 3, 0, 1, 40, 60, 1, 30, 20, 10, 0, 70, 80, 90, 1, 11, 12, 13, 0, 21, 22, 23,
      ],
    })
  })

  it('reports a value outside its control’s range rather than clamping it', () => {
    const wide = {
      ...reading!,
      values: Uint8Array.from([...values.slice(0, 1), 11, ...values.slice(2)]),
    }
    expect(candidateEffectValues(wide)).toMatchObject({
      controller: 3,
      problem: 'range',
      value: 11,
    })
  })
})

describe('readV16LiveEffects', () => {
  function makeLink() {
    let hear: (message: Uint8Array) => void = () => {}
    const stop = vi.fn()
    const send = vi.fn()
    return {
      hear: (message: Uint8Array) => hear(message),
      link: {
        listen: (listener: typeof hear) => {
          hear = listener
          return stop
        },
        send,
      },
      send,
      stop,
    }
  }

  it('sends the one request, and only once the call is made, and resolves with the reply', async () => {
    const { hear, link, send } = makeLink()
    expect(send).not.toHaveBeenCalled()
    const result = readV16LiveEffects(link)
    await Promise.resolve()
    hear(frame([5, 0, 0, 0, 0]))
    hear(bare)
    await expect(result).resolves.toMatchObject({ reply: bare })
    expect(send).toHaveBeenCalledOnce()
    expect(send).toHaveBeenCalledWith(makeV16LiveEffectsReadRequest())
  })

  it('ignores a duplicate or late reply once it has settled', async () => {
    const { hear, link, stop } = makeLink()
    const result = readV16LiveEffects(link)
    await Promise.resolve()
    hear(bare)
    await result
    expect(stop).toHaveBeenCalledOnce()
    expect(() => hear(echoed)).not.toThrow()
  })

  it('does not ask again when no reply comes', async () => {
    vi.useFakeTimers()
    const { link, send } = makeLink()
    const result = readV16LiveEffects(link, { timeoutMs: 100 })
    const outcome = result.catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await outcome).toMatchObject({ problem: 'no-reply' })
    expect(send).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('fails at once on an unusable reply', async () => {
    const { hear, link } = makeLink()
    const result = readV16LiveEffects(link)
    await Promise.resolve()
    hear(frame([...prefix, ...values]))
    await expect(result).rejects.toMatchObject({ problem: 'unusable' })
  })

  it('reports a send that failed', async () => {
    const { link, stop } = makeLink()
    link.send.mockRejectedValueOnce(new Error('port closed'))
    await expect(readV16LiveEffects(link)).rejects.toMatchObject({ problem: 'send-failed' })
    expect(stop).toHaveBeenCalled()
  })

  it('cancels when a port changes, sending nothing if it was already cancelled', async () => {
    const first = makeLink()
    const controller = new AbortController()
    const result = readV16LiveEffects(first.link, { signal: controller.signal })
    await Promise.resolve()
    controller.abort()
    await expect(result).rejects.toBeInstanceOf(V16LiveEffectsReadError)
    first.hear(bare)

    const second = makeLink()
    await expect(
      readV16LiveEffects(second.link, { signal: AbortSignal.abort() }),
    ).rejects.toMatchObject({ problem: 'cancelled' })
    expect(second.send).not.toHaveBeenCalled()
  })
})
