import { ListMusic } from 'lucide-react'
import { useRef, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { MidiLogCard } from '@/components/midi/midi-log-card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogCloseButton } from '@/components/ui/dialog'
import { type MidiLogStore } from '@/lib/midi-log-store'

type MidiLogDialogProps = {
  logStore: MidiLogStore
}

export function MidiLogDialog({ logStore }: MidiLogDialogProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const log = useSyncExternalStore(logStore.subscribe, logStore.getSnapshot, logStore.getSnapshot)
  const hasMidiActivity = !(
    log.length === 1 &&
    log[0].direction === 'system' &&
    log[0].message === 'Ready. Connect a Chromium browser to begin.'
  )

  return (
    <>
      <Button
        className="font-vt323"
        disabled={!hasMidiActivity}
        onClick={() => dialogRef.current?.showModal()}
        type="button"
        variant="secondary"
      >
        <ListMusic className="size-4" />
        {t('midi.log')}
      </Button>

      <Dialog aria-label={t('midi.log')} ref={dialogRef} size="4xl">
        <div className="relative">
          <DialogCloseButton
            className="absolute top-4 right-4 z-10"
            label={t('midi.closeLog')}
            onClick={() => dialogRef.current?.close()}
          />
          <MidiLogCard log={log} />
        </div>
      </Dialog>
    </>
  )
}
