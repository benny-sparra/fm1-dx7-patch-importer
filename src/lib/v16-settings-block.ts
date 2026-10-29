import { unpackSevenBitStream } from '@/lib/fm1-firmware'

/**
 * M-VAVE's V16 settings block, the updater protocol's object 4: 176 bytes that hold the selected
 * Voice's preset and channel and the FM1's global settings, among them the FX table at `0x92`.
 * The owner approved on 2026-10-27 exactly two frames (AGENTS.md, "MIDI"): command `0x23`, a read
 * of object 4, and command `0x22`, a write on object 4 of exactly the 27 FX table bytes at offset
 * `0x92`, never the whole block, and in them only byte 0 of entries 0–5, as an arrangement of
 * 0–5. This module builds those two and refuses every other object, command, offset, length, and
 * value. Offer it only where the firmware profile's `effectOrder` allows.
 *
 * Confirmed: the frame, packed seven bits at a time least significant bit first inside `F0 … F7`,
 * is `00 59 <command> <length, 3 bytes little-endian> <payload> <checksum>`, the checksum the
 * complement of the payload's byte sum (the identity reply). Likely, from the firmware
 * (docs/fm1-research.md, "Controlling Voices and effects more fully") and the preset restore on
 * object 5: the payload of a read or write is the object, a 32-bit little-endian offset, a 24-bit
 * length, then for a write the data; the block's first byte is the version `0x0E`; the table is
 * nine 3-byte entries whose byte 0 is the effect at chain position `p` and whose bytes 1 and 2
 * are effect `p`'s On/Off and Type, so a reorder rewrites those six bytes alone. Needs hardware
 * test: the layout of a read's reply, which end of the chain position 0 is, and that a write
 * touches nothing else.
 */
const updaterHeader = [0x00, 0x59] as const
const readCommand = 0x23
const writeCommand = 0x22

const settingsObject = 4
export const settingsBlockLength = 176
export const settingsBlockVersion = 0x0e
export const fxTableOffset = 0x92
export const fxTableLength = 27
const fxTableEntries = 9
/** The effects V16 has, Filter, Reverb, Delay, Distortion, Chorus, Phaser, as numbers 0–5. */
export const effectOrderSize = 6

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

/**
 * `F0 00 32 …`: reads 215 bytes of object 5 from offset 0 (command `0x23`), which the firmware
 * reading says hold the selected Voice's patch, the 27 live effect values at `0x9C`, and the FX
 * table at `0xB7` (**Likely**). Approved on 2026-10-29 for the hardware run and the development
 * probe only (AGENTS.md, "MIDI"): nothing in production sends it, and it is a fixed message with
 * no object, offset, or length to choose. Object 5's writes, which save banks to Flash, are never
 * built here.
 */
