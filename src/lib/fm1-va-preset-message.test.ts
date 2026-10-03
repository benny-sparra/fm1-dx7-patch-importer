import { describe, expect, it } from 'vitest'

import { dx7PackedVoiceSize, packDx7Voice, decodeVoiceName } from '@/lib/dx7'
import { FM1_VOICE_PARAMETER_COUNT } from '@/lib/fm1-parameters'
import { parseFm1VaReply } from '@/lib/fm1-va-sysex'
import { capturedOrgan3, capturedOrgan3Reply, capturedVirtualAnalog } from '@/test/fm1-va-captures'

import {
  fm1VaPresetMessageSize,
  fm1VaPresetPayloadStart,
  makeFm1VaPresetWrite,
  readFm1VaMessageRecord,
} from './fm1-va-preset-message'

/** The voice and record a captured preset write carries, as the library holds them. */
function contentsOf(message: Uint8Array) {
  const editBuffer = message.slice(
    fm1VaPresetPayloadStart,
    fm1VaPresetPayloadStart + FM1_VOICE_PARAMETER_COUNT,
  )
  return { record: readFm1VaMessageRecord(message), voice: packDx7Voice(editBuffer) }
}

describe('makeFm1VaPresetWrite', () => {
  it('builds the preset write FM-1+VA’s own backup holds for an FM preset, byte for byte', () => {
    const { record, voice } = contentsOf(capturedOrgan3)

    expect(makeFm1VaPresetWrite(0, voice, record)).toEqual(capturedOrgan3)
  })

  it('builds the preset write the backup holds for a preset whose record sets high bits', () => {
    const { record, voice } = contentsOf(capturedVirtualAnalog)

    expect(makeFm1VaPresetWrite(96, voice, record)).toEqual(capturedVirtualAnalog)
  })

  it('writes back exactly what the preset read returned', () => {
    // The read of ORGAN 3 on FM-1_093 matched the same preset in the backup FM-1_089 saved.
    const reply = parseFm1VaReply(capturedOrgan3Reply)
    if (!reply) throw new Error('The captured reply did not parse.')
    const data = reply.data.slice(0, dx7PackedVoiceSize)
    const voice = { data, name: decodeVoiceName(data) }

    const message = makeFm1VaPresetWrite(0, voice, reply.data.slice(dx7PackedVoiceSize))

    expect(message).toEqual(capturedOrgan3)
    expect(message).toHaveLength(fm1VaPresetMessageSize)
  })

  it('rejects a slot outside 0 to 127', () => {
    const { record, voice } = contentsOf(capturedOrgan3)

    expect(() => makeFm1VaPresetWrite(128, voice, record)).toThrow(RangeError)
    expect(() => makeFm1VaPresetWrite(-1, voice, record)).toThrow(RangeError)
    expect(() => makeFm1VaPresetWrite(1.5, voice, record)).toThrow(RangeError)
  })

  it('rejects a record that is not 59 bytes', () => {
    const { record, voice } = contentsOf(capturedOrgan3)

    expect(() => makeFm1VaPresetWrite(0, voice, record.slice(1))).toThrow(
      'An FM-1+VA settings record is 59 bytes; received 58.',
    )
  })

  it('rejects a voice whose edit buffer would hold a byte above seven bits', () => {
    const { record } = contentsOf(capturedOrgan3)
    const voice = { data: new Uint8Array(dx7PackedVoiceSize).fill(0xff), name: '' }

    expect(() => makeFm1VaPresetWrite(0, voice, record)).toThrow(RangeError)
  })
})
