import { describe, expect, it } from 'vitest'

import {
  editParameters,
  makeEditorHistory,
  redoParameters,
  undoParameters,
} from '@/lib/patch-editor'
import { applySoundPreset, soundPresets } from '@/lib/sound-presets'

describe('patch editor history', () => {
  it('records an edit and clears redo history', () => {
    const initial = Uint8Array.from([10, 20, 30])
    const undone = undoParameters(editParameters(makeEditorHistory(initial), [[1, 40]]))

    expect(Array.from(undone.present)).toEqual([10, 20, 30])
    expect(undone.future).toHaveLength(1)
  })

  it('does not create history for a repeated value', () => {
    const history = makeEditorHistory(Uint8Array.from([10, 20, 30]))

    expect(editParameters(history, [[1, 20]])).toBe(history)
  })

  it('clamps edits to their declared parameter range', () => {
    const history = editParameters(
      makeEditorHistory(Uint8Array.from([10, 20, 30])),
      [[0, -4, 0, 99], [1, 140, 0, 99]],
    )

    expect(Array.from(history.present)).toEqual([0, 99, 30])
  })

  it('rejects non-finite parameter values', () => {
    const history = makeEditorHistory(Uint8Array.from([10]))

    expect(() => editParameters(history, [[0, Number.NaN]])).toThrow('finite')
  })

  it('rejects parameter indexes outside the edit buffer', () => {
    const history = makeEditorHistory(Uint8Array.from([10]))

    expect(() => editParameters(history, [[1, 20]])).toThrow('out of range')
  })

  it('restores an undone edit with redo', () => {
    const edited = editParameters(makeEditorHistory(Uint8Array.from([10, 20])), [[0, 80]])

    expect(Array.from(redoParameters(undoParameters(edited)).present)).toEqual([80, 20])
  })

  it('limits retained history to one hundred snapshots', () => {
    let history = makeEditorHistory(Uint8Array.from([0]))
    for (let value = 1; value <= 120; value += 1) {
      history = editParameters(history, [[0, value, 0, 127]])
    }

    expect(history.past).toHaveLength(100)
  })
})

describe('sound starters', () => {
  const makeParameters = () => Uint8Array.from(
    { length: 179 },
    (_, index) => index < 155 ? index % 100 : 0,
  )

  it('offers repeatable presets that stay within MIDI data limits', () => {
    for (const preset of soundPresets) {
      const first = applySoundPreset(makeParameters(), preset.id)
      const second = applySoundPreset(first, preset.id)

      expect(second).toEqual(first)
      expect(second.every((value) => value <= 127)).toBe(true)
    }
  })

  it('selects an algorithm suited to each sound starter', () => {
    const parameters = makeParameters()

    expect([
      applySoundPreset(parameters, 'soft-pad')[134],
      applySoundPreset(parameters, 'bright-pluck')[134],
      applySoundPreset(parameters, 'steady-organ')[134],
      applySoundPreset(parameters, 'gentle-motion')[134],
      applySoundPreset(parameters, 'warm-filter')[134],
      applySoundPreset(parameters, 'wide-space')[134],
    ]).toEqual([4, 0, 31, 5, 18, 24])
  })

  it('sets a complete effect chain suited to each sound starter', () => {
    const parameters = makeParameters()
    parameters.fill(99, 155)

    expect(Array.from(applySoundPreset(parameters, 'soft-pad').slice(155))).toEqual([
      0, 0, 0, 0, 1, 1, 52, 24, 0, 0, 0, 0,
      0, 0, 0, 0, 1, 18, 28, 20, 0, 0, 0, 0,
    ])
    expect(Array.from(applySoundPreset(parameters, 'bright-pluck').slice(155))).toEqual([
      0, 0, 0, 0, 1, 0, 22, 12, 1, 18, 24, 14,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ])
    expect(Array.from(applySoundPreset(parameters, 'steady-organ').slice(155))).toEqual([
      0, 0, 0, 0, 1, 0, 18, 10, 0, 0, 0, 0,
      0, 0, 0, 0, 1, 12, 22, 16, 1, 10, 24, 14,
    ])
    expect(Array.from(applySoundPreset(parameters, 'gentle-motion').slice(155))).toEqual([
      0, 0, 0, 0, 1, 1, 34, 16, 0, 0, 0, 0,
      0, 0, 0, 0, 1, 16, 20, 14, 0, 0, 0, 0,
    ])
    expect(Array.from(applySoundPreset(parameters, 'warm-filter').slice(155))).toEqual([
      1, 0, 58, 1, 1, 0, 32, 18, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ])
    expect(Array.from(applySoundPreset(parameters, 'wide-space').slice(155))).toEqual([
      0, 0, 0, 0, 1, 1, 62, 28, 0, 0, 0, 0,
      0, 0, 0, 0, 1, 34, 46, 38, 0, 0, 0, 0,
    ])
  })

  it('preserves the patch name and operator tuning', () => {
    const parameters = makeParameters()
    const protectedIndexes = [18, 19, 20, 39, 40, 41, 60, 61, 62, 81, 82, 83, 102, 103, 104, 123, 124, 125]

    for (const preset of soundPresets) {
      const applied = applySoundPreset(parameters, preset.id)

      expect(Array.from(applied.slice(145, 155))).toEqual(Array.from(parameters.slice(145, 155)))
      expect(protectedIndexes.map((index) => applied[index])).toEqual(
        protectedIndexes.map((index) => parameters[index]),
      )
    }
  })

  it('rejects incomplete editor data', () => {
    expect(() => applySoundPreset(new Uint8Array(155), 'soft-pad')).toThrow('179')
  })
})
