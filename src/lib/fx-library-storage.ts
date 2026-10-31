import {
  readStoredFxLibraryPreset,
  sameFxLibraryPreset,
  type FxLibraryPreset,
} from '@/lib/fx-library-preset'
import { createId } from '@/lib/id'
import {
  asStorageError,
  fxPresetStoreName,
  openDatabase,
  runTransaction,
} from '@/lib/patch-library-storage'

/** A named FX preset changed or disappeared after the caller loaded it. */
export class FxLibraryPresetConflictError extends Error {
  constructor() {
    super('The FX preset changed in another tab.')
    this.name = 'FxLibraryPresetConflictError'
  }
}

/**
 * Lists every readable named FX preset. An unreadable row remains in storage so a later release can
 * recover it, and is reported separately from an empty library.
 */
export async function listStoredFxLibraryPresets() {
  let records: unknown[]
  try {
    records = await runTransaction<unknown[]>(fxPresetStoreName, 'readonly', (store) =>
      store.getAll(),
    )
  } catch (error) {
    throw asStorageError(error, 'read-failed', 'The FX presets could not be read.')
  }

  const presets: FxLibraryPreset[] = []
  let damagedCount = 0
  for (const record of records) {
    try {
      presets.push(readStoredFxLibraryPreset(record))
    } catch {
      damagedCount += 1
    }
  }
  return { damagedCount, presets }
}

async function runFxPresetMutation<T>(
  operation: (
    store: IDBObjectStore,
    transaction: IDBTransaction,
    setResult: (value: T) => void,
    fail: (error: unknown) => void,
  ) => void,
) {
  const database = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    let transaction: IDBTransaction
    let result: T
    let operationError: unknown
    let finished = false
    const closeWithError = (error: unknown) => {
      if (finished) return
      finished = true
      database.close()
      reject(error instanceof Error ? error : new Error('FX preset transaction failed.'))
    }
    try {
      transaction = database.transaction(fxPresetStoreName, 'readwrite')
      const fail = (error: unknown) => {
        operationError = error
        transaction.abort()
      }
      operation(
        transaction.objectStore(fxPresetStoreName),
        transaction,
        (value) => {
          result = value
        },
        fail,
      )
    } catch (error) {
      database.close()
      reject(error instanceof Error ? error : new Error('FX preset transaction could not start.'))
      return
    }
    transaction.oncomplete = () => {
      if (finished) return
      finished = true
      database.close()
      resolve(result)
    }
    transaction.onabort = () =>
      closeWithError(
        operationError ?? transaction.error ?? new Error('FX preset transaction was aborted.'),
      )
    transaction.onerror = () => {
      if (operationError) return
      closeWithError(transaction.error ?? new Error('FX preset transaction failed.'))
    }
  })
}

function fxWriteError(error: unknown) {
  if (error instanceof FxLibraryPresetConflictError) return error
  return asStorageError(error, 'write-failed', 'The FX preset library could not be saved.')
}

export async function addStoredFxLibraryPreset(preset: FxLibraryPreset) {
  const record = readStoredFxLibraryPreset(preset)
  try {
    return await runFxPresetMutation<IDBValidKey>((store, _transaction, setResult) => {
      const request = store.add(record)
      request.onsuccess = () => setResult(request.result)
    })
  } catch (error) {
    throw fxWriteError(error)
  }
}

/** Adds a complete import in one transaction, so one failed row leaves every row untouched. */
export async function addStoredFxLibraryPresets(presets: readonly FxLibraryPreset[]) {
  const records = presets.map(readStoredFxLibraryPreset)
  try {
    return await runFxPresetMutation<number>((store, _transaction, setResult) => {
      records.forEach((record) => store.add(record))
      setResult(records.length)
    })
  } catch (error) {
    throw fxWriteError(error)
  }
}

/**
 * Merges a backup atomically. An identical ID/content pair is kept; a colliding ID with different
 * content is copied under a fresh ID, so restore never overwrites browser data.
 */
export async function mergeStoredFxLibraryPresets(presets: readonly FxLibraryPreset[]) {
  const incoming = presets.map(readStoredFxLibraryPreset)
  try {
    return await runFxPresetMutation<{ added: FxLibraryPreset[]; kept: number }>(
      (store, transaction, setResult, fail) => {
        const read = store.getAll()
        read.onsuccess = () => {
          const existing = new Map<string, FxLibraryPreset>()
          for (const value of read.result) {
            try {
              const preset = readStoredFxLibraryPreset(value)
              existing.set(preset.id, preset)
            } catch {
              if (typeof value === 'object' && value && 'id' in value) {
                existing.set(String(value.id), value as FxLibraryPreset)
              }
            }
          }
          const added: FxLibraryPreset[] = []
          let kept = 0
          for (const preset of incoming) {
            const collision = existing.get(preset.id)
            if (collision) {
              try {
                if (sameFxLibraryPreset(collision, preset)) {
                  kept += 1
                  continue
                }
              } catch {
                // A damaged row still owns its key and is never overwritten.
              }
              let id = createId()
              while (existing.has(id)) id = createId()
              const copy = { ...preset, effects: preset.effects.slice(), id }
              existing.set(id, copy)
              added.push(copy)
              store.add(copy)
            } else {
              existing.set(preset.id, preset)
              added.push(preset)
              store.add(preset)
            }
          }
          setResult({ added, kept })
        }
        read.onerror = () =>
          fail(read.error ?? transaction.error ?? new Error('FX presets could not be read.'))
      },
    )
  } catch (error) {
    throw fxWriteError(error)
  }
}

export async function updateStoredFxLibraryPreset(
  preset: FxLibraryPreset,
  expected: FxLibraryPreset,
) {
  const record = readStoredFxLibraryPreset(preset)
  const original = readStoredFxLibraryPreset(expected)
  if (record.id !== original.id) throw new Error('An FX preset update cannot change its ID.')
  try {
    return await runFxPresetMutation<IDBValidKey>((store, transaction, setResult, fail) => {
      const read = store.get(record.id)
      read.onsuccess = () => {
        let current: FxLibraryPreset
        try {
          current = readStoredFxLibraryPreset(read.result)
        } catch {
          fail(new FxLibraryPresetConflictError())
          return
        }
        if (!sameFxLibraryPreset(current, original)) {
          fail(new FxLibraryPresetConflictError())
          return
        }
        const write = store.put(record)
        write.onsuccess = () => setResult(write.result)
      }
      read.onerror = () => {
        fail(read.error ?? transaction.error ?? new Error('The FX preset could not be read.'))
      }
    })
  } catch (error) {
    throw fxWriteError(error)
  }
}

export async function deleteStoredFxLibraryPreset(expected: FxLibraryPreset) {
  const original = readStoredFxLibraryPreset(expected)
  try {
    return await runFxPresetMutation<undefined>((store, transaction, setResult, fail) => {
      const read = store.get(original.id)
      read.onsuccess = () => {
        let current: FxLibraryPreset
        try {
          current = readStoredFxLibraryPreset(read.result)
        } catch {
          fail(new FxLibraryPresetConflictError())
          return
        }
        if (!sameFxLibraryPreset(current, original)) {
          fail(new FxLibraryPresetConflictError())
          return
        }
        const remove = store.delete(original.id)
        remove.onsuccess = () => setResult(undefined)
      }
      read.onerror = () => {
        fail(read.error ?? transaction.error ?? new Error('The FX preset could not be read.'))
      }
    })
  } catch (error) {
    throw fxWriteError(error)
  }
}
