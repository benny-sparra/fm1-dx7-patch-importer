import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

/*
  Both words share one grid cell and the inactive one is only made invisible,
  so a latching button keeps the wider word's width in either state (and in
  any locale) instead of jumping when it toggles.
*/
export function OnOffLabel({ on }: { on: boolean }) {
  const { t } = useTranslation()

  return (
    <span className="grid">
      <span aria-hidden={!on} className={cn('col-start-1 row-start-1', !on && 'invisible')}>
        {t('editor.on')}
      </span>
      <span aria-hidden={on} className={cn('col-start-1 row-start-1', on && 'invisible')}>
        {t('editor.off')}
      </span>
    </span>
  )
}
