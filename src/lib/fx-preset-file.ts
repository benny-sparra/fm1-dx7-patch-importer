import { fm1EffectParameterMaximums } from '@/lib/fm1-effects'
import {
  normalizeFxLibraryPresetName,
  readFxLibraryPresetOrder,
  readStoredFxLibraryPreset,
  type FxLibraryPreset,
} from '@/lib/fx-library-preset'

/** The newest file version: version 2 adds each preset's effect order, where it has one. */
const fxPresetFileVersion = 2

export const fxPresetFileAccept = '.json,application/json'
const fxPresetFileName = 'fm1-fx-presets.json'
const fxPresetArchiveName = 'fm1-fx-presets.zip'
export const maximumFxPresetFileSize = 1024 * 1024
export const maximumFxPresetFilePresets = 1000

type FxPresetFileProblem = 'damaged' | 'format' | 'newer' | 'size'

export class FxPresetFileError extends Error {
  readonly problem: FxPresetFileProblem

  constructor(problem: FxPresetFileProblem, message: string) {
    super(message)
    this.name = 'FxPresetFileError'
    this.problem = problem
  }
}

export type PortableFxPreset = { effects: Uint8Array; name: string; order?: number[] }

function damaged(message: string): never {
  throw new FxPresetFileError('damaged', message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readPortablePreset(value: unknown, version: number): PortableFxPreset {
  if (!isRecord(value) || typeof value.name !== 'string' || !Array.isArray(value.effects)) {
    damaged('The file contains an unreadable FX preset.')
  }
  let name: string
  try {
    name = normalizeFxLibraryPresetName(value.name)
  } catch {
    damaged('The file contains an invalid FX preset name.')
  }
  if (value.effects.length !== fm1EffectParameterMaximums.length) {
    damaged('Every FX preset must contain exactly 24 effect controls.')
  }
  const effects = value.effects.map((effect, index) => {
    if (
      typeof effect !== 'number' ||
      !Number.isFinite(effect) ||
      !Number.isInteger(effect) ||
      effect < 0 ||
      effect > fm1EffectParameterMaximums[index]
    ) {
      damaged(`FX preset control ${index + 1} is outside its allowed range.`)
    }
    return effect
  })
  // Version 1 has no order; a version 1 file's stray `order` is not read.
  let order: number[] | undefined
  try {
    order = version >= 2 ? readFxLibraryPresetOrder(value.order) : undefined
  } catch {
    damaged('The file contains an FX preset with an unreadable effect order.')
  }
  return order
    ? { effects: Uint8Array.from(effects), name, order }
    : { effects: Uint8Array.from(effects), name }
}

export function parseFxPresetFile(text: string): PortableFxPreset[] {
  let file: unknown
  try {
    file = JSON.parse(text)
  } catch {
    throw new FxPresetFileError('format', 'The file is not an FX preset library.')
  }
  if (!isRecord(file) || file.format !== 'fm1-fx-presets') {
    throw new FxPresetFileError('format', 'The file is not an FX preset library.')
  }
  const version = file.version
  if (version !== 1 && version !== 2) {
    if (typeof version === 'number' && version > fxPresetFileVersion) {
      throw new FxPresetFileError('newer', 'The file was made by a newer release.')
    }
    damaged('The file has no readable version.')
  }
  if (!Array.isArray(file.presets)) damaged('The file has no readable FX preset list.')
  if (file.presets.length > maximumFxPresetFilePresets) {
    damaged(
      `An FX preset file cannot contain more than ${maximumFxPresetFilePresets.toLocaleString('en-GB')} presets.`,
    )
  }
  return file.presets.map((preset) => readPortablePreset(preset, version))
}

function serializePreset(preset: FxLibraryPreset) {
  const readable = readStoredFxLibraryPreset(preset)
  return JSON.stringify({
    effects: Array.from(readable.effects),
    name: readable.name,
    ...(readable.order ? { order: readable.order } : {}),
  })
}

function presetFileText(presets: readonly string[]) {
  return `{"format":"fm1-fx-presets","presets":[${presets.join(',')}],"version":${fxPresetFileVersion}}`
}

export function makeFxPresetFile(presets: readonly FxLibraryPreset[]) {
  return presetFileText(presets.map(serializePreset))
}

/** Bounded files of the newest version, in input order, each readable by the existing importer. */
export function makeFxPresetFiles(presets: readonly FxLibraryPreset[]) {
  const encoder = new TextEncoder()
  const envelopeSize = encoder.encode(presetFileText([])).byteLength
  const parts: string[] = []
  let batch: string[] = []
  let size = envelopeSize
  for (const preset of presets) {
    const text = serializePreset(preset)
    const bytes = encoder.encode(text).byteLength
    if (envelopeSize + bytes > maximumFxPresetFileSize) {
      throw new FxPresetFileError('size', 'An FX preset cannot fit in a portable file.')
    }
    if (
      batch.length &&
      (batch.length === maximumFxPresetFilePresets || size + 1 + bytes > maximumFxPresetFileSize)
    ) {
      parts.push(presetFileText(batch))
      batch = []
      size = envelopeSize
    }
    size += bytes + (batch.length ? 1 : 0)
    batch.push(text)
  }
  if (batch.length || !parts.length) parts.push(presetFileText(batch))
  return parts.map((text, index) => ({
    filename:
      parts.length === 1
        ? fxPresetFileName
        : `fm1-fx-presets-${String(index + 1).padStart(3, '0')}.json`,
    text,
  }))
}

/** Packages large collections as individually importable files, loading ZIP support on demand. */
export async function makeFxPresetDownload(presets: readonly FxLibraryPreset[]) {
  const files = makeFxPresetFiles(presets)
  if (files.length === 1) {
    return {
      blob: new Blob([files[0].text], { type: 'application/json' }),
      filename: fxPresetFileName,
      batched: false,
    }
  }
  const { zipSync } = await import('fflate')
  const encoder = new TextEncoder()
  const archive = Object.fromEntries(
    files.map(({ filename, text }) => [filename, encoder.encode(text)]),
  )
  return {
    blob: new Blob([zipSync(archive)], { type: 'application/zip' }),
    filename: fxPresetArchiveName,
    batched: true,
  }
}

export async function readFxPresetFile(file: Blob) {
  if (file.size > maximumFxPresetFileSize) {
    throw new FxPresetFileError('size', 'The file is too large to be an FX preset library.')
  }
  return parseFxPresetFile(await file.text())
}
