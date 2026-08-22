import { describe, expect, it } from 'vitest'

import {
  getFm1EffectParameters,
  getFm1VoiceParameters,
  makeDefaultFm1Effects,
  makeFm1EditorParameters,
  normalizeFm1Effects,
} from '@/lib/fm1-effects'

describe('FM1 effect editor data', () => {
  it('keeps voice and effect parameters in separate round-trippable sections', () => {
    const voice = Uint8Array.from({ length: 155 }, (_, index) => index % 100)
    const effects = makeDefaultFm1Effects()
    effects[2] = 107
    effects[18] = 75

    const editor = makeFm1EditorParameters(voice, effects)

    expect(getFm1VoiceParameters(editor)).toEqual(voice)
    expect(getFm1EffectParameters(editor)).toEqual(effects)
  })

  it('uses bypassed defaults for missing legacy effect data', () => {
    expect(normalizeFm1Effects(undefined)).toEqual(new Uint8Array(24))
  })

  it('clamps malformed stored values to documented effect ranges', () => {
    const stored = new Uint8Array(24).fill(127)

    expect(Array.from(normalizeFm1Effects(stored).slice(0, 4))).toEqual([1, 2, 107, 10])
  })
})
