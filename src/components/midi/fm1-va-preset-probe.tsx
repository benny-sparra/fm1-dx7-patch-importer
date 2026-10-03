import { Copy, FlaskConical } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorNotice } from '@/components/ui/error-notice'
import { useFm1VaPresetReader } from '@/hooks/use-fm1-va-preset-reader'
import { useFm1VaPresetWriter } from '@/hooks/use-fm1-va-preset-writer'
import { decodeVoiceName, updateDx7VoiceName } from '@/lib/dx7'
import {
  fm1VaPresetCount,
  fm1VaPresetNumber,
  type Fm1VaStoredPreset,
} from '@/lib/fm1-va-preset-read'
import type { Fm1VaReply } from '@/lib/fm1-va-sysex'
import { formatMidiBytes } from '@/lib/midi'

type Fm1VaPresetProbeProps = {
  midi: Parameters<typeof useFm1VaPresetReader>[0]
}

type ProbeRead = {
  firmware: string
  preset: Fm1VaStoredPreset
  /** The same preset's previous read, which the bytes are compared with. */
  previous?: Fm1VaStoredPreset
  readAt: Date
  /** The write this read checked, when the preset was read back after one. */
  write?: ProbeWrite
}

/** A write the probe sent, and what came of it. */
type ProbeWrite = {
  /** Whether the read back holds exactly the voice and record that were written. */
  matches: boolean
  name: string
  replies: Fm1VaReply[]
}

/** The name the probe writes a preset under, to show that a write landed. */
const writeTestName = 'WRITE TEST'

const engineMarkerIndex = 18
const hex = (byte: number) => byte.toString(16).padStart(2, '0').toUpperCase()

function voiceName(voice: Uint8Array) {
  return String.fromCharCode(...voice.subarray(118, 128)).replace(/[^\x20-\x7e]/g, '?')
}

function sameBytes(bytes: Uint8Array, other: Uint8Array) {
  return bytes.length === other.length && bytes.every((byte, index) => byte === other[index])
}

function changedIndexes(bytes: Uint8Array, previous: Uint8Array | undefined) {
  if (!previous) return []
  return Array.from(bytes.keys()).filter((index) => bytes[index] !== previous[index])
}

/** The capture a research note or a fixture is made from, as JSON for the clipboard. */
function captureJson({ firmware, preset, previous, readAt, write }: ProbeRead) {
  return JSON.stringify(
    {
      write: write && {
        matches: write.matches,
        name: write.name,
        replies: write.replies.map(({ argument, data, kind, status }) => ({
          argument,
          data: formatMidiBytes(data),
          kind,
          status,
        })),
      },
      changedRecordBytes: changedIndexes(preset.record, previous?.record),
      changedVoiceBytes: changedIndexes(preset.voice, previous?.voice),
      firmware,
      preset: fm1VaPresetNumber(preset.slot),
      readAt: readAt.toISOString(),
      record: formatMidiBytes(preset.record),
      reply: formatMidiBytes(preset.reply),
      voice: formatMidiBytes(preset.voice),
    },
    null,
    2,
  )
}

function ByteGrid({
  bytes,
  label,
  previous,
}: {
  bytes: Uint8Array
  label: string
  previous?: Uint8Array
}) {
  return (
    <figure className="space-y-1">
      <figcaption className="text-xs font-semibold tracking-wide uppercase">{label}</figcaption>
      <ol className="grid grid-cols-4 gap-1 font-mono text-xs sm:grid-cols-8">
        {Array.from(bytes, (byte, index) => {
          const changed = previous !== undefined && previous[index] !== byte
          return (
            <li
              className={
                changed
                  ? 'rounded-sm bg-[var(--fm1-finish-tint)] px-1 text-[var(--fm1-finish-foreground)] outline outline-[var(--fm1-accent)]'
                  : 'px-1'
              }
              data-changed={changed || undefined}
              key={index}
              title={changed ? `was ${hex(previous[index])}` : undefined}
            >
              <span className="text-[var(--crt-ink-3)]">{index}:</span> {hex(byte)}
            </li>
          )
        })}
      </ol>
    </figure>
  )
}

/**
 * Development only. Reads one stored preset from an FM1 on FM-1+VA and shows its voice and settings
 * record byte by byte, marking the bytes that changed since the previous read of the same preset,
 * so the record can be mapped one setting at a time (docs/feature-backlog.md, FM-1+VA item 2).
 */
