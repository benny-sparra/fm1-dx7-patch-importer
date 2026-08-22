import { type Dx7Voice } from '@/lib/dx7'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import { type NamedBank, validateNamedBank } from '@/lib/named-bank'
import {
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
  loadedBanks: string[]
  savedAt: string
  version: 5
  voices: Record<string, Dx7Voice>
  workspaceBanks: string[]
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
    const fail = (message: string) => {
      if (finished) return
      finished = true
      reject(new PatchLibraryStorageError('unavailable', message, request.error))
    }
    request.onerror = () => fail('Browser storage could not be opened.')
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

export async function loadStoredPatchLibrary() {
  let stored:
    | StoredPatchLibrary
    | (Omit<StoredPatchLibrary, 'bankDescriptions' | 'version'> & { version: 4 })
    | (Omit<StoredPatchLibrary, 'bankDescriptions' | 'workspaceBanks' | 'version'> & { version: 3 })
    | (Omit<StoredPatchLibrary, 'bankDescriptions' | 'bankNames' | 'workspaceBanks' | 'version'> & {
        version: 2
      })
    | (Omit<
        StoredPatchLibrary,
        'bankDescriptions' | 'bankNames' | 'effects' | 'workspaceBanks' | 'version'
      > & { version: 1 })
    | undefined
  try {
    stored = await runTransaction(workspaceStoreName, 'readonly', (store) => store.get(recordKey))
  } catch (error) {
    if (error instanceof PatchLibraryStorageError) throw error
    throw new PatchLibraryStorageError(
      'read-failed',
      'The saved workspace could not be read.',
      error,
    )
  }

  if (!stored) return null
  if (
    (stored.version !== 1 &&
      stored.version !== 2 &&
      stored.version !== 3 &&
      stored.version !== 4 &&
      stored.version !== 5) ||
    !Array.isArray(stored.loadedBanks) ||
    typeof stored.voices !== 'object' ||
    ((stored.version === 4 || stored.version === 5) && !Array.isArray(stored.workspaceBanks))
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
      (stored.version === 3 || stored.version === 4 || stored.version === 5) &&
      stored.bankNames &&
      typeof stored.bankNames === 'object'
        ? stored.bankNames
        : {}
    const storedBankDescriptions =
      stored.version === 5 && stored.bankDescriptions && typeof stored.bankDescriptions === 'object'
        ? stored.bankDescriptions
        : {}
    const workspaceBanks =
      stored.version === 4 || stored.version === 5
        ? [...new Set(stored.workspaceBanks.filter(isWorkspaceBankId))]
        : [...browserBanks]
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
          .map(([bank, description]) => [bank, description.trim().slice(0, 500).trimEnd()])
          .filter(([, description]) => Boolean(description)),
      ),
      bankNames: Object.fromEntries(
        Object.entries(storedBankNames)
          .filter(([bank, name]) => workspaceBanks.includes(bank) && typeof name === 'string')
          .map(([bank, name]) => [bank, name.trim().slice(0, workspaceBankTitleLength).trimEnd()])
          .filter(([, name]) => Boolean(name)),
      ),
      effects: Object.fromEntries(
        Object.keys(stored.voices).map((id) => [id, normalizeFm1Effects(storedEffects[id])]),
      ),
      loadedBanks: stored.loadedBanks.filter((bank) => workspaceBanks.includes(bank)),
      voices: stored.voices,
      workspaceBanks,
    })
    return { ...compacted, savedAt: stored.savedAt, version: 5 as const }
  } catch (error) {
    if (error instanceof PatchLibraryStorageError) throw error
    throw new PatchLibraryStorageError(
      'incompatible',
      'The saved patch library is incompatible or damaged.',
      error,
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
          version: 5,
        } satisfies StoredPatchLibrary,
        recordKey,
      ),
    )
  } catch (error) {
    if (error instanceof PatchLibraryStorageError) throw error
    throw new PatchLibraryStorageError('write-failed', 'The workspace could not be saved.', error)
  }
}

export async function listStoredNamedBanks() {
  const banks = await runTransaction<NamedBank[]>(namedBankStoreName, 'readonly', (store) =>
    store.getAll(),
  )
  banks.forEach(validateNamedBank)
  return banks.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export async function saveStoredNamedBank(bank: NamedBank) {
  validateNamedBank(bank)
  return runTransaction<IDBValidKey>(namedBankStoreName, 'readwrite', (store) => store.put(bank))
}

export function deleteStoredNamedBank(id: string) {
  if (!id) return Promise.reject(new Error('A saved bank ID is required.'))
  return runTransaction<undefined>(namedBankStoreName, 'readwrite', (store) => store.delete(id))
}
