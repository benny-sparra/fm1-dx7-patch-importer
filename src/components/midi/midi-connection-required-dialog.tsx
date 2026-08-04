import { Cable, X } from 'lucide-react'
import { type RefObject } from 'react'

import { Button } from '@/components/ui/button'

type MidiConnectionRequiredDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>
}

export function MidiConnectionRequiredDialog({ dialogRef }: MidiConnectionRequiredDialogProps) {
  const closeDialog = () => dialogRef.current?.close()

  return (
    <dialog
      aria-labelledby="midi-connection-required-title"
      className="fixed inset-0 z-50 m-auto w-[min(480px,calc(100vw-2rem))] rounded-lg border border-primary/30 bg-card p-0 text-card-foreground shadow-2xl"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog()
      }}
      ref={dialogRef}
    >
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex gap-3">
          <Cable className="mt-0.5 size-6 shrink-0 text-primary" />
          <div>
            <h2 className="text-lg font-bold" id="midi-connection-required-title">
              Connect MIDI to send this bank
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              The FM1 must be connected as a MIDI output before a bank of sounds can be sent.
            </p>
          </div>
        </div>
        <Button
          aria-label="Close MIDI connection message"
          className="shrink-0"
          onClick={closeDialog}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      </div>

      <div className="grid gap-3 px-5 py-4 text-sm leading-5">
        <p>Switch <strong>MIDI online</strong> on at the top of the page, allow MIDI access, then select the FM1 MIDI output in Settings.</p>
      </div>

      <div className="flex justify-end border-t bg-muted/40 px-5 py-4">
        <Button autoFocus onClick={closeDialog} type="button">
          Close
        </Button>
      </div>
    </dialog>
  )
}
