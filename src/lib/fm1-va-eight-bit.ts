import { decodeVoiceName, dx7PackedVoiceSize, isSevenBitData } from '@/lib/dx7'

/**
 * An 8-Bit preset's voice, as FM-1+VA stores and reads it back from `FM-1_096`: 128 bytes in the
 * layout of a packed DX7 voice, kept exactly as read. They hold the preset's drums, bass, and lead
 * (docs/fm1-research.md, "Every field of an 8-Bit preset"), not a DX7 voice, so the library keeps
 * them apart from its DX7 voices and its Virtual Analog presets, and nothing normalises them,
 * plays them, or exports them as a DX7 voice.
 */
export function isFm1VaEightBitVoice(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array && value.length === dx7PackedVoiceSize && isSevenBitData(value)
}

/** The name an 8-Bit preset carries in the voice's name bytes, as an FM preset does. */
export function fm1VaEightBitName(voice: Uint8Array) {
  return decodeVoiceName(voice)
}
