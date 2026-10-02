import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { parseDx7Bank, unpackDx7Voice } from '@/lib/dx7'
import { fm1VaChecksum } from '@/lib/fm1-va-sysex'
import { capturedOrgan3 } from '@/test/fm1-va-captures'

import {
  Fm1VaPresetFileError,
  fm1VaPresetFileSize,
  importableVoices,
  parseFm1VaPresetFile,
  readFm1VaPresetFile,
} from './fm1-va-preset-file'

const capturedRecord = capturedOrgan3.slice(161, 229)

// Preset 097 after Erase Preset made it a Virtual Analog preset and SAVE stored it, from a backup
// saved on 2026-10-01. Its record's byte 18 is 5A, where an FM preset's is 03.
const capturedVirtualAnalog = Uint8Array.from(
  `F0 43 00 7D 04 60 63 63 63 63 63 63 63 00 27 00 00 00 00 00 00 00 63 00 01 00 07 63 63 63 63 63
   63 63 00 27 00 00 00 00 00 00 00 00 00 01 00 07 63 63 63 63 63 63 63 00 27 00 00 00 00 00 00 00
   00 00 01 00 07 63 63 63 63 63 63 63 00 27 00 00 00 00 00 00 00 00 00 01 00 07 63 63 63 63 63 63
   63 00 27 00 00 00 00 00 00 00 00 00 01 00 07 63 63 63 63 63 63 63 00 27 00 00 00 00 00 00 00 63
   00 01 00 07 63 63 63 63 32 32 32 32 00 00 01 23 00 00 00 00 00 03 18 56 4F 49 43 45 20 39 37 20
   20 00 50 03 03 03 03 03 03 00 03 03 03 03 03 03 03 00 03 03 03 03 5A 02 32 3C 64 00 64 00 00 00
   00 00 00 00 01 00 00 02 00 00 00 03 00 00 04 00 00 78 05 00 00 00 00 00 00 07 00 00 00 00 00 00
   00 00 00 00 00 07 F7`
    .trim()
    .split(/\s+/)
    .map((byte) => Number.parseInt(byte, 16)),
)

// Yamaha's ROM1A factory cartridge fills the other presets.
const rom1a = parseDx7Bank(
  Uint8Array.from(readFileSync(resolve('public/dx7-banks/factory/rom1a.syx'))).buffer,
)

function presetMessage(slot: number, voice: Uint8Array, record = capturedRecord) {
  const payload = Uint8Array.from([...voice, ...record])
  return Uint8Array.from([
    0xf0,
    0x43,
    0x00,
    0x7d,
    0x04,
    slot,
    ...payload,
    fm1VaChecksum(payload),
    0xf7,
  ])
}

/**
 * A backup with ORGAN 3 in preset 001, the Virtual Analog preset in 097, and ROM1A's voices, in
 * order, in the others.
 */
function backupFile() {
  const file = new Uint8Array(fm1VaPresetFileSize)
  for (let slot = 1; slot < 128; slot += 1) {
    file.set(presetMessage(slot, unpackDx7Voice(rom1a[slot % 32])), slot * 231)
  }
  file.set(capturedOrgan3, 0)
  file.set(capturedVirtualAnalog, 96 * 231)
  return file
}

function problemOf(bytes: Uint8Array) {
  try {
    parseFm1VaPresetFile(bytes.buffer as ArrayBuffer)
  } catch (error) {
    if (error instanceof Fm1VaPresetFileError) return error.problem
    throw error
  }
  return null
}

function parsedPresets(file: Uint8Array) {
  return parseFm1VaPresetFile(file.buffer as ArrayBuffer).flatMap(({ presets }) => presets)
}

function parsedVoices(file: Uint8Array) {
  return parseFm1VaPresetFile(file.buffer as ArrayBuffer).flatMap(importableVoices)
}

describe('fm1VaChecksum', () => {
  it('matches the checksum FM-1+VA wrote on a captured preset', () => {
    expect(fm1VaChecksum(capturedOrgan3.slice(6, 229))).toBe(capturedOrgan3[229])
    expect(fm1VaChecksum(capturedVirtualAnalog.slice(6, 229))).toBe(capturedVirtualAnalog[229])
  })

  it('rebuilds the captured preset from its voice and record', () => {
    expect(presetMessage(0, capturedOrgan3.slice(6, 161))).toEqual(capturedOrgan3)
  })
})

