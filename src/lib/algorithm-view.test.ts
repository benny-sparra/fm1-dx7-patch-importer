// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { readAlgorithmView, rememberAlgorithmView } from '@/lib/algorithm-view'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('algorithm view preference', () => {
  it('starts on the flat diagram', () => {
    expect(readAlgorithmView()).toBe('2d')
  })

  it('remembers the wireframe under its own key and touches no other', () => {
    localStorage.setItem('fm1-colourway', 'black')
    rememberAlgorithmView('3d')
    expect(localStorage.getItem('fm1-algorithm-view')).toBe('3d')
    expect(localStorage.getItem('fm1-colourway')).toBe('black')
    expect(readAlgorithmView()).toBe('3d')
  })

  it('falls back to the flat diagram for a value it does not know', () => {
    localStorage.setItem('fm1-algorithm-view', 'holographic')
    expect(readAlgorithmView()).toBe('2d')
  })

  it('reads and writes nothing, and does not throw, when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readAlgorithmView()).toBe('2d')
    expect(() => rememberAlgorithmView('3d')).not.toThrow()
  })
})
