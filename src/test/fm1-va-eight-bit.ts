import { dx7PackedVoiceSize } from '@/lib/dx7'
import { parseFm1VaReply } from '@/lib/fm1-va-sysex'
import { capturedEightBitReply } from '@/test/fm1-va-captures'

const reply = parseFm1VaReply(capturedEightBitReply)
if (!reply) throw new Error('The captured 8-Bit reply did not parse.')

/** Preset 097's voice bytes as FM-1_097 read them back: an 8-Bit preset named NES ROCK. */
export function capturedEightBitVoice() {
  return reply!.data.slice(0, dx7PackedVoiceSize)
}

/** Preset 097's settings record, whose byte 18 marks it as 8-Bit. */
export function capturedEightBitRecord() {
  return reply!.data.slice(dx7PackedVoiceSize)
}
