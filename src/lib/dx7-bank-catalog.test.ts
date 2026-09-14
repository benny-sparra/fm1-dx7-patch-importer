/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { dx7BankCatalog, findDx7CatalogBank } from '@/data/dx7-bank-catalog'
import { makeDx7BankFile, parseDx7Bank } from '@/lib/dx7'
import { Dx7CatalogBankUnavailableError, loadDx7CatalogBank } from '@/lib/dx7-bank-catalog'
import { makeDemoVoices } from '@/lib/patch-library'

describe('DX7 bank catalog', () => {
  it('lists every bank published in the source catalog with unique local files', () => {
    expect(dx7BankCatalog).toHaveLength(39)
    expect(new Set(dx7BankCatalog.map(({ id }) => id)).size).toBe(39)
    expect(new Set(dx7BankCatalog.map(({ file }) => file)).size).toBe(39)
    expect(findDx7CatalogBank('vrc112b')?.name).toBe('VRC112B')
  })

  it('lists the four FM-1 factory banks as their own group', () => {
    expect(
      dx7BankCatalog.filter(({ category }) => category === 'FM-1 Factory').map(({ id }) => id),
    ).toEqual(['fm1-bank1', 'fm1-bank2', 'fm1-bank3', 'fm1-bank4'])
  })

  it('keeps the recovered FM-1 voice names byte for byte, device quirks included', () => {
    const names = (file: string) =>
      parseDx7Bank(Uint8Array.from(readFileSync(resolve('public', file.slice(1)))).buffer).map(
        ({ name }) => name,
      )

    expect(names('/dx7-banks/fm1/bank1.syx').slice(0, 9)).toEqual([
      'PIANO 1',
      'ORGAN 1',
      'SYN LEAD 1',
      'SYN PAD 1',
      'PIANO 2',
      'Organ 2',
      'SYN LEAD 2',
      'SYN PAD 2',
      'PIANO3',
    ])
    expect(names('/dx7-banks/fm1/bank4.syx').slice(19, 28)).toEqual([
      'SAW EM UP',
      'BI   BEN',
      'KALIMBA',
      'GAMALONG',
      'SAW EM UP2',
      'TUB BELLS',
      'BRUSHES',
      'TOM TOMS',
      'SAW EM UP3',
    ])
  })

  it('loads and validates a selected catalog bank', async () => {
    const bytes = makeDx7BankFile(makeDemoVoices())
    const fetchBank = vi.fn(async () => ({
      arrayBuffer: async () => bytes.buffer,
      ok: true,
    }))

    await expect(loadDx7CatalogBank('rom1a', fetchBank)).resolves.toHaveLength(32)
    expect(fetchBank).toHaveBeenCalledWith('/dx7-banks/factory/rom1a.syx')
  })

  it('ships a checksum-valid 32-voice SysEx file for every entry', () => {
    for (const bank of dx7BankCatalog) {
      const bytes = Uint8Array.from(readFileSync(resolve('public', bank.file.slice(1))))
      expect(parseDx7Bank(bytes.buffer)).toHaveLength(32)
    }
  })

  it('rejects missing choices, failed loads, and malformed catalog data', async () => {
    await expect(loadDx7CatalogBank('', vi.fn())).rejects.toThrow('Choose')
    await expect(
      loadDx7CatalogBank('rom1a', async () => ({
        arrayBuffer: async () => new ArrayBuffer(0),
        ok: false,
      })),
    ).rejects.toThrow('could not be loaded')
    await expect(
      loadDx7CatalogBank('rom1a', async () => ({
        arrayBuffer: async () => new ArrayBuffer(12),
        ok: true,
      })),
    ).rejects.toThrow('4104-byte')
  })
})

describe('DX7 catalog bank downloads', () => {
  it('reports a failed download as an unavailable catalog bank', async () => {
    await expect(
      loadDx7CatalogBank('rom1a', async () => ({
        arrayBuffer: async () => new ArrayBuffer(0),
        ok: false,
      })),
    ).rejects.toBeInstanceOf(Dx7CatalogBankUnavailableError)
  })

  it('reports a network failure as an unavailable catalog bank', async () => {
    await expect(
      loadDx7CatalogBank('rom1a', async () => {
        throw new TypeError('Failed to fetch')
      }),
    ).rejects.toBeInstanceOf(Dx7CatalogBankUnavailableError)
  })
})
