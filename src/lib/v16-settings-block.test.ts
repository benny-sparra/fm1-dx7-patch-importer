import { describe, expect, it, vi } from 'vitest'

import {
  fxTableLength,
  fxTableOffset,
  makeEffectOrderWrite,
  makeSettingsBlockReadRequest,
  parseSettingsBlockReply,
  readEffectOrder,
  readV16SettingsBlock,
  settingsBlockLength,
  settingsBlockVersion,
  V16SettingsReadError,
  type V16SettingsBlock,
} from '@/lib/v16-settings-block'

// A fixture is built here with its own packer, so the module's is not checked against itself.
function pack(bytes: number[]) {
  const packed: number[] = []
  let bits = BigInt(0)
  let count = 0
  for (const byte of bytes) {
    bits |= BigInt(byte) << BigInt(count)
    count += 8
  }
  for (let at = 0; at < count; at += 7) packed.push(Number((bits >> BigInt(at)) & BigInt(0x7f)))
  return packed
}

function frame(command: number, payload: number[]) {
  const checksum = ~payload.reduce((sum, byte) => sum + byte, 0) & 0xff
  return Uint8Array.of(
    0xf0,
    ...pack([
      0x00,
      0x59,
      command,
      payload.length & 0xff,
      payload.length >> 8,
      0,
      ...payload,
      checksum,
    ]),
    0xf7,
  )
}

const prefix = [4, 0, 0, 0, 0, 0xb0, 0, 0]

// A block as a V16 might send it: made up, with the version first. Its FX table is nine entries,
// byte 0 the effect at that chain position (Delay, Filter, Reverb, Distortion, Phaser, Chorus,
// then the unused 6–8), bytes 1 and 2 effect e's On/Off and Type by number.
const tableOrder = [2, 0, 1, 3, 5, 4]
const blockBytes = Array.from({ length: settingsBlockLength }, (_, index) => (index * 7) % 100)
blockBytes[0] = settingsBlockVersion
;[...tableOrder, 6, 7, 8].forEach((effect, entry) => {
  blockBytes[fxTableOffset + entry * 3] = effect
  blockBytes[fxTableOffset + entry * 3 + 1] = entry % 2
  blockBytes[fxTableOffset + entry * 3 + 2] = entry % 3
})

function readBlock(payload = blockBytes): V16SettingsBlock {
  const answer = parseSettingsBlockReply(frame(0x23, payload))
  if (answer?.type !== 'block') throw new Error('fixture is not a block')
  return answer.block
}

describe('makeSettingsBlockReadRequest', () => {
  it('asks for object 4, offset 0, 176 bytes, as a packed updater frame', () => {
    expect([...makeSettingsBlockReadRequest()]).toEqual([
      0xf0, 0x00, 0x32, 0x0d, 0x41, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16,
      0x00, 0x00, 0x4b, 0x00, 0xf7,
    ])
  })

  it('matches what the same packing makes of the identity query’s body', () => {
    expect(frame(0x11, []).subarray(0, 9)).toEqual(
      Uint8Array.of(0xf0, 0x00, 0x32, 0x45, 0x00, 0x00, 0x00, 0x40, 0x7f),
    )
  })
})

