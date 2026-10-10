import type { Patch } from '@/data/patches'
import { dx7BankVoiceCount, dx7PackedVoiceSize, updateDx7VoiceName, type Dx7Voice } from '@/lib/dx7'
import {
  type Favourite,
  favouritePatchId,
  favouriteSoundKey,
  findFavourite,
} from '@/lib/favourites'
import { makeDefaultFm1Effects, normalizeFm1Effects } from '@/lib/fm1-effects'
import { DX7_TRANSPOSE_C3 } from '@/lib/fm1-parameters'
import { fm1VaEightBitName } from '@/lib/fm1-va-eight-bit'
import { fm1VaVirtualAnalogName } from '@/lib/fm1-va-virtual-analog'
import { soundKey } from '@/lib/sound-key'

// Lazy code takes the record size from here, a module the initial chunks already share with it, so
// the small record module does not become a chunk of its own (docs: AGENTS.md, bundle boundaries).
export { fm1VaRecordSize } from '@/lib/fm1-va-record'

export const browserBanks = ['A', 'B', 'C', 'D'] as const
/** The `family` of a slot holding an FM-1+VA Virtual Analog preset. */
export const virtualAnalogFamily = 'VA'
/** The `family` of a slot holding an FM-1+VA 8-Bit preset. */
export const eightBitFamily = '8-Bit'
export const maximumWorkspaceBanks = 10
export const workspaceBankTitleLength = 10
/** The longest description a workspace bank or a saved bank keeps. */
export const bankDescriptionLength = 500

/** The workspace bank a change targeted was removed or renumbered after it was chosen. */
export class WorkspaceBankUnavailableError extends Error {
  constructor() {
    super('That workspace bank is no longer available.')
    this.name = 'WorkspaceBankUnavailableError'
  }
}

export type PatchLibrarySnapshot = {
  bankDescriptions: Record<string, string>
  bankNames: Record<string, string>
  effects: Record<string, Uint8Array>
  /**
   * The voice bytes of each slot holding an FM-1+VA 8-Bit preset, by the slot's id, kept exactly as
   * read, as `virtualAnalog` keeps a Virtual Analog preset's: no entry in `voices`, and its record
   * in `records`.
   */
  eightBit: Record<string, Uint8Array>
  /** Sounds kept in Favourites, in their order. They are copies, apart from the workspace banks. */
  favourites: Favourite[]
  loadedBanks: string[]
  /**
   * The FM-1+VA settings record of each slot that has one, by the slot's id. A slot without one,
   * such as any patch that did not come from FM-1+VA, has no entry.
   */
  records: Record<string, Uint8Array>
  /**
   * The voice bytes of each slot holding an FM-1+VA Virtual Analog preset, by the slot's id, kept
   * exactly as read. Such a slot has no entry in `voices`, since its bytes are not a DX7 voice, so
   * nothing that plays or exports DX7 voices meets it; its record is in `records`.
   */
  virtualAnalog: Record<string, Uint8Array>
  voices: Record<string, Dx7Voice>
  workspaceBanks: string[]
}

export function emptyPatchLibrary(
  workspaceBanks: readonly string[] = browserBanks,
): PatchLibrarySnapshot {
  return {
    bankDescriptions: {},
    bankNames: {},
    effects: {},
    eightBit: {},
    favourites: [],
    loadedBanks: [],
    records: {},
    virtualAnalog: {},
    voices: {},
    workspaceBanks: [...workspaceBanks],
  }
}

export function voiceId(bank: string, number: number) {
  return `bank-${bank}-${number}`
}

/** The workspace bank a slot's `voiceId` names, or undefined for any other id. */
export function bankOfVoiceId(id: string) {
  return /^bank-([A-Z])-\d+$/.exec(id)?.[1]
}

export function isWorkspaceBankId(bank: string) {
  return /^[A-Z]$/.test(bank)
}

export function getNextWorkspaceBank(workspaceBanks: readonly string[]) {
  if (workspaceBanks.length >= maximumWorkspaceBanks) return null

  for (let index = 0; index < 26; index += 1) {
    const bank = String.fromCharCode(65 + index)
    if (!workspaceBanks.includes(bank)) return bank
  }
  return null
}

export function addWorkspaceBank(snapshot: PatchLibrarySnapshot, bank: string) {
  if (bank !== getNextWorkspaceBank(snapshot.workspaceBanks)) return snapshot
  return { ...snapshot, workspaceBanks: [...snapshot.workspaceBanks, bank] }
}

