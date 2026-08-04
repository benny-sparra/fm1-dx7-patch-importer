import { CheckCircle2, FlaskConical, LoaderCircle, RotateCcw, Send, X, XCircle } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { type Fm1CapabilityProbeResult, type MidiController } from '@/hooks/use-midi'
import { type Fm1CapabilityKind } from '@/lib/midi'

type Fm1SysexTestDialogProps = {
  midi: MidiController
}

type TestStatus = {
  kind: 'idle' | 'error' | 'success'
  message: string
}

export function Fm1SysexTestDialog({ midi }: Fm1SysexTestDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [status, setStatus] = useState<TestStatus>({
    kind: 'idle',
    message: '',
  })
  const [isProbing, setIsProbing] = useState(false)
  const [probeResults, setProbeResults] = useState<Fm1CapabilityProbeResult[]>([])

  const runCapabilityProbe = async () => {
    setIsProbing(true)
    setProbeResults([])
    setStatus({
      kind: 'idle',
      message: 'Requesting identity, current voice, and stored bank data from the FM1…',
    })

    try {
      const results = await midi.probeFm1Capabilities()
      setProbeResults(results)
      const supported = results.filter((result) => result.status === 'supported')
      setStatus(supported.length > 0
        ? {
            kind: 'success',
            message: `The FM1 returned ${supported.length} recognized response${supported.length === 1 ? '' : 's'}.`,
          }
        : {
            kind: 'error',
            message: 'No recognized reply was received. This does not prove the feature is unsupported; verify the input port and cable, then retry.',
          })
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'The capability test could not run.',
      })
    } finally {
      setIsProbing(false)
    }
  }

  const sendTranspose = (value: 24 | 36) => {
    const sent = midi.sendParameter(144, value)
    setStatus(sent
      ? {
          kind: 'success',
          message: value === 24
            ? 'Reference transpose sent. Play a note, then send the octave-up value.'
            : 'Octave-up transpose sent. The same note should now sound one octave higher.',
        }
      : {
          kind: 'error',
          message: 'The message was not sent. Connect a SysEx-capable output and check the MIDI log.',
        })
  }

  return (
    <>
      <Button
        onClick={() => dialogRef.current?.showModal()}
        type="button"
        variant="secondary"
      >
        <FlaskConical className="size-4" />
        FM1 diagnostics
      </Button>

      <dialog
        aria-labelledby="sysex-test-title"
        className="fixed inset-0 z-50 m-auto max-h-[calc(100svh-2rem)] w-[min(620px,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-primary/30 bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/55"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close()
        }}
        ref={dialogRef}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="flex gap-3">
            <FlaskConical className="mt-0.5 size-6 shrink-0 text-primary" />
            <div>
              <h2 className="text-lg font-bold" id="sysex-test-title">
                Test FM1 MIDI capabilities
              </h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Check V15 for device-to-browser responses, or make an audible real-time parameter edit.
              </p>
            </div>
          </div>
          <Button
            aria-label="Close SysEx test"
            className="shrink-0"
            onClick={() => dialogRef.current?.close()}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>

        <div className="grid gap-4 p-5">
          <section className="grid gap-3 rounded-lg border bg-background p-4">
            <div>
              <h3 className="text-sm font-semibold">V15 readback diagnostic</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Sends standard read-only MIDI identity and Yamaha DX7 dump requests. It does not overwrite a patch or bank.
              </p>
            </div>

            <Button
              disabled={isProbing || !midi.hasMidiInput || !midi.hasMidiOutput}
              onClick={() => void runCapabilityProbe()}
              type="button"
            >
              {isProbing ? <LoaderCircle className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
              {isProbing ? 'Listening for FM1…' : 'Test device readback'}
            </Button>

            {!midi.hasMidiInput || !midi.hasMidiOutput ? (
              <p className="text-xs leading-5 text-amber-700 dark:text-amber-300">
                Select both the FM1 output and input monitor in Settings first. They may have the same device name.
              </p>
            ) : null}

            {probeResults.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-3">
                {(['identity', 'voice', 'bank'] as Fm1CapabilityKind[]).map((kind) => {
                  const result = probeResults.find((item) => item.kind === kind)
                  const supported = result?.status === 'supported'
                  const invalid = result?.status === 'invalid'
                  return (
                    <div className="rounded-md border bg-card px-3 py-2 text-xs" key={kind}>
                      <span className="flex items-center gap-1.5 font-semibold capitalize">
                        {supported
                          ? <CheckCircle2 className="size-3.5 text-emerald-600" />
                          : <XCircle className="size-3.5 text-muted-foreground" />}
                        {kind === 'voice' ? 'Current voice' : kind}
                      </span>
                      <span className={invalid ? 'text-destructive' : 'text-muted-foreground'}>
                        {supported ? 'Valid reply' : invalid ? 'Invalid dump' : 'No response'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </section>

          <div className="border-t" />

          <div>
            <h3 className="text-sm font-semibold">Real-time parameter test</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Makes an audible edit to the current patch using M-VAVE's documented DX7 parameter-write format.
            </p>
          </div>

          <ol className="grid gap-2 text-sm leading-6 text-muted-foreground">
            <li><span className="font-semibold text-foreground">1.</span> Select a patch on the FM1 and connect its MIDI output in Settings.</li>
            <li><span className="font-semibold text-foreground">2.</span> Send the reference value, then play a note.</li>
            <li><span className="font-semibold text-foreground">3.</span> Send the octave-up value and play the same note again.</li>
          </ol>

          <div className="grid gap-3 rounded-lg border bg-background p-4 sm:grid-cols-2">
            <Button
              disabled={!midi.hasMidiOutput}
              onClick={() => sendTranspose(24)}
              type="button"
              variant="outline"
            >
              <RotateCcw className="size-4" />
              1. Send reference pitch
            </Button>
            <Button
              disabled={!midi.hasMidiOutput}
              onClick={() => sendTranspose(36)}
              type="button"
            >
              <Send className="size-4" />
              2. Send octave up
            </Button>
          </div>

          <div className="rounded-md border bg-muted/40 px-4 py-3 font-mono text-xs leading-5 text-muted-foreground">
            Parameter 144 · reference 24 · test 36
            <br />
            Ch {midi.channel}: F0 43 {(0x10 | (midi.channel - 1)).toString(16).padStart(2, '0').toUpperCase()} 01 10 vv F7
          </div>

          {status.message ? (
            <p
              className={status.kind === 'error'
                ? 'rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'
                : 'rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm'}
              role="status"
            >
              {status.message}
            </p>
          ) : null}

          <p className="text-xs leading-5 text-muted-foreground">
            This changes only the current edit buffer. Reselect the patch on the FM1 after the test to restore its stored settings. The full sent message is recorded in the MIDI log.
          </p>
        </div>
      </dialog>
    </>
  )
}
