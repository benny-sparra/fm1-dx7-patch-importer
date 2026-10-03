import { describe, expect, it } from 'vitest'

import { makeDemoVoices } from '@/lib/patch-library'

import { soundKey } from './sound-key'

const [voice] = makeDemoVoices()
const record = (seed: number) =>
  Uint8Array.from({ length: 59 }, (_, index) => (index + seed) & 0xff)

describe('soundKey', () => {
  it('tells apart the same voice and effects with different FM-1+VA records', () => {
    expect(soundKey(voice, undefined, record(1))).not.toBe(soundKey(voice, undefined, record(2)))
  })

  it('tells apart a sound with a record from the same sound without one', () => {
    expect(soundKey(voice, undefined, record(1))).not.toBe(soundKey(voice, undefined))
  })

  it('gives copies of the same record the same key', () => {
    expect(soundKey(voice, undefined, record(1))).toBe(soundKey(voice, undefined, record(1)))
  })
})
