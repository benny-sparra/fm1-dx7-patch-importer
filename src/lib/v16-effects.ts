import { FM1_EFFECT_PARAMETER_COUNT, fm1EffectParameters } from '@/lib/fm1-parameters'

/**
 * The effects of M-VAVE's V16, kept between visits: its eight Voices share one live FX group that
 * the editor cannot read back, so this is the editor's note of what it last sent. The
 * `fm1-v16-effects` key is stored data under the legacy rules in AGENTS.md. Version 1 is
 * `{ "version": 1, "effects": number[24] }`, the 24 effect parameters in the order and with the
 * limits a patch's FM1 effects have (`fm1EffectParameters`). A field that is not a whole number is
 * 0 and one above its limit is cut to it; a record of another version reads as all off and is left
 * in storage until the effects change.
 */
const storageKey = 'fm1-v16-effects'
const storedVersion = 1

const fm1EffectParameterCount = FM1_EFFECT_PARAMETER_COUNT
const fm1EffectParameterMaximums = Uint8Array.from(fm1EffectParameters.map(({ max }) => max))

function makeDefaultFm1Effects() {
  return new Uint8Array(fm1EffectParameterCount)
}

const listeners = new Set<() => void>()
// Kept in memory as well, so effects set while storage is blocked still work this session. Loaded on
// first use and replaced as a whole, so the snapshot stays the same until it changes.
let current: Uint8Array | null = null

function normaliseEffects(record: unknown) {
  if (typeof record !== 'object' || record === null) return makeDefaultFm1Effects()
  const { effects, version } = record as Record<string, unknown>
  if (version !== storedVersion || !Array.isArray(effects)) return makeDefaultFm1Effects()
  return Uint8Array.from({ length: fm1EffectParameterCount }, (_, index) => {
    const value: unknown = effects[index]
    return Number.isInteger(value) && (value as number) > 0
      ? Math.min(value as number, fm1EffectParameterMaximums[index])
      : 0
  })
}

function readStoredEffects() {
  try {
    const stored = localStorage.getItem(storageKey)
    return stored === null ? makeDefaultFm1Effects() : normaliseEffects(JSON.parse(stored))
  } catch {
    return makeDefaultFm1Effects()
  }
}

/** The 24 effect parameters, the same array until an update replaces it. */
export function getV16Effects() {
  current ??= readStoredEffects()
  return current
}

/**
 * Keeps `next`, 24 parameters cut to their limits, and returns the controllers whose value changed,
 * which are the only ones to send.
 */
export function setV16Effects(next: Uint8Array) {
  const before = getV16Effects()
  const effects = Uint8Array.from({ length: fm1EffectParameterCount }, (_, index) =>
    Math.min(next[index] ?? 0, fm1EffectParameterMaximums[index]),
  )
  const changed = Array.from(effects.keys()).filter(
    (controller) => effects[controller] !== before[controller],
  )
  if (changed.length === 0) return changed
  current = effects
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ effects: Array.from(effects), version: storedVersion }),
    )
  } catch {
    // The effects work for this session; only keeping them for the next visit is lost.
  }
  listeners.forEach((listener) => listener())
  return changed
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
}
