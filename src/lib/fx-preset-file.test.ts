import { describe, expect, it } from 'vitest'

import { fm1EffectParameterMaximums } from '@/lib/fm1-effects'
import { createFxLibraryPreset } from '@/lib/fx-library-preset'

import {
  FxPresetFileError,
  makeFxPresetFile,
  maximumFxPresetFilePresets,
  maximumFxPresetFileSize,
  parseFxPresetFile,
  readFxPresetFile,
} from './fx-preset-file'

const now = '2026-10-30T12:00:00.000Z'
const validEffects = Array.from(fm1EffectParameterMaximums)

function file(presets: unknown[], version = 1) {
  return JSON.stringify({ format: 'fm1-fx-presets', presets, version })
}

describe('FX preset portable files', () => {
  it('exports only portable names, values and orders in display order, as version 2', () => {
    const presets = [
      createFxLibraryPreset({
        effects: Uint8Array.from(validEffects),
        id: 'local-2',
        name: 'Second',
        now,
      }),
      createFxLibraryPreset({
        effects: new Uint8Array(24),
        id: 'local-1',
        name: 'First',
        now,
        order: [1, 0, 2, 3, 4, 5],
      }),
    ]

    expect(JSON.parse(makeFxPresetFile(presets))).toEqual({
      format: 'fm1-fx-presets',
      presets: [
        { effects: validEffects, name: 'Second' },
        { effects: Array.from({ length: 24 }, () => 0), name: 'First', order: [1, 0, 2, 3, 4, 5] },
      ],
      version: 2,
    })
  })

  it('reads a complete file without retaining unknown properties', () => {
    const parsed = parseFxPresetFile(
      file([{ effects: validEffects, id: 'foreign', name: ' Imported ', vendor: 'ignored' }]),
    )

    expect(parsed).toEqual([{ effects: Uint8Array.from(validEffects), name: 'Imported' }])
  })

  it('reads a version 1 file as it was written, with no order and a stray one ignored', () => {
    const parsed = parseFxPresetFile(
      file([{ effects: validEffects, name: 'Old', order: [5, 4, 3, 2, 1, 0] }], 1),
    )

    expect(parsed).toEqual([{ effects: Uint8Array.from(validEffects), name: 'Old' }])
  })

  it('reads each preset’s order from a version 2 file, and a preset without one', () => {
    const parsed = parseFxPresetFile(
      file(
        [
          { effects: validEffects, name: 'Ordered', order: [5, 4, 3, 2, 1, 0] },
          { effects: validEffects, name: 'Plain' },
        ],
        2,
      ),
    )

    expect(parsed).toEqual([
      { effects: Uint8Array.from(validEffects), name: 'Ordered', order: [5, 4, 3, 2, 1, 0] },
      { effects: Uint8Array.from(validEffects), name: 'Plain' },
    ])
  })

  it.each([
    ['not JSON', 'nope'],
    ['wrong format', JSON.stringify({ format: 'other', presets: [], version: 1 })],
    ['future version', JSON.stringify({ format: 'fm1-fx-presets', presets: [], version: 3 })],
    ['bad order', file([{ effects: validEffects, name: 'Order', order: [0, 1, 2, 3, 4, 4] }], 2)],
    ['missing list', JSON.stringify({ format: 'fm1-fx-presets', version: 1 })],
    ['blank name', file([{ effects: validEffects, name: ' ' }])],
    ['short values', file([{ effects: validEffects.slice(1), name: 'Short' }])],
    [
      'fraction',
      file([
        { effects: validEffects.map((value, index) => (index ? value : 0.5)), name: 'Fraction' },
      ]),
    ],
    [
      'above its control limit',
      file([
        { effects: validEffects.map((value, index) => (index ? value : value + 1)), name: 'Range' },
      ]),
    ],
  ])('rejects the entire %s file', (_, text) => {
    expect(() => parseFxPresetFile(text)).toThrow(FxPresetFileError)
  })

  it('accepts an empty import explicitly and rejects more than 1,000 presets', () => {
    expect(parseFxPresetFile(file([]))).toEqual([])
    expect(() =>
      parseFxPresetFile(
        file(
          Array.from({ length: maximumFxPresetFilePresets + 1 }, () => ({
            effects: validEffects,
            name: 'Many',
          })),
        ),
      ),
    ).toThrow('1,000')
  })

  it('refuses an oversized file before reading it', async () => {
    const blob = new Blob([new Uint8Array(maximumFxPresetFileSize + 1)])
    const text = Object.defineProperty(blob, 'text', {
      value: () => Promise.reject(new Error('read')),
    })

    await expect(readFxPresetFile(text)).rejects.toMatchObject({ problem: 'size' })
  })
})