describe('parseFm1VaPresetFile', () => {
  it('reads the voice of a captured preset', () => {
    const [bankA] = parseFm1VaPresetFile(backupFile().buffer as ArrayBuffer)

    const [organ] = importableVoices(bankA)

    expect(organ?.name).toBe('ORGAN 3')
    expect(unpackDx7Voice(organ!)).toEqual(capturedOrgan3.slice(6, 161))
  })

  it('divides the 128 presets into banks A to D of 32, in slot order', () => {
    const banks = parseFm1VaPresetFile(backupFile().buffer as ArrayBuffer)

    expect(banks.map(({ bank, presets }) => [bank, presets.length])).toEqual([
      ['A', 32],
      ['B', 32],
      ['C', 32],
      ['D', 32],
    ])
    expect(importableVoices(banks[3])[31]?.data).toEqual(rom1a[31].data)
  })

  it('reads each voice in the packed form the library stores', () => {
    const voices = parsedVoices(backupFile())

    expect(voices[33]?.data).toEqual(rom1a[1].data)
    expect(voices[33]?.name).toBe(rom1a[1].name)
  })

  it('recognises a Virtual Analog preset by its record', () => {
    expect(parsedPresets(backupFile())[96]).toEqual({ kind: 'virtual-analog', name: 'VOICE 97' })
  })

  it('reads an FM preset’s record as FM', () => {
    expect(parsedPresets(backupFile())[0].kind).toBe('fm')
  })

  it('reports a preset whose checksum does not match as damaged', () => {
    const file = backupFile()
    file[5 * 231 + 20] = (file[5 * 231 + 20] + 1) & 0x7f

    const presets = parsedPresets(file)

    expect(presets[5]).toEqual({ kind: 'damaged' })
    expect(presets.filter(({ kind }) => kind === 'damaged')).toHaveLength(1)
  })

  it('reports a preset with data above seven bits as damaged', () => {
    const file = backupFile()
    file[7 * 231 + 20] |= 0x80

    expect(parsedPresets(file)[7]).toEqual({ kind: 'damaged' })
  })

  it('reports a preset that names a different slot as damaged', () => {
    const file = backupFile()
    file.set(presetMessage(9, unpackDx7Voice(rom1a[0])), 8 * 231)

    const presets = parsedPresets(file)

    expect(presets[8]).toEqual({ kind: 'damaged' })
    expect(presets[9].kind).toBe('fm')
  })

  it('reports a preset without its closing byte as damaged', () => {
    const file = backupFile()
    file[3 * 231 + 230] = 0x00

    expect(parsedPresets(file)[3]).toEqual({ kind: 'damaged' })
  })

  it('refuses a file in which no preset can be read', () => {
    const file = backupFile()
    for (let slot = 0; slot < 128; slot += 1) file[slot * 231 + 229] ^= 0x01

    expect(problemOf(file)).toBe('damaged')
  })

  it('refuses a file of the wrong length', () => {
    expect(problemOf(backupFile().slice(0, 231 * 127))).toBe('size')
  })

  it('refuses a file of the right length that FM-1+VA did not write', () => {
    const file = backupFile()
    file[3] = 0x00

    expect(problemOf(file)).toBe('format')
  })

  it('refuses a DX7 bank', () => {
    const bank = readFileSync(resolve('public/dx7-banks/factory/rom1a.syx'))

    expect(problemOf(Uint8Array.from(bank))).toBe('size')
  })
})

describe('importableVoices', () => {
  it('leaves out the presets the library cannot take', () => {
    const file = backupFile()
    file[5 * 231 + 20] = (file[5 * 231 + 20] + 1) & 0x7f

    const voices = parsedVoices(file)

    expect(voices[5]).toBeNull()
    expect(voices[96]).toBeNull()
    expect(voices.filter((voice) => voice === null)).toHaveLength(2)
  })
})

describe('readFm1VaPresetFile', () => {
  it('reads a file the user chose', async () => {
    const banks = await readFm1VaPresetFile(new Blob([backupFile()]))

    expect(importableVoices(banks[0])[0]?.name).toBe('ORGAN 3')
  })

  it('reports the length of a file of the wrong size before reading it', async () => {
    const error = await readFm1VaPresetFile(new Blob([new Uint8Array(4104)])).catch(
      (cause: unknown) => cause,
    )

    expect(error).toBeInstanceOf(Fm1VaPresetFileError)
    expect((error as Fm1VaPresetFileError).problem).toBe('size')
    expect((error as Fm1VaPresetFileError).receivedBytes).toBe(4104)
  })
})
