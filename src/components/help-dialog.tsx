import { CircleHelp, Library, PlugZap, Send, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { trackAnalyticsEvent } from '@/lib/analytics'

const HELP_SEEN_KEY = 'fm1-librarian-help-seen'

const steps = [
  {
    description: 'help.steps.libraryBody',
    icon: Library,
    title: 'help.steps.libraryTitle',
  },
  {
    description: 'help.steps.editBody',
    icon: SlidersHorizontal,
    title: 'help.steps.editTitle',
  },
  {
    description: 'help.steps.connectBody',
    icon: PlugZap,
    title: 'help.steps.connectTitle',
  },
  {
    description: 'help.steps.transferBody',
    icon: Send,
    title: 'help.steps.transferTitle',
  },
]

export function HelpDialog() {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem(HELP_SEEN_KEY) !== 'true') {
        dialogRef.current?.showModal()
      }
    } catch {
      dialogRef.current?.showModal()
    }
  }, [])

  const closeDialog = () => dialogRef.current?.close()

  const rememberHelpWasSeen = () => {
    try {
      localStorage.setItem(HELP_SEEN_KEY, 'true')
    } catch {
      // The help button remains available when storage is unavailable.
    }
  }

  return (
    <>
      <Button
        aria-label={t('help.open')}
        className="hero-action cursor-pointer bg-transparent hover:bg-transparent hover:text-[var(--hero-action-hover-foreground)]"
        onClick={() => {
          trackAnalyticsEvent({ data: { surface: 'guide' }, name: 'help_opened' })
          dialogRef.current?.showModal()
        }}
        size="icon"
        title={t('help.open')}
        type="button"
        variant="ghost"
      >
        <CircleHelp className="!size-7" />
      </Button>

      <Dialog
        aria-labelledby="help-dialog-title"
        onClose={rememberHelpWasSeen}
        ref={dialogRef}
        size="3xl"
      >
        <DialogHeader>
          <DialogTitle id="help-dialog-title">
            <CircleHelp className="size-4 shrink-0" />
            {t('help.title')}
          </DialogTitle>
          <DialogCloseButton label={t('help.close')} onClick={closeDialog} />
        </DialogHeader>
        <DialogBody>
          <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]">{t('help.intro')}</p>

          {/*
            The callout and each step are labelled wells: the label sits
            astride the top border and breaks it, the way a panel legend does.
          */}
          <div className="crt-legend-box mx-4 mt-5 p-3.5">
            <span className="crt-legend text-[11px] tracking-[0.18em] text-[var(--crt-led)] uppercase">
              {t('help.truthTitle')}
            </span>
            <span className="block pt-1 text-sm leading-6 text-[var(--crt-ink-2)]">
              {t('help.truthBody')}
            </span>
          </div>

          <ol className="grid gap-x-4 gap-y-5 p-4 pt-6 sm:grid-cols-2">
            {steps.map(({ description, icon: Icon, title }, index) => (
              <li className="crt-legend-box p-3.5 pt-3" key={title}>
                <span className="crt-legend font-dot-matrix flex items-center gap-1.5 text-xs font-bold tracking-[0.12em] text-[var(--crt-acc-lt)] uppercase">
                  {index + 1}. <Icon aria-hidden="true" className="size-3.5" />
                  {t(title)}
                </span>
                <p className="text-sm leading-6 text-[var(--crt-ink-2)]">{t(description)}</p>
              </li>
            ))}
          </ol>
        </DialogBody>
        <DialogFooter>
          <Button className="shrink-0" onClick={closeDialog} type="button">
            {t('help.start')}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
