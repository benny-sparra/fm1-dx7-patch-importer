import type { TFunction } from 'i18next'

import { Fm1VaPresetReadError } from '@/lib/fm1-va-preset-read'

/**
 * Explains a read of the FM1's presets that did not finish, for the dialogs that read them. The
 * reader cancels a read itself when the ports change, and refuses one once they cannot read; a
 * read the user stops shows nothing.
 */
export function fm1VaReadErrorMessage(t: TFunction, error: unknown) {
  if (error instanceof Fm1VaPresetReadError) {
    switch (error.problem) {
      case 'busy':
        return t('fm1VaImport.errors.readBusy')
      case 'no-reply':
      case 'send-failed':
        return t('fm1VaImport.errors.readNoReply')
      case 'cancelled':
      case 'unavailable':
        return t('fm1VaImport.errors.readStopped')
    }
  }
  return t('fm1VaImport.errors.readFailed')
}
