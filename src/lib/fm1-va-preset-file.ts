import { dx7BankVoiceCount, isSevenBitData, packDx7Voice, type Dx7Voice } from '@/lib/dx7'
import { FM1_VOICE_PARAMETER_COUNT } from '@/lib/fm1-parameters'

/**
 * The `.syx` file FM-1+VA's **Save a backup** writes: one preset write per stored preset, 128 in
 * slot order, each `F0 43 00 7D 04 <slot> <155-byte DX7 voice> <68-byte settings record> <sum> F7`
 * (docs/fm1-research.md, FM-1+VA). The record holds the preset's effects, which are not mapped yet,
 * so only the voices are read.
 */
const fm1VaPresetCount = 128
const fm1VaPresetMessageSize = 231
export const fm1VaPresetFileSize = fm1VaPresetCount * fm1VaPresetMessageSize
const fm1VaPresetHeader = [0xf0, 0x43, 0x00, 0x7d, 0x04] as const
const payloadStart = fm1VaPresetHeader.length + 1
const checksumIndex = fm1VaPresetMessageSize - 2

/** The FM1 banks a backup holds, in the order of its presets. */
const fm1VaPresetBanks = ['A', 'B', 'C', 'D'] as const
export type Fm1VaPresetBank = (typeof fm1VaPresetBanks)[number]

/**
 * One FM1 bank from the file: its 32 patches in slot order, with null for a preset whose message
 * was damaged, which an import leaves as it is.
 */
export type Fm1VaPresetFileBank = { bank: Fm1VaPresetBank; voices: (Dx7Voice | null)[] }

type Fm1VaPresetFileProblem = 'damaged' | 'format' | 'size'

/** A file that cannot be read as an FM-1+VA backup, with a code the UI can explain. */
export class Fm1VaPresetFileError extends Error {
  readonly problem: Fm1VaPresetFileProblem
  readonly receivedBytes: number

  constructor(problem: Fm1VaPresetFileProblem, message: string, receivedBytes: number) {
    super(message)
    this.name = 'Fm1VaPresetFileError'
    this.problem = problem
    this.receivedBytes = receivedBytes
  }
}

function presetFileSizeError(receivedBytes: number) {
  return new Fm1VaPresetFileError(
    'size',
    `Expected a ${fm1VaPresetFileSize}-byte FM-1+VA backup; received ${receivedBytes} bytes.`,
    receivedBytes,
  )
}

/** FM-1+VA's checksum: the low seven bits of the sum of each payload byte's complement. */
export function fm1VaChecksum(payload: Uint8Array) {
  return payload.reduce((sum, byte) => sum + (~byte & 0x7f), 0) & 0x7f
}

function hasPresetHeader(message: Uint8Array) {
  return fm1VaPresetHeader.every((byte, index) => message[index] === byte)
}

/** Reads one preset write, or null when it is damaged or does not carry the expected slot. */
function readPresetVoice(message: Uint8Array, slot: number): Dx7Voice | null {
  if (!hasPresetHeader(message) || message[5] !== slot || message.at(-1) !== 0xf7) return null
  const payload = message.subarray(payloadStart, checksumIndex)
  if (!isSevenBitData(payload) || fm1VaChecksum(payload) !== message[checksumIndex]) return null
  return packDx7Voice(payload.slice(0, FM1_VOICE_PARAMETER_COUNT))
}

/**
 * Reads an FM-1+VA backup into FM1 banks A–D. A damaged preset leaves a gap rather than failing
 * the whole file; a file in which no preset can be read is refused.
 */
export function parseFm1VaPresetFile(file: ArrayBuffer): Fm1VaPresetFileBank[] {
  const bytes = new Uint8Array(file)
  if (bytes.length !== fm1VaPresetFileSize) throw presetFileSizeError(bytes.length)
  if (!hasPresetHeader(bytes)) {
    throw new Fm1VaPresetFileError('format', 'This is not a backup saved by FM-1+VA.', bytes.length)
  }

  const presets = Array.from({ length: fm1VaPresetCount }, (_, slot) => {
    const start = slot * fm1VaPresetMessageSize
    return readPresetVoice(bytes.subarray(start, start + fm1VaPresetMessageSize), slot)
  })
  if (presets.every((voice) => voice === null)) {
    throw new Fm1VaPresetFileError(
      'damaged',
      'No preset in the FM-1+VA backup could be read.',
      bytes.length,
    )
  }

  return fm1VaPresetBanks.map((bank, index) => ({
    bank,
    voices: presets.slice(index * dx7BankVoiceCount, (index + 1) * dx7BankVoiceCount),
  }))
}

/**
 * Reads a backup the user chose. A file of the wrong size is refused before it is loaded, so
 * picking a large file by mistake does not read all of it into memory.
 */
export async function readFm1VaPresetFile(file: Blob) {
  if (file.size !== fm1VaPresetFileSize) throw presetFileSizeError(file.size)
  return parseFm1VaPresetFile(await file.arrayBuffer())
}