export function compactWorkspaceBanks(snapshot: PatchLibrarySnapshot): PatchLibrarySnapshot {
  const sourceBanks = [...new Set(snapshot.workspaceBanks)]
  const bankDescriptions: Record<string, string> = {}
  const bankNames: Record<string, string> = {}
  const effects: Record<string, Uint8Array> = {}
  const eightBit: Record<string, Uint8Array> = {}
  const loadedBanks: string[] = []
  const records: Record<string, Uint8Array> = {}
  const virtualAnalog: Record<string, Uint8Array> = {}
  const voices: Record<string, Dx7Voice> = {}
  const workspaceBanks = sourceBanks.map((_, index) => String.fromCharCode(65 + index))

  sourceBanks.forEach((sourceBank, bankIndex) => {
    const destinationBank = workspaceBanks[bankIndex]
    if (snapshot.bankDescriptions[sourceBank]) {
      bankDescriptions[destinationBank] = snapshot.bankDescriptions[sourceBank]
    }
    if (snapshot.bankNames[sourceBank]) {
      bankNames[destinationBank] = snapshot.bankNames[sourceBank]
    }
    if (snapshot.loadedBanks.includes(sourceBank)) loadedBanks.push(destinationBank)

    for (let slot = 1; slot <= dx7BankVoiceCount; slot += 1) {
      const sourceId = voiceId(sourceBank, slot)
      const destinationId = voiceId(destinationBank, slot)
      if (snapshot.voices[sourceId]) voices[destinationId] = snapshot.voices[sourceId]
      if (snapshot.effects[sourceId]) effects[destinationId] = snapshot.effects[sourceId]
      if (snapshot.records[sourceId]) records[destinationId] = snapshot.records[sourceId]
      if (snapshot.virtualAnalog[sourceId]) {
        virtualAnalog[destinationId] = snapshot.virtualAnalog[sourceId]
      }
      if (snapshot.eightBit[sourceId]) eightBit[destinationId] = snapshot.eightBit[sourceId]
    }
  })

  return {
    bankDescriptions,
    bankNames,
    effects,
    eightBit,
    favourites: snapshot.favourites,
    loadedBanks,
    records,
    virtualAnalog,
    voices,
    workspaceBanks,
  }
}

export function createWorkspaceBank(
  snapshot: PatchLibrarySnapshot,
  bank: string,
  name: string,
  description: string,
  imported: Dx7Voice[],
) {
  const normalizedName = normalizeWorkspaceBankNameForSave(name)
  if (!normalizedName) throw new Error('A workspace bank needs a name.')
  if (bank !== getNextWorkspaceBank(snapshot.workspaceBanks)) {
    throw new WorkspaceBankUnavailableError()
  }
  if (!imported) throw new Error('A workspace bank needs sound data.')

  const added = addWorkspaceBank(snapshot, bank)
  const populated = importVoices(added, bank, imported)
  return updateBankInformation(populated, bank, normalizedName, description)
}

export function makePatches(snapshot: PatchLibrarySnapshot): Patch[] {
  return snapshot.workspaceBanks.flatMap((bank, bankIndex) =>
    Array.from({ length: dx7BankVoiceCount }, (_, slotIndex) => {
      const number = slotIndex + 1
      const id = voiceId(bank, number)
      const voice = snapshot.voices[id]
      const virtualAnalog = snapshot.virtualAnalog[id]
      const eightBit = snapshot.eightBit[id]
      return {
        bank,
        family: voice
          ? 'DX7'
          : virtualAnalog
            ? virtualAnalogFamily
            : eightBit
              ? eightBitFamily
              : '',
        id,
        name:
          voice?.name ??
          (virtualAnalog
            ? fm1VaVirtualAnalogName(virtualAnalog)
            : eightBit
              ? fm1VaEightBitName(eightBit)
              : 'Empty'),
        number,
        // The FM1 has four banks, so only the first four workspace banks have a program to select.
        ...(bankIndex < browserBanks.length
          ? { program: bankIndex * dx7BankVoiceCount + slotIndex }
          : {}),
      }
    }),
  )
}

