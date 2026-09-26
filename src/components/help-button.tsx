import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { LoadFailedNotice } from '@/components/ui/load-failed-notice'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { hasSeenHelp } from '@/lib/help-seen'

// The guide loads when it is first asked for; the trigger stays in the initial bundle.
const HelpDialog = lazy(() =>
  import('@/components/help-dialog').then((module) => ({ default: module.HelpDialog })),
)

export function HelpButton() {
  const { t } = useTranslation()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [requested, setRequested] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  // A first visit opens the guide itself, before anything has been clicked.
  useEffect(() => {
    if (!hasSeenHelp()) setRequested(true)
  }, [])

  return (
    <>
      <Button
        aria-label={t('help.open')}
        className="hero-action font-dot-matrix size-[26px] cursor-pointer rounded-none p-0 text-base leading-none font-bold text-[var(--crt-acc-lt)] hover:bg-[var(--crt-sel-bg)] hover:text-[var(--crt-acc-lt)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
        onClick={() => {
          trackAnalyticsEvent({ data: { surface: 'guide' }, name: 'help_opened' })
          setLoadFailed(false)
          setRequested(true)
        }}
        ref={triggerRef}
        size="bare"
        title={t('help.open')}
        type="button"
        variant="bare"
      >
        <span aria-hidden="true">?</span>
      </Button>
      {loadFailed ? <LoadFailedNotice message={t('ui.helpOpenFailed')} /> : null}
      {requested ? (
        <ErrorBoundary
          onError={() => {
            setRequested(false)
            setLoadFailed(true)
          }}
        >
          <Suspense fallback={null}>
            <HelpDialog
              onClose={() => {
                setRequested(false)
                triggerRef.current?.focus()
              }}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
    </>
  )
}
