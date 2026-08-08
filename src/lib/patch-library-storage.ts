import { type Dx7Voice } from '@/lib/dx7'
import { normalizeFm1Effects } from '@/lib/fm1-effects'

const databaseName = 'fm1-librarian'
const storeName = 'library'
const recordKey = 'current'

export type StoredPatchLibrary = {
  effects: Record<string, Uint8Array>
  loadedBanks: string[]
  savedAt: string
  version: 2
  voices: Record<string, Dx7Voice>
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('Browser storage is unavailable.'))
      return
    }

    const request = indexedDB.open(databaseName, 1)
    request.onerror = () => reject(request.error ?? new Error('Could not open browser storage.'))
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName)
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    const request = operation(transaction.objectStore(storeName))
    let finished = false
    let result: T

    const fail = (error: DOMException | null, fallback: string) => {
      if (finished) return
      finished = true
      database.close()
      reject(error ?? new Error(fallback))
    }

    request.onerror = () => fail(request.error, 'Browser storage operation failed.')
    request.onsuccess = () => { result = request.result }
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
  const stored = await runTransaction<
    | StoredPatchLibrary
    | (Omit<StoredPatchLibrary, 'effects' | 'version'> & { version: 1 })
    | undefined
  >(
    'readonly',
    (store) => store.get(recordKey),
  )

  if (!stored) return null
  if (
    (stored.version !== 1 && stored.version !== 2)
    || !Array.isArray(stored.loadedBanks)
    || typeof stored.voices !== 'object'
  ) {
    throw new Error('The saved patch library is not compatible with this version.')
  }

  const storedEffects = stored.version === 2 && typeof stored.effects === 'object'
    ? stored.effects
    : {}

  return {
    effects: Object.fromEntries(
      Object.keys(stored.voices).map((id) => [id, normalizeFm1Effects(storedEffects[id])]),
    ),
    loadedBanks: stored.loadedBanks,
    savedAt: stored.savedAt,
    version: 2 as const,
    voices: stored.voices,
  }
}

export function saveStoredPatchLibrary(
  library: Omit<StoredPatchLibrary, 'savedAt' | 'version'>,
) {
  return runTransaction<IDBValidKey>(
    'readwrite',
    (store) => store.put({
      ...library,
      savedAt: new Date().toISOString(),
      version: 2,
    } satisfies StoredPatchLibrary, recordKey),
  )
}