export function importVoices(
  snapshot: PatchLibrarySnapshot,
  bank: string,
  imported: Dx7Voice[],
): PatchLibrarySnapshot {
  if (!snapshot.workspaceBanks.includes(bank)) throw new WorkspaceBankUnavailableError()
  if (imported.length !== dx7BankVoiceCount) {
    throw new Error(`A browser bank requires exactly ${dx7BankVoiceCount} DX7 voices.`)
  }

  const voices = { ...snapshot.voices }
  const effects = { ...snapshot.effects }
  const records = { ...snapshot.records }
  const virtualAnalog = { ...snapshot.virtualAnalog }
  const eightBit = { ...snapshot.eightBit }
  imported.forEach((voice, index) => {
    const id = voiceId(bank, index + 1)
    voices[id] = voice
    effects[id] = makeDefaultFm1Effects()
    // A DX7 bank carries no FM-1+VA record, so a slot it replaces loses its own.
    delete records[id]
    delete virtualAnalog[id]
    delete eightBit[id]
  })
  return {
    bankDescriptions: snapshot.bankDescriptions,
    bankNames: snapshot.bankNames,
    effects,
    eightBit,
    favourites: snapshot.favourites,
    loadedBanks: [...new Set([...snapshot.loadedBanks, bank])].sort(),
    records,
    virtualAnalog,
    voices,
    workspaceBanks: snapshot.workspaceBanks,
  }
}

/**
 * A patch read from the FM1's memory: its DX7 voice, or a Virtual Analog or 8-Bit preset's voice
 * bytes, the FM1 effects stored with it, and the FM-1+VA settings record, kept exactly as read. A
 * Virtual Analog or 8-Bit preset always has its record, which marks it.
 */
export type FetchedSound =
  | { effects?: Uint8Array; record?: Uint8Array; voice: Dx7Voice }
  | { effects?: Uint8Array; record: Uint8Array; virtualAnalog: Uint8Array }
  | { effects?: Uint8Array; eightBit: Uint8Array; record: Uint8Array }

/**
 * A bank of patches read from the FM1's memory, with null for a slot that keeps its patch, and
 * where it goes: the workspace bank it replaces, or a new bank with this title.
 */
export type FetchedBank = { sounds: (FetchedSound | null)[] } & (
  { bank: string } | { newBankTitle: string }
)

/**
 * Puts banks read from the FM1 into the workspace, as one change: each into the workspace bank it
 * names, or into a new bank added after the others. Each patch arrives with its own effects, or
 * the defaults without them, and its own record or none; a null slot is left as it is, so a new
 * bank leaves it empty.
 */
export function importFetchedBanks(
  snapshot: PatchLibrarySnapshot,
  banks: readonly FetchedBank[],
): PatchLibrarySnapshot {
  let workspaceBanks = snapshot.workspaceBanks
  const bankNames = { ...snapshot.bankNames }
  const destinations = banks.map((fetched) => {
    if ('bank' in fetched) {
      if (!workspaceBanks.includes(fetched.bank)) throw new WorkspaceBankUnavailableError()
      return fetched.bank
    }
    const added = getNextWorkspaceBank(workspaceBanks)
    if (!added) throw new WorkspaceBankUnavailableError()
    workspaceBanks = [...workspaceBanks, added]
    const title = normalizeWorkspaceBankNameForSave(fetched.newBankTitle)
    if (title) bankNames[added] = title
    return added
  })
  if (new Set(destinations).size !== destinations.length) {
    throw new Error('Two banks read from the FM1 cannot replace the same workspace bank.')
  }

  const voices = { ...snapshot.voices }
  const effects = { ...snapshot.effects }
  const records = { ...snapshot.records }
  const virtualAnalog = { ...snapshot.virtualAnalog }
  const eightBit = { ...snapshot.eightBit }
  const loadedBanks = new Set(snapshot.loadedBanks)
  banks.forEach(({ sounds }, bankIndex) => {
    const bank = destinations[bankIndex]
    if (sounds.length !== dx7BankVoiceCount) {
      throw new Error(`A browser bank requires exactly ${dx7BankVoiceCount} DX7 voices.`)
    }
    sounds.forEach((sound, index) => {
      if (!sound) return
      const id = voiceId(bank, index + 1)
      delete voices[id]
      delete virtualAnalog[id]
      delete eightBit[id]
      if ('voice' in sound) voices[id] = sound.voice
      else if ('virtualAnalog' in sound) virtualAnalog[id] = sound.virtualAnalog.slice()
      else eightBit[id] = sound.eightBit.slice()
      effects[id] = normalizeFm1Effects(sound.effects)
      if (sound.record) records[id] = sound.record.slice()
      else delete records[id]
      loadedBanks.add(bank)
    })
  })
  return {
    bankDescriptions: snapshot.bankDescriptions,
    bankNames,
    effects,
    eightBit,
    favourites: snapshot.favourites,
    loadedBanks: [...loadedBanks].sort(),
    records,
    virtualAnalog,
    voices,
    workspaceBanks,
  }
}

