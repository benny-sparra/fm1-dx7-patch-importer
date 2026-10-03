import { dx7PackedVoiceSize, makeDx7BankFile, type Dx7Voice } from '@/lib/dx7'
import { sysexFilenameStem } from '@/lib/sysex-file'
import { fm1EffectParameterCount, normalizeFm1Effects } from '@/lib/fm1-effects'
import {
  bankDescriptionLength,
  fm1VaRecordSize,
  importVoices,
  normalizeWorkspaceBankNameForSave,
  voiceId,
  type PatchLibrarySnapshot,
} from '@/lib/patch-library'

export const savedBankNameLength = 80

type NamedBankSlot = {
  effects: Uint8Array
  /** The slot's FM-1+VA settings record, from version 2, when its sound has one. */
  record?: Uint8Array
  slot: number
  voice: Dx7Voice
}

/**
 * A saved bank. Version 2 adds each slot's optional record and is what this release writes; a
 * version 1 bank, which has no records, is read as it is.
 */
export type NamedBank = {
  createdAt: string
  description: string
  id: string
  name: string
  slots: NamedBankSlot[]
  updatedAt: string
  version: 1 | 2
}

const namedBankVersion = 2

type CreateNamedBankOptions = {
  description: string
  id: string
  name: string
  now: string
}

function normalizeName(name: string) {
  const normalized = name.trim()
  if (!normalized) throw new Error('A saved bank needs a name.')
  if (normalized.length > savedBankNameLength) {
    throw new Error(`A saved bank name cannot exceed ${savedBankNameLength} characters.`)
  }
  return normalized
}

function normalizeDescription(description: string) {
  const normalized = description.trim()
  if (normalized.length > bankDescriptionLength) {
    throw new Error(`A saved bank description cannot exceed ${bankDescriptionLength} characters.`)
  }
  return normalized
}

function cloneSlot(slot: NamedBankSlot): NamedBankSlot {
  return {
    effects: normalizeFm1Effects(slot.effects),
    ...(slot.record ? { record: slot.record.slice() } : {}),
    slot: slot.slot,
    voice: { ...slot.voice, data: slot.voice.data.slice() },
  }
}

export function validateNamedBank(value: unknown): asserts value is NamedBank {
  if (!value || typeof value !== 'object') throw new Error('A saved bank record is invalid.')
  const bank = value as Partial<NamedBank>
  if (
    (bank.version !== 1 && bank.version !== 2) ||
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
      slot.voice.data.length !== dx7PackedVoiceSize ||
      typeof slot.voice.name !== 'string' ||
      !(slot.effects instanceof Uint8Array) ||
      slot.effects.length !== fm1EffectParameterCount ||
      (slot.record !== undefined &&
        (!(slot.record instanceof Uint8Array) || slot.record.length !== fm1VaRecordSize))
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
    const record = snapshot.records[id]
    return {
      effects: normalizeFm1Effects(snapshot.effects[id]),
      ...(record ? { record: record.slice() } : {}),
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
    version: namedBankVersion,
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
  const records = { ...loaded.records }
  bank.slots.forEach((slot) => {
    const id = voiceId(destinationBank, slot.slot)
    effects[id] = normalizeFm1Effects(slot.effects)
    if (slot.record) records[id] = slot.record.slice()
  })
  // A saved bank's name may be longer than a workspace bank title, which storage keeps short.
  const title = normalizeWorkspaceBankNameForSave(bank.name)
  return {
    ...loaded,
    bankDescriptions: {
      ...loaded.bankDescriptions,
      ...(bank.description ? { [destinationBank]: bank.description } : {}),
    },
    bankNames: { ...loaded.bankNames, ...(title ? { [destinationBank]: title } : {}) },
    effects,
    records,
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
    version: namedBankVersion,
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
    version: namedBankVersion,
  }
}

export function makeNamedBankSysexFile(bank: NamedBank) {
  validateNamedBank(bank)
  return makeDx7BankFile(bank.slots.map(({ voice }) => voice))
}

export function makeNamedBankSysexFilename(bank: NamedBank) {
  validateNamedBank(bank)
  const stem = sysexFilenameStem(bank.name)

  return `fm1-${stem || 'bank'}.syx`
}
