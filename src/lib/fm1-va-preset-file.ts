import {
  decodeVoiceName,
  dx7BankVoiceCount,
  isSevenBitData,
  packDx7Voice,
  type Dx7Voice,
} from '@/lib/dx7'
import { FM1_VOICE_PARAMETER_COUNT } from '@/lib/fm1-parameters'
import type { Fm1VaStoredPreset } from '@/lib/fm1-va-preset-read'
import { fm1VaRecordEffects } from '@/lib/fm1-va-record-effects'
import {
  fm1VaPresetChecksumIndex,
  fm1VaPresetHeader,
  fm1VaPresetMessageSize,
  fm1VaPresetPayloadStart,
  fm1VaRecordByteIndex,
  readFm1VaMessageRecord,
} from '@/lib/fm1-va-preset-message'
import { fm1VaChecksum } from '@/lib/fm1-va-sysex'
import type { FetchedSound } from '@/lib/patch-library'
import { soundKey } from '@/lib/sound-key'

/**
 * FM-1+VA's stored presets, from the `.syx` file its **Save a backup** writes or read from the FM1
 * itself. The file holds one preset write per stored preset, 128 in slot order, each
 * `F0 43 00 7D 04 <slot> <155-byte DX7 voice> <68-byte settings record> <sum> F7`
 * (docs/fm1-research.md, FM-1+VA). Each FM preset's voice is read with its record, kept exactly as
 * stored, and the effects the record holds; a Virtual Analog preset is only named.
 */
const fm1VaPresetCount = 128
export const fm1VaPresetFileSize = fm1VaPresetCount * fm1VaPresetMessageSize

// Record byte 18 is `5A` in a Virtual Analog preset and `03` in an FM one. In the file its high
// bit, which is clear in every preset seen, is not read.
const engineMarkerByte = 18
const engineMarkerIndex = fm1VaRecordByteIndex(engineMarkerByte)
const virtualAnalogMarker = 0x5a

/** The FM1 banks a backup holds, in the order of its presets. */
export const fm1VaPresetBanks = ['A', 'B', 'C', 'D'] as const
export type Fm1VaPresetBank = (typeof fm1VaPresetBanks)[number]

/**
 * A stored preset: an FM preset's DX7 voice, with its record and the effects the record holds, a
 * Virtual Analog preset, whose voice bytes are not a DX7 voice and which the library cannot hold
 * yet, or one that arrived damaged.
 */
export type Fm1VaPreset =
  | { kind: 'damaged' }
  | { effects: Uint8Array; kind: 'fm'; record: Uint8Array; voice: Dx7Voice }
  | { kind: 'virtual-analog'; name: string }

function fmPreset(record: Uint8Array, voice: Dx7Voice): Fm1VaPreset {
  return { effects: fm1VaRecordEffects(record), kind: 'fm', record, voice }
}

/** One FM1 bank: its 32 presets in slot order. */
export type Fm1VaPresetFileBank = { bank: Fm1VaPresetBank; presets: Fm1VaPreset[] }

/**
 * A bank's patches for the library, each with its record, and null for each preset an import leaves
 * as it is.
 */
export function importableSounds({ presets }: Fm1VaPresetFileBank): (FetchedSound | null)[] {
  return presets.map((preset) =>
    preset.kind === 'fm'
      ? { effects: preset.effects, record: preset.record, voice: preset.voice }
      : null,
  )
}

/**
 * Whether a preset differs from the patch in the library slot it would replace, as the sound key
 * compares patches: voice data, FM1 effects, and record. A slot the library has no patch in
 * differs; a preset the import leaves out does not.
 */
export function differsFromLibrary(
  preset: Fm1VaPreset,
  slot: { effects?: Uint8Array; record?: Uint8Array; voice?: Dx7Voice },
) {
  if (preset.kind !== 'fm') return false
  return (
    !slot.voice ||
    soundKey(preset.voice, preset.effects, preset.record) !==
      soundKey(slot.voice, slot.effects, slot.record)
  )
}

