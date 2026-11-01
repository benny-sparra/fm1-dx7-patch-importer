import {
  fm1EffectParameterCount,
  makeDefaultFm1Effects,
  normalizeFm1Effects,
} from '@/lib/fm1-effects'
import type { Fm1Firmware } from '@/lib/fm1-firmware'

type V16EffectsPersistence = 'persisted' | 'session-only'
type V16EffectsLastSent = {
  effects: Uint8Array
  presetId: string
  route: string
}

/**
 * The effects of M-VAVE's V16, kept between visits: its eight Voices share one live FX group that
 * the editor cannot read back, so this is the editor's current browser state. The
 * `fm1-v16-effects` key is stored data under the legacy rules in AGENTS.md. Version 1 is
 * `{ "version": 1, "effects": number[24] }`, in `fm1EffectParameters` order.
 */
const storageKey = 'fm1-v16-effects'
const storedVersion = 1

const listeners = new Set<() => void>()
let current: Uint8Array | null = null
let persistence: V16EffectsPersistence = 'persisted'
// A stored record this release cannot read, or storage that would not open, is never written over.
let storedRecordKept = false
let lastSent: V16EffectsLastSent | null = null
// Session metadata belongs to the current rack, not to a tab that unmounts on navigation.
let loadedPresetId = ''

function readRecord(record: unknown) {
  if (typeof record !== 'object' || record === null) return null
  const { effects, version } = record as Record<string, unknown>
  if (version !== storedVersion || !Array.isArray(effects)) return null
  return normalizeFm1Effects(
    Uint8Array.from({ length: fm1EffectParameterCount }, (_, index) => {
      const value: unknown = effects[index]
      return Number.isInteger(value) && (value as number) > 0 ? Math.min(value as number, 255) : 0
    }),
  )
}

function readStoredEffects() {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored === null) return makeDefaultFm1Effects()
    const read = readRecord(JSON.parse(stored))
    if (read) return read
  } catch {
    // Current values remain usable in memory when storage is blocked or unreadable.
  }
  // The record may be a newer release's or damaged, and is the user's only copy: keep it, and keep
  // this session's edits in memory.
  storedRecordKept = true
  persistence = 'session-only'
  return makeDefaultFm1Effects()
}

/** The effect parameters, returned as the same array until an update replaces it. */
export function getV16Effects() {
  current ??= readStoredEffects()
  return current
}

export function getV16EffectsPersistence() {
  return persistence
}

/** The named preset the rack was loaded from; never persisted as a claim about hardware state. */
export function getV16EffectsPresetId() {
  return loadedPresetId
}

export function setV16EffectsPresetId(next: string) {
  if (loadedPresetId === next) return
  loadedPresetId = next
  listeners.forEach((listener) => listener())
}

export function getV16EffectsLastSent() {
  return lastSent
}

/**
 * Keeps `next`, the parameters cut to their limits, and returns the controllers whose value changed,
 * which are the only ones a live edit sends.
 */
export function setV16Effects(next: Uint8Array) {
  const before = getV16Effects()
  const effects = normalizeFm1Effects(next)
  const changed = Array.from(effects.keys()).filter(
    (controller) => effects[controller] !== before[controller],
  )
  if (changed.length === 0) return changed
  current = effects
  lastSent = null
  if (!storedRecordKept) {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ effects: Array.from(effects), version: storedVersion }),
      )
      persistence = 'persisted'
    } catch {
      persistence = 'session-only'
    }
  }
  listeners.forEach((listener) => listener())
  return changed
}

/** Records the snapshot that reached the FM1, which a later edit may already have replaced. */
export function markV16EffectsSent(presetId: string, route: string, effects: Uint8Array) {
  lastSent = { effects: effects.slice(), presetId, route }
  listeners.forEach((listener) => listener())
}

export function clearV16EffectsLastSent() {
  if (!lastSent) return
  lastSent = null
  listeners.forEach((listener) => listener())
}

export function v16EffectsRouteKey(
  outputId: string | undefined,
  effectChannel: number | undefined,
  firmware: Fm1Firmware,
) {
  return `${outputId ?? ''}:${effectChannel ?? 1}:${firmware.kind}:${'identity' in firmware ? firmware.identity : ''}`
}

export function subscribeV16Effects(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Forgets the effects held in memory, so each test starts from storage. */
export function resetV16EffectsForTests() {
  current = null
  persistence = 'persisted'
  storedRecordKept = false
  lastSent = null
  loadedPresetId = ''
}
