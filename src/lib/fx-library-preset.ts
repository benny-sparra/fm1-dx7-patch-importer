import { fm1EffectParameterCount, normalizeFm1Effects } from '@/lib/fm1-effects'
import { isEffectOrder } from '@/lib/v16-settings-block'

export const fxLibraryPresetNameLength = 80

/**
 * A named FX preset. Version 2 adds `order`, V16's effect chain by position (each of the effects
 * 0–5 once), present only when the order was known as the preset was saved; a version 1 record
 * has none and is read as version 2 without one. A preset without an order leaves the FM1's order
 * as it is when recalled.
 */
export type FxLibraryPreset = {
  createdAt: string
  effects: Uint8Array
  id: string
  name: string
  order?: number[]
  updatedAt: string
  version: 2
}

type CreateFxLibraryPresetOptions = {
  effects: Uint8Array
  id: string
  name: string
  now: string
  order?: readonly number[] | null
}

/** A name that is empty or longer than `fxLibraryPresetNameLength`, so the user can fix it. */
export class FxLibraryPresetNameError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FxLibraryPresetNameError'
  }
}

export function normalizeFxLibraryPresetName(name: string) {
  const normalized = name.trim()
  if (!normalized) throw new FxLibraryPresetNameError('An FX preset needs a name.')
  if (Array.from(normalized).length > fxLibraryPresetNameLength) {
    throw new FxLibraryPresetNameError(
      `An FX preset name cannot exceed ${fxLibraryPresetNameLength} characters.`,
    )
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

/** An effect order as a preset keeps it, or nothing for no order; anything else is refused. */
export function readFxLibraryPresetOrder(value: unknown) {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || !isEffectOrder(value)) {
    throw new Error('An FX preset’s effect order must hold each of the six effects once.')
  }
  return value.slice() as number[]
}

/** `preset` with `order` in it, or without one when `order` is nothing. */
function withOrder(preset: Omit<FxLibraryPreset, 'order'>, order: unknown): FxLibraryPreset {
  const read = readFxLibraryPresetOrder(order)
  return read ? { ...preset, order: read } : preset
}

export function createFxLibraryPreset({
  effects,
  id,
  name,
  now,
  order,
}: CreateFxLibraryPresetOptions): FxLibraryPreset {
  if (!id) throw new Error('An FX preset needs an ID.')
  if (!isIsoTimestamp(now)) throw new Error('An FX preset needs an ISO timestamp.')
  return withOrder(
    {
      createdAt: now,
      effects: readEffects(effects),
      id,
      name: normalizeFxLibraryPresetName(name),
      updatedAt: now,
      version: 2,
    },
    order,
  )
}

/**
 * Reads one stored version 1 or 2 record without changing the record in storage. A version 1
 * record, which has no order, is upgraded in memory to version 2 without one.
 */
export function readStoredFxLibraryPreset(value: unknown): FxLibraryPreset {
  if (!value || typeof value !== 'object') throw new Error('The FX preset record is invalid.')
  const preset = value as Partial<Omit<FxLibraryPreset, 'version'>> & { version?: unknown }
  if (
    (preset.version !== 1 && preset.version !== 2) ||
    typeof preset.id !== 'string' ||
    !preset.id ||
    typeof preset.name !== 'string' ||
    !isIsoTimestamp(preset.createdAt) ||
    !isIsoTimestamp(preset.updatedAt)
  ) {
    throw new Error('The FX preset record is invalid.')
  }
  return withOrder(
    {
      createdAt: preset.createdAt,
      effects: readEffects(preset.effects),
      id: preset.id,
      name: normalizeFxLibraryPresetName(preset.name),
      updatedAt: preset.updatedAt,
      version: 2,
    },
    preset.version === 2 ? preset.order : undefined,
  )
}

export function renameFxLibraryPreset(preset: FxLibraryPreset, name: string, now: string) {
  const source = readStoredFxLibraryPreset(preset)
  if (!isIsoTimestamp(now)) throw new Error('An FX preset needs an ISO timestamp.')
  return { ...source, name: normalizeFxLibraryPresetName(name), updatedAt: now }
}

/**
 * `preset` holding `effects` and, when `order` is given, that order. An order of `undefined` keeps
 * the preset's own, so saving while the FM1's order is unknown never drops one; `null` removes it.
 */
export function updateFxLibraryPreset(
  preset: FxLibraryPreset,
  effects: Uint8Array,
  now: string,
  order?: readonly number[] | null,
) {
  const source = readStoredFxLibraryPreset(preset)
  if (!isIsoTimestamp(now)) throw new Error('An FX preset needs an ISO timestamp.')
  const { order: kept, ...rest } = source
  return withOrder(
    { ...rest, effects: readEffects(effects), updatedAt: now },
    order === undefined ? kept : order,
  )
}

export function duplicateFxLibraryPreset(preset: FxLibraryPreset, id: string, now: string) {
  const source = readStoredFxLibraryPreset(preset)
  return createFxLibraryPreset({
    effects: source.effects,
    id,
    name: fxLibraryPresetCopyName(source.name),
    now,
    order: source.order,
  })
}

/** Whether two effect orders are the same, nothing matching only nothing. */
export function sameEffectOrder(
  left: readonly number[] | null | undefined,
  right: readonly number[] | null | undefined,
) {
  if (!left || !right) return !left && !right
  return left.length === right.length && left.every((effect, index) => effect === right[index])
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
    sameEffectOrder(left.order, right.order) &&
    left.effects.length === right.effects.length &&
    left.effects.every((value, index) => value === right.effects[index])
  )
}

export function sortFxLibraryPresets(presets: readonly FxLibraryPreset[], collator: Intl.Collator) {
  return [...presets].sort(
    (left, right) => collator.compare(left.name, right.name) || left.id.localeCompare(right.id),
  )
}
