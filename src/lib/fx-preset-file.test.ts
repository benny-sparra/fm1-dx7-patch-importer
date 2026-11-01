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

function file(presets: unknown[]) {
  return JSON.stringify({ format: 'fm1-fx-presets', presets, version: 1 })
}

describe('FX preset portable files', () => {
  it('exports only portable names and values in display order', () => {
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
      }),
    ]

    expect(JSON.parse(makeFxPresetFile(presets))).toEqual({
      format: 'fm1-fx-presets',
      presets: [
        { effects: validEffects, name: 'Second' },
        { effects: Array.from({ length: 24 }, () => 0), name: 'First' },
      ],
      version: 1,
    })
  })

  it('reads a complete file without retaining unknown properties', () => {
    const parsed = parseFxPresetFile(
      file([{ effects: validEffects, id: 'foreign', name: ' Imported ', vendor: 'ignored' }]),
    )

    expect(parsed).toEqual([{ effects: Uint8Array.from(validEffects), name: 'Imported' }])
  })

  it.each([
    ['not JSON', 'nope'],
    ['wrong format', JSON.stringify({ format: 'other', presets: [], version: 1 })],
    ['future version', JSON.stringify({ format: 'fm1-fx-presets', presets: [], version: 2 })],
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