describe('parseSettingsBlockReply', () => {
  it('reads the 176 bytes of a reply that carries the block alone', () => {
    const block = readBlock()
    expect([...block.bytes]).toEqual(blockBytes)
  })

  it('reads the block after an echo of the request’s object, offset, and length', () => {
    const answer = parseSettingsBlockReply(frame(0x23, [...prefix, ...blockBytes]))
    expect(answer?.type === 'block' && [...answer.block.bytes]).toEqual(blockBytes)
  })

  it('reads a reply handed over as a plain array', () => {
    expect(parseSettingsBlockReply([...frame(0x23, blockBytes)])?.type).toBe('block')
  })

  it('ignores messages that are not a reply to a read', () => {
    expect(parseSettingsBlockReply(Uint8Array.of(0xf0, 0x43, 0x00, 0x09, 0xf7))).toBeNull()
    expect(parseSettingsBlockReply(frame(0x11, [1, 2, 3]))).toBeNull()
    expect(parseSettingsBlockReply(Uint8Array.of(0x90, 60, 100))).toBeNull()
  })

  it('treats the request itself, sent back by a loopback port, as too short to be a block', () => {
    expect(parseSettingsBlockReply(makeSettingsBlockReadRequest())).toEqual({
      problem: 'length',
      type: 'invalid',
    })
  })

  it.each([
    ['a version other than 0x0E', [0x0d, ...blockBytes.slice(1)], 'version'],
    ['a block that is too short', blockBytes.slice(0, 175), 'length'],
    ['a block that is too long', [...blockBytes, 0], 'layout'],
    ['an echo that names another object', [5, ...prefix.slice(1), ...blockBytes], 'layout'],
  ])('refuses %s', (_name, payload, problem) => {
    expect(parseSettingsBlockReply(frame(0x23, payload))).toEqual({ problem, type: 'invalid' })
  })

  it('refuses a reply whose checksum is wrong', () => {
    const reply = frame(0x23, blockBytes)
    reply[reply.length - 3] ^= 0x01
    expect(parseSettingsBlockReply(reply)).toEqual({ problem: 'checksum', type: 'invalid' })
  })

  it('refuses a reply with a byte above 7 bits', () => {
    const reply = frame(0x23, blockBytes)
    reply[10] = 0x80
    expect(parseSettingsBlockReply(reply)).toEqual({ problem: 'seven-bit', type: 'invalid' })
  })
})

describe('readEffectOrder', () => {
  it('gives the effect at each chain position', () => {
    expect(readEffectOrder(readBlock())).toEqual(tableOrder)
    expect(fxTableOffset).toBe(0x92)
  })

  it.each([
    ['an effect twice', 3, 0],
    ['an unused effect among the six', 3, 6],
    ['a number above 8', 3, 9],
  ])('returns null for a table with %s', (_name, entry, value) => {
    const bytes = [...blockBytes]
    bytes[fxTableOffset + entry * 3] = value
    expect(readEffectOrder(readBlock(bytes))).toBeNull()
  })

  it('refuses a block that did not come from a read', () => {
    const made: V16SettingsBlock = { bytes: Uint8Array.from(blockBytes), reply: new Uint8Array() }
    expect(() => readEffectOrder(made)).toThrow(TypeError)
  })
})

describe('makeEffectOrderWrite', () => {
  function unpackWrite(message: Uint8Array) {
    const bytes: number[] = []
    let accumulator = 0
    let count = 0
    for (const septet of message.subarray(1, -1)) {
      accumulator |= septet << count
      count += 7
      while (count >= 8) {
        bytes.push(accumulator & 0xff)
        accumulator >>= 8
        count -= 8
      }
    }
    return bytes
  }

  const tableOf = (bytes: number[]) => bytes.slice(14, 14 + fxTableLength)

  it('writes 27 bytes at offset 0x92 of object 4, not the block', () => {
    const bytes = unpackWrite(makeEffectOrderWrite(readBlock(), tableOrder))
    expect(bytes.slice(0, 6)).toEqual([0x00, 0x59, 0x22, 35, 0, 0])
    expect(bytes.slice(6, 14)).toEqual([4, 0x92, 0, 0, 0, 27, 0, 0])
    const payload = bytes.slice(6, 6 + 35)
    expect(bytes[6 + 35]).toBe(~payload.reduce((sum, byte) => sum + byte, 0) & 0xff)
  })

  it('carries the table as read when the order is unchanged', () => {
    const bytes = unpackWrite(makeEffectOrderWrite(readBlock(), tableOrder))
    expect(tableOf(bytes)).toEqual(blockBytes.slice(0x92, 0x92 + 27))
  })

  it('changes only byte 0 of entries 0–5, keeping every On/Off, Type, and entries 6–8', () => {
    const order = [5, 4, 3, 2, 1, 0]
    const table = tableOf(unpackWrite(makeEffectOrderWrite(readBlock(), order)))
    const expected = blockBytes.slice(0x92, 0x92 + 27)
    order.forEach((effect, position) => {
      expected[position * 3] = effect
    })
    expect(table).toEqual(expected)
  })

  it('refuses a block that did not come from a read', () => {
    const made: V16SettingsBlock = { bytes: Uint8Array.from(blockBytes), reply: new Uint8Array() }
    expect(() => makeEffectOrderWrite(made, tableOrder)).toThrow(TypeError)
  })

  it('refuses a table that is not an order of the six effects', () => {
    const bytes = [...blockBytes]
    bytes[fxTableOffset] = 6
    expect(() => makeEffectOrderWrite(readBlock(bytes), tableOrder)).toThrow(RangeError)
  })

  it.each([
    ['too few', [0, 1, 2, 3, 4]],
    ['too many', [0, 1, 2, 3, 4, 5, 6]],
    ['a repeat', [0, 1, 2, 3, 4, 4]],
    ['an unused effect', [0, 1, 2, 3, 4, 6]],
    ['a negative number', [0, 1, 2, 3, 4, -1]],
    ['a fraction', [0, 1, 2, 3, 4, 5.5]],
  ])('refuses an order with %s', (_name, order) => {
    expect(() => makeEffectOrderWrite(readBlock(), order)).toThrow(RangeError)
  })

  it('sends only 7-bit bytes between F0 and F7', () => {
    const message = makeEffectOrderWrite(readBlock(), [5, 4, 3, 2, 1, 0])
    expect(message[0]).toBe(0xf0)
    expect(message[message.length - 1]).toBe(0xf7)
    expect([...message.subarray(1, -1)].every((byte) => byte < 0x80)).toBe(true)
  })
})

