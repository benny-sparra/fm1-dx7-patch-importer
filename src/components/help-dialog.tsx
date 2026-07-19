import { CircleHelp, Download, FileUp, PlugZap, Send, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'

const HELP_SEEN_KEY = 'fm1-librarian-help-seen'

const steps = [
  {
    description: 'Download a standard 32-voice Yamaha DX7 SysEx (.syx) bank from a source you trust.',
    icon: Download,
    title: 'Find a DX7 bank',
  },
  {
    description: 'Choose browser bank A–D, then import the file. You can rename and rearrange patches before sending.',
    icon: FileUp,
    title: 'Import and organise',
  },
  {
    description: 'Connect the FM1 over USB or MIDI, click MIDI idle · Connect, and select its output in Settings.',
    icon: PlugZap,
    title: 'Connect your FM1',
  },
  {
    description: 'Click Send to FM1, then choose the matching destination bank on the synth when prompted.',
    icon: Send,
    title: 'Transfer the sounds',
  },
]

export function HelpDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem(HELP_SEEN_KEY) !== 'true') {
        dialogRef.current?.showModal()
      }
    } catch {
      dialogRef.current?.showModal()
    }
  }, [])

  const closeDialog = () => dialogRef.current?.close()

  const rememberHelpWasSeen = () => {
    try {
      localStorage.setItem(HELP_SEEN_KEY, 'true')
    } catch {
      // The help button remains available when storage is unavailable.
    }
  }

  return (
    <>
      <Button
        aria-label="How to use the FM1 patch librarian"
        className="cursor-pointer bg-transparent text-white/70 hover:bg-transparent hover:text-white"
        onClick={() => dialogRef.current?.showModal()}
        size="icon"
        title="Help"
        type="button"
        variant="ghost"
      >
        <CircleHelp className="!size-7" />
      </Button>

      <dialog
        aria-labelledby="help-dialog-title"
        className="fixed inset-0 z-50 m-auto max-h-[calc(100svh-2rem)] w-[min(620px,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-primary/30 bg-card p-0 text-card-foreground shadow-2xl"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog()
        }}
        onClose={rememberHelpWasSeen}
        ref={dialogRef}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="flex gap-3">
            <CircleHelp className="mt-0.5 size-6 shrink-0 text-primary" />
            <div>
              <h2 className="text-lg font-bold" id="help-dialog-title">
                Welcome to the FM1 patch librarian
              </h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Import, organise, audition, and transfer DX7-compatible sounds to your M-VAVE FM1 from the browser.
              </p>
            </div>
          </div>
          <Button
            aria-label="Close help"
            className="shrink-0"
            onClick={closeDialog}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>

        <ol className="grid gap-3 p-5 sm:grid-cols-2">
          {steps.map(({ description, icon: Icon, title }, index) => (
            <li className="rounded-lg border bg-background p-4" key={title}>
              <div className="flex items-center gap-2 font-semibold">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                  {index + 1}
                </span>
                <Icon className="size-4 text-primary" />
                {title}
              </div>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                {description}
              </p>
            </li>
          ))}
        </ol>

        <div className="flex justify-end border-t bg-muted/40 px-5 py-4">
          <Button className="shrink-0" onClick={closeDialog} type="button">
            Start using the librarian
          </Button>
        </div>
      </dialog>
    </>
  )
}
