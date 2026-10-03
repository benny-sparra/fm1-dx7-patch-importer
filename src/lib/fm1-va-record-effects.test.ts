import { describe, expect, it } from 'vitest'

import { dx7PackedVoiceSize } from '@/lib/dx7'
import { fm1EffectParameterCount } from '@/lib/fm1-effects'
import { parseFm1VaReply } from '@/lib/fm1-va-sysex'
import { capturedOrgan3Reply, capturedVirtualAnalogDistortionReply } from '@/test/fm1-va-captures'

import { fm1VaRecordEffects } from './fm1-va-record-effects'

function recordOf(reply: Uint8Array) {
  const parsed = parseFm1VaReply(reply)
  if (!parsed) throw new Error('The captured reply did not parse.')
  return parsed.data.slice(dx7PackedVoiceSize)
}

describe('fm1VaRecordEffects', () => {
  it('reads each effect controller from the place the hardware tests found it', () => {
    // Preset 097 after the record-mapping tests: every effect on, the Filter high pass and Reverb
    // Plate, and each setting the value the FX probe sent for it (docs/fm1-research.md).
    // prettier-ignore
    expect(Array.from(fm1VaRecordEffects(recordOf(capturedVirtualAnalogDistortionReply)))).toEqual([
      1, 2, 40, 5,
      1, 2, 11, 77,
      1, 12, 33, 13,
      1, 14, 44, 15,
      1, 16, 55, 17,
      1, 18, 19, 66,
    ])
  })

  it('reads a factory preset with every effect off', () => {
    // ORGAN 3 as FM-1+VA stores it: Cutoff 80 and every other setting 3.
    // prettier-ignore
    expect(Array.from(fm1VaRecordEffects(recordOf(capturedOrgan3Reply)))).toEqual([
      0, 0, 80, 3,
      0, 0, 3, 3,
      0, 3, 3, 3,
      0, 3, 3, 3,
      0, 3, 3, 3,
      0, 3, 3, 3,
    ])
  })

  it('holds a value above a controller’s range at its maximum', () => {
    const record = new Uint8Array(59)
    record[0] = 200
    record[28] = 0x7f

    const effects = fm1VaRecordEffects(record)

    expect(effects).toHaveLength(fm1EffectParameterCount)
    expect(effects[2]).toBe(107)
    expect(effects[0]).toBe(1)
  })
})