export function renameBank(
  snapshot: PatchLibrarySnapshot,
  bank: string,
  name: string,
): PatchLibrarySnapshot {
  if (!snapshot.workspaceBanks.includes(bank)) return snapshot
  const bankNames = { ...snapshot.bankNames }
  const normalized = normalizeWorkspaceBankNameForSave(name)
  if (normalized) bankNames[bank] = normalized
  else delete bankNames[bank]
  return { ...snapshot, bankNames }
}

export function updateBankInformation(
  snapshot: PatchLibrarySnapshot,
  bank: string,
  title: string,
  description: string,
): PatchLibrarySnapshot {
  if (!snapshot.workspaceBanks.includes(bank)) return snapshot
  const normalizedTitle = normalizeWorkspaceBankNameForSave(title)
  if (!normalizedTitle) throw new Error('A workspace bank needs a title.')
  const normalizedDescription = description.trim().slice(0, bankDescriptionLength).trimEnd()
  const bankDescriptions = { ...snapshot.bankDescriptions }
  if (normalizedDescription) bankDescriptions[bank] = normalizedDescription
  else delete bankDescriptions[bank]
  return {
    ...snapshot,
    bankDescriptions,
    bankNames: { ...snapshot.bankNames, [bank]: normalizedTitle },
  }
}

export function normalizeWorkspaceBankNameForSave(name: string) {
  return name.trim().slice(0, workspaceBankTitleLength).trimEnd() || null
}

export function renameVoice(
  snapshot: PatchLibrarySnapshot,
  id: string,
  name: string,
): PatchLibrarySnapshot {
  const voice = snapshot.voices[id]
  if (!voice) return snapshot
  const trimmedName = name.trim()
  if (!trimmedName) return snapshot
  return {
    ...snapshot,
    voices: { ...snapshot.voices, [id]: updateDx7VoiceName(voice, trimmedName) },
  }
}

/** Puts `source` in `entries` under `targetId`, or removes the entry when there is none. */
function moveEntry<T>(entries: Record<string, T>, source: T | undefined, targetId: string) {
  if (source) entries[targetId] = source
  else delete entries[targetId]
}

export function moveVoice(
  snapshot: PatchLibrarySnapshot,
  bank: string,
  from: number,
  to: number,
): PatchLibrarySnapshot {
  if (to < 1 || to > dx7BankVoiceCount || from < 1 || from > dx7BankVoiceCount || from === to)
    return snapshot
  const fromId = voiceId(bank, from)
  if (!holdsSound(snapshot, fromId)) return snapshot

  const voices = { ...snapshot.voices }
  const effects = { ...snapshot.effects }
  const records = { ...snapshot.records }
  const virtualAnalog = { ...snapshot.virtualAnalog }
  const eightBit = { ...snapshot.eightBit }
  // Each slot's entries move together; one the source has none of is removed, so an empty slot
  // moves as empty rather than as a stored entry holding undefined.
  const moveSlot = (sourceId: string, targetId: string) => {
    moveEntry(voices, snapshot.voices[sourceId], targetId)
    moveEntry(records, snapshot.records[sourceId], targetId)
    moveEntry(virtualAnalog, snapshot.virtualAnalog[sourceId], targetId)
    moveEntry(eightBit, snapshot.eightBit[sourceId], targetId)
    const filled = holdsSound(snapshot, sourceId)
    moveEntry(
      effects,
      filled ? normalizeFm1Effects(snapshot.effects[sourceId]) : undefined,
      targetId,
    )
  }
  const direction = from < to ? 1 : -1
  for (let slot = from; slot !== to; slot += direction) {
    moveSlot(voiceId(bank, slot + direction), voiceId(bank, slot))
  }
  moveSlot(fromId, voiceId(bank, to))
  return { ...snapshot, effects, eightBit, records, virtualAnalog, voices }
}

/** Whether slot `id` holds a sound: a DX7 voice, or a Virtual Analog or 8-Bit preset. */
function holdsSound(snapshot: PatchLibrarySnapshot, id: string) {
  return Boolean(snapshot.voices[id] || snapshot.virtualAnalog[id] || snapshot.eightBit[id])
}

