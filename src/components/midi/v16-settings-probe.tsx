import { Copy, FlaskConical } from 'lucide-react'
import { useId, useRef, useState } from 'react'
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
import { formatMidiBytes, makeLogEntry } from '@/lib/midi'
import { midiActivity } from '@/lib/midi-activity'
import {
  fxOrderLength,
  fxOrderOffset,
  makeSettingsBlockReadRequest,
  makeSettingsBlockWrite,
  parseSettingsBlockReply,
  readFxOrderBytes,
  type V16SettingsBlock,
} from '@/lib/v16-settings-block'

type V16SettingsProbeProps = {
  midi: Pick<
    MidiController,
    | 'firmware'
    | 'inputs'
    | 'logStore'
    | 'outputs'
    | 'selectedInputId'
    | 'selectedOutputId'
    | 'sysexAvailable'
  >
}

type ProbeRead = {
  block: V16SettingsBlock
  /** The read before this one, which the bytes are compared with. */
  previous?: V16SettingsBlock
  readAt: Date
}

const hex = (byte: number) => byte.toString(16).padStart(2, '0').toUpperCase()
const replyTimeoutMs = 2000
/** How long the FM1 gets to apply a write before the probe reads the block again. */
const settleMs = 400

function changedIndexes(bytes: Uint8Array, previous: Uint8Array | undefined) {
  if (!previous) return []
  return Array.from(bytes.keys()).filter((index) => bytes[index] !== previous[index])
}

function parseOrderText(text: string) {
  const tokens = text
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
  const bytes = tokens.map((token) => (/^[0-9a-f]{1,2}$/i.test(token) ? parseInt(token, 16) : NaN))
  return bytes.length === fxOrderLength && bytes.every((byte) => !Number.isNaN(byte)) ? bytes : null
}

const problemText = {
  checksum: 'its checksum was wrong',
  layout: 'its payload was neither the block nor the request’s prefix and the block',
  length: 'its payload was not 176 bytes',
  'seven-bit': 'it held a byte above 7 bits',
  version: 'its first byte was not the version 0x0E',
}

/**
 * Development only, on M-VAVE's V16. Reads the updater protocol's object 4 settings block,
 * writes it back unchanged, or writes it back with the 27 FX order bytes replaced, then reads it
 * again and shows which bytes changed, so the order's encoding and the write's reach can be found
 * (docs/hardware-runs/stock-v16-effect-order-run-sheet.md). These are the only `00 32` messages it
 * sends besides the identity query, approved on 2026-10-27 (AGENTS.md, "MIDI"). It sends nothing
 * on its own: every message is a button.
 */
