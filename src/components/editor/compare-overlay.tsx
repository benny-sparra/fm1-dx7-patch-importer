import { GitCompareArrows } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { DialogBody, DialogCloseButton, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type CompareNoticeProps = {
  closeTitle: string
  isComparing: boolean
  onClose: () => void
}

/**
 * Explains the paused controls while the editor plays the saved version. Render it inside the
 * sticky editor toolbar: the notice hangs just below the toolbar at any toolbar height, over the
 * rack rather than pushing it down. It wears the dialog chrome and closes like a dialog, back to
 * the edits, but is not modal, so the floating keyboard and the Compare button stay usable. The
 * wrapper is a live region that stays mounted, so starting a comparison is announced.
 */
export function CompareNotice({ closeTitle, isComparing, onClose }: CompareNoticeProps) {
  const { t } = useTranslation()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isComparing) closeRef.current?.focus()
  }, [isComparing])

  return (
    <div className="absolute inset-x-0 top-full mt-2.5 px-3 sm:px-5 lg:px-8" role="status">
      {isComparing ? (
        <div className="compare-notice modal-surface mx-auto max-w-2xl border-2 border-[var(--crt-acc-lt)] bg-[var(--crt-bg-panel2)] text-[var(--crt-ink)]">
          <DialogHeader>
            <DialogTitle>
              <GitCompareArrows aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{t('editor.comparingTitle')}</span>
            </DialogTitle>
            <DialogCloseButton
              label={t('editor.stopComparing')}
              onClick={onClose}
              ref={closeRef}
              title={closeTitle}
            />
          </DialogHeader>
          <DialogBody>
            <p className="px-4 py-3 text-sm leading-6 text-[var(--crt-ink-3)]">
              {t('editor.comparingBody')}
            </p>
          </DialogBody>
        </div>
      ) : null}
    </div>
  )
}

/** Covers the paused rack while comparing. Place it in a relatively positioned box around the rack. */
export function CompareOverlay({ isComparing }: { isComparing: boolean }) {
  if (!isComparing) return null
  return <div aria-hidden="true" className="absolute inset-0 z-10 cursor-not-allowed" />
}
