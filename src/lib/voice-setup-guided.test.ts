// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getVoiceSetupGuided,
  markVoiceSetupGuided,
  resetVoiceSetupGuidedForTests,
} from './voice-setup-guided'

const key = 'fm1-voice-setup-guided'

beforeEach(() => {
  localStorage.clear()
  resetVoiceSetupGuidedForTests()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the wizard’s stored flag', () => {
  it('starts as not guided, so the wizard opens by itself', () => {
    expect(getVoiceSetupGuided()).toBe(false)
  })

  it('writes the version 1 value, the string 1', () => {
    markVoiceSetupGuided()

    expect(localStorage.getItem(key)).toBe('1')
    expect(getVoiceSetupGuided()).toBe(true)
  })

  // The value release 1 wrote. Keep it as written: later versions must still read it as guided.
  it('reads the value the first release wrote as guided', () => {
    localStorage.setItem(key, '1')
    expect(getVoiceSetupGuided()).toBe(true)
  })

  it('reads any value a later version writes as guided, so the wizard never opens by itself again', () => {
    localStorage.setItem(key, '{"version":2}')
    expect(getVoiceSetupGuided()).toBe(true)
  })

  it('keeps it done for the session when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(getVoiceSetupGuided()).toBe(false)
    expect(() => markVoiceSetupGuided()).not.toThrow()
    expect(getVoiceSetupGuided()).toBe(true)
  })
})
