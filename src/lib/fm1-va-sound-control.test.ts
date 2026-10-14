import { describe, expect, it } from 'vitest'

import {
  fm1VaChoiceValue,
  fm1VaSoundSettings,
  isFm1VaSoundController,
  makeFm1VaSoundControlMessage,
} from './fm1-va-sound-control'

describe('fm1VaSoundSettings', () => {
  it('lists each controller once', () => {
    const controllers = fm1VaSoundSettings.map(({ controller }) => controller)

    expect(new Set(controllers).size).toBe(controllers.length)
  })

  it('holds exactly the sound-setting controllers the hardware run tested', () => {
    const controllers = fm1VaSoundSettings.map(({ controller }) => controller).sort((a, b) => a - b)

    expect(controllers).toEqual([
      24, 25, 26, 27, 28, 29, 30, 31, 52, 53, 54, 55, 56, 57, 70, 71, 72, 73, 74, 75, 76, 77, 78,
    ])
  })

  it('gives Waveform, Filter Type, and Key Tracking four choices, as the four equal bands', () => {
    const lists = fm1VaSoundSettings.flatMap((setting) =>
      'choices' in setting ? [[setting.controller, setting.choices.length]] : [],
    )

    expect(lists).toEqual([
      [24, 4],
      [31, 4],
      [56, 4],
    ])
  })
})

describe('makeFm1VaSoundControlMessage', () => {
  it('builds a Control Change on the MIDI Channel', () => {
    expect(makeFm1VaSoundControlMessage(24, 32, 1)).toEqual(Uint8Array.of(0xb0, 24, 32))
    expect(makeFm1VaSoundControlMessage(74, 127, 16)).toEqual(Uint8Array.of(0xbf, 74, 127))
  })

  it.each([0, 23, 32, 51, 58, 69, 79, 85, 102, 119, 127])(
    'refuses CC %i, which is not a sound setting',
    (controller) => {
      expect(() => makeFm1VaSoundControlMessage(controller, 0, 1)).toThrow(RangeError)
      expect(isFm1VaSoundController(controller)).toBe(false)
    },
  )

  it.each([-1, 128, 1.5])('refuses value %s', (value) => {
    expect(() => makeFm1VaSoundControlMessage(25, value, 1)).toThrow(RangeError)
  })

  it.each([0, 17, 1.5])('refuses channel %s', (channel) => {
    expect(() => makeFm1VaSoundControlMessage(25, 0, channel)).toThrow(RangeError)
  })
})

describe('fm1VaChoiceValue', () => {
  it('picks each of four choices at the start of its band', () => {
    expect([0, 1, 2, 3].map((index) => fm1VaChoiceValue(index, 4))).toEqual([0, 32, 64, 96])
  })

  it('refuses a choice outside the list', () => {
    expect(() => fm1VaChoiceValue(4, 4)).toThrow(RangeError)
  })
})
