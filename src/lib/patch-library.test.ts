import { describe, expect, it } from 'vitest'

import {
  emptyPatchLibrary,
  getBankVoices,
  importVoices,
  makeBankFingerprint,
  makeDemoVoices,
  moveVoice,
  renameVoice,
  voiceId,
} from '@/lib/patch-library'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'

describe('patch library operations', () => {
  it('fingerprints equal bank contents identically and detects a voice edit', () => {
    const voices = makeDemoVoices()
    const copied = voices.map((voice) => ({ ...voice, data: voice.data.slice() }))
    const edited = copied.map((voice) => ({ ...voice, data: voice.data.slice() }))
    edited[0].data[0] = 98

    expect(makeBankFingerprint(voices)).toBe(makeBankFingerprint(copied))
    expect(makeBankFingerprint(voices)).not.toBe(makeBankFingerprint(edited))
  })

  it('imports exactly 32 voices into a browser bank', () => {
    const result = importVoices(emptyPatchLibrary(), 'B', makeDemoVoices())

    expect(result.loadedBanks).toEqual(['B'])
    expect(getBankVoices(result, 'B')).toHaveLength(32)
    expect(result.voices[voiceId('B', 1)].name).toBe('E.PIANO1')
    expect(result.effects[voiceId('B', 1)]).toEqual(makeDefaultFm1Effects())
  })

  it('rejects incomplete bank imports', () => {
    expect(() => importVoices(emptyPatchLibrary(), 'A', makeDemoVoices().slice(0, 31)))
      .toThrow('exactly 32')
  })

  it('moves a voice and shifts the intervening slots', () => {
    const initial = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    const firstName = initial.voices[voiceId('A', 1)].name
    const secondName = initial.voices[voiceId('A', 2)].name
    const result = moveVoice(initial, 'A', 1, 3)

    expect(result.voices[voiceId('A', 1)].name).toBe(secondName)
    expect(result.voices[voiceId('A', 3)].name).toBe(firstName)
  })

  it('normalizes unsupported rename characters for DX7 storage', () => {
    const initial = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    const result = renameVoice(initial, voiceId('A', 1), 'BASS 🎹')

    expect(result.voices[voiceId('A', 1)].name).toBe('BASS')
  })
})
