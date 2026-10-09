import { normalizeStoredDx7Voice, type Dx7Voice } from '@/lib/dx7'
import { type Favourite, readFavourites } from '@/lib/favourites'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import { readFm1VaRecord } from '@/lib/fm1-va-record'
import { isFm1VaVirtualAnalogVoice } from '@/lib/fm1-va-virtual-analog'
import { type NamedBank, validateNamedBank } from '@/lib/named-bank'
import {
  bankDescriptionLength,
  browserBanks,
  compactWorkspaceBanks,
  isWorkspaceBankId,
  maximumWorkspaceBanks,
  workspaceBankTitleLength,
} from '@/lib/patch-library'

const databaseName = 'fm1-librarian'
const workspaceStoreName = 'library'
const namedBankStoreName = 'named-banks'
const recordKey = 'current'

export type PatchLibraryStorageErrorCode =
  'unavailable' | 'read-failed' | 'incompatible' | 'write-failed'

export class PatchLibraryStorageError extends Error {
  readonly code: PatchLibraryStorageErrorCode
  readonly technicalMessage: string

  constructor(code: PatchLibraryStorageErrorCode, message: string, cause?: unknown) {
    super(cause instanceof Error ? cause.message : message, { cause })
    this.name = 'PatchLibraryStorageError'
    this.code = code
    this.technicalMessage = cause instanceof Error ? `${cause.name}: ${cause.message}` : message
  }
}

export type StoredPatchLibrary = {
  bankDescriptions: Record<string, string>
  bankNames: Record<string, string>
  effects: Record<string, Uint8Array>
  favourites: Favourite[]
  loadedBanks: string[]
  /** FM-1+VA settings records by slot id, from version 7. Favourites carry their own. */
  records: Record<string, Uint8Array>
  savedAt: string
  version: 8
  /**
   * The voice bytes of each slot holding an FM-1+VA Virtual Analog preset, by slot id, from
   * version 8, kept exactly as read.
   */
  virtualAnalog: Record<string, Uint8Array>
  voices: Record<string, Dx7Voice>
  workspaceBanks: string[]
}

/** Reads the records a workspace stored, keeping only those of slots it still has a patch in. */
function readStoredRecords(value: unknown, filled: (id: string) => boolean) {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value).flatMap(([id, stored]) => {
      const record = filled(id) ? readFm1VaRecord(stored) : undefined
      return record ? [[id, record]] : []
    }),
  )
}

/**
 * Reads the Virtual Analog voices a workspace stored. They are kept exactly as read, so one that is
 * not seven-bit data of a voice's size cannot be put right, and makes the workspace unreadable
 * rather than being changed. A slot that also holds a DX7 voice keeps the DX7 voice.
 */
function readStoredVirtualAnalog(value: unknown, voices: Record<string, unknown>) {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value).flatMap(([id, stored]) => {
      if (!isFm1VaVirtualAnalogVoice(stored)) {
        throw new PatchLibraryStorageError(
          'incompatible',
          'The saved patch library contains an unreadable Virtual Analog preset.',
        )
      }
      return id in voices ? [] : [[id, stored]]
    }),
  )
}

function asStorageError(
  error: unknown,
  code: PatchLibraryStorageErrorCode,
  message: string,
): PatchLibraryStorageError {
  if (error instanceof PatchLibraryStorageError) return error
  return new PatchLibraryStorageError(code, message, error)
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new PatchLibraryStorageError('unavailable', 'Browser storage is unavailable.'))
      return
    }

    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(databaseName, 2)
    } catch (error) {
      reject(
        new PatchLibraryStorageError('unavailable', 'Browser storage could not be opened.', error),
      )
      return
    }
    let finished = false
    const fail = (message: string, cause?: unknown) => {
      if (finished) return
      finished = true
      reject(new PatchLibraryStorageError('unavailable', message, cause))
    }
    request.onerror = () => fail('Browser storage could not be opened.', request.error)
    // The request is still pending while blocked, and reading its `error` then throws.
    request.onblocked = () => fail('Browser storage is blocked by another open tab.')
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(workspaceStoreName)) {
        request.result.createObjectStore(workspaceStoreName)
      }
      if (!request.result.objectStoreNames.contains(namedBankStoreName)) {
        request.result.createObjectStore(namedBankStoreName, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => {
      if (finished) {
        request.result.close()
        return
      }
      finished = true
      resolve(request.result)
    }
  })
}

