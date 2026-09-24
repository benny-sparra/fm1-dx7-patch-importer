/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
  Dx7BankFileError,
  makeDx7BankFile,
  makeDx7BankPayload,
  normalizeStoredDx7Voice,
  makeDx7VoiceNameEdits,
  makeDx7SingleVoicePayload,
  packDx7Voice,
  parseDx7Bank,
  readDx7BankFile,
  unpackDx7Voice,
  updateDx7VoiceName,
  type Dx7Voice,
} from '@/lib/dx7'

function makeVoice(): Dx7Voice {
  const data = Uint8Array.from({ length: 128 }, (_, index) => index & 0x7f)
  for (let operator = 0; operator < 6; operator += 1) {
    const offset = operator * 17
    data[offset + 11] &= 0x0f
    data[offset + 13] &= 0x1f
    data[offset + 15] &= 0x3f
  }
  data[110] &= 0x1f
  data[111] &= 0x0f
  return updateDx7VoiceName({ data, name: '' }, 'ROUNDTRIP')
}

describe('DX7 edit-buffer conversion', () => {
  it('round-trips a packed voice without losing combined bitfields', () => {
    const original = makeVoice()

    expect(packDx7Voice(unpackDx7Voice(original))).toEqual(original)
  })

  it('preserves unrelated packed fields and voices after import, edit, export, and re-import', () => {
    const bankFile = Uint8Array.from(readFileSync(resolve('public/dx7-banks/factory/rom1a.syx')))
    const imported = parseDx7Bank(bankFile.buffer)
    const parameters = unpackDx7Voice(imported[0])

    expect([parameters[11], parameters[12], parameters[13], parameters[20]]).toEqual([1, 1, 4, 7])

    parameters[11] = 3
    parameters[20] = 14
    const editedVoice = packDx7Voice(parameters)
    const expectedPackedVoice = imported[0].data.slice()
    expectedPackedVoice[11] = 0x07
    expectedPackedVoice[12] = 0x74

    expect(editedVoice.data).toEqual(expectedPackedVoice)

    const reimported = parseDx7Bank(
      makeDx7BankFile([editedVoice, ...imported.slice(1)]).buffer as ArrayBuffer,
    )

    expect(unpackDx7Voice(reimported[0])).toEqual(parameters)
    expect(reimported.slice(1)).toEqual(imported.slice(1))
  })

  it('ignores reserved high bits in the packed algorithm byte', () => {
    const voice = makeVoice()
    voice.data[110] = 0b1110_0101

    expect(unpackDx7Voice(voice)[134]).toBe(5)
  })

  it('refuses to unpack a voice that is not 128 bytes', () => {
    expect(() => unpackDx7Voice({ data: new Uint8Array(127), name: 'TOO SHORT' })).toThrow('128')
    expect(() => unpackDx7Voice({ data: new Uint8Array(129), name: 'TOO LONG' })).toThrow('128')
  })

  it('rejects a malformed packed voice before creating a single-voice dump', () => {
    expect(() =>
      makeDx7SingleVoicePayload({
        data: new Uint8Array(127),
        name: 'TOO SHORT',
      }),
    ).toThrow('128')
  })
})

describe('DX7 live voice-name edits', () => {
  it('emits only the name bytes that changed', () => {
    const parameters = unpackDx7Voice(makeVoice())

    expect(makeDx7VoiceNameEdits(parameters, 'ROUNDTWIP')).toEqual([[151, 0x57]])
  })

  it('pads a shortened name with spaces on the synth', () => {
    const parameters = unpackDx7Voice(makeVoice())

    expect(makeDx7VoiceNameEdits(parameters, 'ROUND')).toEqual([
      [150, 0x20],
      [151, 0x20],
      [152, 0x20],
      [153, 0x20],
    ])
  })
})

function makeBankFileWithDataByte(offset: number, value: number) {
  const file = makeDx7BankFile(Array.from({ length: 32 }, makeVoice))
  file[6 + offset] = value
  const sum = file.slice(6, -2).reduce((total, byte) => total + byte, 0)
  file[file.length - 2] = (128 - (sum & 0x7f)) & 0x7f
  return file
}

