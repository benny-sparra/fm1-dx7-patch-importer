import { type Patch } from '@/data/patches'
import { encodedDx7FactoryBanks } from '@/data/dx7-factory-banks'
import { parseDx7Bank, updateDx7VoiceName, type Dx7Voice } from '@/lib/dx7'
import {
  makeDefaultFm1Effects,
  normalizeFm1Effects,
} from '@/lib/fm1-effects'

export const browserBanks = ['A', 'B', 'C', 'D'] as const
export const maximumWorkspaceBanks = 10
export const workspaceBankTitleLength = 10

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

export function makeFactoryPatchLibrary(): PatchLibrarySnapshot {
  return restoreFactoryPatchLibrary(emptyPatchLibrary())
}

export function restoreFactoryPatchLibrary(snapshot: PatchLibrarySnapshot): PatchLibrarySnapshot {
  const cleared = browserBanks.reduce(
    (current, bank) => clearLibraryBank(current, bank),
    snapshot,
  )
  return browserBanks.reduce((current, bank) => {
    const binary = atob(encodedDx7FactoryBanks[bank])
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return importVoices(current, bank, parseDx7Bank(bytes.buffer))
  }, cleared)
}

export function initializePatchLibrary(stored: PatchLibrarySnapshot | null) {
  return stored ?? makeFactoryPatchLibrary()
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

export function createWorkspaceBank(
  snapshot: PatchLibrarySnapshot,
  bank: string,
  name: string,
  imported?: Dx7Voice[],
) {
  const normalizedName = normalizeWorkspaceBankNameForSave(name)
  if (!normalizedName) throw new Error('A workspace bank needs a name.')
  if (bank !== getNextWorkspaceBank(snapshot.workspaceBanks)) {
    throw new Error('That workspace bank is no longer available.')
  }

  const added = addWorkspaceBank(snapshot, bank)
  const populated = imported ? importVoices(added, bank, imported) : added
  return updateBankInformation(populated, bank, normalizedName, '')
}

export function makePatches(snapshot: PatchLibrarySnapshot): Patch[] {
  return snapshot.workspaceBanks.flatMap((bank, bankIndex) => (
    Array.from({ length: 32 }, (_, slotIndex) => {
      const number = slotIndex + 1
      const id = voiceId(bank, number)
      const voice = snapshot.voices[id]
      return {
        bank,
        family: voice ? 'DX7' : '',
        id,
        name: voice?.name ?? 'Empty',
        number,
        program: (bankIndex % browserBanks.length) * 32 + slotIndex,
      }
    })
  ))
}

export function importVoices(
  snapshot: PatchLibrarySnapshot,
  bank: string,
  imported: Dx7Voice[],
): PatchLibrarySnapshot {
  if (!snapshot.workspaceBanks.includes(bank) || imported.length !== 32) {
    throw new Error('A browser bank requires exactly 32 DX7 voices.')
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
  if (to < 1 || to > 32 || from < 1 || from > 32 || from === to) return snapshot
  const moved = snapshot.voices[voiceId(bank, from)]
  if (!moved) return snapshot

  const voices = { ...snapshot.voices }
  const effects = { ...snapshot.effects }
  const direction = from < to ? 1 : -1
  for (let slot = from; slot !== to; slot += direction) {
    const targetId = voiceId(bank, slot)
    const sourceId = voiceId(bank, slot + direction)
    voices[targetId] = snapshot.voices[sourceId]
    effects[targetId] = normalizeFm1Effects(snapshot.effects[sourceId])
  }
  const targetId = voiceId(bank, to)
  voices[targetId] = moved
  effects[targetId] = normalizeFm1Effects(snapshot.effects[voiceId(bank, from)])
  return { ...snapshot, effects, voices }
}

export function clearLibraryBank(snapshot: PatchLibrarySnapshot, bank: string) {
  const voices = { ...snapshot.voices }
  const effects = { ...snapshot.effects }
  for (let slot = 1; slot <= 32; slot += 1) {
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
  const cleared = clearLibraryBank(snapshot, bank)
  const bankDescriptions = { ...cleared.bankDescriptions }
  const bankNames = { ...cleared.bankNames }
  delete bankDescriptions[bank]
  delete bankNames[bank]
  return {
    ...cleared,
    bankDescriptions,
    bankNames,
    workspaceBanks: cleared.workspaceBanks.filter((workspaceBank) => workspaceBank !== bank),
  }
}

export function getBankVoices(snapshot: PatchLibrarySnapshot, bank: string) {
  return Array.from({ length: 32 }, (_, index) => snapshot.voices[voiceId(bank, index + 1)])
    .filter((voice): voice is Dx7Voice => Boolean(voice))
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
  const names = [
    'E.PIANO', 'GLASSBELL', 'FM BASS', 'BRASS', 'WARM PAD', 'PLUCK',
    'ORGAN', 'MALLET',
  ]

  return Array.from({ length: 32 }, (_, index) => {
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
