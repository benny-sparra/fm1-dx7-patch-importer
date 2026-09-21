import { trackAnalyticsEvent } from '@/lib/analytics'
import { downloadFile } from '@/lib/download-file'
import {
  dx7BankVoiceCount,
  dx7PackedVoiceSize,
  isSevenBitData,
  normalizeStoredDx7Voice,
  type Dx7Voice,
} from '@/lib/dx7'
import { fm1EffectParameterCount, normalizeFm1Effects } from '@/lib/fm1-effects'
import { recordBackupTime } from '@/lib/last-backup'
import { type NamedBank, validateNamedBank } from '@/lib/named-bank'
import {
  bankDescriptionLength,
  compactWorkspaceBanks,
  isWorkspaceBankId,
  maximumWorkspaceBanks,
  voiceId,
  workspaceBankTitleLength,
  type PatchLibrarySnapshot,
} from '@/lib/patch-library'

/**
 * A backup file is a public format from its first release: every later release must read every
 * version written before it. Its version is independent of the IndexedDB record versions, which
 * change for different reasons.
 */
export const workspaceBackupFormat = 'fm1-librarian-backup'
export const workspaceBackupVersion = 1
export const workspaceBackupFileAccept = '.json,application/json'

/**
 * The largest file a restore reads. A full workspace is well under a megabyte, so this leaves room
 * for hundreds of saved banks while refusing a large file picked by mistake before it is loaded.
 */
export const maximumWorkspaceBackupFileSize = 32 * 1024 * 1024

type BackupSlotV1 = { effects: string; slot: number; voice: string }

type BackupFileV1 = {
  format: typeof workspaceBackupFormat
  savedAt: string
  savedBanks: {
    createdAt: string
    description: string
    id: string
    name: string
    slots: BackupSlotV1[]
    updatedAt: string
  }[]
  version: 1
  workspace: {
    bankDescriptions: Record<string, string>
    bankNames: Record<string, string>
    loadedBanks: string[]
    slots: (BackupSlotV1 & { bank: string })[]
    workspaceBanks: string[]
  }
}

// 'format' is not a backup at all, 'newer' was written by a later release, and 'damaged' is a
// backup whose workspace cannot be read.
type WorkspaceBackupProblem = 'damaged' | 'format' | 'newer' | 'size'

/** A backup file that cannot be restored, with a problem code the UI can explain in any language. */
export class WorkspaceBackupError extends Error {
  readonly problem: WorkspaceBackupProblem

  constructor(problem: WorkspaceBackupProblem, message: string) {
    super(message)
    this.name = 'WorkspaceBackupError'
    this.problem = problem
  }
}

export type WorkspaceBackup = {
  /** Saved banks in the file that could not be read, and are left out of the restore. */
  damagedSavedBankCount: number
  savedAt: string
  savedBanks: NamedBank[]
  workspace: PatchLibrarySnapshot
}

function encodeBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
}