async function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    let transaction: IDBTransaction
    let request: IDBRequest<T>
    try {
      transaction = database.transaction(storeName, mode)
      request = operation(transaction.objectStore(storeName))
    } catch (error) {
      database.close()
      reject(error instanceof Error ? error : new Error(String(error)))
      return
    }
    let finished = false
    let result: T

    const fail = (error: DOMException | null, fallback: string) => {
      if (finished) return
      finished = true
      database.close()
      reject(error ?? new Error(fallback))
    }

    request.onerror = () => fail(request.error, 'Browser storage operation failed.')
    request.onsuccess = () => {
      result = request.result
    }
    transaction.oncomplete = () => {
      if (finished) return
      finished = true
      database.close()
      resolve(result)
    }
    transaction.onabort = () => fail(transaction.error, 'Browser storage transaction was aborted.')
    transaction.onerror = () => fail(transaction.error, 'Browser storage transaction failed.')
  })
}

function normalizeStoredVoices(voices: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(voices).map(([id, value]) => {
      const voice = normalizeStoredDx7Voice(value)
      if (!voice) {
        throw new PatchLibraryStorageError(
          'incompatible',
          'The saved patch library contains an unreadable voice.',
        )
      }
      return [id, voice]
    }),
  )
}

export async function loadStoredPatchLibrary() {
  let stored:
    | StoredPatchLibrary
    | (Omit<StoredPatchLibrary, 'version' | 'virtualAnalog'> & { version: 7 })
    | (Omit<StoredPatchLibrary, 'records' | 'version' | 'virtualAnalog'> & { version: 6 })
    | (Omit<StoredPatchLibrary, 'favourites' | 'records' | 'version' | 'virtualAnalog'> & {
        version: 5
      })
    | (Omit<
        StoredPatchLibrary,
        'bankDescriptions' | 'favourites' | 'records' | 'version' | 'virtualAnalog'
      > & {
        version: 4
      })
    | (Omit<
        StoredPatchLibrary,
        | 'bankDescriptions'
        | 'favourites'
        | 'records'
        | 'workspaceBanks'
        | 'version'
        | 'virtualAnalog'
      > & { version: 3 })
    | (Omit<
        StoredPatchLibrary,
        | 'bankDescriptions'
        | 'bankNames'
        | 'favourites'
        | 'records'
        | 'workspaceBanks'
        | 'version'
        | 'virtualAnalog'
      > & {
        version: 2
      })
    | (Omit<
        StoredPatchLibrary,
        | 'bankDescriptions'
        | 'bankNames'
        | 'effects'
        | 'favourites'
        | 'records'
        | 'workspaceBanks'
        | 'version'
        | 'virtualAnalog'
      > & { version: 1 })
    | undefined
  try {
    stored = await runTransaction(workspaceStoreName, 'readonly', (store) => store.get(recordKey))
  } catch (error) {
    throw asStorageError(error, 'read-failed', 'The saved workspace could not be read.')
  }

  if (!stored) return null
  if (
    (stored.version !== 1 &&
      stored.version !== 2 &&
      stored.version !== 3 &&
      stored.version !== 4 &&
      stored.version !== 5 &&
      stored.version !== 6 &&
      stored.version !== 7 &&
      stored.version !== 8) ||
    !Array.isArray(stored.loadedBanks) ||
    typeof stored.voices !== 'object' ||
    ((stored.version === 4 ||
      stored.version === 5 ||
      stored.version === 6 ||
      stored.version === 7 ||
      stored.version === 8) &&
      !Array.isArray(stored.workspaceBanks))
  ) {
    throw new PatchLibraryStorageError(
      'incompatible',
      'The saved patch library is not compatible with this version.',
    )
  }

  try {
    const storedEffects =
      stored.version !== 1 && stored.effects && typeof stored.effects === 'object'
        ? stored.effects
        : {}
    const storedBankNames =
      (stored.version === 3 ||
        stored.version === 4 ||
        stored.version === 5 ||
        stored.version === 6 ||
        stored.version === 7 ||
        stored.version === 8) &&
      stored.bankNames &&
      typeof stored.bankNames === 'object'
        ? stored.bankNames
        : {}
    const storedBankDescriptions =
      (stored.version === 5 ||
        stored.version === 6 ||
        stored.version === 7 ||
        stored.version === 8) &&
      stored.bankDescriptions &&
      typeof stored.bankDescriptions === 'object'
        ? stored.bankDescriptions
        : {}
    const workspaceBanks =
      stored.version === 4 ||
      stored.version === 5 ||
      stored.version === 6 ||
      stored.version === 7 ||
      stored.version === 8
        ? [...new Set(stored.workspaceBanks.filter(isWorkspaceBankId))]
        : [...browserBanks]
    // Favourites arrived in version 6; earlier workspaces have none.
    const favourites =
      stored.version === 6 || stored.version === 7 || stored.version === 8
        ? readFavourites(stored.favourites)
        : []
    // Virtual Analog presets arrived in version 8, and records in version 7; earlier workspaces
    // have none.
    const storedVirtualAnalog =
      stored.version === 8 ? readStoredVirtualAnalog(stored.virtualAnalog, stored.voices) : {}
    const storedRecords =
      stored.version === 7 || stored.version === 8
        ? readStoredRecords(
            stored.records,
            (id) => id in stored.voices || id in storedVirtualAnalog,
          )
        : {}
    if (!favourites) {
      throw new PatchLibraryStorageError(
        'incompatible',
        'The saved patch library contains an unreadable favourite.',
      )
    }
    if (workspaceBanks.length === 0 || workspaceBanks.length > maximumWorkspaceBanks) {
      throw new PatchLibraryStorageError(
        'incompatible',
        'The saved patch library has an invalid workspace bank list.',
      )
    }

    const compacted = compactWorkspaceBanks({
      bankDescriptions: Object.fromEntries(
        Object.entries(storedBankDescriptions)
          .filter(
            ([bank, description]) =>
              workspaceBanks.includes(bank) && typeof description === 'string',
          )
          .map(([bank, description]) => [
            bank,
            description.trim().slice(0, bankDescriptionLength).trimEnd(),
          ])
          .filter(([, description]) => Boolean(description)),
      ),
      bankNames: Object.fromEntries(
        Object.entries(storedBankNames)
          .filter(([bank, name]) => workspaceBanks.includes(bank) && typeof name === 'string')
          .map(([bank, name]) => [bank, name.trim().slice(0, workspaceBankTitleLength).trimEnd()])
          .filter(([, name]) => Boolean(name)),
      ),
      effects: storedEffects,
      favourites,
      loadedBanks: stored.loadedBanks.filter((bank) => workspaceBanks.includes(bank)),
      records: storedRecords,
      virtualAnalog: storedVirtualAnalog,
      voices: stored.voices,
      workspaceBanks,
    })
    const voices = normalizeStoredVoices(compacted.voices)
    const effects = Object.fromEntries(
      [...Object.keys(voices), ...Object.keys(compacted.virtualAnalog)].map((id) => [
        id,
        normalizeFm1Effects(compacted.effects[id]),
      ]),
    )
    return { ...compacted, effects, savedAt: stored.savedAt, version: 8 as const, voices }
  } catch (error) {
    throw asStorageError(
      error,
      'incompatible',
      'The saved patch library is incompatible or damaged.',
    )
  }
}

