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
import { useFm1VaSoundControl } from '@/hooks/use-fm1-va-sound-control'
import { decodeVoiceName, updateDx7VoiceName } from '@/lib/dx7'
import {
  fm1VaPresetCount,
  fm1VaPresetNumber,
  type Fm1VaStoredPreset,
} from '@/lib/fm1-va-preset-read'
import { fm1VaChoiceValue, fm1VaSoundSettings } from '@/lib/fm1-va-sound-control'
import type { Fm1VaReply } from '@/lib/fm1-va-sysex'
import { formatMidiBytes } from '@/lib/midi'

type Fm1VaPresetProbeProps = {
  midi: Parameters<typeof useFm1VaPresetReader>[0] & Parameters<typeof useFm1VaSoundControl>[0]
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

/** One setting changed on the FM1, by a sent CC or by hand, waiting for SAVE and a read. */
type MapChange = {
  controller?: number
  setting: string
  slot: number
  value?: number
}

type ByteChange = { from: number; index: number; to: number }

/** A change and the bytes the next read of its preset found changed. */
type MapEntry = MapChange & { record: ByteChange[]; voice: ByteChange[] }

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

function byteChanges(bytes: Uint8Array, previous: Uint8Array): ByteChange[] {
  return changedIndexes(bytes, previous).map((index) => ({
    from: previous[index],
    index,
    to: bytes[index],
  }))
}

function changeLabel({ controller, setting, value }: MapChange) {
  return controller === undefined ? `By hand: ${setting}` : `CC ${controller} ${setting} = ${value}`
}

function byteChangeText(changes: ByteChange[]) {
  return changes.length === 0
    ? 'none'
    : changes.map(({ from, index, to }) => `${index}: ${hex(from)} → ${hex(to)}`).join(', ')
}

/** The map so far, as JSON for the clipboard, for docs/fm1-research.md. */
function mapJson(firmware: string, entries: MapEntry[]) {
  const bytes = (changes: ByteChange[]) =>
    changes.map(({ from, index, to }) => ({ from: hex(from), index, to: hex(to) }))
  return JSON.stringify(
    {
      firmware,
      entries: entries.map(({ controller, record, setting, slot, value, voice }) => ({
        controller,
        preset: fm1VaPresetNumber(slot),
        record: bytes(record),
        setting,
        value,
        voice: bytes(voice),
      })),
    },
    null,
    2,
  )
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
 * so the record can be mapped one setting at a time (docs/feature-backlog.md, FM-1+VA item 2). Its
 * map sends one Virtual Analog setting at a time, or notes one changed by hand, and logs the bytes
 * that the read after SAVE finds changed.
 */
export function Fm1VaPresetProbe({ midi }: Fm1VaPresetProbeProps) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null)
  const [number, setNumber] = useState('1')
  const [reading, setReading] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [read, setRead] = useState<ProbeRead | null>(null)
  const lastReads = useRef(new Map<number, Fm1VaStoredPreset>())
  // Each preset as this session first read it, which a write test can put back.
  const firstReads = useRef(new Map<number, Fm1VaStoredPreset>())
  const [mapController, setMapController] = useState<number>(fm1VaSoundSettings[0].controller)
  const [mapValue, setMapValue] = useState('0')
  const [handChange, setHandChange] = useState('')
  const [pendingChange, setPendingChange] = useState<MapChange | null>(null)
  const [mapEntries, setMapEntries] = useState<MapEntry[]>([])
  const titleId = useId()
  const numberId = useId()
  const settingId = useId()
  const valueId = useId()
  const handChangeId = useId()

  const slot = Number(number) - 1
  const validSlot = Number.isInteger(slot) && slot >= 0 && slot < fm1VaPresetCount
  const { canRead, readPreset: readStoredPreset } = useFm1VaPresetReader(midi)
  const { canWrite, writePreset } = useFm1VaPresetWriter(midi)
  const { canSend, sendSoundControl } = useFm1VaSoundControl(midi)
  const firmware = ('identity' in midi.firmware && midi.firmware.identity) || midi.firmware.kind

  async function readPreset() {
    setReading(true)
    setFailure(null)
    try {
      const preset = await readStoredPreset(slot)
      const previous = lastReads.current.get(slot)
      lastReads.current.set(slot, preset)
      if (!firstReads.current.has(slot)) firstReads.current.set(slot, preset)
      setRead({ firmware, preset, previous, readAt: new Date() })
      if (pendingChange?.slot === slot && previous) {
        const entry: MapEntry = {
          ...pendingChange,
          record: byteChanges(preset.record, previous.record),
          voice: byteChanges(preset.voice, previous.voice),
        }
        setMapEntries((entries) => [...entries, entry])
        setPendingChange(null)
      }
    } catch (caughtError) {
      setFailure(caughtError instanceof Error ? caughtError.message : 'The read failed.')
    } finally {
      setReading(false)
    }
  }

  /**
   * Writes the preset just read back to its slot, unchanged, under `writeTestName`, or as this
   * session first read it, then reads it again to see whether the write landed exactly.
   */
  async function writeBack(kind: 'first' | 'renamed' | 'unchanged') {
    if (!read) return
    const preset =
      kind === 'first' ? (firstReads.current.get(read.preset.slot) ?? read.preset) : read.preset
    // A Virtual Analog preset keeps its name in the same bytes as an FM one, so either renames.
    const stored = { data: preset.voice, name: decodeVoiceName(preset.voice) }
    const voice = kind === 'renamed' ? updateDx7VoiceName(stored, writeTestName) : stored
    setReading(true)
    setFailure(null)
    try {
      const replies = await writePreset(preset.slot, voice.data, preset.record)
      const readBack = await readStoredPreset(preset.slot)
      lastReads.current.set(preset.slot, readBack)
      setRead({
        firmware,
        preset: readBack,
        previous: read.preset,
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

  const mapSetting = fm1VaSoundSettings.find((setting) => setting.controller === mapController)
  const mapNumber = Number(mapValue)
  const validMapValue =
    mapValue !== '' && Number.isInteger(mapNumber) && mapNumber >= 0 && mapNumber <= 127
  // A change is compared with the preset's last read, so the preset is read before the first one.
  const canMap = validSlot && lastReads.current.has(slot) && !reading

  function sendMapChange() {
    if (!mapSetting || !validMapValue) return
    if (sendSoundControl(mapSetting.controller, mapNumber)) {
      setPendingChange({
        controller: mapSetting.controller,
        setting: mapSetting.setting,
        slot,
        value: mapNumber,
      })
    }
  }

  function noteHandChange() {
    const setting = handChange.trim()
    if (setting) setPendingChange({ setting, slot })
  }

  async function copyMap() {
    try {
      await navigator.clipboard.writeText(mapJson(firmware, mapEntries))
    } catch {
      setFailure('The map could not be copied.')
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
  const firstRead = read ? firstReads.current.get(read.preset.slot) : undefined

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
            {canRead ? (
              <section aria-label="Map a setting" className="space-y-3 border-t pt-3">
                <p className="leading-6 text-[var(--crt-ink-3)]">
                  Maps the settings to bytes. Read the preset, then send one setting, or change one
                  on the FM1 and note it. Press SAVE on the FM1 and read the preset again: the bytes
                  that changed are logged against the setting. Use a test preset, with an FM-1+VA
                  backup to put it back.
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 font-medium" htmlFor={settingId}>
                    Setting
                    <select
                      className="h-10 rounded-md border bg-background px-2"
                      id={settingId}
                      onChange={(event) => {
                        setMapController(Number(event.target.value))
                        setMapValue('0')
                      }}
                      value={mapController}
                    >
                      {fm1VaSoundSettings.map(({ controller, setting }) => (
                        <option key={controller} value={controller}>
                          CC {controller} {setting}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 font-medium" htmlFor={valueId}>
                    Value (0–127)
                    <input
                      className="h-10 w-24 rounded-md border bg-background px-2"
                      id={valueId}
                      inputMode="numeric"
                      max="127"
                      min="0"
                      onChange={(event) => setMapValue(event.target.value)}
                      type="number"
                      value={mapValue}
                    />
                  </label>
                  <Button
                    disabled={!canSend || !canMap || !validMapValue}
                    onClick={sendMapChange}
                    type="button"
                  >
                    <span>Send</span>
                  </Button>
                </div>
                {mapSetting && 'choices' in mapSetting ? (
                  <div className="flex flex-wrap gap-2">
                    {mapSetting.choices.map((choice, index) => {
                      const value = fm1VaChoiceValue(index, mapSetting.choices.length)
                      return (
                        <Button
                          key={choice}
                          onClick={() => setMapValue(String(value))}
                          type="button"
                          variant="secondary"
                        >
                          <span>
                            {choice} ({value})
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                ) : null}
                {!canSend ? (
                  <p>
                    Sending a setting needs FM-1+VA FM-1_086 or later, with its output selected.
                  </p>
                ) : null}
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 font-medium" htmlFor={handChangeId}>
                    Changed by hand on the FM1
                    <input
                      className="h-10 w-64 rounded-md border bg-background px-2"
                      id={handChangeId}
                      onChange={(event) => setHandChange(event.target.value)}
                      placeholder="Level 50"
                      value={handChange}
                    />
                  </label>
                  <Button
                    disabled={!canMap || handChange.trim() === ''}
                    onClick={noteHandChange}
                    type="button"
                    variant="secondary"
                  >
                    <span>Note the change</span>
                  </Button>
                </div>
                <p role="status">
                  {pendingChange
                    ? `${changeLabel(pendingChange)}. Press SAVE on the FM1, then read preset ${fm1VaPresetNumber(pendingChange.slot)} again.`
                    : ''}
                </p>
                {mapEntries.length > 0 ? (
                  <>
                    <ol aria-label="Byte map" className="space-y-1 font-mono text-xs">
                      {mapEntries.map((entry, index) => (
                        <li key={index}>
                          {fm1VaPresetNumber(entry.slot)} {changeLabel(entry)} → record{' '}
                          {byteChangeText(entry.record)}; voice {byteChangeText(entry.voice)}
                        </li>
                      ))}
                    </ol>
                    <Button onClick={() => void copyMap()} type="button" variant="secondary">
                      <Copy aria-hidden="true" />
                      <span>Copy map</span>
                    </Button>
                  </>
                ) : null}
              </section>
            ) : null}
            {read ? (
              <section aria-label="Write test" className="space-y-2 border-t pt-3">
                <p className="leading-6 text-[var(--crt-ink-3)]">
                  Writes this preset back to slot {fm1VaPresetNumber(read.preset.slot)} with
                  FM-1+VA&rsquo;s preset write, which stores it at once, then reads it again. Start
                  from an FM-1+VA backup. A Virtual Analog preset is written the same way, with its
                  voice bytes exactly as read, as FM-1+VA&rsquo;s own backup restores it.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!canWrite || reading}
                    onClick={() => void writeBack('unchanged')}
                    type="button"
                    variant="secondary"
                  >
                    <span>Write back unchanged</span>
                  </Button>
                  <Button
                    disabled={!canWrite || reading}
                    onClick={() => void writeBack('renamed')}
                    type="button"
                    variant="secondary"
                  >
                    <span>Write back as {writeTestName}</span>
                  </Button>
                  {firstRead &&
                  !(
                    sameBytes(firstRead.voice, read.preset.voice) &&
                    sameBytes(firstRead.record, read.preset.record)
                  ) ? (
                    <Button
                      disabled={!canWrite || reading}
                      onClick={() => void writeBack('first')}
                      type="button"
                      variant="secondary"
                    >
                      <span>Restore the first read ({voiceName(firstRead.voice).trim()})</span>
                    </Button>
                  ) : null}
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
