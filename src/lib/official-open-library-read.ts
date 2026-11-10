import {
  dx7BankFileSize,
  dx7BankVoiceCount,
  dx7Checksum,
  dx7PackedVoiceSize,
  packDx7Voice,
  parseDx7Bank,
  type Dx7Voice,
} from '@/lib/dx7'
import { FM1_VOICE_PARAMETER_COUNT } from '@/lib/fm1-parameters'
import { OfficialOpenReadError } from '@/lib/official-open-transfer'

/**
 * Turns what M-VAVE's Official Open sends for a read (`readOfficialOpenExport`) into the library's
 * DX7 voices (docs/fm1-research.md, "Official Open V14", and the reads of 2026-10-20). Bytes that
 * are not what the read is documented to give are refused as `unexpected`, never repaired.
 */

/** A track's voice (kind 1): the 155 edit-buffer bytes, then which operators are switched on. */
const trackVoiceSize = FM1_VOICE_PARAMETER_COUNT + 1
const libraryBankSize = dx7BankVoiceCount * dx7PackedVoiceSize

function unexpected(message: string) {
  return new OfficialOpenReadError('unexpected', message)
}

/**
 * The patch a DX7 track plays, from its 156-byte voice. The last byte, which operators are
 * switched on, has no place in a patch: mute and solo are the editor's, so a track with operators
 * switched off reads as a patch with all six on.
 */
export function officialOpenTrackVoice(bytes: Uint8Array): Dx7Voice {
  if (bytes.length !== trackVoiceSize) {
    throw unexpected(`Expected a ${trackVoiceSize}-byte track voice; received ${bytes.length}.`)
  }
  try {
    return packDx7Voice(bytes.slice(0, FM1_VOICE_PARAMETER_COUNT))
  } catch {
    throw unexpected('The track voice holds bytes above seven bits.')
  }
}

/**
 * The 32 patches of one bank of the FM1's DX7 library, from its 4096 bytes: standard packed
 * voices with no SysEx frame. They are checked as a bank file's are, by framing them as one.
 */
export function officialOpenLibraryBank(bytes: Uint8Array): Dx7Voice[] {
  if (bytes.length !== libraryBankSize) {
    throw unexpected(`Expected a ${libraryBankSize}-byte library bank; received ${bytes.length}.`)
  }
  const file = new Uint8Array(dx7BankFileSize)
  file.set([0xf0, 0x43, 0x00, 0x09, 0x20, 0x00])
  file.set(bytes, 6)
  file.set([dx7Checksum(bytes), 0xf7], 6 + libraryBankSize)
  try {
    return parseDx7Bank(file.buffer)
  } catch {
    throw unexpected('The library bank holds bytes above seven bits.')
  }
}