export function V16SettingsProbe({ midi }: V16SettingsProbeProps) {
  const { firmware, logStore, sysexAvailable } = midi
  const input = midi.inputs.find((device) => device.id === midi.selectedInputId)?.port
  const output = midi.outputs.find((device) => device.id === midi.selectedOutputId)?.port
  const canRun = Boolean(input && output && sysexAvailable && firmware.kind === 'mvave')
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [read, setRead] = useState<ProbeRead | null>(null)
  const [orderText, setOrderText] = useState('')
  const [outcome, setOutcome] = useState<string | null>(null)
  const [heard, setHeard] = useState<string[]>([])
  const last = useRef<V16SettingsBlock | undefined>(undefined)
  const titleId = useId()
  const orderId = useId()

  const log = (direction: 'out' | 'system', message: string, data?: Uint8Array) =>
    logStore.append(makeLogEntry(direction, message, data))

  /** Sends the read request and resolves with the block, rejecting with why it is unusable. */
  function readBlock() {
    return new Promise<V16SettingsBlock>((resolve, reject) => {
      if (!input || !output) {
        reject(new Error('Select the FM1’s input and output.'))
        return
      }
      const stop = () => {
        clearTimeout(timer)
        input.removeListener('midimessage', handle)
      }
      const handle = (event: MessageEvent) => {
        const answer = parseSettingsBlockReply(event.data)
        if (!answer) return
        stop()
        if (answer.type === 'block') {
          log('system', 'Read the V16 settings block.')
          resolve(answer.block)
        } else {
          setHeard((messages) => [...messages, formatMidiBytes(Uint8Array.from(event.data))])
          reject(new Error(`The FM1 answered, but ${problemText[answer.problem]}.`))
        }
      }
      const timer = setTimeout(() => {
        stop()
        reject(new Error('The FM1 did not answer the read of its settings block.'))
      }, replyTimeoutMs)
      input.addListener('midimessage', handle)
      const request = makeSettingsBlockReadRequest()
      output.send(request)
      midiActivity.signal('out')
      log('out', 'Asked the FM1 for its settings block (object 4).', request)
    })
  }

  function showRead(block: V16SettingsBlock) {
    setRead({ block, previous: last.current, readAt: new Date() })
    last.current = block
    setOrderText(Array.from(readFxOrderBytes(block), hex).join(' '))
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setFailure(null)
    try {
      await action()
    } catch (caughtError) {
      setFailure(caughtError instanceof Error ? caughtError.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const readOnce = () =>
    run(async () => {
      setOutcome(null)
      showRead(await readBlock())
    })

  /** Reads, writes back with `order`, waits, and reads again, so the two reads can be compared. */
  const writeBack = (order: number[] | null) =>
    run(async () => {
      if (!output) return
      const before = await readBlock()
      showRead(before)
      const message = makeSettingsBlockWrite(before, order ?? readFxOrderBytes(before))
      output.send(message)
      midiActivity.signal('out')
      log('out', 'Wrote the V16 settings block (object 4).', message)
      await new Promise((resolve) => setTimeout(resolve, settleMs))
      const after = await readBlock()
      showRead(after)
      const changed = changedIndexes(after.bytes, before.bytes)
      setOutcome(
        `Wrote the block ${order ? 'with the order bytes you gave' : 'back unchanged'}. The read after it ${
          changed.length === 0
            ? 'matches the read before it, byte for byte.'
            : `differs at ${changed.map((index) => `${index}: ${hex(before.bytes[index])} → ${hex(after.bytes[index])}`).join(', ')}.`
        }`,
      )
    })

  async function copyCapture() {
    if (!read) return
    const capture = JSON.stringify(
      {
        block: formatMidiBytes(read.block.bytes),
        changedBytes: changedIndexes(read.block.bytes, read.previous?.bytes),
        firmware: firmware.kind === 'mvave' ? firmware.identity : firmware.kind,
        heardOnInvalid: heard,
        outcome,
        readAt: read.readAt.toISOString(),
        reply: formatMidiBytes(read.block.reply),
      },
      null,
      2,
    )
    try {
      await navigator.clipboard.writeText(capture)
    } catch {
      setFailure('The capture could not be copied.')
    }
  }

  const order = parseOrderText(orderText)

  return (
    <>
      <button
        className="inline-flex items-center gap-1 underline underline-offset-2"
        onClick={() => dialog?.showModal()}
        type="button"
      >
        <FlaskConical aria-hidden="true" className="size-3.5" />
        V16 settings probe (dev)
      </button>
      <Dialog aria-labelledby={titleId} ref={setDialog} size="lg">
        <DialogHeader>
          <DialogTitle id={titleId}>V16 settings probe</DialogTitle>
          <DialogCloseButton label="Close settings probe" onClick={() => dialog?.close()} />
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4 p-4 text-sm">
            <p className="leading-6 text-[var(--crt-ink-3)]">
              Development only, stock V16. Reads the settings block (object 4) and writes it back,
              unchanged or with the {fxOrderLength} FX order bytes at {fxOrderOffset} replaced, then
              reads it again. Follow the run sheet, and never press SAVE on the FM1 except where it
              says. Firmware: {firmware.kind === 'mvave' ? firmware.identity : firmware.kind}.
            </p>
            {!canRun ? (
              <p>Connect an FM1 on M-VAVE&rsquo;s V16, with SysEx and its input and output.</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button disabled={!canRun || busy} onClick={() => void readOnce()} type="button">
                <span>{busy ? 'Working…' : 'Read block'}</span>
              </Button>
              <Button
                disabled={!canRun || busy}
                onClick={() => void writeBack(null)}
                type="button"
                variant="secondary"
              >
                <span>Write back unchanged</span>
              </Button>
              <Button
                disabled={!read}
                onClick={() => void copyCapture()}
                type="button"
                variant="secondary"
              >
                <Copy aria-hidden="true" />
                <span>Copy capture</span>
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1 font-medium" htmlFor={orderId}>
                FX order bytes ({fxOrderLength}, hex)
                <input
                  className="h-10 rounded-md border bg-background px-2 font-mono"
                  id={orderId}
                  onChange={(event) => setOrderText(event.target.value)}
                  value={orderText}
                />
              </label>
              <Button
                disabled={!canRun || busy || !order}
                onClick={() => void writeBack(order)}
                type="button"
                variant="secondary"
              >
                <span>Write with these order bytes</span>
              </Button>
            </div>
            {failure ? <ErrorNotice>{failure}</ErrorNotice> : null}
            {outcome ? <p role="status">{outcome}</p> : null}
            {read ? (
              <section aria-label="Settings block read" className="space-y-2">
                <p>
                  Read at {read.readAt.toLocaleTimeString()}.{' '}
                  {read.previous
                    ? `${changedIndexes(read.block.bytes, read.previous.bytes).length} bytes changed since the last read.`
                    : 'First read.'}{' '}
                  The order bytes are {fxOrderOffset}–{fxOrderOffset + fxOrderLength - 1}.
                </p>
                <ol className="grid grid-cols-4 gap-1 font-mono text-xs sm:grid-cols-8">
                  {Array.from(read.block.bytes, (byte, index) => {
                    const changed =
                      read.previous !== undefined && read.previous.bytes[index] !== byte
                    const inOrder = index >= fxOrderOffset && index < fxOrderOffset + fxOrderLength
                    return (
                      <li
                        className={
                          changed
                            ? 'rounded-sm bg-[var(--fm1-finish-tint)] px-1 text-[var(--fm1-finish-foreground)] outline outline-[var(--fm1-accent)]'
                            : inOrder
                              ? 'px-1 font-semibold text-[var(--fm1-accent)]'
                              : 'px-1'
                        }
                        data-changed={changed || undefined}
                        key={index}
                      >
                        <span className="text-[var(--crt-ink-3)]">{index}:</span> {hex(byte)}
                      </li>
                    )
                  })}
                </ol>
              </section>
            ) : null}
          </div>
        </DialogBody>
      </Dialog>
    </>
  )
}
