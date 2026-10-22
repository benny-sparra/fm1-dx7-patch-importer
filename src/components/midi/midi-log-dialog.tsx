import { Download } from 'lucide-react'
import { useEffect, useId, useRef, useSyncExternalStore } from 'react'
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
import type { MidiLogStore } from '@/lib/midi-log-store'

type MidiLogDialogProps = {
  logStore: MidiLogStore
  onClose: () => void
}

/** Shows the MIDI log as it grows, and downloads it for a bug report. */
export function MidiLogDialog({ logStore, onClose }: MidiLogDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const log = useSyncExternalStore(logStore.subscribe, logStore.getSnapshot, logStore.getSnapshot)

  // The footer mounts this dialog only while it is wanted, so it opens itself as it appears.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
  }, [])

  function downloadLog() {
    const { filename, text } = makeMidiLogFile(log, {
      exportedAt: new Date(),
      userAgent: navigator.userAgent,
    })
    downloadFile(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename)
  }

  return (
    <Dialog aria-labelledby={titleId} onClose={onClose} ref={dialogRef} size="4xl">
      <DialogHeader>
        <DialogTitle id={titleId}>{t('midi.log')}</DialogTitle>
        <DialogCloseButton label={t('midi.closeLog')} onClick={() => dialogRef.current?.close()} />
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
  )
}
