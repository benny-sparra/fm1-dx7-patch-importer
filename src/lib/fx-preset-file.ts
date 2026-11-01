import { fm1EffectParameterMaximums } from '@/lib/fm1-effects'
import {
  normalizeFxLibraryPresetName,
  readStoredFxLibraryPreset,
  type FxLibraryPreset,
} from '@/lib/fx-library-preset'

export const fxPresetFileAccept = '.json,application/json'
export const fxPresetFileName = 'fm1-fx-presets.json'
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

export type PortableFxPreset = { effects: Uint8Array; name: string }

function damaged(message: string): never {
  throw new FxPresetFileError('damaged', message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readPortablePreset(value: unknown): PortableFxPreset {
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
  return { effects: Uint8Array.from(effects), name }
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
  if (file.version !== 1) {
    if (typeof file.version === 'number' && file.version > 1) {
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
  return file.presets.map(readPortablePreset)
}

export function makeFxPresetFile(presets: readonly FxLibraryPreset[]) {
  return JSON.stringify({
    format: 'fm1-fx-presets',
    presets: presets.map((preset) => {
      const readable = readStoredFxLibraryPreset(preset)
      return { effects: Array.from(readable.effects), name: readable.name }
    }),
    version: 1,
  })
}

export async function readFxPresetFile(file: Blob) {
  if (file.size > maximumFxPresetFileSize) {
    throw new FxPresetFileError('size', 'The file is too large to be an FX preset library.')
  }
  return parseFxPresetFile(await file.text())
}
