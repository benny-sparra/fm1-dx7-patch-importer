import { dx7PackedVoiceSize } from '@/lib/dx7'
import { parseFm1VaReply } from '@/lib/fm1-va-sysex'
import { capturedVirtualAnalogFilterOnReply } from '@/test/fm1-va-captures'

const reply = parseFm1VaReply(capturedVirtualAnalogFilterOnReply)
if (!reply) throw new Error('The captured Virtual Analog reply did not parse.')

/** Preset 097's voice bytes as FM-1_093 read them back: a Virtual Analog preset named VOICE 97. */
function capturedVirtualAnalogVoice() {
  return reply!.data.slice(0, dx7PackedVoiceSize)
}

/** Preset 097's settings record, whose byte 18 marks it as Virtual Analog. */
export function capturedVirtualAnalogRecord() {
  return reply!.data.slice(dx7PackedVoiceSize)
}

/**
 * Virtual Analog voice bytes holding 127 where a DX7 voice allows 99, as FM-1+VA's preset pack
 * does, so a test can see that nothing clamps them.
 */
export function virtualAnalogVoiceBeyondDx7Ranges() {
  const voice = capturedVirtualAnalogVoice()
  voice[112] = 127
  return voice
}