/** Splits 128 presets in slot order into FM1 banks A–D. */
function toPresetBanks(presets: readonly Fm1VaPreset[]): Fm1VaPresetFileBank[] {
  return fm1VaPresetBanks.map((bank, index) => ({
    bank,
    presets: presets.slice(index * dx7BankVoiceCount, (index + 1) * dx7BankVoiceCount),
  }))
}

/**
 * A preset read from the FM1. Its voice and record arrive eight bits a byte; an FM preset whose
 * voice holds a byte above seven bits is not a DX7 voice the library can keep, so it counts as
 * damaged.
 */
function readStoredPreset({ record, voice }: Fm1VaStoredPreset): Fm1VaPreset {
  const name = decodeVoiceName(voice)
  if (record[engineMarkerByte] === virtualAnalogMarker) return { kind: 'virtual-analog', name }
  if (!isSevenBitData(voice)) return { kind: 'damaged' }
  return fmPreset(record.slice(), { data: voice.slice(), name })
}

/** The FM1 banks A–D from the 128 presets read from the FM1, in slot order. */
export function fm1VaPresetBanksFromRead(
  presets: readonly Fm1VaStoredPreset[],
): Fm1VaPresetFileBank[] {
  return toPresetBanks(presets.map(readStoredPreset))
}

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

function hasPresetHeader(message: Uint8Array) {
  return fm1VaPresetHeader.every((byte, index) => message[index] === byte)
}

/** Reads one preset write; one that is damaged or carries another slot counts as damaged. */
function readPreset(message: Uint8Array, slot: number): Fm1VaPreset {
  if (!hasPresetHeader(message) || message[5] !== slot || message.at(-1) !== 0xf7) {
    return { kind: 'damaged' }
  }
  const payload = message.subarray(fm1VaPresetPayloadStart, fm1VaPresetChecksumIndex)
  if (!isSevenBitData(payload) || fm1VaChecksum(payload) !== message[fm1VaPresetChecksumIndex]) {
    return { kind: 'damaged' }
  }
  const voice = packDx7Voice(payload.slice(0, FM1_VOICE_PARAMETER_COUNT))
  return message[engineMarkerIndex] === virtualAnalogMarker
    ? { kind: 'virtual-analog', name: voice.name }
    : fmPreset(readFm1VaMessageRecord(message), voice)
}

/**
 * Reads an FM-1+VA backup into FM1 banks A–D. A damaged preset is reported rather than failing the
 * whole file; a file in which no preset can be read is refused.
 */
export function parseFm1VaPresetFile(file: ArrayBuffer): Fm1VaPresetFileBank[] {
  const bytes = new Uint8Array(file)
  if (bytes.length !== fm1VaPresetFileSize) throw presetFileSizeError(bytes.length)
  if (!hasPresetHeader(bytes)) {
    throw new Fm1VaPresetFileError('format', 'This is not a backup saved by FM-1+VA.', bytes.length)
  }

  const presets = Array.from({ length: fm1VaPresetCount }, (_, slot) => {
    const start = slot * fm1VaPresetMessageSize
    return readPreset(bytes.subarray(start, start + fm1VaPresetMessageSize), slot)
  })
  if (presets.every(({ kind }) => kind === 'damaged')) {
    throw new Fm1VaPresetFileError(
      'damaged',
      'No preset in the FM-1+VA backup could be read.',
      bytes.length,
    )
  }

  return toPresetBanks(presets)
}

/**
 * Reads a backup the user chose. A file of the wrong size is refused before it is loaded, so
 * picking a large file by mistake does not read all of it into memory.
 */
export async function readFm1VaPresetFile(file: Blob) {
  if (file.size !== fm1VaPresetFileSize) throw presetFileSizeError(file.size)
  return parseFm1VaPresetFile(await file.arrayBuffer())
}
