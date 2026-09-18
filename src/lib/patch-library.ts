import { type Patch } from '@/data/patches'
import { dx7BankVoiceCount, updateDx7VoiceName, type Dx7Voice } from '@/lib/dx7'
import { makeDefaultFm1Effects, normalizeFm1Effects } from '@/lib/fm1-effects'

export const browserBanks = ['A', 'B', 'C', 'D'] as const
export const maximumWorkspaceBanks = 10
export const workspaceBankTitleLength = 10

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
  loadedBanks: string[]
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
    loadedBanks: [],
    voices: {},
    workspaceBanks: [...workspaceBanks],
  }
}

export function voiceId(bank: string, number: number) {
  return `bank-${bank}-${number}`
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
  const loadedBanks: string[] = []
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
    }
  })

  return { bankDescriptions, bankNames, effects, loadedBanks, voices, workspaceBanks }
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
      return {
        bank,
        family: voice ? 'DX7' : '',
        id,
        name: voice?.name ?? 'Empty',
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
  imported.forEach((voice, index) => {
    const id = voiceId(bank, index + 1)
    voices[id] = voice
    effects[id] = makeDefaultFm1Effects()
  })
  return {
    bankDescriptions: snapshot.bankDescriptions,
    bankNames: snapshot.bankNames,
    effects,
    loadedBanks: [...new Set([...snapshot.loadedBanks, bank])].sort(),
    voices,
    workspaceBanks: snapshot.workspaceBanks,
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
  const normalizedDescription = description.trim().slice(0, 500).trimEnd()
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

export function moveVoice(
  snapshot: PatchLibrarySnapshot,
  bank: string,
  from: number,
  to: number,
): PatchLibrarySnapshot {
  if (to < 1 || to > dx7BankVoiceCount || from < 1 || from > dx7BankVoiceCount || from === to)
    return snapshot
  const moved = snapshot.voices[voiceId(bank, from)]
  if (!moved) return snapshot

  const voices = { ...snapshot.voices }
  const effects = { ...snapshot.effects }
  const direction = from < to ? 1 : -1
  for (let slot = from; slot !== to; slot += direction) {
    const targetId = voiceId(bank, slot)
    const sourceId = voiceId(bank, slot + direction)
    const source = snapshot.voices[sourceId]
    if (source) {
      voices[targetId] = source
      effects[targetId] = normalizeFm1Effects(snapshot.effects[sourceId])
    } else {
      // An empty slot moves as empty, rather than as a stored entry holding undefined.
      delete voices[targetId]
      delete effects[targetId]
    }
  }
  const targetId = voiceId(bank, to)
  voices[targetId] = moved
  effects[targetId] = normalizeFm1Effects(snapshot.effects[voiceId(bank, from)])
  return { ...snapshot, effects, voices }
}

/**
 * Copies a voice and its FM1 effects over one slot of a loaded workspace bank. The copy gets its
 * own voice and effect objects, so nothing that remembers what a slot last sent mistakes it for the
 * sound it replaced.
 */
export function copyVoice(
  snapshot: PatchLibrarySnapshot,
  sourceId: string,
  bank: string,
  slot: number,
): PatchLibrarySnapshot {
  if (!snapshot.workspaceBanks.includes(bank) || !snapshot.loadedBanks.includes(bank)) {
    throw new WorkspaceBankUnavailableError()
  }
  if (!Number.isInteger(slot) || slot < 1 || slot > dx7BankVoiceCount) {
    throw new RangeError('Slot out of range.')
  }
  const voice = snapshot.voices[sourceId]
  const targetId = voiceId(bank, slot)
  if (!voice || targetId === sourceId) return snapshot

  return {
    ...snapshot,
    effects: { ...snapshot.effects, [targetId]: normalizeFm1Effects(snapshot.effects[sourceId]) },
    voices: { ...snapshot.voices, [targetId]: { ...voice, data: voice.data.slice() } },
  }
}

export function clearLibraryBank(snapshot: PatchLibrarySnapshot, bank: string) {
  const voices = { ...snapshot.voices }
  const effects = { ...snapshot.effects }
  for (let slot = 1; slot <= dx7BankVoiceCount; slot += 1) {
    const id = voiceId(bank, slot)
    delete voices[id]
    delete effects[id]
  }
  return {
    bankDescriptions: snapshot.bankDescriptions,
    bankNames: snapshot.bankNames,
    effects,
    loadedBanks: snapshot.loadedBanks.filter((loadedBank) => loadedBank !== bank),
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

/** The code a slot shows, such as A01. */
export function patchSlotCode({ bank, number }: Pick<Patch, 'bank' | 'number'>) {
  return `${bank}${String(number).padStart(2, '0')}`
}

// A letter then a slot number, with or without the zero a slot shows: B7 and B07 name the same slot.
const slotCodeQuery = /^([a-z])0?(\d{1,2})$/

/**
 * Matches a patch by name, or by its slot code when the whole query is one. A lone letter is part of
 * a name rather than a bank, so it does not list every patch in that bank.
 */
export function patchMatchesSearch(patch: Pick<Patch, 'bank' | 'name' | 'number'>, search: string) {
  const query = search.trim().toLowerCase()
  if (!query) return true
  const code = slotCodeQuery.exec(query)
  if (code && code[1] === patch.bank.toLowerCase() && Number(code[2]) === patch.number) return true
  return patch.name.toLowerCase().includes(query)
}

export function getBankVoices(snapshot: PatchLibrarySnapshot, bank: string) {
  return Array.from(
    { length: dx7BankVoiceCount },
    (_, index) => snapshot.voices[voiceId(bank, index + 1)],
  ).filter((voice): voice is Dx7Voice => Boolean(voice))
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
    const data = new Uint8Array(128)
    for (let operator = 0; operator < 6; operator += 1) {
      const offset = operator * 17
      data.set([99, 99, 99, 99, 99, 80, 60, 0], offset)
      data[offset + 14] = operator === 0 ? 90 : 0
      data[offset + 15] = 2
    }
    data[110] = 31
    data[117] = 24
    return updateDx7VoiceName(
      { data, name: '' },
      `${names[index % names.length]}${Math.floor(index / names.length) + 1}`,
    )
  })
}
