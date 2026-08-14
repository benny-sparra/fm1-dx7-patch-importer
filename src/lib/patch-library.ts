import { patches as placeholders, type Patch } from '@/data/patches'
import { encodedDx7FactoryBanks } from '@/data/dx7-factory-banks'
import { parseDx7Bank, updateDx7VoiceName, type Dx7Voice } from '@/lib/dx7'
import {
  makeDefaultFm1Effects,
  normalizeFm1Effects,
} from '@/lib/fm1-effects'

export const browserBanks = ['A', 'B', 'C', 'D'] as const
export type BrowserBank = typeof browserBanks[number]

export type PatchLibrarySnapshot = {
  bankNames: Record<string, string>
  effects: Record<string, Uint8Array>
  loadedBanks: string[]
  voices: Record<string, Dx7Voice>
}

export function emptyPatchLibrary(): PatchLibrarySnapshot {
  return { bankNames: {}, effects: {}, loadedBanks: [], voices: {} }
}

export function makeFactoryPatchLibrary(): PatchLibrarySnapshot {
  return browserBanks.reduce((snapshot, bank) => {
    const binary = atob(encodedDx7FactoryBanks[bank])
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return importVoices(snapshot, bank, parseDx7Bank(bytes.buffer))
  }, emptyPatchLibrary())
}

export function initializePatchLibrary(stored: PatchLibrarySnapshot | null) {
  return stored ?? makeFactoryPatchLibrary()
}

export function voiceId(bank: string, number: number) {
  return `bank-${bank}-${number}`
}

export function makePatches(snapshot: PatchLibrarySnapshot): Patch[] {
  return placeholders.map((patch) => {
    const voice = snapshot.voices[voiceId(patch.bank, patch.number)]
    return {
      ...patch,
      id: voiceId(patch.bank, patch.number),
      name: voice?.name ?? 'Empty',
      family: voice ? 'DX7' : '',
    }
  })
}

export function importVoices(
  snapshot: PatchLibrarySnapshot,
  bank: string,
  imported: Dx7Voice[],
): PatchLibrarySnapshot {
  if (!browserBanks.includes(bank as BrowserBank) || imported.length !== 32) {
    throw new Error('A browser bank requires exactly 32 DX7 voices.')
  }

  const voices = { ...snapshot.voices }
  const effects = { ...snapshot.effects }
  const bankNames = { ...snapshot.bankNames }
  delete bankNames[bank]
  imported.forEach((voice, index) => {
    const id = voiceId(bank, index + 1)
    voices[id] = voice
    effects[id] = makeDefaultFm1Effects()
  })
  return {
    bankNames,
    effects,
    loadedBanks: [...new Set([...snapshot.loadedBanks, bank])].sort(),
    voices,
  }
}

export function renameBank(
  snapshot: PatchLibrarySnapshot,
  bank: string,
  name: string,
): PatchLibrarySnapshot {
  if (!browserBanks.includes(bank as BrowserBank)) return snapshot
  const bankNames = { ...snapshot.bankNames }
  const normalized = normalizeWorkspaceBankNameForSave(name)
  if (normalized) bankNames[bank] = normalized
  else delete bankNames[bank]
  return { ...snapshot, bankNames }
}

export function normalizeWorkspaceBankNameForSave(name: string) {
  return name.trim().slice(0, 80).trimEnd() || null
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
  const bankNames = { ...snapshot.bankNames }
  delete bankNames[bank]
  for (let slot = 1; slot <= 32; slot += 1) {
    const id = voiceId(bank, slot)
    delete voices[id]
    delete effects[id]
  }
  return {
    bankNames,
    effects,
    loadedBanks: snapshot.loadedBanks.filter((loadedBank) => loadedBank !== bank),
    voices,
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
