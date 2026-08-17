/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { dx7BankCatalog, findDx7CatalogBank } from '@/data/dx7-bank-catalog'
import { makeDx7BankFile, parseDx7Bank } from '@/lib/dx7'
import { loadDx7CatalogBank } from '@/lib/dx7-bank-catalog'
import { makeDemoVoices } from '@/lib/patch-library'

describe('DX7 bank catalog', () => {
  it('lists every bank published in the source catalog with unique local files', () => {
    expect(dx7BankCatalog).toHaveLength(35)
    expect(new Set(dx7BankCatalog.map(({ id }) => id)).size).toBe(35)
    expect(new Set(dx7BankCatalog.map(({ file }) => file)).size).toBe(35)
    expect(findDx7CatalogBank('vrc112b')?.name).toBe('VRC112B')
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
      expect(parseDx7Bank(bytes.buffer), bank.file).toHaveLength(32)
    }
  })

  it('rejects missing choices, failed loads, and malformed catalog data', async () => {
    await expect(loadDx7CatalogBank('', vi.fn())).rejects.toThrow('Choose')
    await expect(loadDx7CatalogBank('rom1a', async () => ({
      arrayBuffer: async () => new ArrayBuffer(0),
      ok: false,
    }))).rejects.toThrow('could not be loaded')
    await expect(loadDx7CatalogBank('rom1a', async () => ({
      arrayBuffer: async () => new ArrayBuffer(12),
      ok: true,
    }))).rejects.toThrow('4104-byte')
  })
})
