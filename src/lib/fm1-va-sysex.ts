import { unpackSevenBitStream } from '@/lib/fm1-firmware'

/**
 * FM-1+VA's own SysEx: requests under the Yamaha ID with a sub-ID it assigns, `F0 43 00 7D …`, and
 * the replies it sends back (docs/fm1-research.md, FM-1+VA). Only bounded requests are built from
 * these pieces; there is no generic transmitter.
 */
export const fm1VaRequestHeader = [0xf0, 0x43, 0x00, 0x7d] as const

/** FM-1+VA's checksum: the low seven bits of the sum of each byte's seven-bit complement. */
export function fm1VaChecksum(bytes: Uint8Array | readonly number[]) {
  let sum = 0
  for (const byte of bytes) sum += ~byte & 0x7f
  return sum & 0x7f
}

/** What a reply says it carries. */
export const fm1VaReplyKinds = { memory: 0x51, pattern: 0x52, preset: 0x50 } as const

/** How the FM1 answered a request: done, or why it did not. */
export const fm1VaReplyStatuses = { busy: 3, damaged: 2, done: 0, outOfRange: 1 } as const

export type Fm1VaReply = {
  /** The request's own argument, such as the slot a preset reply answers. */
  argument: number
  data: Uint8Array
  kind: number
  status: number
}

// A reply is F0 7D, then an 8-bit buffer packed seven bits at a time, least significant bit first,
// then F7. The buffer is 7D, the kind, the status, a 32-bit argument and a 16-bit data length, both
// little-endian, the data, and the complement of the low byte of the sum of everything before it.
const replyMarker = 0x7d
const replyHeaderLength = 9

/**
 * The reply in a message, or null when the message is not an FM-1+VA reply or arrived damaged.
 * WebMidi hands an input message over as a plain array, so either form is read.
 */
export function parseFm1VaReply(message: Uint8Array | readonly number[]): Fm1VaReply | null {
  const data = Uint8Array.from(message)
  if (
    data.length < 3 ||
    data[0] !== 0xf0 ||
    data[1] !== replyMarker ||
    data[data.length - 1] !== 0xf7 ||
    data.subarray(1, -1).some((byte) => byte > 0x7f)
  ) {
    return null
  }

  const buffer = unpackSevenBitStream(data.subarray(1, -1))
  if (buffer.length < replyHeaderLength + 1 || buffer[0] !== replyMarker) return null
  const length = buffer[7] | (buffer[8] << 8)
  const checksumIndex = replyHeaderLength + length
  if (buffer.length <= checksumIndex) return null
  const sum = buffer.slice(0, checksumIndex).reduce((total, byte) => total + byte, 0)
  if ((~sum & 0xff) !== buffer[checksumIndex]) return null

  return {
    argument: (buffer[3] | (buffer[4] << 8) | (buffer[5] << 16) | (buffer[6] << 24)) >>> 0,
    data: Uint8Array.from(buffer.slice(replyHeaderLength, checksumIndex)),
    kind: buffer[1],
    status: buffer[2],
  }
}
