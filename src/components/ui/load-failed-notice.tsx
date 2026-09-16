import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { reloadPage } from '@/lib/reload-page'
import { cn } from '@/lib/utils'

type LoadFailedNoticeProps = {
  className?: string
  message: string
}

/**
 * Explains that a lazily loaded part of the app did not arrive and offers a reload, which fetches
 * the current deployment's files when a newer release has replaced the ones this page expects.
 */
export function LoadFailedNotice({ className, message }: LoadFailedNoticeProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-destructive',
        className,
      )}
      role="alert"
    >
      <span>{message}</span>
      <Button onClick={reloadPage} size="sm" type="button" variant="outline">
        <RefreshCw aria-hidden="true" />
        <span>{t('common.reloadApp')}</span>
      </Button>
    </div>
  )
}
