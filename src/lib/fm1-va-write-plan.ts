import { decodeVoiceName, packDx7Voice, unpackDx7Voice, type Dx7Voice } from '@/lib/dx7'
import type { Fm1VaStoredPreset } from '@/lib/fm1-va-preset-read'
import { fm1VaRecordWithEffects } from '@/lib/fm1-va-record-effects'
import { voiceId } from '@/lib/patch-library'

/**
 * What writing a library bank over one of the FM1's banks A–D would do to each stored preset, worked
 * out from a read of all 128 so that only presets that would change are written
 * (docs/feature-backlog.md, FM-1+VA item 4).
 */

/** The FM1's four banks of 32 presets, in slot order. */
export const fm1VaWriteBanks = ['A', 'B', 'C', 'D'] as const
export type Fm1VaWriteBank = (typeof fm1VaWriteBanks)[number]
const presetsPerBank = 32

/** Record byte 18 marks a Virtual Analog preset with `5A`. */
const engineMarkerByte = 18
const virtualAnalogMarker = 0x5a

/** A preset write the plan calls for: what to store in `slot`, and the stored name it replaces. */
export type Fm1VaPlannedWrite = {
  /** The voice as the FM1 will store and read it back: the packed form of its edit buffer. */
  expectedVoice: Uint8Array
  name: string
  record: Uint8Array
  replaces: string
  slot: number
  voice: Dx7Voice
}

/**
 * One stored preset's part in a plan: a write, or why it is left as it is. A Virtual Analog preset
 * is never written over, since the library cannot hold one yet and its sound would be lost.
 */
export type Fm1VaPresetPlan =
  | ({ kind: 'write' } & Fm1VaPlannedWrite)
  | { kind: 'empty'; slot: number }
  | { kind: 'same'; slot: number }
  | { kind: 'virtual-analog'; name: string; slot: number }

type PlanLibrary = {
  effects: Partial<Record<string, Uint8Array>>
  records: Partial<Record<string, Uint8Array>>
  voices: Partial<Record<string, Dx7Voice>>
}

/** A patch to write: its voice, its library effects, and its own settings record if it has one. */
export type Fm1VaWritePatch = { effects?: Uint8Array; record?: Uint8Array; voice: Dx7Voice }

function sameBytes(bytes: Uint8Array, other: Uint8Array) {
  return bytes.length === other.length && bytes.every((byte, index) => byte === other[index])
}

/** The 32 patches of workspace bank `libraryBank`, in slot order, with none where a slot is empty. */
export function fm1VaLibraryBankPatches(
  libraryBank: string,
  library: PlanLibrary,
): (Fm1VaWritePatch | undefined)[] {
  return Array.from({ length: presetsPerBank }, (_, index) => {
    const id = voiceId(libraryBank, index + 1)
    const voice = library.voices[id]
    return voice && { effects: library.effects[id], record: library.records[id], voice }
  })
}

/**
 * The plan for writing workspace bank `libraryBank` over FM1 bank `bank`, as
 * `planFm1VaPatchesWrite` plans it.
 */
export function planFm1VaBankWrite(
  stored: readonly Fm1VaStoredPreset[],
  bank: Fm1VaWriteBank,
  libraryBank: string,
  library: PlanLibrary,
): Fm1VaPresetPlan[] {
  return planFm1VaPatchesWrite(stored, bank, fm1VaLibraryBankPatches(libraryBank, library))
}

/**
 * The plan for writing `patches`, at most 32 in slot order, over FM1 bank `bank`, from `stored`,
 * all 128 presets read from the FM1 in slot order. Each patch goes with its own settings record,
 * or the stored preset's when it has none, holding the patch's effects either way, so bytes not
 * yet mapped keep the values the FM1 or the import read. A preset that would read back the same is
 * left alone, as is a slot with no patch, including every slot after the last.
 */
export function planFm1VaPatchesWrite(
  stored: readonly Fm1VaStoredPreset[],
  bank: Fm1VaWriteBank,
  patches: readonly (Fm1VaWritePatch | undefined)[],
): Fm1VaPresetPlan[] {
  const firstSlot = fm1VaWriteBanks.indexOf(bank) * presetsPerBank
  return Array.from({ length: presetsPerBank }, (_, index): Fm1VaPresetPlan => {
    const slot = firstSlot + index
    const preset = stored[slot]
    const replaces = decodeVoiceName(preset.voice)
    if (preset.record[engineMarkerByte] === virtualAnalogMarker) {
      return { kind: 'virtual-analog', name: replaces, slot }
    }
    const patch = patches[index]
    if (!patch) return { kind: 'empty', slot }

    const { voice } = patch
    const record = fm1VaRecordWithEffects(
      patch.record ?? preset.record,
      patch.effects ?? new Uint8Array(),
    )
    const expectedVoice = packDx7Voice(Uint8Array.from(unpackDx7Voice(voice))).data
    if (sameBytes(expectedVoice, preset.voice) && sameBytes(record, preset.record)) {
      return { kind: 'same', slot }
    }
    return { expectedVoice, kind: 'write', name: voice.name, record, replaces, slot, voice }
  })
}

/** Whether a read back holds exactly what a planned write stored. */
function fm1VaWriteLanded(write: Fm1VaPlannedWrite, readBack: Fm1VaStoredPreset) {
  return sameBytes(readBack.voice, write.expectedVoice) && sameBytes(readBack.record, write.record)
}

/** A write that read back differently, so the writes after it were not sent. */
export class Fm1VaWriteMismatchError extends Error {
  readonly slot: number

  constructor(slot: number) {
    super(`Preset ${String(slot + 1).padStart(3, '0')} did not read back as written.`)
    this.name = 'Fm1VaWriteMismatchError'
    this.slot = slot
  }
}

type WriteEveryOptions = {
  /** Called after each write is confirmed, with how many have been. */
  onWritten?: (count: number) => void
  read: (slot: number) => Promise<Fm1VaStoredPreset>
  /** Aborting stops before the next write; a write already sent is still confirmed. */
  signal?: AbortSignal
  write: (slot: number, voice: Dx7Voice, record: Uint8Array) => Promise<unknown>
}

/**
 * Writes each planned preset in turn and reads it back, resolving with how many were written. It
 * stops before the next write once `signal` aborts, and rejects at the first preset that does not
 * read back as written, or whose write or read fails, leaving the rest unsent.
 */
export async function writeFm1VaPlannedPresets(
  writes: readonly Fm1VaPlannedWrite[],
  { onWritten, read, signal, write }: WriteEveryOptions,
) {
  let written = 0
  for (const planned of writes) {
    if (signal?.aborted) break
    await write(planned.slot, planned.voice, planned.record)
    if (!fm1VaWriteLanded(planned, await read(planned.slot))) {
      throw new Fm1VaWriteMismatchError(planned.slot)
    }
    written += 1
    onWritten?.(written)
  }
  return written
}
