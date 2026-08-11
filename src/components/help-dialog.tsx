import { CircleHelp, Library, PlugZap, Send, SlidersHorizontal } from 'lucide-react'
import { type SVGProps, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

const HELP_SEEN_KEY = 'fm1-librarian-help-seen'

function PixelCloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 18 18" {...props}>
      <path
        d="M2 2h4v4h2v2h2V6h2V2h4v4h-2v2h-2v2h2v2h2v4h-4v-4h-2v-2H8v2H6v4H2v-4h2v-2h2V8H4V6H2V2Z"
        fill="currentColor"
      />
    </svg>
  )
}

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
        className="cursor-pointer bg-transparent text-white/70 hover:bg-transparent hover:text-white"
        onClick={() => dialogRef.current?.showModal()}
        size="icon"
        title={t('help.open')}
        type="button"
        variant="ghost"
      >
        <CircleHelp className="!size-7" />
      </Button>

      <dialog
        aria-labelledby="help-dialog-title"
        className="fixed inset-0 z-50 m-auto max-h-[calc(100svh-2rem)] w-[min(760px,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-primary/30 bg-card p-0 text-card-foreground shadow-2xl"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog()
        }}
        onClose={rememberHelpWasSeen}
        ref={dialogRef}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="flex gap-3">
            <CircleHelp className="mt-0.5 size-6 shrink-0 text-primary" />
            <div>
              <h2 className="text-lg font-bold" id="help-dialog-title">
                {t('help.title')}
              </h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {t('help.intro')}
              </p>
            </div>
          </div>
          <Button
            aria-label={t('help.close')}
            className="shrink-0"
            onClick={closeDialog}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PixelCloseIcon className="!size-5" />
          </Button>
        </div>

        <p className="mx-5 mt-5 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm leading-6">
          <span className="font-semibold">{t('help.truthTitle')}</span>{' '}{t('help.truthBody')}
        </p>

        <ol className="grid gap-3 p-5 sm:grid-cols-2">
          {steps.map(({ description, icon: Icon, title }, index) => (
            <li className="rounded-lg border bg-background p-4" key={title}>
              <div className="flex items-center gap-2 font-semibold">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                  {index + 1}
                </span>
                <Icon className="size-4 text-primary" />
                {t(title)}
              </div>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                {t(description)}
              </p>
            </li>
          ))}
        </ol>

        <div className="flex justify-end border-t bg-muted/40 px-5 py-4">
          <Button className="shrink-0" onClick={closeDialog} type="button">
            {t('help.start')}
          </Button>
        </div>
      </dialog>
    </>
  )
}