/**
 * Copies a voice and its FM1 effects over one slot of a loaded workspace bank. The copy gets its
 * own voice and effect objects, so nothing that remembers what a slot last sent mistakes it for the
 * sound it replaced.
 */
/** A slot a sound can replace: one in a workspace bank that holds sounds. */
function assertReplaceableSlot(snapshot: PatchLibrarySnapshot, bank: string, slot: number) {
  if (!snapshot.workspaceBanks.includes(bank) || !snapshot.loadedBanks.includes(bank)) {
    throw new WorkspaceBankUnavailableError()
  }
  if (!Number.isInteger(slot) || slot < 1 || slot > dx7BankVoiceCount) {
    throw new RangeError('Slot out of range.')
  }
}

export function copyVoice(
  snapshot: PatchLibrarySnapshot,
  sourceId: string,
  bank: string,
  slot: number,
): PatchLibrarySnapshot {
  assertReplaceableSlot(snapshot, bank, slot)
  const targetId = voiceId(bank, slot)
  if (targetId === sourceId) return snapshot
  const virtualAnalog = snapshot.virtualAnalog[sourceId]
  const eightBit = snapshot.eightBit[sourceId]
  if (virtualAnalog || eightBit) {
    return {
      ...snapshot,
      effects: { ...snapshot.effects, [targetId]: normalizeFm1Effects(snapshot.effects[sourceId]) },
      eightBit: eightBit
        ? { ...snapshot.eightBit, [targetId]: eightBit.slice() }
        : withoutEntry(snapshot.eightBit, targetId),
      records: withRecord(snapshot.records, targetId, snapshot.records[sourceId]),
      virtualAnalog: virtualAnalog
        ? { ...snapshot.virtualAnalog, [targetId]: virtualAnalog.slice() }
        : withoutEntry(snapshot.virtualAnalog, targetId),
      voices: withoutEntry(snapshot.voices, targetId),
    }
  }
  const source = findLibrarySound(snapshot, sourceId)
  if (!source) return snapshot

  return {
    ...snapshot,
    effects: { ...snapshot.effects, [targetId]: normalizeFm1Effects(source.effects) },
    eightBit: withoutEntry(snapshot.eightBit, targetId),
    records: withRecord(snapshot.records, targetId, source.record),
    virtualAnalog: withoutEntry(snapshot.virtualAnalog, targetId),
    voices: {
      ...snapshot.voices,
      [targetId]: { ...source.voice, data: source.voice.data.slice() },
    },
  }
}

/**
 * Swaps a workspace slot's patch with the one in another slot of a loaded bank: its voice or
 * Virtual Analog or 8-Bit bytes, FM1 effects, and record. Each gets its own copies, as a copy does, since a
 * swap puts a sound in a slot.
 */
export function swapVoices(
  snapshot: PatchLibrarySnapshot,
  sourceId: string,
  bank: string,
  slot: number,
): PatchLibrarySnapshot {
  // A favourite or any other id that names no workspace slot has no slot to take the other patch.
  const source = /^bank-([A-Z])-(\d+)$/.exec(sourceId)
  if (!source) throw new WorkspaceBankUnavailableError()
  assertReplaceableSlot(snapshot, source[1], Number(source[2]))
  assertReplaceableSlot(snapshot, bank, slot)
  const targetId = voiceId(bank, slot)
  if (targetId === sourceId) return snapshot

  const voices = { ...snapshot.voices }
  const effects = { ...snapshot.effects }
  const records = { ...snapshot.records }
  const virtualAnalog = { ...snapshot.virtualAnalog }
  const eightBit = { ...snapshot.eightBit }
  const put = (fromId: string, toId: string) => {
    const voice = snapshot.voices[fromId]
    moveEntry(voices, voice && { ...voice, data: voice.data.slice() }, toId)
    moveEntry(records, snapshot.records[fromId]?.slice(), toId)
    moveEntry(virtualAnalog, snapshot.virtualAnalog[fromId]?.slice(), toId)
    moveEntry(eightBit, snapshot.eightBit[fromId]?.slice(), toId)
    const filled = holdsSound(snapshot, fromId)
    moveEntry(effects, filled ? normalizeFm1Effects(snapshot.effects[fromId]) : undefined, toId)
  }
  put(sourceId, targetId)
  put(targetId, sourceId)
  return { ...snapshot, effects, eightBit, records, virtualAnalog, voices }
}

