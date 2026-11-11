import { describe, expect, it } from 'vitest'

import { fm1EffectParameterMaximums } from '@/lib/fm1-effects'

import {
  createFxLibraryPreset,
  duplicateFxLibraryPreset,
  FxLibraryPresetNameError,
  fxLibraryPresetNameLength,
  readStoredFxLibraryPreset,
  renameFxLibraryPreset,
  sameEffectOrder,
  sameFxLibraryPreset,
  sortFxLibraryPresets,
  updateFxLibraryPreset,
} from './fx-library-preset'

const now = '2026-10-30T12:00:00.000Z'

function effects(seed = 0) {
  return Uint8Array.from(fm1EffectParameterMaximums, (maximum, index) =>
    Math.min(maximum, seed + index),
  )
}

describe('FX library preset records', () => {
  it('captures an independent version 2 snapshot with a trimmed Unicode name and no order', () => {
    const current = effects(1)
    const preset = createFxLibraryPreset({ effects: current, id: 'fx-1', name: '  Warm 🌊  ', now })

    current[0] = 0

    expect(preset).toEqual({
      createdAt: now,
      effects: effects(1),
      id: 'fx-1',
      name: 'Warm 🌊',
      updatedAt: now,
      version: 2,
    })
    expect(preset.effects).not.toBe(current)
  })

  it('keeps an effect order given as it is saved, without aliasing it', () => {
    const order = [5, 4, 3, 2, 1, 0]
    const preset = createFxLibraryPreset({
      effects: effects(),
      id: 'fx-1',
      name: 'Odd',
      now,
      order,
    })

    order[0] = 0

    expect(preset.order).toEqual([5, 4, 3, 2, 1, 0])
  })

  it.each([[[0, 1, 2, 3, 4]], [[0, 0, 1, 2, 3, 4]], [[0, 1, 2, 3, 4, 6]], ['012345']])(
    'refuses an order that is not each of the six effects once: %o',
    (order) => {
      expect(() =>
        createFxLibraryPreset({
          effects: effects(),
          id: 'fx-1',
          name: 'Bad',
          now,
          order: order as number[],
        }),
      ).toThrow('effect order')
    },
  )

  it('counts names by Unicode code point and rejects blank or overlong names', () => {
    expect(() =>
      createFxLibraryPreset({ effects: effects(), id: 'fx-1', name: '   ', now }),
    ).toThrow('name')
    expect(() =>
      createFxLibraryPreset({
        effects: effects(),
        id: 'fx-1',
        name: '🌊'.repeat(fxLibraryPresetNameLength + 1),
        now,
      }),
    ).toThrow(String(fxLibraryPresetNameLength))
    expect(
      createFxLibraryPreset({
        effects: effects(),
        id: 'fx-1',
        name: '🌊'.repeat(fxLibraryPresetNameLength),
        now,
      }).name,
    ).toHaveLength(fxLibraryPresetNameLength * 2)
  })

  it('reads the version 1 fixture, trimming its name and normalising stored values in memory', () => {
    const stored = {
      createdAt: now,
      effects: new Uint8Array(24).fill(255),
      id: 'fx-1',
      name: '  Stage  ',
      updatedAt: now,
      version: 1,
    }

    const read = readStoredFxLibraryPreset(stored)

    expect(read.name).toBe('Stage')
    expect(read.effects).toEqual(fm1EffectParameterMaximums)
    expect(read.version).toBe(2)
    expect(read).not.toHaveProperty('order')
    expect(stored.name).toBe('  Stage  ')
    expect(stored.effects[0]).toBe(255)
    expect(stored.version).toBe(1)
  })

  it('ignores an order in a version 1 record, which never held one', () => {
    const read = readStoredFxLibraryPreset({
      createdAt: now,
      effects: effects(),
      id: 'fx-1',
      name: 'Stage',
      order: [5, 4, 3, 2, 1, 0],
      updatedAt: now,
      version: 1,
    })

    expect(read).not.toHaveProperty('order')
  })

  it('reads the version 2 fixture with its effect order, and one saved without an order', () => {
    const stored = {
      createdAt: now,
      effects: effects(3),
      id: 'fx-2',
      name: ' Reverb first ',
      order: [1, 0, 2, 3, 4, 5],
      updatedAt: now,
      version: 2,
    }

    expect(readStoredFxLibraryPreset(stored)).toEqual({ ...stored, name: 'Reverb first' })
    expect(readStoredFxLibraryPreset({ ...stored, order: undefined })).not.toHaveProperty('order')
  })

  it.each([
    null,
    {},
    { createdAt: now, effects: effects(), id: 'fx-1', name: 'Future', updatedAt: now, version: 3 },
    {
      createdAt: now,
      effects: effects(),
      id: 'fx-1',
      name: 'Bad order',
      order: [0, 1, 2],
      updatedAt: now,
      version: 2,
    },
    {
      createdAt: now,
      effects: Array.from(effects()),
      id: 'fx-1',
      name: 'Array',
      updatedAt: now,
      version: 1,
    },
    {
      createdAt: now,
      effects: new Uint8Array(23),
      id: 'fx-1',
      name: 'Short',
      updatedAt: now,
      version: 1,
    },
    {
      createdAt: 'today',
      effects: effects(),
      id: 'fx-1',
      name: 'Date',
      updatedAt: now,
      version: 1,
    },
    { createdAt: now, effects: effects(), id: '', name: 'ID', updatedAt: now, version: 1 },
  ])('rejects an unreadable stored record without changing it: %o', (stored) => {
    expect(() => readStoredFxLibraryPreset(stored)).toThrow('preset')
  })

  it('renames and duplicates without aliasing the source record', () => {
    const source = createFxLibraryPreset({ effects: effects(2), id: 'fx-1', name: 'Original', now })
    const renamed = renameFxLibraryPreset(source, ' Renamed ', '2026-10-30T13:00:00.000Z')
    const duplicate = duplicateFxLibraryPreset(source, 'fx-2', '2026-10-30T14:00:00.000Z')

    duplicate.effects[0] = 0

    expect(renamed.name).toBe('Renamed')
    expect(renamed.version).toBe(2)
    expect(renamed.createdAt).toBe(now)
    expect(duplicate.name).toBe('Copy of Original')
    expect(source.effects[0]).not.toBe(0)
  })

  it('keeps the order through a rename and a duplicate', () => {
    const order = [2, 0, 1, 3, 4, 5]
    const source = createFxLibraryPreset({ effects: effects(), id: 'fx-1', name: 'A', now, order })

    expect(renameFxLibraryPreset(source, 'B', now).order).toEqual(order)
    expect(duplicateFxLibraryPreset(source, 'fx-2', now).order).toEqual(order)
  })

  it('updates the order when one is given, keeps it when none is known, and clears it on null', () => {
    const order = [2, 0, 1, 3, 4, 5]
    const source = createFxLibraryPreset({ effects: effects(), id: 'fx-1', name: 'A', now, order })

    expect(updateFxLibraryPreset(source, effects(1), now, [5, 4, 3, 2, 1, 0]).order).toEqual([
      5, 4, 3, 2, 1, 0,
    ])
    expect(updateFxLibraryPreset(source, effects(1), now).order).toEqual(order)
    expect(updateFxLibraryPreset(source, effects(1), now, null)).not.toHaveProperty('order')
  })

  it('bounds a duplicate name to 80 code points', () => {
    const source = createFxLibraryPreset({
      effects: effects(),
      id: 'fx-1',
      name: '🌊'.repeat(fxLibraryPresetNameLength),
      now,
    })

    const duplicate = duplicateFxLibraryPreset(source, 'fx-2', now)

    expect(Array.from(duplicate.name)).toHaveLength(fxLibraryPresetNameLength)
    expect(duplicate.name.startsWith('Copy of ')).toBe(true)
  })

  it('compares complete record content and sorts by locale name then id', () => {
    const a2 = createFxLibraryPreset({ effects: effects(), id: '2', name: 'Alpha', now })
    const a1 = createFxLibraryPreset({ effects: effects(), id: '1', name: 'Alpha', now })
    const beta = createFxLibraryPreset({ effects: effects(), id: '3', name: 'Beta', now })

    expect(sameFxLibraryPreset(a1, { ...a1, effects: a1.effects.slice() })).toBe(true)
    expect(sameFxLibraryPreset(a1, { ...a1, name: 'Changed' })).toBe(false)
    expect(sameFxLibraryPreset(a1, { ...a1, order: [0, 1, 2, 3, 4, 5] })).toBe(false)
    expect(sameEffectOrder(undefined, null)).toBe(true)
    expect(sameEffectOrder([0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5])).toBe(true)
    expect(sameEffectOrder([0, 1, 2, 3, 4, 5], [1, 0, 2, 3, 4, 5])).toBe(false)
    expect(sortFxLibraryPresets([beta, a2, a1], new Intl.Collator('en-GB'))).toEqual([a1, a2, beta])
  })

  it('refuses an empty or over-long name with an error the page can translate', () => {
    const source = createFxLibraryPreset({ effects: effects(), id: 'a', name: 'A', now })

    expect(() => renameFxLibraryPreset(source, '  ', now)).toThrow(FxLibraryPresetNameError)
    expect(() =>
      renameFxLibraryPreset(source, 'x'.repeat(fxLibraryPresetNameLength + 1), now),
    ).toThrow(FxLibraryPresetNameError)
  })
})
