import { describe, expect, it } from 'vitest'

import { makePianoKeys, mapComputerPianoKeys, qwertyKeyLabel } from '@/lib/piano-keyboard'

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