/** The entries without one for slot `id`, or the same entries when it has none. */
function withoutEntry<T>(entries: Record<string, T>, id: string) {
  if (!(id in entries)) return entries
  const next = { ...entries }
  delete next[id]
  return next
}

/** The records with slot `id` holding its own copy of `record`, or no record when there is none. */
function withRecord(
  records: Record<string, Uint8Array>,
  id: string,
  record: Uint8Array | undefined,
) {
  const next = { ...records }
  if (record) next[id] = record.slice()
  else delete next[id]
  return next
}

/** The sound a patch id names, in a workspace slot or in Favourites. */
export function findLibrarySound(snapshot: PatchLibrarySnapshot, id: string) {
  const favourite = findFavourite(snapshot.favourites, id)
  if (favourite) {
    return { effects: favourite.effects, record: favourite.record, voice: favourite.voice }
  }
  const voice = snapshot.voices[id]
  return voice ? { effects: snapshot.effects[id], record: snapshot.records[id], voice } : undefined
}

/**
 * Saves an edited sound, as the editor does. A favourite and the bank slot it came from are one
 * sound to the user, so saving either updates the other copies that sounded the same before the
 * edit: saving a slot updates the matching favourites, and saving a favourite updates the matching
 * slots in every workspace bank. Each copy gets its own voice and effect objects. `linked` counts
 * the other copies updated.
 *
 * `record`, given only for a sound that has an FM-1+VA settings record, replaces it in the sound
 * and in each copy, which held the same record since copies match on it. Without it, every record
 * stays as it was.
 */
export function saveSound(
  snapshot: PatchLibrarySnapshot,
  id: string,
  voice: Dx7Voice,
  effects: Uint8Array,
  record?: Uint8Array,
) {
  const previous = findLibrarySound(snapshot, id)
  if (!previous) return { linked: 0, snapshot }
  const previousKey = soundKey(previous.voice, previous.effects, previous.record)
  const savedEffects = normalizeFm1Effects(effects)
  const voiceCopy = () => ({ ...voice, data: voice.data.slice() })
  // A record goes only where the sound had one, so a sound without a record never gains one.
  const savedRecord = previous.record && record
  const soundWithRecord = <T extends object>(sound: T) =>
    savedRecord ? { ...sound, record: savedRecord.slice() } : sound
  let linked = 0

  if (findFavourite(snapshot.favourites, id)) {
    const voices = { ...snapshot.voices }
    const slotEffects = { ...snapshot.effects }
    const records = { ...snapshot.records }
    for (const [slotId, slotVoice] of Object.entries(snapshot.voices)) {
      const slotKey = soundKey(slotVoice, snapshot.effects[slotId], snapshot.records[slotId])
      if (slotKey !== previousKey) continue
      voices[slotId] = voiceCopy()
      slotEffects[slotId] = savedEffects.slice()
      if (savedRecord) records[slotId] = savedRecord.slice()
      linked += 1
    }
    const favourites = snapshot.favourites.map((favourite) =>
      favouritePatchId(favourite.id) === id
        ? soundWithRecord({ ...favourite, effects: savedEffects, voice })
        : favourite,
    )
    return {
      linked,
      snapshot: {
        ...snapshot,
        effects: slotEffects,
        favourites,
        records: savedRecord ? records : snapshot.records,
        voices,
      },
    }
  }

  const favourites = snapshot.favourites.map((favourite) => {
    if (favouriteSoundKey(favourite) !== previousKey) return favourite
    linked += 1
    return soundWithRecord({ ...favourite, effects: savedEffects.slice(), voice: voiceCopy() })
  })
  return {
    linked,
    snapshot: {
      ...snapshot,
      effects: { ...snapshot.effects, [id]: savedEffects },
      // Favourites that did not change stay the same list, so nothing reading them recomputes.
      favourites: linked > 0 ? favourites : snapshot.favourites,
      records: savedRecord ? { ...snapshot.records, [id]: savedRecord } : snapshot.records,
      voices: { ...snapshot.voices, [id]: voice },
    },
  }
}

/**
 * Puts a voice from outside the workspace over a slot: one read from a file, or found in a saved
 * bank or the catalog. The slot gets its own copy of the voice, effects, and record. A DX7 voice
 * file carries no FM1 effects, so without `effects` the slot's effects return to their defaults, as
 * they do when a bank is imported, and without `record` the slot has none.
 */
