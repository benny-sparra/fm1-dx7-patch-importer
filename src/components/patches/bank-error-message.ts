import type { TFunction } from 'i18next'

import { Dx7BankFileError } from '@/lib/dx7'
import { Dx7CatalogBankUnavailableError } from '@/lib/dx7-bank-catalog'
import { WorkspaceBankUnavailableError } from '@/lib/patch-library'

/**
 * Explains a failed bank operation in the interface language. Library errors a user can act on get
 * their own message; anything else shows the operation's fallback rather than technical text.
 */
export function bankErrorMessage(t: TFunction, error: unknown, fallback: string) {
  if (error instanceof Dx7BankFileError) {
    switch (error.problem) {
      case 'checksum':
        return t('banks.fileErrors.checksum')
      case 'format':
        return t('banks.fileErrors.format')
      case 'high-bit-data':
        return t('banks.fileErrors.highBitData')
      case 'size':
        return t('banks.fileErrors.size', { bytes: error.receivedBytes })
    }
  }
  if (error instanceof Dx7CatalogBankUnavailableError) return t('banks.catalogUnavailable')
  if (error instanceof WorkspaceBankUnavailableError) return t('banks.bankUnavailable')
  return fallback
}
