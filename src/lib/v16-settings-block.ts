import { unpackSevenBitStream } from '@/lib/fm1-firmware'

/**
 * M-VAVE's V16 settings block, the updater protocol's object 4: 176 bytes that hold the selected
 * Voice's preset and channel and the FM1's global settings, among them the FX order. The owner
 * approved reading it (command `0x23`) and writing it back (`0x22`) with only the FX order bytes
 * changed on 2026-10-27 (AGENTS.md, "MIDI"). Nothing else of the `00 32` family is built here, and
 * this module refuses any other object, command, offset, or length. Offer it only where the
 * firmware profile's `effectOrder` allows.
 *
 * Confirmed: the frame, packed seven bits at a time least significant bit first inside `F0 … F7`,
 * is `00 59 <command> <length, 3 bytes little-endian> <payload> <checksum>`, the checksum the
 * complement of the payload's byte sum (the identity reply). Likely, from the firmware and from
 * the preset restore on object 5: the payload of a read or write is the object, a 32-bit
 * offset, a 24-bit length, then for a write the data. Needs hardware test: the layout of a read's
 * reply, that the version `0x0E` is the block's first byte, and everything about the 27 order
 * bytes (docs/fm1-research.md, "Object 4: the FX order").
 */
const updaterHeader = [0x00, 0x59] as const
const readCommand = 0x23
const writeCommand = 0x22

const settingsObject = 4
export const settingsBlockLength = 176
export const settingsBlockVersion = 0x0e
export const fxOrderOffset = 0x92
export const fxOrderLength = 27

/** The object, offset, and length that precede a write's data and may echo in a read's reply. */
const requestPrefix = Uint8Array.of(
  settingsObject,
  0,
  0,
  0,
  0,
  settingsBlockLength & 0xff,
  settingsBlockLength >> 8,
  0,
)

/** Packs 8-bit bytes seven bits at a time, least significant bit first, as `unpack…` reads them. */
function packSevenBitStream(bytes: readonly number[]) {
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

function checksumOf(payload: ArrayLike<number>) {
  return ~Array.from(payload).reduce((sum, byte) => sum + byte, 0) & 0xff
}

function makeUpdaterFrame(command: number, payload: ArrayLike<number>) {
  const body = [
    ...updaterHeader,
    command,
    payload.length & 0xff,
    (payload.length >> 8) & 0xff,
    payload.length >> 16,
    ...Array.from(payload),
    checksumOf(payload),
  ]
  return Uint8Array.of(0xf0, ...packSevenBitStream(body), 0xf7)
}

/** `F0 00 32 …`: asks for the whole settings block, from offset 0. It changes nothing. */
export function makeSettingsBlockReadRequest() {
  return makeUpdaterFrame(readCommand, requestPrefix)
}

/** A settings block exactly as the FM1 sent it. Only a read makes one. */
export type V16SettingsBlock = {
  /** The 176 bytes, eight bits each. */
  readonly bytes: Uint8Array
  /** The reply message, for the MIDI log and fixtures. */
  readonly reply: Uint8Array
}

/** Every block a read made, so a write can refuse one that was built any other way. */
const readBlocks = new WeakSet<V16SettingsBlock>()

type SettingsBlockProblem = 'checksum' | 'layout' | 'length' | 'seven-bit' | 'version'

export type SettingsBlockAnswer =
  { block: V16SettingsBlock; type: 'block' } | { problem: SettingsBlockProblem; type: 'invalid' }

/**
 * What a message says about a read of the block: null when it is not a reply to one, the block
 * when it holds one, and otherwise why it is not usable. A reply is the 176 bytes alone or the
 * 8-byte request prefix before them (**Needs hardware test**, since the notes do not say which).
 */
export function parseSettingsBlockReply(
  message: Uint8Array | readonly number[],
): SettingsBlockAnswer | null {
  const data = Uint8Array.from(message)
  if (data.length < 3 || data[0] !== 0xf0 || data[data.length - 1] !== 0xf7) return null
  const inner = data.subarray(1, -1)
  if (inner[0] !== 0x00 || inner[1] !== 0x32) return null
  const frame = unpackSevenBitStream(inner)
  if (frame[0] !== updaterHeader[0] || frame[1] !== updaterHeader[1] || frame[2] !== readCommand)
    return null
  const invalid = (problem: SettingsBlockProblem): SettingsBlockAnswer => ({
    problem,
    type: 'invalid',
  })
  if (inner.some((byte) => byte > 0x7f)) return invalid('seven-bit')
  const length = frame[3] | (frame[4] << 8) | (frame[5] << 16)
  // The packing may add a final partly-empty septet, so more bytes than the frame needs are fine.
  if (frame.length < 6 + length + 1) return invalid('length')
  const payload = frame.slice(6, 6 + length)
  if (frame[6 + length] !== checksumOf(payload)) return invalid('checksum')
  let block: number[]
  if (payload.length === settingsBlockLength) block = payload
  else if (
    payload.length === requestPrefix.length + settingsBlockLength &&
    requestPrefix.every((byte, index) => payload[index] === byte)
  )
    block = payload.slice(requestPrefix.length)
  else return invalid(payload.length < settingsBlockLength ? 'length' : 'layout')
  if (block[0] !== settingsBlockVersion) return invalid('version')
  const read: V16SettingsBlock = { bytes: Uint8Array.from(block), reply: data }
  readBlocks.add(read)
  return { block: read, type: 'block' }
}

/** The 27 FX order bytes of `block`, as the FM1 holds them. How they encode an order is not known. */
export function readFxOrderBytes(block: V16SettingsBlock) {
  assertRead(block)
  return block.bytes.slice(fxOrderOffset, fxOrderOffset + fxOrderLength)
}

function assertRead(block: V16SettingsBlock) {
  if (!readBlocks.has(block)) {
    throw new TypeError('A settings block is written back only from one the FM1 sent.')
  }
}

/**
 * `F0 00 32 …`: writes `block` back at offset 0 with its FX order bytes replaced by `order`, every
 * other byte as the FM1 sent it. With `order` equal to the block's own bytes it writes the block
 * back unchanged. The FM1 checks every field, rejects the whole block for one bad value, and
 * applies what changed, so a block read just before it is sent keeps the selected Voice's preset
 * and channel as they are.
 */
export function makeSettingsBlockWrite(block: V16SettingsBlock, order: ArrayLike<number>) {
  assertRead(block)
  if (order.length !== fxOrderLength) {
    throw new RangeError(`The FX order is ${fxOrderLength} bytes; received ${order.length}.`)
  }
  const bytes = Uint8Array.from(block.bytes)
  for (let index = 0; index < fxOrderLength; index += 1) {
    const value = order[index]
    if (!Number.isInteger(value) || value < 0 || value > 0xff) {
      throw new RangeError(`FX order byte ${index} is 0 to 255; received ${value}.`)
    }
    bytes[fxOrderOffset + index] = value
  }
  return makeUpdaterFrame(writeCommand, [...requestPrefix, ...bytes])
}