export function replaceVoice(
  snapshot: PatchLibrarySnapshot,
  bank: string,
  slot: number,
  voice: Dx7Voice,
  effects?: Uint8Array,
  record?: Uint8Array,
): PatchLibrarySnapshot {
  assertReplaceableSlot(snapshot, bank, slot)
  const id = voiceId(bank, slot)
  return {
    ...snapshot,
    effects: { ...snapshot.effects, [id]: normalizeFm1Effects(effects) },
    eightBit: withoutEntry(snapshot.eightBit, id),
    records: withRecord(snapshot.records, id, record),
    virtualAnalog: withoutEntry(snapshot.virtualAnalog, id),
    voices: { ...snapshot.voices, [id]: { ...voice, data: voice.data.slice() } },
  }
}

/**
 * Puts a Virtual Analog preset from outside the workspace over a slot, such as one found in a saved
 * bank: its voice bytes exactly as read, its effects, and its record, each the slot's own copy.
 */
export function replaceWithVirtualAnalog(
  snapshot: PatchLibrarySnapshot,
  bank: string,
  slot: number,
  virtualAnalog: Uint8Array,
  effects: Uint8Array | undefined,
  record: Uint8Array,
): PatchLibrarySnapshot {
  assertReplaceableSlot(snapshot, bank, slot)
  const id = voiceId(bank, slot)
  return {
    ...snapshot,
    effects: { ...snapshot.effects, [id]: normalizeFm1Effects(effects) },
    eightBit: withoutEntry(snapshot.eightBit, id),
    records: withRecord(snapshot.records, id, record),
    virtualAnalog: { ...snapshot.virtualAnalog, [id]: virtualAnalog.slice() },
    voices: withoutEntry(snapshot.voices, id),
  }
}

/**
 * Puts an 8-Bit preset from outside the workspace over a slot, such as one found in a saved bank:
 * its voice bytes exactly as read, its effects, and its record, each the slot's own copy.
 */
export function replaceWithEightBit(
  snapshot: PatchLibrarySnapshot,
  bank: string,
  slot: number,
  eightBit: Uint8Array,
  effects: Uint8Array | undefined,
  record: Uint8Array,
): PatchLibrarySnapshot {
  assertReplaceableSlot(snapshot, bank, slot)
  const id = voiceId(bank, slot)
  return {
    ...snapshot,
    effects: { ...snapshot.effects, [id]: normalizeFm1Effects(effects) },
    eightBit: { ...snapshot.eightBit, [id]: eightBit.slice() },
    records: withRecord(snapshot.records, id, record),
    virtualAnalog: withoutEntry(snapshot.virtualAnalog, id),
    voices: withoutEntry(snapshot.voices, id),
  }
}

export function clearLibraryBank(snapshot: PatchLibrarySnapshot, bank: string) {
  const voices = { ...snapshot.voices }
  const effects = { ...snapshot.effects }
  const records = { ...snapshot.records }
  const virtualAnalog = { ...snapshot.virtualAnalog }
  const eightBit = { ...snapshot.eightBit }
  for (let slot = 1; slot <= dx7BankVoiceCount; slot += 1) {
    const id = voiceId(bank, slot)
    delete voices[id]
    delete effects[id]
    delete records[id]
    delete virtualAnalog[id]
    delete eightBit[id]
  }
  return {
    bankDescriptions: snapshot.bankDescriptions,
    bankNames: snapshot.bankNames,
    effects,
    eightBit,
    favourites: snapshot.favourites,
    loadedBanks: snapshot.loadedBanks.filter((loadedBank) => loadedBank !== bank),
    records,
    virtualAnalog,
    voices,
    workspaceBanks: snapshot.workspaceBanks,
  }
}

export function deleteWorkspaceBank(snapshot: PatchLibrarySnapshot, bank: string) {
  if (snapshot.workspaceBanks.length <= 1 || !snapshot.workspaceBanks.includes(bank)) {
    return snapshot
  }
  return compactWorkspaceBanks({
    ...snapshot,
    workspaceBanks: snapshot.workspaceBanks.filter((workspaceBank) => workspaceBank !== bank),
  })
}

/**
 * The bank to show after deleting one. Later banks move up a letter, so the next bank takes the
 * deleted bank's letter; when the last bank goes, the one before it is shown.
 */
