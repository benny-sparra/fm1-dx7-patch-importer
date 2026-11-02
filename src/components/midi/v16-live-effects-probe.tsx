import { Copy, FlaskConical } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { MessageEvent } from 'webmidi'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorNotice } from '@/components/ui/error-notice'
import type { MidiController } from '@/hooks/use-midi'
import { fm1EffectParameters } from '@/lib/fm1-parameters'
import { formatMidiBytes, makeLogEntry } from '@/lib/midi'
import { midiActivity } from '@/lib/midi-activity'
import {
  candidateEffectValues,
  liveEffectsOffset,
  readV16LiveEffects,
  type V16LiveEffects,
} from '@/lib/v16-live-effects'

type LiveEffectsProbeProps = {
  midi: Pick<
    MidiController,
    | 'firmware'
    | 'hasMidiOutput'
    | 'inputs'
    | 'logStore'
    | 'outputs'
    | 'selectedInputId'
    | 'selectedOutputId'
    | 'sysexAvailable'
  >
}

const hex = (byte: number) => byte.toString(16).padStart(2, '0').toUpperCase()

/**
 * Development only. Sends the one approved read of V16's live FX settings (AGENTS.md, "MIDI",
 * 2026-11-02) when its button is pressed, and shows the raw bytes beside the candidate decoding.
 * It offers nothing else: no other command, object, offset, or length, no retry, and nothing is
 * sent until the press, on stock `FM-1_016` only. Hardware use waits for the owner's go-ahead on
 * docs/v16-fx-readback-validation.md.
 */
export function V16LiveEffectsProbe({ midi }: LiveEffectsProbeProps) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null)
  const [reading, setReading] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [result, setResult] = useState<{ at: Date; read: V16LiveEffects } | null>(null)
  const abort = useRef<AbortController | null>(null)
  const titleId = useId()
  const { firmware, logStore } = midi
  const input = midi.inputs.find((device) => device.id === midi.selectedInputId)?.port
  const output = midi.outputs.find((device) => device.id === midi.selectedOutputId)?.port
  const stockV16 = firmware.kind === 'mvave' && firmware.identity === 'FM-1_016'
  const canRead = stockV16 && midi.hasMidiOutput && midi.sysexAvailable && !!input && !!output

  // A changed port, or unmounting, cancels the read that is waiting.
  useEffect(() => () => abort.current?.abort(), [input, output])

  async function read() {
    if (!canRead || !input || !output || reading) return
    const controller = new AbortController()
    abort.current = controller
    setReading(true)
    setFailure(null)
    try {
      const effects = await readV16LiveEffects(
        {
          listen: (hear) => {
            const handle = (event: MessageEvent) => hear(event.data)
            input.addListener('midimessage', handle)
            return () => input.removeListener('midimessage', handle)
          },
          send: (message) => {
            output.send(message)
            midiActivity.signal('out')
            logStore.append(makeLogEntry('out', 'Asked the FM1 for its live FX settings.', message))
          },
        },
        { signal: controller.signal },
      )
      logStore.append(makeLogEntry('in', 'The FM1 sent its live FX settings.', effects.reply))
      setResult({ at: new Date(), read: effects })
    } catch (error) {
      if (!controller.signal.aborted) {
        setFailure(error instanceof Error ? error.message : 'The read failed.')
      }
    } finally {
      if (abort.current === controller) setReading(false)
    }
  }

  async function copyCapture() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            firmware: stockV16 ? firmware.identity : undefined,
            offset: hex(liveEffectsOffset),
            readAt: result.at.toISOString(),
            reply: formatMidiBytes(result.read.reply),
            table: formatMidiBytes(result.read.table),
            values: formatMidiBytes(result.read.values),
          },
          null,
          2,
        ),
      )
    } catch {
      setFailure('The capture could not be copied. The MIDI log holds the reply too.')
    }
  }

  const candidate = result ? candidateEffectValues(result.read) : null

  return (
    <>
      <button
        className="inline-flex shrink-0 items-center gap-1.5 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onClick={() => dialog?.showModal()}
        type="button"
      >
        <FlaskConical aria-hidden="true" className="size-3.5" />
        V16 live FX read (dev)
      </button>
      <Dialog aria-labelledby={titleId} ref={setDialog} size="lg">
        <DialogHeader>
          <DialogTitle id={titleId}>V16 live FX read</DialogTitle>
          <DialogCloseButton label="Close live FX read" onClick={() => dialog?.close()} />
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4 p-4 text-sm">
            <p className="leading-6 text-[var(--crt-ink-3)]">
              Development only. Sends one read of the live FX settings (object 5, offset 0x
              {hex(liveEffectsOffset)}, 54 bytes) when pressed. It changes nothing on the FM1, never
              asks again, and needs stock FM-1_016 with both ports selected.
            </p>
            {!canRead ? (
              <p>Connect stock FM-1_016 with SysEx on and its input and output selected.</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button aria-disabled={!canRead || reading} onClick={() => void read()} type="button">
                <span>{reading ? 'Reading…' : 'Read live FX'}</span>
              </Button>
              <Button disabled={!result} onClick={() => void copyCapture()} variant="secondary">
                <Copy aria-hidden="true" />
                <span>Copy capture</span>
              </Button>
            </div>
            {failure ? <ErrorNotice>{failure}</ErrorNotice> : null}
            {result && candidate ? (
              <section aria-label="Live FX read" className="space-y-3">
                <p>Read at {result.at.toLocaleTimeString()}.</p>
                <p className="font-mono text-xs break-all">
                  Values (0x9C): {formatMidiBytes(result.read.values)}
                  <br />
                  Table (0xB7): {formatMidiBytes(result.read.table)}
                </p>
                {candidate.type === 'invalid' ? (
                  <p>
                    Candidate decoding fails: controller {candidate.controller} read{' '}
                    {candidate.value}, outside its range.
                  </p>
                ) : (
                  <ol aria-label="Candidate decoding" className="font-mono text-xs">
                    {fm1EffectParameters.map((parameter, index) => (
                      <li key={parameter.id}>
                        CC {parameter.controller} {parameter.id} = {candidate.values[index]}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ) : null}
          </div>
        </DialogBody>
      </Dialog>
    </>
  )
}
