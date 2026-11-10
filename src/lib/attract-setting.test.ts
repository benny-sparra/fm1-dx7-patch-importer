// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { readAttractModeEnabled, rememberAttractModeEnabled } from './attract-setting'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('the screen saver setting', () => {
  it('is on until the viewer switches it off', () => {
    expect(readAttractModeEnabled()).toBe(true)
    rememberAttractModeEnabled(false)
    expect(readAttractModeEnabled()).toBe(false)
    rememberAttractModeEnabled(true)
    expect(readAttractModeEnabled()).toBe(true)
  })

  it('is stored under fm1-attract-mode, a key no release may rename', () => {
    rememberAttractModeEnabled(false)
    expect(localStorage.getItem('fm1-attract-mode')).toBe('off')
  })

  it('stays on, and switching never throws, when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(readAttractModeEnabled()).toBe(true)
    expect(() => rememberAttractModeEnabled(false)).not.toThrow()
  })
})
