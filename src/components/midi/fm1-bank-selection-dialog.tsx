import { CircleCheck, X } from 'lucide-react'
import { type RefObject, useState } from 'react'

import fm1Synth from '@/assets/fm1-synth.png'
import { Button } from '@/components/ui/button'
import { dismissFm1BankSelectionDialogForSession } from '@/lib/session'

type Fm1BankSelectionDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>
}

export function Fm1BankSelectionDialog({ dialogRef }: Fm1BankSelectionDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const closeDialog = () => dialogRef.current?.close()

  return (
    <dialog
      aria-labelledby="fm1-bank-selection-title"
      className="fixed inset-0 z-50 m-auto max-h-[calc(100svh-2rem)] w-[min(620px,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-primary/30 bg-card p-0 text-card-foreground shadow-2xl"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog()
      }}
      onClose={() => {
        if (dontShowAgain) dismissFm1BankSelectionDialogForSession()
      }}
      ref={dialogRef}
    >
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <h2 className="text-lg font-bold" id="fm1-bank-selection-title">
            Choose the destination bank on your FM1
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            The SysEx bank is being sent. Finish the import on the unit.
          </p>
        </div>
        <Button
          aria-label="Close bank selection instructions"
          className="shrink-0"
          onClick={closeDialog}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
        <ol className="grid gap-4 text-sm leading-5">
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
            <span>Wait for the bank selection screen to appear on the FM1 display.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
            <span>Turn <strong>Knob 1, 2, 3 or 4</strong> to choose destination bank <strong>A, B, C or D</strong>.</span>
          </li>
          <li className="flex gap-3">
            <CircleCheck className="size-6 shrink-0 text-primary" />
            <span>The FM1 saves the 32 patches automatically after a brief delay.</span>
          </li>
        </ol>

        <figure className="rounded-lg border bg-[#22242a] p-3 shadow-inner">
          <img
            alt="M-VAVE FM1 front panel showing the display and four numbered knobs"
            className="mx-auto h-auto w-full"
            src={fm1Synth}
          />
        </figure>
      </div>

      <div className="flex items-center justify-between gap-4 border-t bg-muted/40 px-5 py-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            checked={dontShowAgain}
            className="size-4 accent-primary"
            onChange={(event) => setDontShowAgain(event.target.checked)}
            type="checkbox"
          />
          Don't show me again
        </label>
        <Button autoFocus onClick={closeDialog} type="button">
          Close
        </Button>
      </div>
    </dialog>
  )
}
