import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'

import { fm1EffectParameterMaximums } from '@/lib/fm1-effects'
import { createFxLibraryPreset } from '@/lib/fx-library-preset'

import {
  FxPresetFileError,
  makeFxPresetFile,
  makeFxPresetFiles,
  makeFxPresetDownload,
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

function manyPresets(count: number, prefix = 'Preset ') {
  return Array.from({ length: count }, (_, index) =>
    createFxLibraryPreset({
      effects: Uint8Array.from(validEffects),
      id: `preset-${index}`,
      name: `${prefix}${String(index).padStart(6, '0')}`,
      now,
    }),
  )
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

  it('round trips all 1,001 records from Download all', async () => {
    const presets = manyPresets(1001)
    const exported = await makeFxPresetDownload(presets)
    expect(exported.filename).toBe('fm1-fx-presets.zip')
    expect(exported.blob.type).toBe('application/zip')
    expect(exported.batched).toBe(true)
    const files = unzipSync(new Uint8Array(await exported.blob.arrayBuffer()))
    expect(Object.keys(files)).toEqual(['fm1-fx-presets-001.json', 'fm1-fx-presets-002.json'])
    const imported = await Promise.all(
      Object.values(files).map((bytes) => readFxPresetFile(new Blob([bytes]))),
    )
    expect(imported.map((part) => part.length)).toEqual([1000, 1])
    expect(imported.flat()).toEqual(presets.map(({ effects, name }) => ({ effects, name })))
    expect(Math.max(...Object.values(files).map((bytes) => bytes.byteLength))).toBeLessThanOrEqual(
      maximumFxPresetFileSize,
    )
  })

  it.each([0, 1, 1000])('keeps %s presets as the existing single JSON download', async (count) => {
    const presets = manyPresets(count)
    const exported = await makeFxPresetDownload(presets)
    expect(exported.filename).toBe('fm1-fx-presets.json')
    expect(exported.blob.type).toBe('application/json')
    expect(exported.batched).toBe(false)
    expect(await exported.blob.text()).toBe(makeFxPresetFile(presets))
    expect(await readFxPresetFile(exported.blob)).toEqual(
      presets.map(({ effects, name }) => ({ effects, name })),
    )
  })

  it('keeps maximum-length multibyte names and every value through the ZIP round trip', async () => {
    const presets = manyPresets(1001, '🎵'.repeat(74))
    const exported = await makeFxPresetDownload(presets)
    const files = unzipSync(new Uint8Array(await exported.blob.arrayBuffer()))
    const imported = await Promise.all(
      Object.values(files).map((bytes) => readFxPresetFile(new Blob([bytes]))),
    )
    expect(imported.map((part) => part.length)).toEqual([1000, 1])
    expect(Math.max(...Object.values(files).map((bytes) => bytes.byteLength))).toBeLessThanOrEqual(
      maximumFxPresetFileSize,
    )
    expect(imported.flat()).toEqual(presets.map(({ effects, name }) => ({ effects, name })))
  })

  it('keeps each preset’s effect order in every batch, as version 2', () => {
    const presets = Array.from({ length: 1001 }, (_, index) =>
      createFxLibraryPreset({
        effects: Uint8Array.from(validEffects),
        id: `ordered-${index}`,
        name: `Ordered ${index}`,
        now,
        order: index % 2 ? [5, 4, 3, 2, 1, 0] : undefined,
      }),
    )
    const parts = makeFxPresetFiles(presets)
    expect(parts.map(({ text }) => JSON.parse(text).version)).toEqual([2, 2])
    expect(parts.flatMap(({ text }) => parseFxPresetFile(text))).toEqual(
      presets.map(({ effects, name, order }) =>
        order ? { effects, name, order } : { effects, name },
      ),
    )
  })

  it('builds batches without changing the stored records or their order', () => {
    const presets = manyPresets(2001)
    const before = structuredClone(presets)
    const parts = makeFxPresetFiles(presets)
    expect(parts.map(({ filename }) => filename)).toEqual([
      'fm1-fx-presets-001.json',
      'fm1-fx-presets-002.json',
      'fm1-fx-presets-003.json',
    ])
    expect(parts.flatMap(({ text }) => parseFxPresetFile(text))).toEqual(
      presets.map(({ effects, name }) => ({ effects, name })),
    )
    expect(presets).toEqual(before)
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
