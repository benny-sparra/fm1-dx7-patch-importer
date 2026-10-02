import { dx7PackedVoiceSize } from '@/lib/dx7'
import { fm1VaPresetRecordSize } from '@/lib/fm1-va-preset-read'

/** Packs bytes seven bits at a time, least significant bit first, as FM-1+VA sends its replies. */
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

type ReplyOptions = {
  argument: number
  /** Corrupts the reply's checksum, as a damaged message would arrive. */
  badChecksum?: boolean
  data?: readonly number[]
  kind?: number
  status?: number
}

/**
 * An FM-1+VA reply built from the layout in docs/fm1-research.md, "Reading a stored preset". Not
 * captured from an FM1: replace it with a captured reply once one is recorded.
 */
export function makeFm1VaReply({
  argument,
  badChecksum = false,
  data = [],
  kind = 0x50,
  status = 0,
}: ReplyOptions) {
  const buffer = [
    0x7d,
    kind,
    status,
    argument & 0xff,
    (argument >> 8) & 0xff,
    (argument >> 16) & 0xff,
    (argument >>> 24) & 0xff,
    data.length & 0xff,
    data.length >> 8,
    ...data,
  ]
  const sum = buffer.reduce((total, byte) => total + byte, 0)
  buffer.push((~sum & 0xff) ^ (badChecksum ? 1 : 0))
  return Uint8Array.of(0xf0, ...packSevenBitStream(buffer), 0xf7)
}

/** A preset's voice and record, each byte different so a misplaced byte shows. */
export function makeStoredPresetData(seed = 0) {
  const voice = Array.from({ length: dx7PackedVoiceSize }, (_, index) => (index + seed) & 0x7f)
  const record = Array.from(
    { length: fm1VaPresetRecordSize },
    (_, index) => (0xff - index - seed) & 0xff,
  )
  return { record, voice }
}

/** A reply carrying stored preset `slot`. */
export function makeFm1VaPresetReply(slot: number, seed = 0) {
  const { record, voice } = makeStoredPresetData(seed)
  return makeFm1VaReply({ argument: slot, data: [...voice, ...record] })
}
