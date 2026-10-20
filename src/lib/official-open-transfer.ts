import { unpackSevenBitStream } from '@/lib/fm1-firmware'

/**
 * M-VAVE's Official Open project transfer protocol, `F0 7D 'F' 'M' 02` (docs/fm1-research.md,
 * "Official Open: released source"). This module builds command 0, info, which reads the format,
 * the project slots, and each track's engine, and changes nothing (approved 2026-10-16), and holds
 * the framing every request and reply shares. The read commands approved on 2026-10-20 are built in
 * `official-open-read.ts`. Every other command needs its own approval recorded in AGENTS.md first,
 * and 7, 8, and 12–14 are Dangerous / excluded, so nothing here builds a request for them.
 */
export const officialOpenHeader = [0xf0, 0x7d, 0x46, 0x4d, 0x02] as const
const header = officialOpenHeader
const infoCommand = 0
const replyFlag = 0x40
const headerLength = 8

/** The engines a track can run, by the number command 0 reports (`enum groove_source`). */
const officialOpenEngines = ['dx7', '303', '808', 'psg', 'pluck', 'sampler'] as const
export type OfficialOpenEngine = (typeof officialOpenEngines)[number]

/** The ports a request talks through: a send, and a listener for the input's messages. */
export type OfficialOpenLink = {
  listen: (hear: (message: Uint8Array | readonly number[]) => void) => () => void
  send: (message: Uint8Array) => void
}

const officialOpenTrackCount = 8

/** A request's 14-bit token, which the reply echoes. */
const lastToken = 0x3fff

/** The info layout this module reads, the only one V12 reports. */
const infoFormat = 4
const infoLength = 14

export type OfficialOpenInfo = {
  clock: 'internal' | 'midi'
  /** The project slot the working project came from, counted from 0. */
  currentSlot: number
  /** Each track's engine, track 1 first. */
  engines: OfficialOpenEngine[]
  projectSize: number
  slotCount: number
}

export type OfficialOpenInfoReply =
  | { info: OfficialOpenInfo; type: 'info' }
  /** The FM1 answered with a status other than success: 64 plus the error, or 1 for empty. */
  | { status: number; type: 'refused' }
  /** A reply to this request in a layout this module does not know. */
  | { type: 'unexpected' }

/**
 * The track that note channel `channel` (1–16) reaches: tracks 1–7 on channels 1–7 and track 8 on
 * channel 10, or null for the channels Official Open ignores.
 */
export function officialOpenTrackForChannel(channel: number) {
  if (Number.isInteger(channel) && channel >= 1 && channel <= 7) return channel
  return channel === 10 ? officialOpenTrackCount : null
}

/** Makes bytes 1 to the checksum sum to 0 mod 128. */
export function officialOpenChecksum(bytes: readonly number[]) {
  return -bytes.reduce((sum, byte) => sum + byte, 0) & 0x7f
}

/** Packs 8-bit bytes seven bits at a time, least significant bit first, as the FM1 does. */
export function packSevenBitStream(bytes: readonly number[]) {
  const packed: number[] = []
  let accumulator = 0
  let bitCount = 0
  for (const byte of bytes) {
    accumulator |= byte << bitCount
    bitCount += 8
    while (bitCount >= 7) {
      packed.push(accumulator & 0x7f)
      accumulator >>= 7
      bitCount -= 7
    }
  }
  if (bitCount > 0) packed.push(accumulator & 0x7f)
  return packed
}

export function assertOfficialOpenToken(token: number) {
  if (!Number.isInteger(token) || token < 0 || token > lastToken) {
    throw new RangeError(`An Official Open request token is 0 to ${lastToken}; received ${token}.`)
  }
}

/** `F0 7D 46 4D 02 00 <token lo> <token hi> <checksum> F7`: command 0, info, with no payload. */
export function makeOfficialOpenInfoRequest(token: number) {
  assertOfficialOpenToken(token)
  const body = [...header.slice(1), infoCommand, token & 0x7f, token >> 7]
  return Uint8Array.of(0xf0, ...body, officialOpenChecksum(body), 0xf7)
}

/**
 * What a message says about the request for `command` sent with `token`, or null when it is not a
 * whole, undamaged reply to it: the frame, the command with its reply flag, the token, 7-bit bytes,
 * the checksum, and packing that leaves no stray bits. The status is the first unpacked byte, 0 for
 * success, and the data follows it. WebMidi hands an input message over as a plain array, so either
 * form is read.
 */
export function parseOfficialOpenReply(
  message: Uint8Array | readonly number[],
  token: number,
  command: number,
) {
  assertOfficialOpenToken(token)
  const data = Array.from(message)
  if (
    data.length < headerLength + 3 ||
    header.some((byte, index) => data[index] !== byte) ||
    data[5] !== (command | replyFlag) ||
    data[6] !== (token & 0x7f) ||
    data[7] !== token >> 7 ||
    data.at(-1) !== 0xf7 ||
    data.slice(1, -1).some((byte) => byte > 0x7f) ||
    officialOpenChecksum(data.slice(1, -2)) !== data.at(-2)
  ) {
    return null
  }

  const packed = data.slice(headerLength, -2)
  const unpacked = unpackSevenBitStream(Uint8Array.from(packed))
  const repacked = packSevenBitStream(unpacked)
  if (
    unpacked.length === 0 ||
    repacked.length !== packed.length ||
    repacked.some((byte, index) => byte !== packed[index])
  ) {
    return null
  }
  const [status, ...fields] = unpacked
  return { fields, status }
}

/** What a message says about the info request sent with `token`, or null when it is no reply to it. */
export function parseOfficialOpenInfoReply(
  message: Uint8Array | readonly number[],
  token: number,
): OfficialOpenInfoReply | null {
  const reply = parseOfficialOpenReply(message, token, infoCommand)
  if (!reply) return null
  const { fields, status } = reply
  if (status !== 0) return { status, type: 'refused' }
  if (fields.length !== infoLength || fields[0] !== infoFormat) return { type: 'unexpected' }

  const [, slotCount, currentSlot, sizeLow, sizeHigh, clock, ...engineNumbers] = fields
  if (
    slotCount === 0 ||
    currentSlot >= slotCount ||
    clock > 1 ||
    engineNumbers.some((engine) => engine >= officialOpenEngines.length)
  ) {
    return { type: 'unexpected' }
  }
  return {
    info: {
      clock: clock === 0 ? 'internal' : 'midi',
      currentSlot,
      engines: engineNumbers.map((engine) => officialOpenEngines[engine]),
      projectSize: sizeLow | (sizeHigh << 8),
      slotCount,
    },
    type: 'info',
  }
}
