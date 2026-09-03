import { FlaskConical } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogCloseButton } from '@/components/ui/dialog'
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
      <Button
        className="font-vt323"
        onClick={() => dialog?.showModal()}
        type="button"
        variant="outline"
      >
        <FlaskConical className="size-4" />
        FX probe (dev)
      </Button>
      <Dialog aria-label="FM1 effects hardware probe" ref={setDialog} size="md">
        <div className="space-y-4 p-5">
          <DialogCloseButton
            className="absolute top-4 right-4"
            label="Close FX probe"
            onClick={() => dialog?.close()}
          />
          <div className="pr-8">
            <h2 className="font-dot-matrix text-lg font-semibold">FM1 effects hardware probe</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Development only. Sends one known FX CC on the selected FX channel; each send is
              recorded in the local MIDI log. This does not save to the FM1.
            </p>
          </div>
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
      </Dialog>
    </>
  )
}
