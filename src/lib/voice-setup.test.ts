// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  assignVoicePreset,
  getVoiceSetup,
  resetVoiceSetupForTests,
  setVoiceChannel,
  setVoiceSetupEnabled,
  subscribeVoiceSetup,
} from './voice-setup'

const key = 'fm1-voice-setup'

const defaultVoices = Array.from({ length: 8 }, (_, index) => ({
  channel: index + 1,
  preset: null,
}))

// A version 1 record exactly as the first release wrote it. Keep it as written: later versions
// must still read it.
const version1Fixture =
  '{"enabled":true,"version":1,"voices":[{"preset":0,"channel":1},{"preset":127,"channel":9},' +
  '{"preset":null,"channel":3},{"preset":42,"channel":16},{"preset":5,"channel":5},' +
  '{"preset":null,"channel":6},{"preset":64,"channel":2},{"preset":null,"channel":8}]}'

beforeEach(() => {
  localStorage.clear()
  resetVoiceSetupForTests()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function storeRecord(record: unknown) {
  localStorage.setItem(key, JSON.stringify(record))
}

describe('voice setup', () => {
  it('is off, with no presets and Voice n on channel n, when nothing is stored', () => {
    expect(getVoiceSetup()).toEqual({ enabled: false, voices: defaultVoices })
  })

  it('reads a version 1 record back as it was stored', () => {
    localStorage.setItem(key, version1Fixture)
    expect(getVoiceSetup()).toEqual({
      enabled: true,
      voices: [
        { channel: 1, preset: 0 },
        { channel: 9, preset: 127 },
        { channel: 3, preset: null },
        { channel: 16, preset: 42 },
        { channel: 5, preset: 5 },
        { channel: 6, preset: null },
        { channel: 2, preset: 64 },
        { channel: 8, preset: null },
      ],
    })
  })

  it('returns the same snapshot until an update replaces it', () => {
    expect(getVoiceSetup()).toBe(getVoiceSetup())
  })

  it('reads unparseable storage as the default', () => {
    localStorage.setItem(key, '{not json')
    expect(getVoiceSetup()).toEqual({ enabled: false, voices: defaultVoices })
  })

  it('turns a preset that is not an integer 0–127 into none, keeping the other fields', () => {
    storeRecord({
      enabled: true,
      version: 1,
      voices: [
        { channel: 4, preset: 128 },
        { channel: 4, preset: -1 },
        { channel: 4, preset: 1.5 },
        { channel: 4, preset: '7' },
        { channel: 4, preset: 7 },
      ],
    })
    const { enabled, voices } = getVoiceSetup()
    expect(enabled).toBe(true)
    expect(voices.slice(0, 5).map((voice) => voice.preset)).toEqual([null, null, null, null, 7])
    expect(voices[0]?.channel).toBe(4)
  })

  it('puts a channel outside 1–16 back on that Voice’s own channel', () => {
    storeRecord({
      enabled: false,
      version: 1,
      voices: [{ channel: 0 }, { channel: 17 }, { channel: 2.5 }, { channel: 'x' }, {}, null, 7],
    })
    expect(getVoiceSetup().voices.map((voice) => voice.channel)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('fills a short voices list and cuts a long one to eight entries', () => {
    storeRecord({ enabled: false, version: 1, voices: [{ channel: 12, preset: 3 }] })
    expect(getVoiceSetup().voices).toEqual([{ channel: 12, preset: 3 }, ...defaultVoices.slice(1)])

    resetVoiceSetupForTests()
    storeRecord({
      enabled: false,
      version: 1,
      voices: Array.from({ length: 12 }, () => ({ channel: 5, preset: 9 })),
    })
    expect(getVoiceSetup().voices).toHaveLength(8)

    resetVoiceSetupForTests()
    storeRecord({ enabled: false, version: 1, voices: 'nope' })
    expect(getVoiceSetup().voices).toEqual(defaultVoices)
  })

  it('reads a switch that is not a boolean as off', () => {
    storeRecord({ enabled: 'true', version: 1, voices: [] })
    expect(getVoiceSetup().enabled).toBe(false)
    resetVoiceSetupForTests()
    storeRecord({ enabled: 1, version: 1, voices: [] })
    expect(getVoiceSetup().enabled).toBe(false)
  })

  it('reads an unknown or newer version as the default and leaves it stored when read', () => {
    const newer = JSON.stringify({ enabled: true, version: 2, voices: [{ preset: 1, channel: 2 }] })
    localStorage.setItem(key, newer)
    expect(getVoiceSetup()).toEqual({ enabled: false, voices: defaultVoices })
    expect(localStorage.getItem(key)).toBe(newer)
  })

  it('replaces a newer version only once the user changes the setup', () => {
    localStorage.setItem(key, JSON.stringify({ enabled: true, version: 2, voices: [] }))
    setVoiceSetupEnabled(true)
    expect(JSON.parse(localStorage.getItem(key) ?? '')).toMatchObject({ enabled: true, version: 1 })
  })

  it('works from the default when reading storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(getVoiceSetup()).toEqual({ enabled: false, voices: defaultVoices })
    setVoiceChannel(0, 5)
    expect(getVoiceSetup().voices[0]?.channel).toBe(5)
  })

  it('keeps the update in memory when writing storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const listener = vi.fn()
    subscribeVoiceSetup(listener)
    setVoiceSetupEnabled(true)
    expect(getVoiceSetup().enabled).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('notifies subscribers and writes version 1 on each update', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeVoiceSetup(listener)
    setVoiceSetupEnabled(true)
    assignVoicePreset(2, 31)
    setVoiceChannel(7, 16)
    expect(listener).toHaveBeenCalledTimes(3)
    expect(JSON.parse(localStorage.getItem(key) ?? '')).toEqual({
      enabled: true,
      version: 1,
      voices: defaultVoices.map((voice, index) =>
        index === 2 ? { ...voice, preset: 31 } : index === 7 ? { ...voice, channel: 16 } : voice,
      ),
    })
    unsubscribe()
    setVoiceSetupEnabled(false)
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('does not notify or write when an update changes nothing', () => {
    const listener = vi.fn()
    subscribeVoiceSetup(listener)
    setVoiceSetupEnabled(false)
    assignVoicePreset(0, null)
    setVoiceChannel(0, 1)
    expect(listener).not.toHaveBeenCalled()
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('refuses a preset or channel out of range and a Voice that does not exist', () => {
    assignVoicePreset(0, 128)
    setVoiceChannel(0, 17)
    assignVoicePreset(8, 3)
    expect(getVoiceSetup()).toEqual({ enabled: false, voices: defaultVoices })
  })

  it('reads back what an update wrote, in a fresh visit', () => {
    assignVoicePreset(3, 99)
    resetVoiceSetupForTests()
    expect(getVoiceSetup().voices[3]?.preset).toBe(99)
  })
})
