import { decodeVoiceName, dx7PackedVoiceSize, isSevenBitData } from '@/lib/dx7'

/**
 * A Virtual Analog preset's voice, as FM-1+VA stores and reads it back: 128 bytes in the layout of
 * a packed DX7 voice, kept exactly as read. They are not a DX7 voice (docs/fm1-research.md, "A
 * Virtual Analog preset's voice bytes are not a DX7 voice"), so the library keeps them apart from
 * its DX7 voices, and nothing normalises them, plays them, or exports them as one.
 */
export function isFm1VaVirtualAnalogVoice(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array && value.length === dx7PackedVoiceSize && isSevenBitData(value)
}

/** The name a Virtual Analog preset carries in the voice's name bytes, as an FM preset does. */
export function fm1VaVirtualAnalogName(voice: Uint8Array) {
  return decodeVoiceName(voice)
}
