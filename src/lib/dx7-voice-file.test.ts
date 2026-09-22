import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { parseDx7Bank, unpackDx7Voice } from '@/lib/dx7'

import {
  Dx7VoiceFileError,
  makeDx7VoiceFile,
  makeDx7VoiceFilename,
  parseDx7VoiceFile,
  readDx7VoiceFile,
} from './dx7-voice-file'

// BRASS 1, the first voice of Yamaha's ROM1A factory cartridge.
const brass = parseDx7Bank(
  Uint8Array.from(readFileSync(resolve('public/dx7-banks/factory/rom1a.syx'))).buffer,
)[0]

function voiceFile() {
  return makeDx7VoiceFile(brass)
}

function problemOf(bytes: Uint8Array) {
  try {
    parseDx7VoiceFile(bytes.buffer as ArrayBuffer)
  } catch (error) {
    if (error instanceof Dx7VoiceFileError) return error.problem
    throw error
  }
  return null
}

describe('makeDx7VoiceFile', () => {
  it('writes the 163-byte Yamaha single-voice dump', () => {
    const file = voiceFile()

    expect(file.length).toBe(163)
    expect(Array.from(file.slice(0, 6))).toEqual([0xf0, 0x43, 0x00, 0x00, 0x01, 0x1b])
    expect(file.at(-1)).toBe(0xf7)
  })

  it('carries the voice in the unpacked edit-buffer order', () => {
    expect(voiceFile().slice(6, 161)).toEqual(unpackDx7Voice(brass))
  })

  it('ends the data with a checksum that brings its sum to a multiple of 128', () => {
    const file = voiceFile()
    const sum = file.slice(6, 162).reduce((total, byte) => total + byte, 0)

    expect(sum % 128).toBe(0)
  })
})

describe('parseDx7VoiceFile', () => {
  it('reads back the voice a file was written from', () => {
    const voice = parseDx7VoiceFile(voiceFile().buffer as ArrayBuffer)

    expect(voice.data).toEqual(brass.data)
    expect(voice.name).toBe('BRASS   1')
  })

  it('accepts a dump sent on any MIDI channel', () => {
    const file = voiceFile()
    file[2] = 0x0f

    expect(problemOf(file)).toBeNull()
  })

  it('rejects a file of the wrong length', () => {
    expect(problemOf(voiceFile().slice(0, 162))).toBe('size')
  })

  it('reports the length of a file of the wrong size', async () => {
    const error = await readDx7VoiceFile(new Blob([new Uint8Array(200)])).catch(
      (cause: unknown) => cause,
    )

    expect(error).toBeInstanceOf(Dx7VoiceFileError)
    expect((error as Dx7VoiceFileError).receivedBytes).toBe(200)
  })

  it('recognises a 32-voice bank before reading it', async () => {
    const error = await readDx7VoiceFile(new Blob([new Uint8Array(4104)])).catch(
      (cause: unknown) => cause,
    )

    expect((error as Dx7VoiceFileError).problem).toBe('bank')
  })

  it('recognises a 32-voice bank passed in whole', () => {
    expect(problemOf(new Uint8Array(4104))).toBe('bank')
  })

  it('rejects a file that is not a Yamaha dump', () => {
    const file = voiceFile()
    file[1] = 0x42

    expect(problemOf(file)).toBe('format')
  })

  it('rejects a dump of another Yamaha format', () => {
    const file = voiceFile()
    file[3] = 0x09

    expect(problemOf(file)).toBe('format')
  })

  it('rejects a file without its closing byte', () => {
    const file = voiceFile()
    file[162] = 0x00

    expect(problemOf(file)).toBe('format')
  })

  it('rejects voice data above seven bits', () => {
    const file = voiceFile()
    file[10] = 0x80

    expect(problemOf(file)).toBe('high-bit-data')
  })

  it('rejects a file whose checksum does not match its data', () => {
    const file = voiceFile()
    file[10] = (file[10] + 1) & 0x7f

    expect(problemOf(file)).toBe('checksum')
  })

  it('reads a file the user chose', async () => {
    const voice = await readDx7VoiceFile(new Blob([voiceFile()]))

    expect(voice.data).toEqual(brass.data)
  })
})

describe('makeDx7VoiceFilename', () => {
  it('names the file after its slot and patch', () => {
    expect(makeDx7VoiceFilename({ bank: 'A', name: 'BRASS   1', number: 5 })).toBe(
      'fm1-A05-BRASS-1.syx',
    )
  })

  it('replaces characters a filename cannot hold', () => {
    expect(makeDx7VoiceFilename({ bank: 'B', name: 'A/B:C', number: 12 })).toBe('fm1-B12-A-B-C.syx')
  })

  it('uses the slot alone when the name leaves nothing usable', () => {
    expect(makeDx7VoiceFilename({ bank: 'C', name: '...', number: 1 })).toBe('fm1-C01.syx')
  })
})
