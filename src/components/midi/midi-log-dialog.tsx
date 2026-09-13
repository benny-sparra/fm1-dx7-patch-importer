import { ListMusic } from 'lucide-react'
import { useRef, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { MidiLogCard } from '@/components/midi/midi-log-card'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type MidiLogStore } from '@/lib/midi-log-store'

type MidiLogDialogProps = {
  logStore: MidiLogStore
}

export function MidiLogDialog({ logStore }: MidiLogDialogProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const log = useSyncExternalStore(logStore.subscribe, logStore.getSnapshot, logStore.getSnapshot)
  // Every append publishes a new snapshot, so this re-renders whenever activity starts.
  const hasMidiActivity = logStore.hasActivity()

  return (
    <>
      <button
        className="inline-flex items-center gap-1.5 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        disabled={!hasMidiActivity}
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        <ListMusic aria-hidden="true" className="size-3.5" />
        {t('midi.log')}
      </button>

      <Dialog aria-labelledby="midi-log-title" ref={dialogRef} size="4xl">
        <DialogHeader>
          <DialogTitle id="midi-log-title">{t('midi.log')}</DialogTitle>
          <DialogCloseButton
            label={t('midi.closeLog')}
            onClick={() => dialogRef.current?.close()}
          />
        </DialogHeader>
        <DialogBody>
          <MidiLogCard log={log} />
        </DialogBody>
      </Dialog>
    </>
  )
}