describe('DX7 7-bit data boundaries', () => {
  it('rejects an imported bank with a high-bit data byte even when its checksum matches', () => {
    const file = makeBankFileWithDataByte(20, 0x85)

    expect(() => parseDx7Bank(file.buffer as ArrayBuffer)).toThrow('7-bit')
  })

  it('refuses to build a single-voice dump from voice data above seven bits', () => {
    const voice = makeVoice()
    voice.data[3] = 0x80

    expect(() => makeDx7SingleVoicePayload(voice)).toThrow('7-bit')
  })

  it('refuses to build a bank dump containing voice data above seven bits', () => {
    const voices = Array.from({ length: 32 }, makeVoice)
    voices[31].data[0] = 0xff

    expect(() => makeDx7BankPayload(voices)).toThrow('7-bit')
  })
})

describe('normalizeStoredDx7Voice', () => {
  it('keeps a valid stored voice unchanged', () => {
    const voice = makeVoice()

    expect(normalizeStoredDx7Voice(voice)).toEqual(voice)
  })

  it('masks stored bytes above seven bits without changing the stored copy', () => {
    const voice = makeVoice()
    voice.data[0] = 0x85

    const normalized = normalizeStoredDx7Voice(voice)

    expect(normalized?.data[0]).toBe(0x05)
    expect(normalized?.name).toBe('ROUNDTRIP')
    expect(voice.data[0]).toBe(0x85)
  })

  it('names a stored voice from its data when the name is missing', () => {
    const { data } = makeVoice()

    expect(normalizeStoredDx7Voice({ data })?.name).toBe('ROUNDTRIP')
  })

  it('rejects stored values that are not packed voices', () => {
    expect(normalizeStoredDx7Voice(null)).toBeNull()
    expect(normalizeStoredDx7Voice('E.PIANO')).toBeNull()
    expect(normalizeStoredDx7Voice({ data: new Uint8Array(100), name: 'SHORT' })).toBeNull()
    expect(normalizeStoredDx7Voice({ data: Array(128).fill(0), name: 'ARRAY' })).toBeNull()
  })
})

describe('DX7 bank file problems', () => {
  function importError(bytes: Uint8Array) {
    try {
      parseDx7Bank(bytes.buffer as ArrayBuffer)
    } catch (error) {
      return error
    }
    throw new Error('Expected the bank file to be rejected.')
  }

  it('reports the size of a bank file with the wrong length', () => {
    const error = importError(new Uint8Array(3))

    expect(error).toBeInstanceOf(Dx7BankFileError)
    expect(error).toMatchObject({ problem: 'size', receivedBytes: 3 })
  })

  it('reports a file that is not a DX7 32-voice bank', () => {
    const file = makeDx7BankFile(Array.from({ length: 32 }, makeVoice))
    file[1] = 0x41

    expect(importError(file)).toMatchObject({ problem: 'format' })
  })

  it('reports a bank with data above seven bits', () => {
    expect(importError(makeBankFileWithDataByte(20, 0x85))).toMatchObject({
      problem: 'high-bit-data',
    })
  })

  it('reports a bank whose checksum does not match', () => {
    const file = makeDx7BankFile(Array.from({ length: 32 }, makeVoice))
    file[file.length - 2] ^= 0x01

    expect(importError(file)).toMatchObject({ problem: 'checksum' })
  })
})

describe('readDx7BankFile', () => {
  it('rejects a file of the wrong size without reading it', async () => {
    const arrayBuffer = vi.fn()
    const file = { arrayBuffer, size: 50_000_000 } as unknown as Blob

    await expect(readDx7BankFile(file)).rejects.toMatchObject({
      problem: 'size',
      receivedBytes: 50_000_000,
    })
    expect(arrayBuffer).not.toHaveBeenCalled()
  })

  it('reads the voices from a bank file of the right size', async () => {
    const voices = Array.from({ length: 32 }, makeVoice)
    const file = new Blob([makeDx7BankFile(voices)])

    const imported = await readDx7BankFile(file)

    expect(imported).toHaveLength(32)
    expect(imported[0]?.data).toEqual(voices[0]?.data)
  })
})