export function Fm1VaPresetProbe({ midi }: Fm1VaPresetProbeProps) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null)
  const [number, setNumber] = useState('1')
  const [reading, setReading] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [read, setRead] = useState<ProbeRead | null>(null)
  const lastReads = useRef(new Map<number, Fm1VaStoredPreset>())
  const titleId = useId()
  const numberId = useId()

  const slot = Number(number) - 1
  const validSlot = Number.isInteger(slot) && slot >= 0 && slot < fm1VaPresetCount
  const { canRead, readPreset: readStoredPreset } = useFm1VaPresetReader(midi)
  const { canWrite, writePreset } = useFm1VaPresetWriter(midi)
  const firmware = ('identity' in midi.firmware && midi.firmware.identity) || midi.firmware.kind

  async function readPreset() {
    setReading(true)
    setFailure(null)
    try {
      const preset = await readStoredPreset(slot)
      const previous = lastReads.current.get(slot)
      lastReads.current.set(slot, preset)
      setRead({ firmware, preset, previous, readAt: new Date() })
    } catch (caughtError) {
      setFailure(caughtError instanceof Error ? caughtError.message : 'The read failed.')
    } finally {
      setReading(false)
    }
  }

  /**
   * Writes the preset just read back to its slot, unchanged or under `writeTestName`, then reads
   * it again to see whether the write landed exactly.
   */
  async function writeBack(renamed: boolean) {
    if (!read) return
    const { preset } = read
    const stored = { data: preset.voice, name: decodeVoiceName(preset.voice) }
    const voice = renamed ? updateDx7VoiceName(stored, writeTestName) : stored
    setReading(true)
    setFailure(null)
    try {
      const replies = await writePreset(preset.slot, voice, preset.record)
      const readBack = await readStoredPreset(preset.slot)
      lastReads.current.set(preset.slot, readBack)
      setRead({
        firmware,
        preset: readBack,
        previous: preset,
        readAt: new Date(),
        write: {
          matches:
            sameBytes(readBack.voice, voice.data) && sameBytes(readBack.record, preset.record),
          name: voice.name,
          replies,
        },
      })
    } catch (caughtError) {
      setFailure(caughtError instanceof Error ? caughtError.message : 'The write failed.')
    } finally {
      setReading(false)
    }
  }

  async function copyCapture() {
    if (!read) return
    try {
      await navigator.clipboard.writeText(captureJson(read))
    } catch {
      setFailure('The capture could not be copied. The MIDI log holds the reply too.')
    }
  }

  const marker = read?.preset.record[engineMarkerIndex]

  return (
    <>
      <button
        className="inline-flex shrink-0 items-center gap-1.5 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onClick={() => dialog?.showModal()}
        type="button"
      >
        <FlaskConical aria-hidden="true" className="size-3.5" />
        FM-1+VA preset probe (dev)
      </button>
      <Dialog aria-labelledby={titleId} ref={setDialog} size="lg">
        <DialogHeader>
          <DialogTitle id={titleId}>FM-1+VA preset probe</DialogTitle>
          <DialogCloseButton label="Close preset probe" onClick={() => dialog?.close()} />
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4 p-4 text-sm">
            <p className="leading-6 text-[var(--crt-ink-3)]">
              Development only. Reads a stored preset with FM-1+VA&rsquo;s read command, which
              changes nothing on the FM1. Change one setting on the FM1, press SAVE, and read the
              preset again: bytes that changed since its last read are marked. Firmware: {firmware}.
            </p>
            {!canRead ? (
              <p>
                Connect an FM1 on FM-1+VA FM-1_079 or later, with its input and output selected.
              </p>
            ) : null}
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 font-medium" htmlFor={numberId}>
                Preset (001–128)
                <input
                  className="h-10 w-24 rounded-md border bg-background px-2"
                  id={numberId}
                  inputMode="numeric"
                  max={fm1VaPresetCount}
                  min="1"
                  onChange={(event) => setNumber(event.target.value)}
                  type="number"
                  value={number}
                />
              </label>
              <Button
                disabled={!canRead || !validSlot || reading}
                onClick={() => void readPreset()}
                type="button"
              >
                <span>{reading ? 'Reading…' : 'Read preset'}</span>
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
            {failure ? <ErrorNotice>{failure}</ErrorNotice> : null}
            {read ? (
              <section aria-label="Preset read" className="space-y-3">
                <p>
                  Preset {fm1VaPresetNumber(read.preset.slot)}, {voiceName(read.preset.voice)}, read
                  at {read.readAt.toLocaleTimeString()}. Record byte 18 is{' '}
                  {marker === undefined ? '—' : hex(marker)}
                  {marker === 0x5a ? ' (Virtual Analog)' : ''}.{' '}
                  {read.previous
                    ? `${changedIndexes(read.preset.record, read.previous.record).length} record and ${changedIndexes(read.preset.voice, read.previous.voice).length} voice bytes changed since the last read.`
                    : 'First read of this preset.'}
                </p>
                <ByteGrid
                  bytes={read.preset.record}
                  label="Settings record (59 bytes)"
                  previous={read.previous?.record}
                />
                <ByteGrid
                  bytes={read.preset.voice}
                  label="Packed voice (128 bytes)"
                  previous={read.previous?.voice}
                />
              </section>
            ) : null}
            {read && marker !== 0x5a ? (
              <section aria-label="Write test" className="space-y-2 border-t pt-3">
                <p className="leading-6 text-[var(--crt-ink-3)]">
                  Writes this preset back to slot {fm1VaPresetNumber(read.preset.slot)} with
                  FM-1+VA&rsquo;s preset write, which stores it at once, then reads it again. Start
                  from an FM-1+VA backup. A Virtual Analog preset is not written, since its voice
                  bytes are not a DX7 voice.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!canWrite || reading}
                    onClick={() => void writeBack(false)}
                    type="button"
                    variant="secondary"
                  >
                    <span>Write back unchanged</span>
                  </Button>
                  <Button
                    disabled={!canWrite || reading}
                    onClick={() => void writeBack(true)}
                    type="button"
                    variant="secondary"
                  >
                    <span>Write back as {writeTestName}</span>
                  </Button>
                </div>
                {read.write ? (
                  <p>
                    Wrote {read.write.name.trim()}.{' '}
                    {read.write.matches
                      ? 'The read back matches what was written.'
                      : 'The read back differs from what was written.'}{' '}
                    {read.write.replies.length === 0
                      ? 'No FM-1+VA reply was heard after the write.'
                      : `Replies heard after the write: ${read.write.replies
                          .map(
                            ({ argument, data, kind, status }) =>
                              `kind ${hex(kind)}, status ${status}, argument ${argument}, ${data.length} data bytes`,
                          )
                          .join('; ')}.`}
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        </DialogBody>
      </Dialog>
    </>
  )
}
