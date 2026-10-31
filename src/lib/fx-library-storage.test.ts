// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
})

describe('stored FX preset library', () => {
  it('starts empty and round-trips independent version 1 records', async () => {
    expect(await listStoredFxLibraryPresets()).toEqual({ damagedCount: 0, presets: [] })

    const source = preset('fx-1', 'First')
    await addStoredFxLibraryPreset(source)
    source.effects[0] = 1

    const loaded = await listStoredFxLibraryPresets()
    expect(loaded.damagedCount).toBe(0)
    expect(loaded.presets).toEqual([preset('fx-1', 'First')])
    expect(loaded.presets[0].effects).not.toBe(source.effects)
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
