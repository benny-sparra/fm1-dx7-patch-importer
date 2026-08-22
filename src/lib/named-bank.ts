import { makeDx7BankFile, type Dx7Voice } from '@/lib/dx7'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import { importVoices, voiceId, type PatchLibrarySnapshot } from '@/lib/patch-library'

type NamedBankSlot = {
  effects: Uint8Array
  slot: number
  voice: Dx7Voice
}

export type NamedBank = {
  createdAt: string
  description: string
  id: string
  name: string
  slots: NamedBankSlot[]
  updatedAt: string
  version: 1
}

type CreateNamedBankOptions = {
  description: string
  id: string
  name: string
  now: string
}

function normalizeName(name: string) {
  const normalized = name.trim()
  if (!normalized) throw new Error('A saved bank needs a name.')
  if (normalized.length > 80) throw new Error('A saved bank name cannot exceed 80 characters.')
  return normalized
}

function normalizeDescription(description: string) {
  const normalized = description.trim()
  if (normalized.length > 500)
    throw new Error('A saved bank description cannot exceed 500 characters.')
  return normalized
}

function cloneSlot(slot: NamedBankSlot): NamedBankSlot {
  return {
    effects: normalizeFm1Effects(slot.effects),
    slot: slot.slot,
    voice: { ...slot.voice, data: slot.voice.data.slice() },
  }
}

export function validateNamedBank(value: unknown): asserts value is NamedBank {
  if (!value || typeof value !== 'object') throw new Error('A saved bank record is invalid.')
  const bank = value as Partial<NamedBank>
  if (
    bank.version !== 1 ||
    typeof bank.id !== 'string' ||
    !bank.id ||
    typeof bank.name !== 'string' ||
    typeof bank.description !== 'string' ||
    typeof bank.createdAt !== 'string' ||
    typeof bank.updatedAt !== 'string' ||
    !Array.isArray(bank.slots) ||
    bank.slots.length !== 32
  ) {
    throw new Error('A saved bank record is invalid.')
  }

  normalizeName(bank.name)
  normalizeDescription(bank.description)
  bank.slots.forEach((slot, index) => {
    if (
      !slot ||
      slot.slot !== index + 1 ||
      !(slot.voice?.data instanceof Uint8Array) ||
      slot.voice.data.length !== 128 ||
      typeof slot.voice.name !== 'string' ||
      !(slot.effects instanceof Uint8Array) ||
      slot.effects.length !== 24
    ) {
      throw new Error('A saved bank must contain 32 valid sound slots.')
    }
  })
}

export function createNamedBank(
  snapshot: PatchLibrarySnapshot,
  sourceBank: string,
  options: CreateNamedBankOptions,
): NamedBank {
  if (!snapshot.workspaceBanks.includes(sourceBank)) {
    throw new Error('The source browser bank is invalid.')
  }

  const slots = Array.from({ length: 32 }, (_, index) => {
    const slot = index + 1
    const id = voiceId(sourceBank, slot)
    const voice = snapshot.voices[id]
    if (!voice) throw new Error('A saved bank must contain exactly 32 sounds.')
    return {
      effects: normalizeFm1Effects(snapshot.effects[id]),
      slot,
      voice: { ...voice, data: voice.data.slice() },
    }
  })

  return {
    createdAt: options.now,
    description: normalizeDescription(options.description),
    id: options.id,
    name: normalizeName(options.name),
    slots,
    updatedAt: options.now,
    version: 1,
  }
}

export function loadNamedBank(
  snapshot: PatchLibrarySnapshot,
  destinationBank: string,
  bank: NamedBank,
) {
  validateNamedBank(bank)
  const loaded = importVoices(
    snapshot,
    destinationBank,
    bank.slots.map(({ voice }) => ({ ...voice, data: voice.data.slice() })),
  )
  const effects = { ...loaded.effects }
  bank.slots.forEach((slot) => {
    effects[voiceId(destinationBank, slot.slot)] = normalizeFm1Effects(slot.effects)
  })
  return {
    ...loaded,
    bankDescriptions: {
      ...loaded.bankDescriptions,
      ...(bank.description ? { [destinationBank]: bank.description } : {}),
    },
    bankNames: { ...loaded.bankNames, [destinationBank]: bank.name },
    effects,
  }
}

export function renameNamedBank(
  bank: NamedBank,
  name: string,
  description: string,
  now: string,
): NamedBank {
  return {
    ...bank,
    description: normalizeDescription(description),
    name: normalizeName(name),
    updatedAt: now,
  }
}

export function duplicateNamedBank(bank: NamedBank, id: string, now: string): NamedBank {
  validateNamedBank(bank)
  return {
    ...bank,
    createdAt: now,
    id,
    name: normalizeName(`${bank.name.slice(0, 75).trimEnd()} copy`),
    slots: bank.slots.map(cloneSlot),
    updatedAt: now,
  }
}

export function makeNamedBankSysexFile(bank: NamedBank) {
  validateNamedBank(bank)
  return makeDx7BankFile(bank.slots.map(({ voice }) => voice))
}

export function makeNamedBankSysexFilename(bank: NamedBank) {
  validateNamedBank(bank)
  const stem = bank.name
    .normalize('NFKC')
    .replace(/[\p{Cc}<>:"/\\|?*]+/gu, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')

  return `fm1-${stem || 'bank'}.sysex`
}
