import { dx7PackedVoiceSize, makeDx7BankFile, type Dx7Voice } from '@/lib/dx7'
import { sysexFilenameStem } from '@/lib/sysex-file'
import { fm1EffectParameterCount, normalizeFm1Effects } from '@/lib/fm1-effects'
import { isFm1VaVirtualAnalogVoice } from '@/lib/fm1-va-virtual-analog'
import {
  bankDescriptionLength,
  fm1VaRecordSize,
  importFetchedBanks,
  normalizeWorkspaceBankNameForSave,
  voiceId,
  type PatchLibrarySnapshot,
} from '@/lib/patch-library'

export const savedBankNameLength = 80

/**
 * One slot of a saved bank: a DX7 voice, with the FM-1+VA settings record from version 2 when its
 * sound has one, or, from version 3, a Virtual Analog preset's voice bytes and its record.
 */
type NamedBankSlot = { effects: Uint8Array; slot: number } & (
  { record?: Uint8Array; voice: Dx7Voice } | { record: Uint8Array; virtualAnalog: Uint8Array }
)

/**
 * A saved bank. Version 2 adds each slot's optional record, and version 3, which this release
 * writes, Virtual Analog slots; earlier banks, which have neither, are read as they are.
 */
export type NamedBank = {
  createdAt: string
  description: string
  id: string
  name: string
  slots: NamedBankSlot[]
  updatedAt: string
  version: 1 | 2 | 3
}

const namedBankVersion = 3

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
  const effects = normalizeFm1Effects(slot.effects)
  if ('virtualAnalog' in slot) {
    return {
      effects,
      record: slot.record.slice(),
      slot: slot.slot,
      virtualAnalog: slot.virtualAnalog.slice(),
    }
  }
  return {
    effects,
    ...(slot.record ? { record: slot.record.slice() } : {}),
    slot: slot.slot,
    voice: { ...slot.voice, data: slot.voice.data.slice() },
  }
}

function isValidRecord(record: unknown) {
  return record instanceof Uint8Array && record.length === fm1VaRecordSize
}

/** Whether a slot holds a valid sound: a DX7 voice, or, from version 3, a Virtual Analog preset. */
function isValidSlotSound(slot: Partial<NamedBankSlot>, version: NamedBank['version']) {
  if ('virtualAnalog' in slot) {
    return (
      version === 3 && isFm1VaVirtualAnalogVoice(slot.virtualAnalog) && isValidRecord(slot.record)
    )
  }
  return (
    'voice' in slot &&
    slot.voice?.data instanceof Uint8Array &&
    slot.voice.data.length === dx7PackedVoiceSize &&
    typeof slot.voice.name === 'string' &&
    (slot.record === undefined || isValidRecord(slot.record))
  )
}

export function validateNamedBank(value: unknown): asserts value is NamedBank {
  if (!value || typeof value !== 'object') throw new Error('A saved bank record is invalid.')
  const bank = value as Partial<NamedBank>
  if (
    (bank.version !== 1 && bank.version !== 2 && bank.version !== 3) ||
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
  const version = bank.version
  bank.slots.forEach((slot, index) => {
    if (
      !slot ||
      slot.slot !== index + 1 ||
      !isValidSlotSound(slot, version) ||
      !(slot.effects instanceof Uint8Array) ||
      slot.effects.length !== fm1EffectParameterCount
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
    const virtualAnalog = snapshot.virtualAnalog[id]
    const record = snapshot.records[id]
    const effects = normalizeFm1Effects(snapshot.effects[id])
    if (virtualAnalog && record) {
      return { effects, record: record.slice(), slot, virtualAnalog: virtualAnalog.slice() }
    }
    if (!voice) throw new Error('A saved bank must contain exactly 32 sounds.')
    return {
      effects,
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
  const loaded = importFetchedBanks(snapshot, [
    { bank: destinationBank, sounds: bank.slots.map(cloneSlot) },
  ])
  // A saved bank's name may be longer than a workspace bank title, which storage keeps short.
  const title = normalizeWorkspaceBankNameForSave(bank.name)
  return {
    ...loaded,
    bankDescriptions: {
      ...loaded.bankDescriptions,
      ...(bank.description ? { [destinationBank]: bank.description } : {}),
    },
    bankNames: { ...loaded.bankNames, ...(title ? { [destinationBank]: title } : {}) },
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

/** A saved bank as a DX7 bank file, with `initVoice` in each Virtual Analog slot. */
export function makeNamedBankSysexFile(bank: NamedBank, initVoice: Dx7Voice) {
  validateNamedBank(bank)
  return makeDx7BankFile(bank.slots.map((slot) => ('voice' in slot ? slot.voice : initVoice)))
}

/** How many of a saved bank's slots hold a Virtual Analog preset. */
export function namedBankVirtualAnalogCount(bank: NamedBank) {
  return bank.slots.filter((slot) => 'virtualAnalog' in slot).length
}

export function makeNamedBankSysexFilename(bank: NamedBank) {
  validateNamedBank(bank)
  const stem = sysexFilenameStem(bank.name)

  return `fm1-${stem || 'bank'}.syx`
}
