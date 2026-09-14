import i18n from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'

import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { i18nReady } from '@/i18n'
import french from '@/i18n/locales/fr'
import { parseDx7Bank } from '@/lib/dx7'
import { Dx7CatalogBankUnavailableError } from '@/lib/dx7-bank-catalog'
import { WorkspaceBankUnavailableError } from '@/lib/patch-library'

function importError(bytes: Uint8Array) {
  try {
    parseDx7Bank(bytes.buffer as ArrayBuffer)
  } catch (error) {
    return error
  }
  throw new Error('Expected the bank file to be rejected.')
}

beforeAll(async () => {
  await i18nReady
  i18n.addResourceBundle('fr', 'translation', french)
})

describe('bankErrorMessage', () => {
  it('explains a bank file of the wrong size with its byte count', () => {
    const t = i18n.getFixedT('en')

    expect(bankErrorMessage(t, importError(new Uint8Array(3)), 'Import failed.')).toBe(
      'This file is 3 bytes. A DX7 bank file must be exactly 4,104 bytes.',
    )
  })

  it('explains a bank file problem in the interface language', () => {
    const t = i18n.getFixedT('fr')
    const notDx7 = Uint8Array.from({ length: 4104 })

    expect(bankErrorMessage(t, importError(notDx7), 'Échec.')).toBe(french.banks.fileErrors.format)
  })

  it('explains an unavailable catalog bank and workspace bank', () => {
    const t = i18n.getFixedT('en')

    expect(bankErrorMessage(t, new Dx7CatalogBankUnavailableError('ROM1A'), 'Failed.')).toBe(
      'That sound bank could not be downloaded. Check your connection, then try again.',
    )
    expect(bankErrorMessage(t, new WorkspaceBankUnavailableError(), 'Failed.')).toBe(
      'That workspace bank is no longer available. Close this dialog and try again.',
    )
  })

  it('shows the fallback instead of technical text for any other error', () => {
    const t = i18n.getFixedT('en')

    expect(bankErrorMessage(t, new Error('QuotaExceededError: IndexedDB'), 'Import failed.')).toBe(
      'Import failed.',
    )
  })
})
