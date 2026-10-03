import { isSevenBitData, unpackDx7Voice, type Dx7Voice } from '@/lib/dx7'
import { FM1_VOICE_PARAMETER_COUNT } from '@/lib/fm1-parameters'
import { fm1VaChecksum, fm1VaRequestHeader } from '@/lib/fm1-va-sysex'
import { fm1VaRecordSize } from '@/lib/patch-library'

/**
 * FM-1+VA's preset write, `F0 43 00 7D 04 <slot> <155-byte voice> <68-byte record> <sum> F7`
 * (docs/fm1-research.md, FM-1+VA): the message that stores one preset exactly, and the message
 * its **Save a backup** file holds one of for each preset. The checksum covers only the 223
 * payload bytes after the slot.
 */
export const fm1VaPresetMessageSize = 231
export const fm1VaPresetHeader = [...fm1VaRequestHeader, 0x04] as const
export const fm1VaPresetPayloadStart = fm1VaPresetHeader.length + 1
export const fm1VaPresetChecksumIndex = fm1VaPresetMessageSize - 2
const recordStart = fm1VaPresetPayloadStart + FM1_VOICE_PARAMETER_COUNT
const slotCount = 128

/**
 * Where record byte `index` sits in a message. The record travels in groups of eight: a byte that
 * carries the high bits of the seven bytes after it, bit k for byte k, then those seven bytes' low
 * bits.
 */
export function fm1VaRecordByteIndex(index: number) {
  return recordStart + Math.floor(index / 7) * 8 + 1 + (index % 7)
}

/** The record a message carries, out of its groups of eight. */
export function readFm1VaMessageRecord(message: Uint8Array) {
  return Uint8Array.from({ length: fm1VaRecordSize }, (_, index) => {
    const highBits = message[recordStart + Math.floor(index / 7) * 8]
    return message[fm1VaRecordByteIndex(index)] | (((highBits >> (index % 7)) & 1) << 7)
  })
}

/** A record in the groups of eight it travels in: 59 bytes become 68. */
function packRecord(record: Uint8Array) {
  const packed: number[] = []
  for (let start = 0; start < record.length; start += 7) {
    const group = record.subarray(start, start + 7)
    packed.push(group.reduce((highBits, byte, bit) => highBits | ((byte >> 7) << bit), 0))
    group.forEach((byte) => packed.push(byte & 0x7f))
  }
  return packed
}

/**
 * The preset write that stores `voice` and `record` in preset `slot` (0–127), exactly. The voice
 * travels as its 155-byte edit buffer, so its bytes must be seven-bit, and the record must be the
 * 59 bytes a read returns. Sending it replaces that stored preset at once: only code that the
 * preset write's approval in `AGENTS.md` covers may send it.
 */
export function makeFm1VaPresetWrite(slot: number, voice: Dx7Voice, record: Uint8Array) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= slotCount) {
    throw new RangeError(`An FM-1+VA preset slot is 0 to ${slotCount - 1}; received ${slot}.`)
  }
  if (record.length !== fm1VaRecordSize) {
    throw new RangeError(
      `An FM-1+VA settings record is ${fm1VaRecordSize} bytes; received ${record.length}.`,
    )
  }
  const editBuffer = Uint8Array.from(unpackDx7Voice(voice))
  if (!isSevenBitData(editBuffer)) {
    throw new RangeError('An FM-1+VA preset write needs a voice whose bytes are seven-bit.')
  }
  const payload = Uint8Array.of(...editBuffer, ...packRecord(record))
  return Uint8Array.of(...fm1VaPresetHeader, slot, ...payload, fm1VaChecksum(payload), 0xf7)
}
