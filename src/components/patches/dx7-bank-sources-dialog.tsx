import { ExternalLink, Library } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog, DialogCloseButton, DialogHeader } from '@/components/ui/dialog'

const bankSources = [
  {
    description: 'Factory DX7 cartridges and SysEx banks.',
    name: 'Yamaha Black Boxes',
    url: 'https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/',
  },
  {
    description: 'Long-running DX7 patch and bank collection.',
    name: 'Bobby Blues DX7 archive',
    url: 'https://bobbyblues.recup.ch/yamaha_dx7/dx7_patches.html',
  },
  {
    description: 'Curated DX7, TX816 and TX802 SysEx banks.',
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

      <Dialog
        aria-labelledby="dx7-bank-sources-title"
        ref={dialogRef}
        size="lg"
      >
        <DialogHeader>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold" id="dx7-bank-sources-title">
              <Library className="size-5 text-primary" />
              {t('dialogs.sourcesTitle')}
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {t('dialogs.sourcesIntro')}
            </p>
          </div>
          <DialogCloseButton
            label={t('dialogs.sourcesClose')}
            onClick={() => dialogRef.current?.close()}
          />
        </DialogHeader>

        <ul className="grid gap-3 p-5">
          {bankSources.map((source) => (
            <li key={source.url}>
              <a
                className="group flex items-start justify-between gap-4 rounded-md border bg-background p-4 transition-colors hover:border-primary/50 hover:bg-accent"
                href={source.url}
                rel="noreferrer"
                target="_blank"
              >
                <span>
                  <span className="block font-semibold text-foreground group-hover:text-primary">
                    {source.name}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                    {source.description}
                  </span>
                </span>
                <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
              </a>
            </li>
          ))}
        </ul>

      </Dialog>
    </>
  )
}
