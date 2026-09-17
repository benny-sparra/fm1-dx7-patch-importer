import { describe, expect, it } from 'vitest'

import {
  isBlackKey,
  makePianoKeys,
  mapComputerPianoKeys,
  qwertyKeyLabel,
} from '@/lib/piano-keyboard'

describe('piano keyboard mapping', () => {
  it('maps the two-octave surface to MIDI notes and labels', () => {
    const { blackKeys, whiteKeys } = makePianoKeys(3)
    expect(whiteKeys).toHaveLength(15)
    expect(blackKeys).toHaveLength(10)
    expect(whiteKeys[0]).toMatchObject({ computerKeyCode: 'KeyA', label: 'C3', note: 48 })
    expect(blackKeys[0]).toMatchObject({
      computerKeyCode: 'KeyW',
      label: 'C#3',
      note: 49,
      position: 0,
    })
    expect(whiteKeys[14]).toMatchObject({ label: 'C5', note: 72 })
  })

  it('maps the computer keyboard chromatically without duplicate bindings', () => {
    const { blackKeys, whiteKeys } = makePianoKeys(3)
    const mapping = mapComputerPianoKeys([...whiteKeys, ...blackKeys])
    expect([...mapping.keys()]).toEqual([
      'KeyA',
      'KeyS',
      'KeyD',
      'KeyF',
      'KeyG',
      'KeyH',
      'KeyJ',
      'KeyK',
      'KeyW',
      'KeyE',
      'KeyT',
      'KeyY',
      'KeyU',
    ])
    expect([...mapping.values()].map(({ note }) => note).sort((a, b) => a - b)).toEqual([
      48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
    ])
  })
})

describe('qwertyKeyLabel', () => {
  it('names a physical key by its QWERTY letter', () => {
    expect(qwertyKeyLabel('KeyA')).toBe('A')
    expect(qwertyKeyLabel('KeyZ')).toBe('Z')
  })
})

describe('isBlackKey', () => {
  it('marks the five black keys of an octave', () => {
    expect([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71].filter(isBlackKey)).toEqual([
      61, 63, 66, 68, 70,
    ])
  })

  it('answers the same way in every octave', () => {
    expect([0, 12, 24, 127].map(isBlackKey)).toEqual([false, false, false, false])
    expect([1, 13, 25, 126].map(isBlackKey)).toEqual([true, true, true, true])
  })
})