describe('readV16SettingsBlock', () => {
  function makeLink(answers: (Uint8Array | null)[]) {
    const sent: Uint8Array[] = []
    let hear: (message: Uint8Array) => void = () => {}
    const link = {
      listen: (listener: (message: Uint8Array) => void) => {
        hear = listener
        return () => {
          hear = () => {}
        }
      },
      send: (message: Uint8Array) => {
        sent.push(message)
        const answer = answers[sent.length - 1]
        if (answer) hear(answer)
      },
    }
    return { link, sent }
  }

  it('sends the read request once and resolves with the block', async () => {
    const { link, sent } = makeLink([frame(0x23, blockBytes)])
    const block = await readV16SettingsBlock(link)
    expect([...block.bytes]).toEqual(blockBytes)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toEqual(makeSettingsBlockReadRequest())
  })

  it('asks again when the first request is not answered', async () => {
    vi.useFakeTimers()
    const { link, sent } = makeLink([null, frame(0x23, blockBytes)])
    const read = readV16SettingsBlock(link, { timeoutMs: 100 })
    await vi.advanceTimersByTimeAsync(100)
    expect((await read).bytes.length).toBe(settingsBlockLength)
    expect(sent).toHaveLength(2)
    vi.useRealTimers()
  })

  it('gives up with no-reply after its attempts', async () => {
    vi.useFakeTimers()
    const { link, sent } = makeLink([null, null, null])
    const read = readV16SettingsBlock(link, { attempts: 2, timeoutMs: 100 })
    const outcome = read.catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(300)
    expect(await outcome).toMatchObject({ problem: 'no-reply' })
    expect(sent).toHaveLength(2)
    vi.useRealTimers()
  })

  it('fails at once on a reply it cannot use, without asking again', async () => {
    const { link, sent } = makeLink([frame(0x23, [0x0d, ...blockBytes.slice(1)])])
    await expect(readV16SettingsBlock(link)).rejects.toMatchObject({ problem: 'unusable' })
    expect(sent).toHaveLength(1)
  })

  it('rejects as cancelled when its signal aborts', async () => {
    const { link } = makeLink([null])
    const controller = new AbortController()
    const read = readV16SettingsBlock(link, { signal: controller.signal })
    controller.abort()
    await expect(read).rejects.toBeInstanceOf(V16SettingsReadError)
    await expect(read).rejects.toMatchObject({ problem: 'cancelled' })
  })
})
