import { describe, expect, it } from 'vitest'

import { capturedOrgan3Reply } from '@/test/fm1-va-captures'
import { makeFm1VaReply } from '@/test/fm1-va-replies'

import { fm1VaChecksum, parseFm1VaReply } from './fm1-va-sysex'

describe('fm1VaChecksum', () => {
  it('sums the seven-bit complement of each byte, keeping the low seven bits', () => {
    // 0x10 complements to 0x6f and 0x00 to 0x7f; 0xee keeps 0x6e.
    expect(fm1VaChecksum([0x10, 0x00])).toBe(0x6e)
    expect(fm1VaChecksum([0x10, 0x7f])).toBe(0x6f)
  })
})

describe('parseFm1VaReply', () => {
  it('reads a preset reply captured from FM-1_093', () => {
    const reply = parseFm1VaReply(capturedOrgan3Reply)

    expect(reply).toMatchObject({ argument: 0, kind: 0x50, status: 0 })
    expect(reply?.data).toHaveLength(187)
  })

  it('reads the kind, status, argument, and data from a reply', () => {
    const reply = makeFm1VaReply({ argument: 0x01020304, data: [0x00, 0x80, 0xff], status: 1 })

    expect(parseFm1VaReply(reply)).toEqual({
      argument: 0x01020304,
      data: Uint8Array.of(0x00, 0x80, 0xff),
      kind: 0x50,
      status: 1,
    })
  })

  it('reads a reply WebMidi hands over as a plain array', () => {
    const reply = Array.from(makeFm1VaReply({ argument: 5 }))

    expect(parseFm1VaReply(reply)?.argument).toBe(5)
  })

  it('reads a reply whose argument has its top bit set as a positive number', () => {
    expect(parseFm1VaReply(makeFm1VaReply({ argument: 0xffffffff }))?.argument).toBe(0xffffffff)
  })

  it('ignores a reply that arrived with the wrong checksum', () => {
    expect(parseFm1VaReply(makeFm1VaReply({ argument: 0, badChecksum: true }))).toBeNull()
  })

  it('ignores a reply shorter than the length it declares', () => {
    const reply = makeFm1VaReply({ argument: 0, data: Array<number>(20).fill(1) })
    const cut = Uint8Array.of(...reply.subarray(0, 12), 0xf7)

    expect(parseFm1VaReply(cut)).toBeNull()
  })

  it('ignores a message with a byte above seven bits', () => {
    const reply = makeFm1VaReply({ argument: 0 })
    reply[4] = 0x80

    expect(parseFm1VaReply(reply)).toBeNull()
  })

  it('ignores other SysEx, such as the identity reply', () => {
    expect(parseFm1VaReply(Uint8Array.of(0xf0, 0x00, 0x32, 0x45, 0xf7))).toBeNull()
    expect(parseFm1VaReply(Uint8Array.of(0xf0, 0x7d, 0xf7))).toBeNull()
  })
})