export async function saveStoredPatchLibrary(
  library: Omit<StoredPatchLibrary, 'savedAt' | 'version'>,
) {
  try {
    return await runTransaction<IDBValidKey>(workspaceStoreName, 'readwrite', (store) =>
      store.put(
        {
          ...library,
          savedAt: new Date().toISOString(),
          version: 8,
        } satisfies StoredPatchLibrary,
        recordKey,
      ),
    )
  } catch (error) {
    throw asStorageError(error, 'write-failed', 'The workspace could not be saved.')
  }
}

/**
 * Lists every readable saved bank. A damaged record is counted rather than failing the whole list,
 * and it stays in storage unchanged so a later release can still recover it.
 */
export async function listStoredNamedBanks() {
  let records: unknown[]
  try {
    records = await runTransaction<unknown[]>(namedBankStoreName, 'readonly', (store) =>
      store.getAll(),
    )
  } catch (error) {
    throw asStorageError(error, 'read-failed', 'The saved banks could not be read.')
  }

  const banks: NamedBank[] = []
  let damagedCount = 0
  for (const record of records) {
    try {
      validateNamedBank(record)
      // Mask any voice byte above seven bits, as the workspace does, so a bank an earlier release
      // stored unmasked loads, sends, and backs up like any other. The record is a fresh copy.
      for (const slot of record.slots) {
        if ('voice' in slot) slot.voice = normalizeStoredDx7Voice(slot.voice) ?? slot.voice
      }
      banks.push(record)
    } catch {
      damagedCount += 1
    }
  }
  banks.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  return { banks, damagedCount }
}

export async function saveStoredNamedBank(bank: NamedBank) {
  validateNamedBank(bank)
  try {
    return await runTransaction<IDBValidKey>(namedBankStoreName, 'readwrite', (store) =>
      store.put(bank),
    )
  } catch (error) {
    throw asStorageError(error, 'write-failed', 'The bank could not be saved.')
  }
}

/**
 * Adds a saved bank only when no record has its id, so it can never overwrite one, including a
 * damaged record the saved-bank list hides. Returns whether it was added.
 */
export async function addStoredNamedBank(bank: NamedBank) {
  validateNamedBank(bank)
  try {
    await runTransaction<IDBValidKey>(namedBankStoreName, 'readwrite', (store) => store.add(bank))
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'ConstraintError') return false
    throw asStorageError(error, 'write-failed', 'The bank could not be saved.')
  }
}

export async function deleteStoredNamedBank(id: string) {
  if (!id) throw new Error('A saved bank ID is required.')
  try {
    return await runTransaction<undefined>(namedBankStoreName, 'readwrite', (store) =>
      store.delete(id),
    )
  } catch (error) {
    throw asStorageError(error, 'write-failed', 'The bank could not be deleted.')
  }
}
