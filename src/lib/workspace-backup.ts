import { trackAnalyticsEvent } from '@/lib/analytics'
import { downloadFile } from '@/lib/download-file'
import {
  dx7BankVoiceCount,
  dx7PackedVoiceSize,
  isSevenBitData,
  normalizeStoredDx7Voice,
  type Dx7Voice,
} from '@/lib/dx7'
import { type Favourite, type FavouriteOrigin, readFavourites } from '@/lib/favourites'
import { fm1EffectParameterCount, normalizeFm1Effects } from '@/lib/fm1-effects'
import { isFm1VaEightBitVoice } from '@/lib/fm1-va-eight-bit'
import { isFm1VaVirtualAnalogVoice } from '@/lib/fm1-va-virtual-analog'
import { recordBackupTime } from '@/lib/last-backup'
import { type NamedBank, validateNamedBank } from '@/lib/named-bank'
import {
  bankDescriptionLength,
  compactWorkspaceBanks,
  fm1VaRecordSize,
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
export const workspaceBackupVersion = 5
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

type BackupFavouriteV2 = { effects: string; id: string; origin: FavouriteOrigin; voice: string }

/** Version 2 adds the favourites to the workspace. Everything else is as version 1 wrote it. */
type BackupFileV2 = Omit<BackupFileV1, 'version' | 'workspace'> & {
  version: 2
  workspace: BackupFileV1['workspace'] & { favourites: BackupFavouriteV2[] }
}

/** A sound's FM-1+VA settings record, in base64, from version 3. A sound without one has none. */
type BackupRecordV3 = { record?: string }

/**
 * Version 3 adds the FM-1+VA settings record to every slot and favourite that has one. Everything
 * else is as version 2 wrote it.
 */
type BackupFileV3 = Omit<BackupFileV2, 'savedBanks' | 'version' | 'workspace'> & {
  savedBanks: (Omit<BackupFileV1['savedBanks'][number], 'slots'> & {
    slots: (BackupSlotV1 & BackupRecordV3)[]
  })[]
  version: 3
  workspace: Omit<BackupFileV2['workspace'], 'favourites' | 'slots'> & {
    favourites: (BackupFavouriteV2 & BackupRecordV3)[]
    slots: (BackupSlotV1 & BackupRecordV3 & { bank: string })[]
  }
}

/** A slot holding a Virtual Analog preset, from version 4: its voice bytes and record in base64. */
type BackupVirtualAnalogSlotV4 = {
  effects: string
  record: string
  slot: number
  virtualAnalog: string
}

type BackupSlotV4 = (BackupSlotV1 & BackupRecordV3) | BackupVirtualAnalogSlotV4

/**
 * Version 4 lets a workspace or saved-bank slot hold a Virtual Analog preset in place of a DX7
 * voice. Everything else is as version 3 wrote it.
 */
type BackupFileV4 = Omit<BackupFileV3, 'savedBanks' | 'version' | 'workspace'> & {
  savedBanks: (Omit<BackupFileV3['savedBanks'][number], 'slots'> & { slots: BackupSlotV4[] })[]
  version: 4
  workspace: Omit<BackupFileV3['workspace'], 'slots'> & {
    slots: (BackupSlotV4 & { bank: string })[]
  }
}

/** A slot holding an 8-Bit preset, from version 5: its voice bytes and record in base64. */
type BackupEightBitSlotV5 = { effects: string; eightBit: string; record: string; slot: number }

type BackupSlotV5 = BackupSlotV4 | BackupEightBitSlotV5

/**
 * Version 5 lets a workspace or saved-bank slot hold an 8-Bit preset in place of a DX7 voice.
 * Everything else is as version 4 wrote it.
 */
type BackupFileV5 = Omit<BackupFileV4, 'savedBanks' | 'version' | 'workspace'> & {
  savedBanks: (Omit<BackupFileV4['savedBanks'][number], 'slots'> & { slots: BackupSlotV5[] })[]
  version: 5
  workspace: Omit<BackupFileV4['workspace'], 'slots'> & {
    slots: (BackupSlotV5 & { bank: string })[]
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

function encodeRecord(record: Uint8Array | undefined): BackupRecordV3 {
  return record ? { record: encodeBase64(record) } : {}
}

/** A slot's sound: a DX7 voice with its optional record, or a Virtual Analog or 8-Bit preset. */
type SlotSound = { effects?: Uint8Array } & (
  | { record?: Uint8Array; voice: Dx7Voice }
  | { record: Uint8Array; virtualAnalog: Uint8Array }
  | { eightBit: Uint8Array; record: Uint8Array }
)

function encodeSlot(sound: SlotSound, slot: number): BackupSlotV5 {
  const effects = encodeBase64(normalizeFm1Effects(sound.effects))
  if ('virtualAnalog' in sound) {
    return {
      effects,
      record: encodeBase64(sound.record),
      slot,
      virtualAnalog: encodeBase64(sound.virtualAnalog),
    }
  }
  if ('eightBit' in sound) {
    return {
      effects,
      eightBit: encodeBase64(sound.eightBit),
      record: encodeBase64(sound.record),
      slot,
    }
  }
  return { effects, ...encodeRecord(sound.record), slot, voice: encodeBase64(sound.voice.data) }
}

/**
 * Writes the workspace, with its favourites, records, and Virtual Analog and 8-Bit presets, and the
 * saved banks as a version 5 file.
 */
export function makeWorkspaceBackup(
  snapshot: PatchLibrarySnapshot,
  savedBanks: readonly NamedBank[],
  savedAt: string,
) {
  const slots = snapshot.workspaceBanks.flatMap((bank) =>
    Array.from({ length: dx7BankVoiceCount }, (_, index) => index + 1).flatMap((slot) => {
      const id = voiceId(bank, slot)
      const voice = snapshot.voices[id]
      const virtualAnalog = snapshot.virtualAnalog[id]
      const eightBit = snapshot.eightBit[id]
      const record = snapshot.records[id]
      const effects = snapshot.effects[id]
      if (voice) return [{ bank, ...encodeSlot({ effects, record, voice }, slot) }]
      if (virtualAnalog && record) {
        return [{ bank, ...encodeSlot({ effects, record, virtualAnalog }, slot) }]
      }
      if (eightBit && record) return [{ bank, ...encodeSlot({ effects, eightBit, record }, slot) }]
      return []
    }),
  )
  const file: BackupFileV5 = {
    format: workspaceBackupFormat,
    savedAt,
    savedBanks: savedBanks.map((bank) => ({
      createdAt: bank.createdAt,
      description: bank.description,
      id: bank.id,
      name: bank.name,
      slots: bank.slots.map((slot) => encodeSlot(slot, slot.slot)),
      updatedAt: bank.updatedAt,
    })),
    version: workspaceBackupVersion,
    workspace: {
      bankDescriptions: snapshot.bankDescriptions,
      bankNames: snapshot.bankNames,
      favourites: snapshot.favourites.map(({ effects, id, origin, record, voice }) => ({
        effects: encodeBase64(normalizeFm1Effects(effects)),
        id,
        origin,
        ...encodeRecord(record),
        voice: encodeBase64(voice.data),
      })),
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
 * Reads one voice, its effects, and, from version 3, its record, or in place of the voice a Virtual
 * Analog preset from version 4 or an 8-Bit preset from version 5. Voice data is checked as strictly as a `.syx` import: a
 * byte above seven bits means the file was spoiled, so it is refused rather than masked. A record
 * of the wrong size is refused the same way; a DX7 voice without one has none, while a Virtual
 * Analog or 8-Bit preset needs its record.
 */
function readSound(value: Record<string, unknown>, version: number): SlotSound | null {
  const effects = decodeBase64(value.effects)
  const record = version >= 3 && value.record !== undefined ? decodeBase64(value.record) : undefined
  if (version >= 4 && value.virtualAnalog !== undefined) {
    const virtualAnalog = decodeBase64(value.virtualAnalog)
    if (
      !isFm1VaVirtualAnalogVoice(virtualAnalog) ||
      !effects ||
      effects.length !== fm1EffectParameterCount ||
      !record ||
      record.length !== fm1VaRecordSize
    ) {
      return null
    }
    return { effects: normalizeFm1Effects(effects), record, virtualAnalog }
  }
  if (version >= 5 && value.eightBit !== undefined) {
    const eightBit = decodeBase64(value.eightBit)
    if (
      !isFm1VaEightBitVoice(eightBit) ||
      !effects ||
      effects.length !== fm1EffectParameterCount ||
      !record ||
      record.length !== fm1VaRecordSize
    ) {
      return null
    }
    return { effects: normalizeFm1Effects(effects), eightBit, record }
  }
  const data = decodeBase64(value.voice)
  if (
    !data ||
    data.length !== dx7PackedVoiceSize ||
    !isSevenBitData(data) ||
    !effects ||
    effects.length !== fm1EffectParameterCount ||
    record === null ||
    (record && record.length !== fm1VaRecordSize)
  ) {
    return null
  }
  const voice = normalizeStoredDx7Voice({ data })
  if (!voice) return null
  return { effects: normalizeFm1Effects(effects), ...(record ? { record } : {}), voice }
}

function readSlot(value: unknown, version: number): (SlotSound & { slot: number }) | null {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.slot) ||
    (value.slot as number) < 1 ||
    (value.slot as number) > dx7BankVoiceCount
  ) {
    return null
  }
  const sound = readSound(value, version)
  return sound ? { ...sound, slot: value.slot as number } : null
}

/** Reads the favourites a backup holds from version 2. An unreadable one damages the workspace. */
function readBackupFavourites(value: unknown, version: number): Favourite[] {
  if (!Array.isArray(value)) damaged('The backup has no readable favourites.')
  // A favourite is a DX7 voice; one holding anything else is unreadable.
  const decoded = value.map((entry) => {
    const sound = isRecord(entry) ? readSound(entry, version) : null
    return sound && 'voice' in sound && isRecord(entry) ? { ...entry, ...sound } : null
  })
  const favourites = readFavourites(decoded, (voice) => (voice ? (voice as Dx7Voice) : null))
  if (!favourites) damaged('The backup contains an unreadable favourite.')
  return favourites
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

function readWorkspace(value: unknown, version: number): PatchLibrarySnapshot {
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
  const virtualAnalog: Record<string, Uint8Array> = {}
  const eightBit: Record<string, Uint8Array> = {}
  const effects: Record<string, Uint8Array> = {}
  const records: Record<string, Uint8Array> = {}
  for (const entry of value.slots) {
    const slot = readSlot(entry, version)
    const bank = isRecord(entry) ? entry.bank : undefined
    if (!slot || typeof bank !== 'string' || !banks.includes(bank)) {
      damaged('The backup contains an unreadable workspace patch.')
    }
    const id = voiceId(bank, slot.slot)
    if (voices[id] || virtualAnalog[id] || eightBit[id]) {
      damaged('The backup contains a workspace slot twice.')
    }
    if ('voice' in slot) voices[id] = slot.voice
    else if ('virtualAnalog' in slot) virtualAnalog[id] = slot.virtualAnalog
    else eightBit[id] = slot.eightBit
    effects[id] = normalizeFm1Effects(slot.effects)
    if (slot.record) records[id] = slot.record
  }

  const loadedBanks = Array.isArray(value.loadedBanks)
    ? banks.filter((bank) => (value.loadedBanks as unknown[]).includes(bank))
    : []

  return compactWorkspaceBanks({
    bankDescriptions: readBankText(value.bankDescriptions, bankDescriptionLength, banks),
    bankNames: readBankText(value.bankNames, workspaceBankTitleLength, banks),
    effects,
    eightBit,
    // Favourites arrived in version 2; a version 1 backup has none.
    favourites: version >= 2 ? readBackupFavourites(value.favourites, version) : [],
    loadedBanks,
    // Records arrived in version 3, Virtual Analog presets in version 4, and 8-Bit presets in
    // version 5; earlier backups have none.
    records,
    virtualAnalog,
    voices,
    workspaceBanks: banks,
  })
}

/** Reads one saved bank, or null when it is damaged and should be left out. */
function readSavedBank(value: unknown, version: number): NamedBank | null {
  if (!isRecord(value) || !Array.isArray(value.slots)) return null
  const slots = value.slots.map((slot) => readSlot(slot, version))
  if (slots.some((slot) => !slot)) return null
  const bank = {
    createdAt: value.createdAt,
    description: value.description,
    id: value.id,
    name: value.name,
    slots,
    updatedAt: value.updatedAt,
    version: 4,
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

  const workspace = readWorkspace(file.workspace, file.version)
  const savedBanks: NamedBank[] = []
  let damagedSavedBankCount = 0
  for (const entry of Array.isArray(file.savedBanks) ? file.savedBanks : []) {
    const bank = readSavedBank(entry, file.version)
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
