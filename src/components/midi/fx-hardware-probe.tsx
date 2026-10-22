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
import { fm1V16EffectControllerGroups, type Fm1EffectProbeMode } from '@/lib/midi'

type FxHardwareProbeProps = {
  send: (controller: number, value: number, mode: Fm1EffectProbeMode) => boolean
}

type ProbeController = { controller: number; label: string; max: number | null }

// V15's controllers with the editor's maximum for each, and in V16 research V16's by its release
// notes, whose parameters and ranges the run finds out, with V15's to check they no longer act.
const v15Controllers: ProbeController[] = fm1EffectParameters.map((parameter) => ({
  controller: parameter.controller,
  label: `CC ${parameter.controller}: ${parameter.id} (editor max ${parameter.max})`,
  max: parameter.max,
}))

const v16Controllers: ProbeController[] = [
  ...fm1V16EffectControllerGroups.flatMap(({ effect, first }) =>
    [0, 1, 2, 3].map((offset) => ({
      controller: first + offset,
      label: `CC ${first + offset}: ${effect} ${offset + 1} of 4 (V16, unmapped)`,
      max: null,
    })),
  ),
  ...v15Controllers.map((entry) => ({ ...entry, label: `${entry.label}, V15's` })),
]

const probeControllers: Record<Fm1EffectProbeMode, ProbeController[]> = {
  profile: v15Controllers,
  'v16-research': v16Controllers,
}

export function FxHardwareProbe({ send }: FxHardwareProbeProps) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null)
  const [mode, setMode] = useState<Fm1EffectProbeMode>('profile')
  const [controller, setController] = useState(0)
  const [value, setValue] = useState('0')
  const controllers = probeControllers[mode]
  const selected = useMemo(
    () => controllers.find((entry) => entry.controller === controller),
    [controller, controllers],
  )
  const requestedValue = Number(value)
  // An unmapped V16 controller has no editor maximum, so the probe tries both halves' edges.
  const probeValues = selected
    ? Array.from(
        new Set(
          selected.max === null
            ? [0, 1, 63, 64, 126, 127]
            : [0, 1, Math.round(selected.max / 2), selected.max, 126, 127],
        ),
      )
    : []
  const canSend = Number.isInteger(requestedValue) && requestedValue >= 0 && requestedValue <= 127

  function sendValue(nextValue: number) {
    setValue(String(nextValue))
    send(controller, nextValue, mode)
  }

  function chooseMode(nextMode: Fm1EffectProbeMode) {
    setMode(nextMode)
    setController(probeControllers[nextMode][0].controller)
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
            recorded in the local MIDI log. This does not save to the FM1. V16 research sends V16's
            CC 70–93 and V15's CC 0–23 whatever the FM1 runs, for
            docs/hardware-runs/stock-v16-run-sheet.md.
          </p>
          <div className="space-y-4 p-4">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Controller map
              <select
                className="h-10 rounded-md border bg-background px-2"
                onChange={(event) =>
                  chooseMode(event.target.value === 'v16-research' ? 'v16-research' : 'profile')
                }
                value={mode}
              >
                <option value="profile">V15 and earlier (CC 0–23, as the profile allows)</option>
                <option value="v16-research">V16 research (CC 70–93 and 0–23)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Controller
              <select
                className="h-10 rounded-md border bg-background px-2"
                onChange={(event) => setController(Number(event.target.value))}
                value={controller}
              >
                {controllers.map((entry) => (
                  <option key={entry.controller} value={entry.controller}>
                    {entry.label}
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
