import { describe, expect, it } from 'vitest'

import {
  makeDx7VoiceNameEdits,
  makeDx7SingleVoicePayload,
  packDx7Voice,
  unpackDx7Voice,
  updateDx7VoiceName,
  type Dx7Voice,
} from '@/lib/dx7'

function makeVoice(): Dx7Voice {
  const data = Uint8Array.from({ length: 128 }, (_, index) => index & 0x7f)
  for (let operator = 0; operator < 6; operator += 1) {
    const offset = operator * 17
    data[offset + 11] &= 0x0f
    data[offset + 13] &= 0x1f
    data[offset + 15] &= 0x3f
  }
  data[111] &= 0x0f
  return updateDx7VoiceName({ data, name: '' }, 'ROUNDTRIP')
}

describe('DX7 edit-buffer conversion', () => {
  it('round-trips a packed voice without losing combined bitfields', () => {
    const original = makeVoice()

    expect(packDx7Voice(unpackDx7Voice(original))).toEqual(original)
  })

  it('rejects a malformed packed voice before creating a single-voice dump', () => {
    expect(() =>
      makeDx7SingleVoicePayload({
        data: new Uint8Array(127),
        name: 'TOO SHORT',
      }),
    ).toThrow('128')
  })
})

describe('DX7 live voice-name edits', () => {
  it('emits only the name bytes that changed', () => {
    const parameters = unpackDx7Voice(makeVoice())

    expect(makeDx7VoiceNameEdits(parameters, 'ROUNDTWIP')).toEqual([[151, 0x57]])
  })

  it('pads a shortened name with spaces on the synth', () => {
    const parameters = unpackDx7Voice(makeVoice())

    expect(makeDx7VoiceNameEdits(parameters, 'ROUND')).toEqual([
      [150, 0x20],
      [151, 0x20],
      [152, 0x20],
      [153, 0x20],
    ])
  })
})
