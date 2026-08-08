import { describe, expect, it } from 'vitest'

import {
  emptyPatchLibrary,
  getBankVoices,
  initializePatchLibrary,
  importVoices,
  makeBankFingerprint,
  makeDemoVoices,
  makeFactoryPatchLibrary,
  moveVoice,
  renameVoice,
  voiceId,
} from '@/lib/patch-library'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'

describe('patch library operations', () => {
  it('maps the first four Yamaha factory ROM banks to browser banks A through D', () => {
    const result = makeFactoryPatchLibrary()

    expect(result.loadedBanks).toEqual(['A', 'B', 'C', 'D'])
    expect(getBankVoices(result, 'A')).toHaveLength(32)
    expect(getBankVoices(result, 'B')).toHaveLength(32)
    expect(getBankVoices(result, 'C')).toHaveLength(32)
    expect(getBankVoices(result, 'D')).toHaveLength(32)
    expect([
      result.voices[voiceId('A', 1)].name,
      result.voices[voiceId('A', 11)].name,
      result.voices[voiceId('B', 1)].name,
      result.voices[voiceId('C', 1)].name,
      result.voices[voiceId('D', 1)].name,
    ]).toEqual(['BRASS   1', 'E.PIANO 1', 'PIANO   4', 'PICCOLO', 'SYN-LEAD 2'])
  })

  it('creates fresh factory voice data for each initialization or reset', () => {
    const first = makeFactoryPatchLibrary()
    first.voices[voiceId('A', 1)].data[0] = 0

    const second = makeFactoryPatchLibrary()

    expect(second.voices[voiceId('A', 1)].data[0]).not.toBe(0)
  })

  it('seeds only an absent library and preserves an intentionally empty saved library', () => {
    const savedEmptyLibrary = emptyPatchLibrary()

    expect(initializePatchLibrary(null).loadedBanks).toEqual(['A', 'B', 'C', 'D'])
    expect(initializePatchLibrary(savedEmptyLibrary)).toBe(savedEmptyLibrary)
    expect(initializePatchLibrary(savedEmptyLibrary).loadedBanks).toEqual([])
  })

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
