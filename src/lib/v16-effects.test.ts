// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fm1EffectParameterMaximums } from '@/lib/fm1-effects'

import {
  getV16Effects,
  getV16EffectsLastSent,
  getV16EffectsPersistence,
  markV16EffectsSent,
  resetV16EffectsForTests,
  setV16Effects,
  subscribeV16Effects,
  v16EffectsRouteKey,
} from './v16-effects'

const key = 'fm1-v16-effects'

// A version 1 record exactly as it is written now. Keep it as written: later versions must still
// read it.
const version1Fixture =
  '{"effects":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24],"version":1}'

beforeEach(() => {
  localStorage.clear()
  resetV16EffectsForTests()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function changeTo(edit: (effects: Uint8Array) => void) {
  const next = getV16Effects().slice()
  edit(next)
  return setV16Effects(next)
}

describe('V16 effects', () => {
  it('are all off when nothing is stored', () => {
    expect(Array.from(getV16Effects())).toEqual(Array.from({ length: 24 }, () => 0))
    expect(getV16EffectsPersistence()).toBe('persisted')
  })

  it('reads a version 1 record as written', () => {
    localStorage.setItem(key, version1Fixture)
    expect(Array.from(getV16Effects())).toEqual(
      Array.from({ length: 24 }, (_, index) =>
        Math.min(index + 1, fm1EffectParameterMaximums[index]),
      ),
    )
  })

  it('round-trips a change through storage and returns only the controllers that changed', () => {
    const changed = changeTo((effects) => {
      effects[3] = 1
      effects[5] = 1
    })
    expect(changed).toEqual([3, 5])
    resetV16EffectsForTests()
    expect(getV16Effects()[3]).toBe(1)
    expect(JSON.parse(localStorage.getItem(key) ?? '{}')).toMatchObject({ version: 1 })
  })

  it('stores nothing and tells nobody when nothing changed', () => {
    const listener = vi.fn()
    subscribeV16Effects(listener)
    expect(setV16Effects(getV16Effects().slice())).toEqual([])
    expect(listener).not.toHaveBeenCalled()
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('keeps the same array until an update replaces it', () => {
    const first = getV16Effects()
    expect(getV16Effects()).toBe(first)
    changeTo((effects) => {
      effects[0] = 1
    })
    expect(getV16Effects()).not.toBe(first)
  })

  it.each([
    ['not JSON', 'nope'],
    ['null', 'null'],
    ['a number', '7'],
    ['an unknown version', '{"version":2,"effects":[1,1,1]}'],
    ['no version', '{"effects":[1,1,1]}'],
    ['effects that are not a list', '{"version":1,"effects":"x"}'],
  ])('read as all off from %s, which stays in storage untouched', (_, stored) => {
    localStorage.setItem(key, stored)
    expect(Array.from(getV16Effects())).toEqual(Array.from({ length: 24 }, () => 0))
    expect(getV16EffectsPersistence()).toBe('session-only')
    expect(localStorage.getItem(key)).toBe(stored)
  })

  it('normalises each field: a value that is not a whole number is 0 and one too high is cut', () => {
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        effects: ['x', -4, 1.5, null, 9999, ...Array.from({ length: 10 }, () => 1)],
      }),
    )
    const effects = getV16Effects()
    expect(Array.from(effects.slice(0, 5))).toEqual([0, 0, 0, 0, fm1EffectParameterMaximums[4]])
    expect(effects).toHaveLength(24)
    expect(effects[20]).toBe(0)
  })

  it('keeps working for the session and exposes persistence failure when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(getV16Effects()[0]).toBe(0)
    expect(getV16EffectsPersistence()).toBe('session-only')
    changeTo((effects) => {
      effects[0] = 1
    })
    expect(getV16Effects()[0]).toBe(1)
    expect(getV16EffectsPersistence()).toBe('session-only')
  })

  it('returns to persisted after a later storage write succeeds', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    changeTo((effects) => {
      effects[0] = 1
    })
    expect(getV16EffectsPersistence()).toBe('session-only')

    write.mockRestore()
    changeTo((effects) => {
      effects[0] = 0
    })

    expect(getV16EffectsPersistence()).toBe('persisted')
  })

  it('keeps only a copied last-send marker and invalidates it on a live change', () => {
    const route = v16EffectsRouteKey('fm1', 2, { identity: 'FM-1_016', kind: 'mvave' })
    markV16EffectsSent('fx-1', route)
    const sent = getV16EffectsLastSent()

    expect(sent).toMatchObject({ presetId: 'fx-1', route })
    expect(sent?.effects).not.toBe(getV16Effects())
    changeTo((effects) => {
      effects[0] = 1
    })
    expect(getV16EffectsLastSent()).toBeNull()
  })
})
