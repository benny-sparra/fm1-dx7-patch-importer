import { FlaskConical } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { fm1EffectParameters } from '@/lib/fm1-parameters'

type FxHardwareProbeProps = {
  send: (controller: number, value: number) => boolean
}

export function FxHardwareProbe({ send }: FxHardwareProbeProps) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null)
  const [controller, setController] = useState(0)
  const [value, setValue] = useState('0')
  const selected = useMemo(
    () => fm1EffectParameters.find((parameter) => parameter.controller === controller),
    [controller],
  )
  const requestedValue = Number(value)
  const probeValues = selected
    ? Array.from(new Set([0, 1, Math.round(selected.max / 2), selected.max, 126, 127]))
    : []
  const canSend = Number.isInteger(requestedValue) && requestedValue >= 0 && requestedValue <= 127

  function sendValue(nextValue: number) {
    setValue(String(nextValue))
    send(controller, nextValue)
  }

  return (
    <>
      <button
        className="inline-flex shrink-0 items-center gap-1.5 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onClick={() => dialog?.showModal()}
        type="button"
      >
        <FlaskConical aria-hidden="true" className="size-3.5" />
        FX probe (dev)
      </button>
      <Dialog aria-labelledby="fx-hardware-probe-title" ref={setDialog} size="md">
        <DialogHeader>
          <DialogTitle id="fx-hardware-probe-title">FM1 effects hardware probe</DialogTitle>
          <DialogCloseButton label="Close FX probe" onClick={() => dialog?.close()} />
        </DialogHeader>
        <DialogBody>
          <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]">
            Development only. Sends one known FX CC on the selected FX channel; each send is
            recorded in the local MIDI log. This does not save to the FM1.
          </p>
          <div className="space-y-4 p-4">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Controller
              <select
                className="h-10 rounded-md border bg-background px-2"
                onChange={(event) => setController(Number(event.target.value))}
                value={controller}
              >
                {fm1EffectParameters.map((parameter) => (
                  <option key={parameter.controller} value={parameter.controller}>
                    CC {parameter.controller}: {parameter.id} (editor max {parameter.max})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Raw MIDI value (0–127)
              <input
                className="h-10 rounded-md border bg-background px-2"
                inputMode="numeric"
                max="127"
                min="0"
                onChange={(event) => setValue(event.target.value)}
                type="number"
                value={value}
              />
            </label>
            <div aria-label="Suggested probe values" className="flex flex-wrap gap-2">
              {probeValues.map((probeValue) => (
                <Button
                  key={probeValue}
                  onClick={() => sendValue(probeValue)}
                  type="button"
                  variant="secondary"
                >
                  Send {probeValue}
                </Button>
              ))}
            </div>
            <Button disabled={!canSend} onClick={() => sendValue(requestedValue)} type="button">
              Send raw value
            </Button>
          </div>
        </DialogBody>
      </Dialog>
    </>
  )
}