function decodeBase64(value: unknown) {
  if (typeof value !== 'string') return null
  try {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

function encodeSlot(voice: Dx7Voice, effects: Uint8Array | undefined, slot: number): BackupSlotV1 {
  return {
    effects: encodeBase64(normalizeFm1Effects(effects)),
    slot,
    voice: encodeBase64(voice.data),
  }
}

/** Writes the workspace and the saved banks as a version 1 backup file. */
export function makeWorkspaceBackup(
  snapshot: PatchLibrarySnapshot,
  savedBanks: readonly NamedBank[],
  savedAt: string,
) {
  const slots = snapshot.workspaceBanks.flatMap((bank) =>
    Array.from({ length: dx7BankVoiceCount }, (_, index) => index + 1).flatMap((slot) => {
      const id = voiceId(bank, slot)
      const voice = snapshot.voices[id]
      return voice ? [{ bank, ...encodeSlot(voice, snapshot.effects[id], slot) }] : []
    }),
  )
  const file: BackupFileV1 = {
    format: workspaceBackupFormat,
    savedAt,
    savedBanks: savedBanks.map((bank) => ({
      createdAt: bank.createdAt,
      description: bank.description,
      id: bank.id,
      name: bank.name,
      slots: bank.slots.map(({ effects, slot, voice }) => encodeSlot(voice, effects, slot)),
      updatedAt: bank.updatedAt,
    })),
    version: workspaceBackupVersion,
    workspace: {
      bankDescriptions: snapshot.bankDescriptions,
      bankNames: snapshot.bankNames,
      loadedBanks: snapshot.loadedBanks,
      slots,
      workspaceBanks: snapshot.workspaceBanks,
    },
  }
  return JSON.stringify(file)
}

/** Names a backup by the local date it was made, such as fm1-backup-2026-09-21.json. */
export function makeWorkspaceBackupFilename(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `fm1-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`
}

/** What a backup download holds, for the notification that confirms it. */
export type WorkspaceBackupDownload =
  'downloaded' | 'downloadedWithoutDamaged' | 'downloadedWithoutSavedBanks'

type BackupSource = {
  hasDamagedNamedBanks: boolean
  namedBanks: readonly NamedBank[]
  namedBanksLoadFailed: boolean
  workspace: PatchLibrarySnapshot
}

/** Downloads the workspace and the saved banks as one backup file, and remembers when. */
export function downloadWorkspaceBackup(source: BackupSource): WorkspaceBackupDownload {
  const now = new Date()
  const text = makeWorkspaceBackup(source.workspace, source.namedBanks, now.toISOString())
  downloadFile(new Blob([text], { type: 'application/json' }), makeWorkspaceBackupFilename(now))
  recordBackupTime(now.toISOString())
  trackAnalyticsEvent({ name: 'backup_downloaded' })
  if (source.namedBanksLoadFailed) return 'downloadedWithoutSavedBanks'
  return source.hasDamagedNamedBanks ? 'downloadedWithoutDamaged' : 'downloaded'
}

function damaged(message: string): never {
  throw new WorkspaceBackupError('damaged', message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Reads one voice and its effects. Voice data is checked as strictly as a `.syx` import: a byte
 * above seven bits means the file was spoiled, so it is refused rather than masked.
 */
function readSlot(value: unknown) {
  if (!isRecord(value)) return null
  const data = decodeBase64(value.voice)
  const effects = decodeBase64(value.effects)
  if (
    !data ||
    data.length !== dx7PackedVoiceSize ||
    !isSevenBitData(data) ||
    !effects ||
    effects.length !== fm1EffectParameterCount ||
    !Number.isInteger(value.slot) ||
    (value.slot as number) < 1 ||
    (value.slot as number) > dx7BankVoiceCount
  ) {
    return null
  }
  const voice = normalizeStoredDx7Voice({ data })
  return voice ? { effects: normalizeFm1Effects(effects), slot: value.slot as number, voice } : null
}

function readBankText(value: unknown, length: number, workspaceBanks: readonly string[]) {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, string] =>
          workspaceBanks.includes(entry[0]) && typeof entry[1] === 'string',
      )
      .map(([bank, text]) => [bank, text.trim().slice(0, length).trimEnd()])
      .filter(([, text]) => Boolean(text)),
  )
}

function readWorkspace(value: unknown): PatchLibrarySnapshot {
  if (!isRecord(value) || !Array.isArray(value.workspaceBanks) || !Array.isArray(value.slots)) {
    damaged('The backup has no readable workspace.')
  }
  const workspaceBanks = value.workspaceBanks
  if (
    workspaceBanks.length === 0 ||
    workspaceBanks.length > maximumWorkspaceBanks ||
    !workspaceBanks.every((bank) => typeof bank === 'string' && isWorkspaceBankId(bank)) ||
    new Set(workspaceBanks).size !== workspaceBanks.length
  ) {
    damaged('The backup has an invalid workspace bank list.')
  }
  const banks = workspaceBanks as string[]

  const voices: Record<string, Dx7Voice> = {}
  const effects: Record<string, Uint8Array> = {}
  for (const entry of value.slots) {
    const slot = readSlot(entry)
    const bank = isRecord(entry) ? entry.bank : undefined
    if (!slot || typeof bank !== 'string' || !banks.includes(bank)) {
      damaged('The backup contains an unreadable workspace patch.')
    }
    const id = voiceId(bank, slot.slot)
    if (voices[id]) damaged('The backup contains a workspace slot twice.')
    voices[id] = slot.voice
    effects[id] = slot.effects
  }

  const loadedBanks = Array.isArray(value.loadedBanks)
    ? banks.filter((bank) => (value.loadedBanks as unknown[]).includes(bank))
    : []

  return compactWorkspaceBanks({
    bankDescriptions: readBankText(value.bankDescriptions, bankDescriptionLength, banks),
    bankNames: readBankText(value.bankNames, workspaceBankTitleLength, banks),
    effects,
    loadedBanks,
    voices,
    workspaceBanks: banks,
  })
}

/** Reads one saved bank, or null when it is damaged and should be left out. */
function readSavedBank(value: unknown): NamedBank | null {
  if (!isRecord(value) || !Array.isArray(value.slots)) return null
  const slots = value.slots.map(readSlot)
  if (slots.some((slot) => !slot)) return null
  const bank = {
    createdAt: value.createdAt,
    description: value.description,
    id: value.id,
    name: value.name,
    slots,
    updatedAt: value.updatedAt,
    version: 1,
  }
  try {
    validateNamedBank(bank)
    return bank
  } catch {
    return null
  }
}

/**
 * Reads a backup file's text. A workspace that cannot be read refuses the whole file, because a
 * restore replaces the workspace; a damaged saved bank is left out and counted, as the saved-bank
 * list does in browser storage.
 */
export function parseWorkspaceBackup(text: string): WorkspaceBackup {
  let file: unknown
  try {
    file = JSON.parse(text)
  } catch {
    throw new WorkspaceBackupError('format', 'The file is not a backup.')
  }
  if (!isRecord(file) || file.format !== workspaceBackupFormat) {
    throw new WorkspaceBackupError('format', 'The file is not a backup.')
  }
  if (typeof file.version !== 'number' || !Number.isInteger(file.version) || file.version < 1) {
    damaged('The backup has no readable version.')
  }
  if (file.version > workspaceBackupVersion) {
    throw new WorkspaceBackupError('newer', 'The backup was made by a newer release.')
  }
  if (typeof file.savedAt !== 'string' || Number.isNaN(Date.parse(file.savedAt))) {
    damaged('The backup has no readable date.')
  }

  const workspace = readWorkspace(file.workspace)
  const savedBanks: NamedBank[] = []
  let damagedSavedBankCount = 0
  for (const entry of Array.isArray(file.savedBanks) ? file.savedBanks : []) {
    const bank = readSavedBank(entry)
    if (!bank) damagedSavedBankCount += 1
    // A bank listed twice is kept once, as the first copy.
    else if (!savedBanks.some(({ id }) => id === bank.id)) savedBanks.push(bank)
  }

  return { damagedSavedBankCount, savedAt: file.savedAt, savedBanks, workspace }
}

/**
 * Reads a backup file the user chose. A file too large to be a backup is refused before it is
 * loaded, so picking a large file by mistake does not read all of it into memory.
 */
export async function readWorkspaceBackupFile(file: Blob) {
  if (file.size > maximumWorkspaceBackupFileSize) {
    throw new WorkspaceBackupError('size', 'The file is too large to be a backup.')
  }
  return parseWorkspaceBackup(await file.text())
}
