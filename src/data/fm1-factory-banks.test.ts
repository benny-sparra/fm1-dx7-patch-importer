/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { encodedFm1FactoryBanks } from '@/data/fm1-factory-banks'

describe('bundled FM-1 factory banks', () => {
  it.each([
    ['A', 1],
    ['B', 2],
    ['C', 3],
    ['D', 4],
  ] as const)('keeps bank %s identical to the catalog file for FM-1 Bank %i', (bank, number) => {
    const catalogFile = readFileSync(resolve(`public/dx7-banks/fm1/bank${number}.syx`))

    expect(Buffer.from(encodedFm1FactoryBanks[bank], 'base64').equals(catalogFile)).toBe(true)
  })
})
