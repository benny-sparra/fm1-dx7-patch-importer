import { ExternalLink } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const bankSources = [
  {
    descriptionKey: 'dialogs.sourceDescriptions.yamahaBlackBoxes',
    name: 'Yamaha Black Boxes',
    url: 'https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/',
  },
  {
    descriptionKey: 'dialogs.sourceDescriptions.bobbyBlues',
    name: 'Bobby Blues DX7 archive',
    url: 'https://bobbyblues.recup.ch/yamaha_dx7/dx7_patches.html',
  },
  {
    descriptionKey: 'dialogs.sourceDescriptions.soundarchive',
    name: 'Soundarchive',
    url: 'https://www.soundarchive.co/yamaha-dx7',
  },
]

export function Dx7BankSourcesDialog() {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        className="synthwave-hero-accent cursor-pointer font-semibold underline decoration-current/40 underline-offset-4 transition-opacity hover:opacity-80"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        {t('dialogs.sourcesOpen')}
      </button>

      <Dialog aria-labelledby="dx7-bank-sources-title" ref={dialogRef} size="lg">
        <DialogHeader>
          <DialogTitle id="dx7-bank-sources-title">{t('dialogs.sourcesTitle')}</DialogTitle>
          <DialogCloseButton
            label={t('dialogs.sourcesClose')}
            onClick={() => dialogRef.current?.close()}
          />
        </DialogHeader>
        <DialogBody>
          <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]">
            {t('dialogs.sourcesIntro')}
          </p>

          <ul className="grid gap-3 p-5">
            {bankSources.map((source) => (
              <li key={source.url}>
                <a
                  className="group flex items-start justify-between gap-4 border border-[var(--crt-line-lt)] p-3.5 transition-colors hover:border-[var(--crt-acc-lt)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-acc-lt)]"
                  href={source.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>
                    <span className="font-dot-matrix block text-xs font-bold tracking-[0.12em] text-[var(--crt-acc-lt)] uppercase">
                      {source.name}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-[var(--crt-ink-2)]">
                      {t(source.descriptionKey)}
                    </span>
                  </span>
                  <ExternalLink className="mt-0.5 size-4 shrink-0 text-[var(--crt-ink-3)] group-hover:text-[var(--crt-acc-lt)]" />
                </a>
              </li>
            ))}
          </ul>
        </DialogBody>
      </Dialog>
    </>
  )
}
