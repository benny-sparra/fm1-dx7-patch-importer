import { useTranslation } from 'react-i18next'

import { ErrorNotice } from '@/components/ui/error-notice'
import type { MidiController } from '@/hooks/use-midi'

/*
 * A module of its own, so a lazy dialog can show why MIDI did not connect without importing
 * `midi-controls`, whose `@/i18n` import made Rolldown split i18next out of the entry.
 */

const midiConnectionErrorKeys = {
  disconnect_failed: 'midi.errors.disconnectFailed',
  enable_failed: 'midi.errors.enableFailed',
  insecure_context: 'midi.errors.insecureContext',
  permission_denied: 'midi.errors.permissionDenied',
  unsupported_browser: 'midi.errors.unsupportedBrowser',
} as const satisfies Record<NonNullable<MidiController['error']>, string>

export function MidiConnectionError({ midi }: { midi: Pick<MidiController, 'error'> }) {
  const { t } = useTranslation()
  if (!midi.error) return null

  return <ErrorNotice>{t(midiConnectionErrorKeys[midi.error])}</ErrorNotice>
}
