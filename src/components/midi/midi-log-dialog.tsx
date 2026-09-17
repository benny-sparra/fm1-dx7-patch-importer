import { Download, ListMusic } from 'lucide-react'
import { useRef, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { MidiLogCard } from '@/components/midi/midi-log-card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { downloadFile } from '@/lib/download-file'
import { makeMidiLogFile } from '@/lib/midi-log-file'
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

  function downloadLog() {
    const { filename, text } = makeMidiLogFile(log, {
      exportedAt: new Date(),
      userAgent: navigator.userAgent,
    })
    downloadFile(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename)
  }

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
        <DialogFooter>
          <Button onClick={downloadLog} size="sm" type="button" variant="outline">
            <Download aria-hidden="true" className="size-4" />
            {t('midi.downloadLog')}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
