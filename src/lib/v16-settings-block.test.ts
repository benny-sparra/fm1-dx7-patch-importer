import { describe, expect, it } from 'vitest'

import {
  fxOrderLength,
  fxOrderOffset,
  makeSettingsBlockReadRequest,
  makeSettingsBlockWrite,
  parseSettingsBlockReply,
  readFxOrderBytes,
  settingsBlockLength,
  settingsBlockVersion,
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

// A block as a V16 might send it: made up, with the version first and the order bytes counting.
const blockBytes = Array.from({ length: settingsBlockLength }, (_, index) => (index * 7) % 100)
blockBytes[0] = settingsBlockVersion
for (let index = 0; index < fxOrderLength; index += 1) blockBytes[fxOrderOffset + index] = index

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

describe('readFxOrderBytes', () => {
  it('returns the 27 bytes at offset 0x92', () => {
    expect([...readFxOrderBytes(readBlock())]).toEqual(Array.from({ length: 27 }, (_, i) => i))
    expect(fxOrderOffset).toBe(0x92)
  })
})

describe('makeSettingsBlockWrite', () => {
  function unpackWrite(message: Uint8Array) {
    const septets = [...message.subarray(1, -1)]
    const bytes: number[] = []
    let accumulator = 0
    let count = 0
    for (const septet of septets) {
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

  it('writes the block back unchanged when given its own order bytes', () => {
    const block = readBlock()
    const bytes = unpackWrite(makeSettingsBlockWrite(block, readFxOrderBytes(block)))
    expect(bytes.slice(0, 6)).toEqual([0x00, 0x59, 0x22, 184, 0, 0])
    expect(bytes.slice(6, 14)).toEqual(prefix)
    expect(bytes.slice(14, 14 + settingsBlockLength)).toEqual(blockBytes)
    const checksum = ~bytes.slice(6, 6 + 184).reduce((sum, byte) => sum + byte, 0) & 0xff
    expect(bytes[6 + 184]).toBe(checksum)
  })

  it('changes only the 27 order bytes', () => {
    const block = readBlock()
    const order = Array.from({ length: 27 }, (_, index) => 26 - index)
    const bytes = unpackWrite(makeSettingsBlockWrite(block, order)).slice(14, 14 + 176)
    const changed = bytes.flatMap((byte, index) => (byte === blockBytes[index] ? [] : [index]))
    expect(changed.every((index) => index >= 0x92 && index < 0x92 + 27)).toBe(true)
    expect(bytes.slice(0x92, 0x92 + 27)).toEqual(order)
    expect([...block.bytes]).toEqual(blockBytes)
  })

  it('refuses a block that did not come from a read', () => {
    const made: V16SettingsBlock = { bytes: Uint8Array.from(blockBytes), reply: new Uint8Array() }
    expect(() =>
      makeSettingsBlockWrite(
        made,
        Array.from({ length: 27 }, () => 0),
      ),
    ).toThrow(TypeError)
    expect(() => readFxOrderBytes(made)).toThrow(TypeError)
  })

  it('refuses an order of the wrong length or with a value that is not a byte', () => {
    const block = readBlock()
    expect(() =>
      makeSettingsBlockWrite(
        block,
        Array.from({ length: 26 }, () => 0),
      ),
    ).toThrow(RangeError)
    expect(() =>
      makeSettingsBlockWrite(
        block,
        Array.from({ length: 28 }, () => 0),
      ),
    ).toThrow(RangeError)
    expect(() =>
      makeSettingsBlockWrite(
        block,
        Array.from({ length: 27 }, () => 256),
      ),
    ).toThrow(RangeError)
    expect(() =>
      makeSettingsBlockWrite(
        block,
        Array.from({ length: 27 }, () => -1),
      ),
    ).toThrow(RangeError)
    expect(() =>
      makeSettingsBlockWrite(
        block,
        Array.from({ length: 27 }, () => 1.5),
      ),
    ).toThrow(RangeError)
  })

  it('sends only 7-bit bytes between F0 and F7', () => {
    const block = readBlock()
    const message = makeSettingsBlockWrite(
      block,
      Array.from({ length: 27 }, () => 255),
    )
    expect(message[0]).toBe(0xf0)
    expect(message[message.length - 1]).toBe(0xf7)
    expect([...message.subarray(1, -1)].every((byte) => byte < 0x80)).toBe(true)
  })
})