export function workspaceBankAfterDeletion(workspaceBanks: readonly string[], deletedBank: string) {
  const index = workspaceBanks.indexOf(deletedBank)
  if (index === -1 || workspaceBanks.length <= 1) return null
  return String.fromCharCode(65 + Math.min(index, workspaceBanks.length - 2))
}

/** Whether deleting a bank removes `bank` or moves it to another letter, so its slot ids change. */
export function isRenumberedByBankDeletion(
  workspaceBanks: readonly string[],
  deletedBank: string,
  bank: string,
) {
  const deletedIndex = workspaceBanks.indexOf(deletedBank)
  return deletedIndex !== -1 && workspaceBanks.indexOf(bank) >= deletedIndex
}

/** The code a slot shows, such as A01. A favourite shows only its place in Favourites, such as 01. */
export function patchSlotCode({ bank, number }: Pick<Patch, 'bank' | 'number'>) {
  const slot = String(number).padStart(2, '0')
  return isWorkspaceBankId(bank) ? `${bank}${slot}` : slot
}

// A letter then a slot number, with or without the zero a slot shows: B7 and B07 name the same slot.
const slotCodeQuery = /^([a-z])0?(\d{1,2})$/

/**
 * Matches a patch by name, or by its slot code when the whole query is one. A lone letter is part of
 * a name rather than a bank, so it does not list every patch in that bank.
 */
/** Whether a patch name contains the search, ignoring case and surrounding spaces. */
export function patchNameMatchesSearch(name: string, search: string) {
  return name.toLowerCase().includes(search.trim().toLowerCase())
}

export function patchMatchesSearch(patch: Pick<Patch, 'bank' | 'name' | 'number'>, search: string) {
  const query = search.trim().toLowerCase()
  if (!query) return true
  const code = slotCodeQuery.exec(query)
  if (code && code[1] === patch.bank.toLowerCase() && Number(code[2]) === patch.number) return true
  return patchNameMatchesSearch(patch.name, query)
}

/**
 * A workspace bank's DX7 voices in slot order. A DX7 bank has no place for a Virtual Analog or
 * 8-Bit preset, so its slot takes `initVoice` when one is given and is left out otherwise.
 */
export function getBankVoices(snapshot: PatchLibrarySnapshot, bank: string, initVoice?: Dx7Voice) {
  return Array.from({ length: dx7BankVoiceCount }, (_, index) => {
    const id = voiceId(bank, index + 1)
    return (
      snapshot.voices[id] ??
      (snapshot.virtualAnalog[id] || snapshot.eightBit[id] ? initVoice : undefined)
    )
  }).filter((voice): voice is Dx7Voice => Boolean(voice))
}

/**
 * How many of a workspace bank's slots hold a Virtual Analog or 8-Bit preset, which a DX7 bank
 * sends or downloads as INIT VOICE.
 */
export function bankInitVoiceCount(
  library: Pick<PatchLibrarySnapshot, 'eightBit' | 'virtualAnalog'>,
  bank: string,
) {
  return Array.from({ length: dx7BankVoiceCount }, (_, index) => voiceId(bank, index + 1)).filter(
    (id) => id in library.virtualAnalog || id in library.eightBit,
  ).length
}

/** Session-only content identity used to describe whether a browser bank changed after transfer. */
export function makeBankFingerprint(voices: Dx7Voice[]) {
  let hash = 0x811c9dc5
  for (const voice of voices) {
    for (const byte of voice.data) {
      hash ^= byte
      hash = Math.imul(hash, 0x01000193)
    }
  }
  return `${voices.length}:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function makeDemoVoices(): Dx7Voice[] {
  const names = ['E.PIANO', 'GLASSBELL', 'FM BASS', 'BRASS', 'WARM PAD', 'PLUCK', 'ORGAN', 'MALLET']

  return Array.from({ length: dx7BankVoiceCount }, (_, index) => {
    const data = new Uint8Array(dx7PackedVoiceSize)
    for (let operator = 0; operator < 6; operator += 1) {
      const offset = operator * 17
      data.set([99, 99, 99, 99, 99, 80, 60, 0], offset)
      data[offset + 14] = operator === 0 ? 90 : 0
      data[offset + 15] = 2
    }
    data[110] = 31
    data[117] = DX7_TRANSPOSE_C3
    return updateDx7VoiceName(
      { data, name: '' },
      `${names[index % names.length]}${Math.floor(index / names.length) + 1}`,
    )
  })
}
