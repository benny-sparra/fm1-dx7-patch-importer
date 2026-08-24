import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function MidiSysexWarning() {
  const { t } = useTranslation()

  return (
    <div
      className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
      role="alert"
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <p>
        <span className="font-semibold">{t('midi.sysexWarningTitle')}</span>{' '}
        {t('midi.sysexWarningBody')}
      </p>
    </div>
  )
}
