import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { Dx7BankFileError, dx7BankFileSize, parseDx7Bank } from '@/lib/dx7'

import { parseDx7BankArchive, readDx7BankArchive } from './dx7-bank-archive'

// Yamaha's ROM1A and ROM1B factory cartridges, as two distinct banks to join.
const bankFile = (name: string) =>
  Uint8Array.from(readFileSync(resolve(`public/dx7-banks/factory/${name}.syx`)))
const rom1a = bankFile('rom1a')
const rom1b = bankFile('rom1b')

function join(...parts: Uint8Array[]) {
  return Uint8Array.from(parts.flatMap((part) => [...part]))
}

/** A copy of a bank whose checksum no longer matches its data. */
function damaged(bank: Uint8Array) {
  const copy = bank.slice()
  copy[10] = (copy[10] + 1) & 0x7f
  return copy
}

function problemOf(bytes: Uint8Array) {
  try {
    parseDx7BankArchive(bytes.buffer as ArrayBuffer)
  } catch (error) {
    if (error instanceof Dx7BankFileError) return error.problem
    throw error
  }
  return null
}

const firstNames = (bytes: Uint8Array) =>
  parseDx7BankArchive(bytes.buffer as ArrayBuffer).map(({ voices }) => voices?.[0].name ?? null)

describe('parseDx7BankArchive', () => {
  it('reads a file holding one bank as that bank', () => {
    const [bank] = parseDx7BankArchive(rom1a.buffer as ArrayBuffer)

    expect(bank.voices).toEqual(parseDx7Bank(rom1a.buffer as ArrayBuffer))
  })

  it('splits a file that joins several banks, in file order', () => {
    expect(firstNames(join(rom1a, rom1b, rom1a))).toEqual(['BRASS   1', 'PIANO   4', 'BRASS   1'])
  })

  it('reports a damaged bank in its place and reads the others', () => {
    expect(firstNames(join(rom1a, damaged(rom1b), rom1a))).toEqual(['BRASS   1', null, 'BRASS   1'])
  })

  it('reports a bank cut short as damaged', () => {
    const cut = rom1b.slice(0, 2000)

    expect(firstNames(join(rom1a, cut))).toEqual(['BRASS   1', null])
  })

  it('passes over other SysEx messages and stray bytes between banks', () => {
    const voiceDump = Uint8Array.of(0xf0, 0x43, 0x00, 0x00, 0x01, 0x1b, 0x00, 0xf7)

    expect(firstNames(join(Uint8Array.of(0x00, 0x7f), rom1a, voiceDump, rom1b))).toEqual([
      'BRASS   1',
      'PIANO   4',
    ])
  })

  it('accepts banks dumped on any MIDI channel', () => {
    const channel16 = rom1b.slice()
    channel16[2] = 0x0f

    expect(firstNames(join(rom1a, channel16))).toHaveLength(2)
  })

  it('refuses a file in which every bank is damaged', () => {
    expect(problemOf(join(damaged(rom1a), damaged(rom1b)))).toBe('checksum')
  })

  it('refuses a single damaged bank for its own problem', () => {
    expect(problemOf(damaged(rom1a))).toBe('checksum')
  })

  it('refuses a single bank with data above seven bits', () => {
    const bank = rom1a.slice()
    bank[10] = 0x80

    expect(problemOf(bank)).toBe('high-bit-data')
  })

  it('refuses a bank-sized file that is not a DX7 bank', () => {
    const notBank = rom1a.slice()
    notBank[1] = 0x42

    expect(problemOf(notBank)).toBe('format')
  })

  it('refuses a file of another size that holds no bank', () => {
    expect(problemOf(new Uint8Array(163))).toBe('size')
  })

  it('refuses a file larger than 256 banks', () => {
    expect(problemOf(new Uint8Array(dx7BankFileSize * 256 + 1))).toBe('too-large')
  })
})

describe('readDx7BankArchive', () => {
  it('reads a file the user chose', async () => {
    const banks = await readDx7BankArchive(new Blob([join(rom1a, rom1b)]))

    expect(banks).toHaveLength(2)
  })

  it('refuses a file too large to hold banks before reading it', async () => {
    const huge = new Blob([new Uint8Array(dx7BankFileSize * 256 + 1)])
    Object.defineProperty(huge, 'arrayBuffer', {
      value: () => Promise.reject(new Error('read')),
    })

    const error = await readDx7BankArchive(huge).catch((cause: unknown) => cause)

    expect((error as Dx7BankFileError).problem).toBe('too-large')
  })
})
