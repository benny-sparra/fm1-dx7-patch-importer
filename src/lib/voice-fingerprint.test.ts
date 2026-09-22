import { describe, expect, it } from 'vitest'

import { updateDx7VoiceName } from '@/lib/dx7'
import { makeDemoVoices } from '@/lib/patch-library'
import { voiceFingerprint } from '@/lib/voice-fingerprint'

describe('voice fingerprint', () => {
  it('gives equal voice data the same fingerprint', () => {
    const [voice] = makeDemoVoices()

    expect(voiceFingerprint(Uint8Array.from(voice.data))).toBe(voiceFingerprint(voice.data))
  })

  it('tells apart voices that differ only in one byte', () => {
    const [voice] = makeDemoVoices()
    const changed = Uint8Array.from(voice.data)
    changed[0] ^= 1

    expect(voiceFingerprint(changed)).not.toBe(voiceFingerprint(voice.data))
  })

  it('tells apart voices that differ only in name', () => {
    const [voice] = makeDemoVoices()

    expect(voiceFingerprint(updateDx7VoiceName(voice, 'OTHER').data)).not.toBe(
      voiceFingerprint(voice.data),
    )
  })

  // The catalog index stores these in JSON, which keeps an integer exactly only up to 2^53.
  it('stays a safe integer', () => {
    for (const voice of makeDemoVoices()) {
      expect(Number.isSafeInteger(voiceFingerprint(voice.data))).toBe(true)
    }
  })

  // The committed catalog index holds fingerprints, so the function must never change its output.
  it('keeps the value the catalog index was written with', () => {
    expect(voiceFingerprint(new Uint8Array(128))).toMatchInlineSnapshot(`7353451592204304`)
  })
})