export function makeObject5LiveReadRequest() {
  return makeUpdaterFrame(readCommand, [5, 0, 0, 0, 0, 215, 0, 0])
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

type SettingsBlockAnswer =
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

function assertRead(block: V16SettingsBlock) {
  if (!readBlocks.has(block)) {
    throw new TypeError('A settings block is written back only from one the FM1 sent.')
  }
}

const isArrangement = (order: ArrayLike<number>) =>
  order.length === effectOrderSize &&
  Array.from({ length: effectOrderSize }, (_, effect) => effect).every((effect) =>
    Array.from(order).includes(effect),
  )

/**
 * The effects of V16's chain by position, as the FM1 holds them: the numbers 0–5, one each, or
 * null when the table is not an arrangement the editor knows how to move (the firmware checks the
 * nine entries differ, and puts 6–8 in the entries the chain does not read).
 */
export function readEffectOrder(block: V16SettingsBlock) {
  assertRead(block)
  const entries = Array.from(
    { length: fxTableEntries },
    (_, entry) => block.bytes[fxTableOffset + entry * 3],
  )
  if (new Set(entries).size !== fxTableEntries || entries.some((effect) => effect > 8)) return null
  const order = entries.slice(0, effectOrderSize)
  return isArrangement(order) ? order : null
}

/**
 * `F0 00 32 …`: writes the 27 FX table bytes at offset `0x92` of object 4, never the whole block.
 * They are `block`'s own with only byte 0 of entries 0–5 replaced by `order`, an arrangement of 0–5
 * by position; every other byte, entries 6–8 included, is as the FM1 sent it. A table that is not
 * an arrangement of 0–5 is refused, since it passes the FM1's check but would drop an effect.
 * Because the write carries the effects' On/Off and Type bytes too, read the block just before
 * sending, or a switch changed since would be put back.
 */
export function makeEffectOrderWrite(block: V16SettingsBlock, order: ArrayLike<number>) {
  if (readEffectOrder(block) === null) {
    throw new RangeError('The FM1’s FX table is not an order of the six effects.')
  }
  if (!isArrangement(order)) {
    throw new RangeError(
      `The effect order is each of 0 to 5 once; received ${Array.from(order).join(', ')}.`,
    )
  }
  const table = Array.from(block.bytes.subarray(fxTableOffset, fxTableOffset + fxTableLength))
  for (let position = 0; position < effectOrderSize; position += 1) {
    table[position * 3] = order[position]
  }
  return makeUpdaterFrame(writeCommand, [
    settingsObject,
    fxTableOffset,
    0,
    0,
    0,
    fxTableLength,
    0,
    0,
    ...table,
  ])
}

/** The ports a read talks through: a send, and the input's messages. */
export type V16SettingsLink = {
  listen: (hear: (message: Uint8Array | readonly number[]) => void) => () => void
  send: (message: Uint8Array) => void | Promise<void>
}

type V16SettingsReadProblem = 'cancelled' | 'no-reply' | 'send-failed' | 'unusable'

/** A read of the settings block that did not finish, with a code the UI can explain. */
export class V16SettingsReadError extends Error {
  readonly problem: V16SettingsReadProblem

  constructor(problem: V16SettingsReadProblem, message: string) {
    super(message)
    this.name = 'V16SettingsReadError'
    this.problem = problem
  }
}

/**
 * Asks the FM1 for its settings block and resolves with it. Asks again when no answer comes within
 * `timeoutMs`, up to `attempts` times; a reply that cannot be used fails at once, since asking
 * again would not change it. Aborting `signal` stops listening and rejects as cancelled.
 */
export function readV16SettingsBlock(
  link: V16SettingsLink,
  {
    attempts = 2,
    signal,
    timeoutMs = 1500,
  }: { attempts?: number; signal?: AbortSignal; timeoutMs?: number } = {},
) {
  const request = makeSettingsBlockReadRequest()
  return new Promise<V16SettingsBlock>((resolve, reject) => {
    let sent = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let settled = false
    let stopListening = () => {}

    const finish = (outcome: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      stopListening()
      signal?.removeEventListener('abort', cancel)
      outcome()
    }
    const fail = (problem: V16SettingsReadProblem, message: string) =>
      finish(() => reject(new V16SettingsReadError(problem, message)))
    function cancel() {
      fail('cancelled', 'The read of the settings block was cancelled.')
    }
    const ask = async () => {
      clearTimeout(timer)
      if (sent === attempts) {
        fail('no-reply', 'The FM1 did not answer the read of its settings block.')
        return
      }
      sent += 1
      try {
        await link.send(request)
      } catch {
        fail('send-failed', 'The read of the settings block could not be sent.')
        return
      }
      if (!settled) timer = setTimeout(() => void ask(), timeoutMs)
    }
    const hear = (message: Uint8Array | readonly number[]) => {
      const answer = parseSettingsBlockReply(message)
      if (!answer) return
      if (answer.type === 'block') finish(() => resolve(answer.block))
      else
        fail(
          'unusable',
          `The FM1 answered the read of its settings block unusably (${answer.problem}).`,
        )
    }

    if (signal?.aborted) {
      cancel()
      return
    }
    signal?.addEventListener('abort', cancel)
    stopListening = link.listen(hear)
    void ask()
  })
}
