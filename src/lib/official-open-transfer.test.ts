import { describe, expect, it } from 'vitest'

import {
  makeOfficialOpenInfoRequest,
  officialOpenTrackForChannel,
  parseOfficialOpenInfoReply,
} from './official-open-transfer'
import { officialOpenInfoReply } from '@/test/fake-fm1-midi'

// Captured from an FM1 running Official Open V12 on 2026-10-16 (docs/fm1-research.md, "Official
// Open: released source"): the request sent with token 1, and the FM1's answer, with tracks 1 to 8
// on 303, 808, DX7, and five PSG.
// prettier-ignore
const capturedRequest = [0xf0, 0x7d, 0x46, 0x4d, 0x02, 0x00, 0x01, 0x00, 0x6d, 0xf7]
// prettier-ignore
const capturedReply = [
  0xf0, 0x7d, 0x46, 0x4d, 0x02, 0x40, 0x01, 0x00, 0x00, 0x08, 0x40, 0x00, 0x00, 0x7c, 0x03, 0x00,
  0x01, 0x04, 0x00, 0x18, 0x30, 0x60, 0x40, 0x01, 0x03, 0x00, 0x75, 0xf7,
]

/** The captured reply with `edit` applied and its checksum made right again. */
function rebuilt(edit: (body: number[]) => number[]) {
  const body = edit(capturedReply.slice(1, -2))
  const checksum = -body.reduce((sum, byte) => sum + byte, 0) & 0x7f
  return [0xf0, ...body, checksum, 0xf7]
}

describe('makeOfficialOpenInfoRequest', () => {
  it('builds the captured command 0 request for token 1', () => {
    expect(Array.from(makeOfficialOpenInfoRequest(1))).toEqual(capturedRequest)
  })

  it('splits a 14-bit token into its low and high seven bits, with the checksum over both', () => {
    const request = makeOfficialOpenInfoRequest(0x1234)

    expect(Array.from(request.subarray(5, 8))).toEqual([0x00, 0x34, 0x24])
    expect(request.subarray(1, -1).reduce((sum, byte) => sum + byte, 0) & 0x7f).toBe(0)
  })

  it('refuses a token that does not fit in 14 bits', () => {
    for (const token of [-1, 0x4000, 1.5]) {
      expect(() => makeOfficialOpenInfoRequest(token)).toThrow(RangeError)
    }
  })
})

describe('parseOfficialOpenInfoReply', () => {
  it('reads the captured reply', () => {
    expect(parseOfficialOpenInfoReply(capturedReply, 1)).toEqual({
      info: {
        clock: 'internal',
        currentSlot: 0,
        engines: ['303', '808', 'dx7', 'psg', 'psg', 'psg', 'psg', 'psg'],
        projectSize: 4064,
        slotCount: 16,
      },
      type: 'info',
    })
  })

  it('reads a Uint8Array as WebMidi might hand one over', () => {
    expect(parseOfficialOpenInfoReply(Uint8Array.from(capturedReply), 1)?.type).toBe('info')
  })

  it('ignores a reply with a damaged checksum', () => {
    const damaged = capturedReply.slice()
    damaged[damaged.length - 2] ^= 0x01

    expect(parseOfficialOpenInfoReply(damaged, 1)).toBeNull()
  })

  it('ignores a reply to a request with another token', () => {
    expect(parseOfficialOpenInfoReply(capturedReply, 2)).toBeNull()
    expect(parseOfficialOpenInfoReply(capturedReply, 0x81)).toBeNull()
  })

  it('ignores the request itself, which lacks the reply flag', () => {
    expect(parseOfficialOpenInfoReply(capturedRequest, 1)).toBeNull()
  })

  it('ignores a reply to another command', () => {
    expect(
      parseOfficialOpenInfoReply(
        rebuilt((body) => body.with(4, 0x49)),
        1,
      ),
    ).toBeNull()
  })

  it('ignores a message without its frame or with a byte above seven bits', () => {
    expect(parseOfficialOpenInfoReply(capturedReply.slice(0, -1), 1)).toBeNull()
    expect(
      parseOfficialOpenInfoReply(
        rebuilt((body) => body.with(9, 0x80)),
        1,
      ),
    ).toBeNull()
  })

  it('ignores packing that leaves stray bits after the last byte', () => {
    expect(
      parseOfficialOpenInfoReply(
        rebuilt((body) => body.with(body.length - 1, 0x40)),
        1,
      ),
    ).toBeNull()
  })

  it('reports an error status the FM1 answered with', () => {
    // Status 71 is 64 minus GROOVE_PROJECT_INVALID (-7), packed as 47 00.
    const refused = rebuilt((body) => [...body.slice(0, 7), 0x47, 0x00])

    expect(parseOfficialOpenInfoReply(refused, 1)).toEqual({ status: 71, type: 'refused' })
  })

  it('calls a reply of the wrong length unexpected', () => {
    const short = rebuilt((body) => body.slice(0, -2))
    const long = rebuilt((body) => [...body.slice(0, -1), 0x00, 0x00, 0x00])

    expect(parseOfficialOpenInfoReply(short, 1)).toEqual({ type: 'unexpected' })
    expect(parseOfficialOpenInfoReply(long, 1)).toEqual({ type: 'unexpected' })
  })

  it('calls another info format, or an engine it does not know, unexpected', () => {
    // Format is the second unpacked byte: 4 sits in bits 8–14, so packed byte 1 carries it.
    const format5 = rebuilt((body) => body.with(8, 0x0a))
    // Track 8's engine is in the last whole byte: 3 (PSG) becomes 6.
    const engine6 = rebuilt((body) => body.with(body.length - 2, 0x06))

    expect(parseOfficialOpenInfoReply(format5, 1)).toEqual({ type: 'unexpected' })
    expect(parseOfficialOpenInfoReply(engine6, 1)).toEqual({ type: 'unexpected' })
  })
})

describe('officialOpenTrackForChannel', () => {
  it('maps channels 1–7 to tracks 1–7 and channel 10 to track 8', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 10].map(officialOpenTrackForChannel)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ])
  })

  it('maps the channels Official Open ignores to no track', () => {
    expect([8, 9, 11, 12, 13, 14, 15, 16].map(officialOpenTrackForChannel)).toEqual(
      Array(8).fill(null),
    )
  })
})

describe('the fake FM1’s command 0 answer', () => {
  it('is the captured reply for token 1 and the captured engines', () => {
    expect(Array.from(officialOpenInfoReply(1, [1, 2, 0, 3, 3, 3, 3, 3]))).toEqual(capturedReply)
  })
})
