import { fm1EffectParameterCount, normalizeFm1Effects } from '@/lib/fm1-effects'

export const fxLibraryPresetNameLength = 80

export type FxLibraryPreset = {
  createdAt: string
  effects: Uint8Array
  id: string
  name: string
  updatedAt: string
  version: 1
}

type CreateFxLibraryPresetOptions = {
  effects: Uint8Array
  id: string
  name: string
  now: string
}

export function normalizeFxLibraryPresetName(name: string) {
  const normalized = name.trim()
  if (!normalized) throw new Error('An FX preset needs a name.')
  if (Array.from(normalized).length > fxLibraryPresetNameLength) {
    throw new Error(`An FX preset name cannot exceed ${fxLibraryPresetNameLength} characters.`)
  }
  return normalized
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const timestamp = Date.parse(value)
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString() === value
}

function readEffects(value: unknown) {
  if (!(value instanceof Uint8Array) || value.length !== fm1EffectParameterCount) {
    throw new Error('An FX preset must contain 24 effect controls.')
  }
  return normalizeFm1Effects(value)
}

export function createFxLibraryPreset({
  effects,
  id,
  name,
  now,
}: CreateFxLibraryPresetOptions): FxLibraryPreset {
  if (!id) throw new Error('An FX preset needs an ID.')
  if (!isIsoTimestamp(now)) throw new Error('An FX preset needs an ISO timestamp.')
  return {
    createdAt: now,
    effects: readEffects(effects),
    id,
    name: normalizeFxLibraryPresetName(name),
    updatedAt: now,
    version: 1,
  }
}

/** Reads one stored version 1 record without changing the record in storage. */
export function readStoredFxLibraryPreset(value: unknown): FxLibraryPreset {
  if (!value || typeof value !== 'object') throw new Error('The FX preset record is invalid.')
  const preset = value as Partial<FxLibraryPreset>
  if (
    preset.version !== 1 ||
    typeof preset.id !== 'string' ||
    !preset.id ||
    typeof preset.name !== 'string' ||
    !isIsoTimestamp(preset.createdAt) ||
    !isIsoTimestamp(preset.updatedAt)
  ) {
    throw new Error('The FX preset record is invalid.')
  }
  return {
    createdAt: preset.createdAt,
    effects: readEffects(preset.effects),
    id: preset.id,
    name: normalizeFxLibraryPresetName(preset.name),
    updatedAt: preset.updatedAt,
    version: 1,
  }
}

export function renameFxLibraryPreset(preset: FxLibraryPreset, name: string, now: string) {
  const source = readStoredFxLibraryPreset(preset)
  if (!isIsoTimestamp(now)) throw new Error('An FX preset needs an ISO timestamp.')
  return { ...source, name: normalizeFxLibraryPresetName(name), updatedAt: now }
}

export function updateFxLibraryPreset(preset: FxLibraryPreset, effects: Uint8Array, now: string) {
  const source = readStoredFxLibraryPreset(preset)
  if (!isIsoTimestamp(now)) throw new Error('An FX preset needs an ISO timestamp.')
  return { ...source, effects: readEffects(effects), updatedAt: now }
}

export function duplicateFxLibraryPreset(preset: FxLibraryPreset, id: string, now: string) {
  const source = readStoredFxLibraryPreset(preset)
  return createFxLibraryPreset({
    effects: source.effects,
    id,
    name: fxLibraryPresetCopyName(source.name),
    now,
  })
}

export function fxLibraryPresetCopyName(name: string) {
  const prefix = 'Copy of '
  return (
    prefix +
    Array.from(name)
      .slice(0, fxLibraryPresetNameLength - prefix.length)
      .join('')
  )
}

export function sameFxLibraryPreset(left: FxLibraryPreset, right: FxLibraryPreset) {
  return (
    left.version === right.version &&
    left.id === right.id &&
    left.name === right.name &&
    left.createdAt === right.createdAt &&
    left.updatedAt === right.updatedAt &&
    left.effects.length === right.effects.length &&
    left.effects.every((value, index) => value === right.effects[index])
  )
}

export function sortFxLibraryPresets(presets: readonly FxLibraryPreset[], collator: Intl.Collator) {
  return [...presets].sort(
    (left, right) => collator.compare(left.name, right.name) || left.id.localeCompare(right.id),
  )
}
