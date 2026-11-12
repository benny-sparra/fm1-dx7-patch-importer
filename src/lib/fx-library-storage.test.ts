// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBDatabase as FakeDatabase } from 'fake-indexeddb'

import { createFxLibraryPreset } from '@/lib/fx-library-preset'
import {
  addStoredFxLibraryPreset,
  addStoredFxLibraryPresets,
  deleteStoredFxLibraryPreset,
  FxLibraryPresetConflictError,
  listStoredFxLibraryPresets,
  mergeStoredFxLibraryPresets,
  updateStoredFxLibraryPreset,
} from '@/lib/fx-library-storage'
import { installFakeIndexedDb } from '@/test/fake-indexed-db'

const now = '2026-10-30T12:00:00.000Z'

function preset(id: string, name = id) {
  return createFxLibraryPreset({ effects: new Uint8Array(24), id, name, now })
}

beforeEach(() => {
  installFakeIndexedDb()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('stored FX preset library', () => {
  it('requests strict durability before reporting a named FX preset as saved', async () => {
    const transactions = vi.spyOn(FakeDatabase.prototype, 'transaction')
    await addStoredFxLibraryPreset(preset('durable'))
    const writing = transactions.mock.results
      .map((result) => result.value)
      .find((item: IDBTransaction) => item.mode === 'readwrite')
    expect(writing.durability).toBe('strict')
  })

  it('starts empty and round-trips independent version 2 records', async () => {
    expect(await listStoredFxLibraryPresets()).toEqual({ damagedCount: 0, presets: [] })

    const source = preset('fx-1', 'First')
    await addStoredFxLibraryPreset(source)
    source.effects[0] = 1

    const loaded = await listStoredFxLibraryPresets()
    expect(loaded.damagedCount).toBe(0)
    expect(loaded.presets).toEqual([preset('fx-1', 'First')])
    expect(loaded.presets[0].effects).not.toBe(source.effects)
  })

  it('reads a version 1 record as an earlier release stored it, rewriting it only on a save', async () => {
    const stored = {
      createdAt: now,
      effects: new Uint8Array(24).fill(1),
      id: 'fx-old',
      name: 'Earlier',
      updatedAt: now,
      version: 1,
    }
    await listStoredFxLibraryPresets() // creates the database as the app does
    const database = await openRawDatabase()
    await transaction(database, 'readwrite', (store) => store.put(stored))
    database.close()

    const [loaded] = (await listStoredFxLibraryPresets()).presets
    expect(loaded).toEqual({ ...stored, version: 2 })
    expect(await readRaw('fx-old')).toEqual(stored)

    const saved = { ...loaded, order: [1, 0, 2, 3, 4, 5], updatedAt: '2026-11-11T12:00:00.000Z' }
    await updateStoredFxLibraryPreset(saved, loaded)
    expect(await readRaw('fx-old')).toEqual(saved)
  })

  it('round-trips a version 2 record with its effect order', async () => {
    const source = createFxLibraryPreset({
      effects: new Uint8Array(24),
      id: 'fx-ordered',
      name: 'Ordered',
      now,
      order: [5, 4, 3, 2, 1, 0],
    })
    await addStoredFxLibraryPreset(source)

    expect((await listStoredFxLibraryPresets()).presets).toEqual([source])
  })

  it('skips and reports a record a newer release wrote, leaving it stored', async () => {
    const newer = { ...preset('fx-new'), version: 3 }
    await listStoredFxLibraryPresets() // creates the database as the app does
    const database = await openRawDatabase()
    await transaction(database, 'readwrite', (store) => store.put(newer))
    database.close()

    expect(await listStoredFxLibraryPresets()).toEqual({ damagedCount: 1, presets: [] })
    expect(await readRaw('fx-new')).toEqual(newer)
  })

  it('skips and reports a damaged row without erasing or replacing it', async () => {
    await addStoredFxLibraryPreset(preset('damaged'))
    const database = await openRawDatabase()
    await transaction(database, 'readwrite', (store) =>
      store.put({ ...preset('damaged'), effects: new Uint8Array(23) }),
    )
    database.close()

    expect(await listStoredFxLibraryPresets()).toEqual({ damagedCount: 1, presets: [] })
    await expect(addStoredFxLibraryPreset(preset('damaged'))).rejects.toThrow(
      'FX preset transaction failed',
    )
    expect(await listStoredFxLibraryPresets()).toEqual({ damagedCount: 1, presets: [] })
  })

  it('updates and deletes only the record version the caller originally loaded', async () => {
    const original = preset('fx-1', 'Original')
    await addStoredFxLibraryPreset(original)
    const changedElsewhere = {
      ...original,
      name: 'Other tab',
      updatedAt: '2026-10-30T13:00:00.000Z',
    }
    await updateStoredFxLibraryPreset(changedElsewhere, original)

    const staleUpdate = { ...original, name: 'Stale', updatedAt: '2026-10-30T14:00:00.000Z' }
    await expect(updateStoredFxLibraryPreset(staleUpdate, original)).rejects.toBeInstanceOf(
      FxLibraryPresetConflictError,
    )
    await expect(deleteStoredFxLibraryPreset(original)).rejects.toBeInstanceOf(
      FxLibraryPresetConflictError,
    )
    expect((await listStoredFxLibraryPresets()).presets[0].name).toBe('Other tab')

    await deleteStoredFxLibraryPreset(changedElsewhere)
    expect((await listStoredFxLibraryPresets()).presets).toEqual([])
  })

  it('imports every preset in one transaction or none when one add fails', async () => {
    await addStoredFxLibraryPreset(preset('existing'))

    await expect(addStoredFxLibraryPresets([preset('new'), preset('existing')])).rejects.toThrow(
      'FX preset transaction failed',
    )

    expect((await listStoredFxLibraryPresets()).presets.map(({ id }) => id)).toEqual(['existing'])
  })

  it('merges restore records without overwriting an ID collision', async () => {
    const local = preset('same', 'Local')
    await addStoredFxLibraryPreset(local)

    const result = await mergeStoredFxLibraryPresets([
      local,
      preset('same', 'From backup'),
      preset('missing', 'New'),
    ])

    expect(result.kept).toBe(1)
    expect(result.added).toHaveLength(2)
    expect(result.added.find(({ name }) => name === 'From backup')?.id).not.toBe('same')
    expect((await listStoredFxLibraryPresets()).presets).toEqual(
      expect.arrayContaining([
        local,
        expect.objectContaining({ id: 'missing', name: 'New' }),
        expect.objectContaining({ name: 'From backup' }),
      ]),
    )
  })
})

async function readRaw(id: string) {
  const database = await openRawDatabase()
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const request = database.transaction('fx-presets').objectStore('fx-presets').get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed.'))
    })
  } finally {
    database.close()
  }
}

function openRawDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('fm1-librarian', 3)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'))
    request.onsuccess = () => resolve(request.result)
  })
}

function transaction(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest,
) {
  return new Promise<void>((resolve, reject) => {
    const pending = database.transaction('fx-presets', mode)
    operation(pending.objectStore('fx-presets'))
    pending.oncomplete = () => resolve()
    pending.onabort = () => reject(pending.error ?? new Error('IndexedDB transaction aborted.'))
    pending.onerror = () => reject(pending.error ?? new Error('IndexedDB transaction failed.'))
  })
}
