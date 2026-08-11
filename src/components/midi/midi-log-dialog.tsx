import { ListMusic } from 'lucide-react'
import { type SVGProps, useRef, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { MidiLogCard } from '@/components/midi/midi-log-card'
import { Button } from '@/components/ui/button'
import { type MidiLogStore } from '@/lib/midi-log-store'

type MidiLogDialogProps = {
  logStore: MidiLogStore
}

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

export function MidiLogDialog({ logStore }: MidiLogDialogProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const log = useSyncExternalStore(
    logStore.subscribe,
    logStore.getSnapshot,
    logStore.getSnapshot,
  )
  const hasMidiActivity = !(
    log.length === 1 &&
    log[0].direction === 'system' &&
    log[0].message === 'Ready. Connect a Chromium browser to begin.'
  )

  return (
    <>
      <Button
        disabled={!hasMidiActivity}
        onClick={() => dialogRef.current?.showModal()}
        type="button"
        variant="secondary"
      >
        <ListMusic className="size-4" />
        {t('midi.log')}
      </Button>

      <dialog
        aria-label={t('midi.log')}
        className="m-auto max-h-[90vh] w-[min(52rem,calc(100vw-2rem))] overflow-auto rounded-xl bg-transparent p-0 text-card-foreground shadow-2xl backdrop:bg-black/55"
        ref={dialogRef}
      >
        <div className="relative">
          <Button
            aria-label={t('midi.closeLog')}
            className="absolute right-4 top-4 z-10"
            onClick={() => dialogRef.current?.close()}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PixelCloseIcon className="!size-5" />
          </Button>
          <MidiLogCard log={log} />
        </div>
      </dialog>
    </>
  )
}
