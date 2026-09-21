/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { format, resolveConfig } from 'prettier'
import { describe, expect, it } from 'vitest'

import { dx7BankCatalog } from '@/data/dx7-bank-catalog'
import { parseDx7Bank } from '@/lib/dx7'

const indexPath = resolve('src/data/dx7-catalog-index.json')

describe('DX7 catalog patch-name index', () => {
  // Catalog search reads this index rather than every bank file. A stale index fails here; run
  // `npm run catalog:index` to write it again from the bank files.
  it('matches the patch names in every catalog bank file', async () => {
    const index = Object.fromEntries(
      dx7BankCatalog.map((bank) => {
        const file = readFileSync(resolve('public', bank.file.slice(1)))
        return [bank.id, parseDx7Bank(Uint8Array.from(file).buffer).map(({ name }) => name)]
      }),
    )
    const formatted = await format(JSON.stringify(index), {
      ...(await resolveConfig(indexPath)),
      filepath: indexPath,
    })

    await expect(formatted).toMatchFileSnapshot(indexPath)
  })
})
