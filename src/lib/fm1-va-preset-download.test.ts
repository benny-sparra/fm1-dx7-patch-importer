import { describe, expect, it } from 'vitest'

import { parseFm1VaPresetFile } from '@/lib/fm1-va-preset-file'
import { fm1VaRecordEffects } from '@/lib/fm1-va-record-effects'
import { capturedEightBitRecord, capturedEightBitVoice } from '@/test/fm1-va-eight-bit'
import {
  capturedVirtualAnalogRecord,
  capturedVirtualAnalogVoice,
} from '@/test/fm1-va-virtual-analog'

import {
  Fm1VaPresetFileInexactError,
  makeFm1VaPresetFile,
  makeFm1VaPresetFilename,
} from './fm1-va-preset-download'

const nesRock = {
  bank: 'D',
  effects: fm1VaRecordEffects(capturedEightBitRecord()),
  name: 'NES ROCK',
  number: 1,
  program: 96,
  record: capturedEightBitRecord(),
  voice: capturedEightBitVoice(),
}

/** The one preset a file holds, as importing the file reads it. */
function readBack(file: Uint8Array) {
  const banks = parseFm1VaPresetFile(file.buffer as ArrayBuffer)
  const presets = banks.flatMap(({ bank, presets: bankPresets }) =>
    bankPresets.map((preset, index) => ({ bank, number: index + 1, preset })),
  )
  return presets.filter(({ preset }) => preset.kind !== 'absent')
}

describe('makeFm1VaPresetFile', () => {
  it('saves an 8-Bit patch as one preset write that imports back exactly, in its own slot', () => {
    const file = makeFm1VaPresetFile(nesRock)

    expect(file).toHaveLength(231)
    const [found, ...others] = readBack(file)
    expect(others).toEqual([])
    expect(found).toMatchObject({ bank: 'D', number: 1 })
    expect(found.preset).toMatchObject({
      eightBit: capturedEightBitVoice(),
      kind: 'eight-bit',
      record: capturedEightBitRecord(),
    })
  })

  it('saves a Virtual Analog patch the same way', () => {
    const file = makeFm1VaPresetFile({
      bank: 'A',
      effects: fm1VaRecordEffects(capturedVirtualAnalogRecord()),
      name: 'VOICE 97',
      number: 3,
      program: 2,
      record: capturedVirtualAnalogRecord(),
      voice: capturedVirtualAnalogVoice(),
    })

    const [found] = readBack(file)
    expect(found).toMatchObject({ bank: 'A', number: 3 })
    expect(found.preset).toMatchObject({
      kind: 'virtual-analog',
      record: capturedVirtualAnalogRecord(),
      virtualAnalog: capturedVirtualAnalogVoice(),
    })
  })

  it('puts the library’s effects in the record, as writing the patch to the FM1 does', () => {
    const effects = nesRock.effects.slice()
    effects[0] = 1

    const [found] = readBack(makeFm1VaPresetFile({ ...nesRock, effects }))

    expect(found.preset.kind === 'eight-bit' && found.preset.effects[0]).toBe(1)
  })

  it('names the same slot in bank A for a patch in an added bank', () => {
    const [found] = readBack(
      makeFm1VaPresetFile({ ...nesRock, bank: 'E', number: 7, program: undefined }),
    )

    expect(found).toMatchObject({ bank: 'A', number: 7 })
  })

  it('refuses voice bytes a preset write would not store exactly', () => {
    const voice = capturedEightBitVoice()
    // Byte 110 keeps only the algorithm's five bits, so a write would drop these two.
    voice[110] |= 0x60

    expect(() => makeFm1VaPresetFile({ ...nesRock, voice })).toThrow(Fm1VaPresetFileInexactError)
  })

  it('names the file after the slot and patch', () => {
    expect(makeFm1VaPresetFilename(nesRock)).toBe('fm1-D01-NES-ROCK.syx')
  })
})
