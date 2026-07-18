import { ListMusic, X } from 'lucide-react'
import { useRef } from 'react'

import { MidiLogCard } from '@/components/midi/midi-log-card'
import { Button } from '@/components/ui/button'
import { type MidiLogEntry } from '@/lib/midi'

type MidiLogDialogProps = {
  log: MidiLogEntry[]
}

export function MidiLogDialog({ log }: MidiLogDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <Button
        onClick={() => dialogRef.current?.showModal()}
        type="button"
        variant="secondary"
      >
        <ListMusic className="size-4" />
        MIDI log
      </Button>

      <dialog
        aria-label="MIDI log"
        className="m-auto max-h-[90vh] w-[min(52rem,calc(100vw-2rem))] overflow-auto rounded-xl bg-transparent p-0 text-card-foreground shadow-2xl backdrop:bg-black/55"
        ref={dialogRef}
      >
        <div className="relative">
          <Button
            aria-label="Close MIDI log"
            className="absolute right-4 top-4 z-10"
            onClick={() => dialogRef.current?.close()}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
          <MidiLogCard log={log} />
        </div>
      </dialog>
    </>
  )
}
