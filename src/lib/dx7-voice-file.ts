import {
  dx7BankFileSize,
  dx7Checksum,
  isSevenBitData,
  makeDx7SingleVoicePayload,
  makeYamahaSysexMessage,
  packDx7Voice,
  type Dx7Voice,
} from '@/lib/dx7'
import { FM1_VOICE_PARAMETER_COUNT } from '@/lib/fm1-parameters'
import { patchSlotCode } from '@/lib/patch-library'
import { sysexFilenameStem } from '@/lib/sysex-file'

// F0 43 0n 00 01 1B, the 155 edit-buffer bytes, the checksum, and F7.
const dx7VoiceFileSize = FM1_VOICE_PARAMETER_COUNT + 8
const voiceDataStart = 6

// 'bank' is a file the size of a 32-voice bank, which belongs in a bank's own import.
type Dx7VoiceFileProblem = 'bank' | 'checksum' | 'format' | 'high-bit-data' | 'size'

/** A single-voice file that cannot be imported, with a code the UI can explain in any language. */
export class Dx7VoiceFileError extends Error {
  readonly problem: Dx7VoiceFileProblem
  readonly receivedBytes: number

  constructor(problem: Dx7VoiceFileProblem, message: string, receivedBytes: number) {
    super(message)
    this.name = 'Dx7VoiceFileError'
    this.problem = problem
    this.receivedBytes = receivedBytes
  }
}

function voiceSizeError(receivedBytes: number) {
  return new Dx7VoiceFileError(
    receivedBytes === dx7BankFileSize ? 'bank' : 'size',
    `Expected a ${dx7VoiceFileSize}-byte DX7 voice; received ${receivedBytes} bytes.`,
    receivedBytes,
  )
}

/** Reads a Yamaha DX7 single-voice bulk dump into the packed form the library stores. */
export function parseDx7VoiceFile(file: ArrayBuffer): Dx7Voice {
  const bytes = new Uint8Array(file)
  if (bytes.length !== dx7VoiceFileSize) throw voiceSizeError(bytes.length)
  if (
    bytes[0] !== 0xf0 ||
    bytes[1] !== 0x43 ||
    bytes[3] !== 0x00 ||
    bytes[4] !== 0x01 ||
    bytes[5] !== 0x1b ||
    bytes.at(-1) !== 0xf7
  ) {
    throw new Dx7VoiceFileError(
      'format',
      'This is not a Yamaha DX7 single-voice bulk SysEx file.',
      bytes.length,
    )
  }
  const voiceData = bytes.slice(voiceDataStart, voiceDataStart + FM1_VOICE_PARAMETER_COUNT)
  if (!isSevenBitData(voiceData)) {
    throw new Dx7VoiceFileError(
      'high-bit-data',
      'The DX7 voice contains data bytes outside the 7-bit MIDI range.',
      bytes.length,
    )
  }
  if (dx7Checksum(voiceData) !== bytes.at(-2)) {
    throw new Dx7VoiceFileError('checksum', 'The DX7 voice checksum is invalid.', bytes.length)
  }

  return packDx7Voice(voiceData)
}

/**
 * Reads a single-voice file the user chose. A file of the wrong size is rejected before it is
 * loaded, so picking a large file by mistake does not read all of it into memory.
 */
export async function readDx7VoiceFile(file: Blob) {
  if (file.size !== dx7VoiceFileSize) throw voiceSizeError(file.size)
  return parseDx7VoiceFile(await file.arrayBuffer())
}

/** A complete Yamaha DX7 single-voice SysEx file, ready to save as a .syx file. */
export function makeDx7VoiceFile(voice: Dx7Voice) {
  return makeYamahaSysexMessage(makeDx7SingleVoicePayload(voice))
}

/** Names a downloaded voice after its slot and patch name, such as fm1-A05-PIANO-2.syx. */
export function makeDx7VoiceFilename(patch: { bank: string; name: string; number: number }) {
  const stem = sysexFilenameStem(patch.name)
  return `fm1-${patchSlotCode(patch)}${stem ? `-${stem}` : ''}.syx`
}
