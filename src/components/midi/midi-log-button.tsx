import { ListMusic } from 'lucide-react'
import { lazy, Suspense, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorBoundary } from '@/components/ui/error-boundary'
import { LoadFailedNotice } from '@/components/ui/load-failed-notice'
import type { MidiLogStore } from '@/lib/midi-log-store'

// The log and its download load when it is first opened; the footer's button stays in the page.
const MidiLogDialog = lazy(() =>
  import('@/components/midi/midi-log-dialog').then((module) => ({
    default: module.MidiLogDialog,
  })),
)

type MidiLogButtonProps = {
  logStore: MidiLogStore
}

export function MidiLogButton({ logStore }: MidiLogButtonProps) {
  const { t } = useTranslation()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  // Every append publishes a new snapshot, so this re-renders whenever activity starts.
  useSyncExternalStore(logStore.subscribe, logStore.getSnapshot, logStore.getSnapshot)
  const hasMidiActivity = logStore.hasActivity()

  return (
    <>
      <button
        className="inline-flex items-center gap-1.5 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        disabled={!hasMidiActivity}
        onClick={() => {
          setLoadFailed(false)
          setOpen(true)
        }}
        ref={triggerRef}
        type="button"
      >
        <ListMusic aria-hidden="true" className="size-3.5" />
        <span>{t('midi.log')}</span>
      </button>
      {loadFailed ? <LoadFailedNotice message={t('midi.logOpenFailed')} /> : null}
      {open ? (
        <ErrorBoundary
          onError={() => {
            setOpen(false)
            setLoadFailed(true)
          }}
        >
          <Suspense fallback={null}>
            <MidiLogDialog
              logStore={logStore}
              onClose={() => {
                setOpen(false)
                triggerRef.current?.focus()
              }}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
    </>
  )
}
