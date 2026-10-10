import { makeDx7VoiceFilename } from '@/lib/dx7-voice-file'
import { fm1VaStoredVoice, makeFm1VaPresetWrite } from '@/lib/fm1-va-preset-message'
import { fm1VaRecordWithEffects } from '@/lib/fm1-va-record-effects'

/** A patch whose voice bytes are not a DX7 voice, so it is saved as an FM-1+VA preset. */
type PresetPatch = {
  bank: string
  effects: Uint8Array | undefined
  name: string
  number: number
  /** The FM1 program the slot selects, in banks A–D only. */
  program?: number
  record: Uint8Array
  voice: Uint8Array
}

/** The voice bytes cannot be stored exactly, so a file of them would not read back the same. */
export class Fm1VaPresetFileInexactError extends Error {
  constructor() {
    super('The preset’s voice bytes cannot be stored exactly in a preset write.')
    this.name = 'Fm1VaPresetFileInexactError'
  }
}

function sameBytes(bytes: Uint8Array, other: Uint8Array) {
  return bytes.length === other.length && bytes.every((byte, index) => byte === other[index])
}

/**
 * A Virtual Analog or 8-Bit patch as a presets file of one preset, the file Baud Girl's Device
 * Manager saves with **Save as a file**: one preset write, holding the voice bytes as read and the
 * record with the library's effects in it, as **Write patches to the FM1…** writes the patch. It
 * names the slot's own FM1 preset, or for an added bank the same slot in bank A, which is where
 * importing the file puts it. Nothing is sent to the FM1.
 */
export function makeFm1VaPresetFile(patch: PresetPatch) {
  if (!sameBytes(fm1VaStoredVoice(patch.voice), patch.voice)) {
    throw new Fm1VaPresetFileInexactError()
  }
  const record = fm1VaRecordWithEffects(patch.record, patch.effects ?? new Uint8Array())
  const slot = patch.program ?? patch.number - 1
  return Uint8Array.from(makeFm1VaPresetWrite(slot, patch.voice, record))
}

/** Names the file as a DX7 patch download is named, such as fm1-A03-NES-ROCK.syx. */
export const makeFm1VaPresetFilename = makeDx7VoiceFilename
