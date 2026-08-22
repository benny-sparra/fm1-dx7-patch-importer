import { afterEach, describe, expect, it, vi } from 'vitest'

import { createNamedBank } from '@/lib/named-bank'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import { emptyPatchLibrary, importVoices, makeDemoVoices } from '@/lib/patch-library'
import {
  loadStoredPatchLibrary,
  saveStoredNamedBank,
  saveStoredPatchLibrary,
} from '@/lib/patch-library-storage'

type FakeRequest<T> = {
  error: DOMException | null
  onerror: (() => void) | null
  onsuccess: (() => void) | null
  result: T
}

function makeRequest<T>(result: T): FakeRequest<T> {
  return { error: null, onerror: null, onsuccess: null, result }
}

function installIndexedDb(readResult?: unknown) {
  const writeRequest = makeRequest<IDBValidKey>('current')
  const readRequest = makeRequest(readResult)
  const put = vi.fn(() => writeRequest)
  const transaction = {
    error: null as DOMException | null,
    onabort: null as (() => void) | null,
    oncomplete: null as (() => void) | null,
    onerror: null as (() => void) | null,
    objectStore: () => ({ get: () => readRequest, put }),
  }
  const database = {
    close: vi.fn(),
    createObjectStore: vi.fn(),
    objectStoreNames: { contains: vi.fn(() => false) },
    transaction: vi.fn(() => transaction),
  }
  const openRequest = {
    ...makeRequest(database),
    onupgradeneeded: null as (() => void) | null,
  }

  const open = vi.fn(() => openRequest)
  vi.stubGlobal('indexedDB', { open })

  return { database, open, openRequest, put, readRequest, transaction, writeRequest }
}

async function openDatabase(openRequest: FakeRequest<unknown>) {
  openRequest.onsuccess?.()
  await Promise.resolve()
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('saveStoredPatchLibrary', () => {
  it('returns no workspace when IndexedDB has no saved record', async () => {
    const fake = installIndexedDb()
    const loading = loadStoredPatchLibrary()

    await openDatabase(fake.openRequest)
    fake.readRequest.onsuccess?.()
    fake.transaction.oncomplete?.()

    await expect(loading).resolves.toBeNull()
  })

  it('loads version 2 workspaces with untitled bank names', async () => {
    const fake = installIndexedDb({
      effects: {},
      loadedBanks: ['A'],
      savedAt: '2026-08-12T12:00:00.000Z',
      version: 2,
      voices: {},
    })
    const loading = loadStoredPatchLibrary()

    await openDatabase(fake.openRequest)
    fake.readRequest.onsuccess?.()
    fake.transaction.oncomplete?.()

    await expect(loading).resolves.toMatchObject({
      bankDescriptions: {},
      bankNames: {},
      version: 5,
      workspaceBanks: ['A', 'B', 'C', 'D'],
    })
  })

  it('restores added empty workspace banks from version 4 storage', async () => {
    const fake = installIndexedDb({
      bankNames: {},
      effects: {},
      loadedBanks: [],
      savedAt: '2026-08-17T08:00:00.000Z',
      version: 4,
      voices: {},
      workspaceBanks: ['A', 'B', 'C', 'D', 'E'],
    })
    const loading = loadStoredPatchLibrary()

    await openDatabase(fake.openRequest)
    fake.readRequest.onsuccess?.()
    fake.transaction.oncomplete?.()

    await expect(loading).resolves.toMatchObject({
      bankDescriptions: {},
      loadedBanks: [],
      version: 5,
      workspaceBanks: ['A', 'B', 'C', 'D', 'E'],
    })
  })

  it('restores normalized bank descriptions from version 5 storage', async () => {
    const fake = installIndexedDb({
      bankDescriptions: { A: '  Friday performance  ', Z: 'Missing bank' },
      bankNames: { A: 'Studio Favourites' },
      effects: {},
      loadedBanks: [],
      savedAt: '2026-08-17T08:00:00.000Z',
      version: 5,
      voices: {},
      workspaceBanks: ['A', 'B', 'C', 'D'],
    })
    const loading = loadStoredPatchLibrary()

    await openDatabase(fake.openRequest)
    fake.readRequest.onsuccess?.()
    fake.transaction.oncomplete?.()

    await expect(loading).resolves.toMatchObject({
      bankDescriptions: { A: 'Friday performance' },
      bankNames: { A: 'Studio Fav' },
      version: 5,
    })
  })

  it('classifies a malformed saved record as incompatible without changing it', async () => {
    const fake = installIndexedDb({
      bankDescriptions: {},
      bankNames: {},
      effects: {},
      loadedBanks: [],
      savedAt: '2026-08-17T08:00:00.000Z',
      version: 5,
      voices: null,
      workspaceBanks: ['A', 'B', 'C', 'D'],
    })
    const loading = loadStoredPatchLibrary()

    await openDatabase(fake.openRequest)
    fake.readRequest.onsuccess?.()
    fake.transaction.oncomplete?.()

    await expect(loading).rejects.toMatchObject({
      code: 'incompatible',
    })
    expect(fake.put).not.toHaveBeenCalled()
  })

  it('treats stored banks as authoritative and compacts legacy gaps', async () => {
    const shiftedVoice = { data: new Uint8Array(128), name: 'SHIFTED' }
    const shiftedEffects = makeDefaultFm1Effects()
    const fake = installIndexedDb({
      bankDescriptions: { C: 'Third bank' },
      bankNames: { C: 'Stage' },
      effects: { 'bank-C-1': shiftedEffects },
      loadedBanks: ['A', 'C'],
      savedAt: '2026-08-17T08:00:00.000Z',
      version: 5,
      voices: { 'bank-C-1': shiftedVoice },
      workspaceBanks: ['A', 'C'],
    })
    const loading = loadStoredPatchLibrary()

    await openDatabase(fake.openRequest)
    fake.readRequest.onsuccess?.()
    fake.transaction.oncomplete?.()

    await expect(loading).resolves.toMatchObject({
      bankDescriptions: { B: 'Third bank' },
      bankNames: { B: 'Stage' },
      loadedBanks: ['A', 'B'],
      workspaceBanks: ['A', 'B'],
    })
    const loaded = await loading
    expect(loaded?.voices['bank-B-1']).toEqual(shiftedVoice)
    expect(loaded?.effects['bank-B-1']).toEqual(shiftedEffects)
    expect(loaded?.voices['bank-C-1']).toBeUndefined()
  })

  it('upgrades the database without replacing the existing workspace store', async () => {
    const fake = installIndexedDb()
    fake.database.objectStoreNames.contains.mockReturnValueOnce(true).mockReturnValueOnce(false)
    const saving = saveStoredPatchLibrary(emptyPatchLibrary())

    fake.openRequest.onupgradeneeded?.()
    await openDatabase(fake.openRequest)
    fake.writeRequest.onsuccess?.()
    fake.transaction.oncomplete?.()
    await saving

    expect(fake.open).toHaveBeenCalledWith('fm1-librarian', 2)
    expect(fake.database.createObjectStore).toHaveBeenCalledOnce()
    expect(fake.database.createObjectStore).toHaveBeenCalledWith('named-banks', { keyPath: 'id' })
  })

  it('resolves only after the write transaction commits', async () => {
    const fake = installIndexedDb()
    const saving = saveStoredPatchLibrary(emptyPatchLibrary())
    let settled = false
    void saving.finally(() => {
      settled = true
    })

    await openDatabase(fake.openRequest)
    fake.writeRequest.onsuccess?.()
    await Promise.resolve()
    await Promise.resolve()

    expect(settled).toBe(false)

    fake.transaction.oncomplete?.()

    await expect(saving).resolves.toBe('current')
    expect(fake.put).toHaveBeenCalledWith(
      expect.objectContaining({
        bankDescriptions: {},
        bankNames: {},
        version: 5,
        workspaceBanks: ['A', 'B', 'C', 'D'],
      }),
      'current',
    )
    expect(fake.database.close).toHaveBeenCalledOnce()
  })

  it('rejects when the write transaction aborts after its request succeeds', async () => {
    const fake = installIndexedDb()
    const saving = saveStoredPatchLibrary(emptyPatchLibrary())

    await openDatabase(fake.openRequest)
    fake.writeRequest.onsuccess?.()
    fake.transaction.error = new DOMException('Write aborted', 'AbortError')
    fake.transaction.onabort?.()

    await expect(saving).rejects.toThrow('Write aborted')
    expect(fake.database.close).toHaveBeenCalledOnce()
  })

  it('rejects when the write transaction fails after its request succeeds', async () => {
    const fake = installIndexedDb()
    const saving = saveStoredPatchLibrary(emptyPatchLibrary())

    await openDatabase(fake.openRequest)
    fake.writeRequest.onsuccess?.()
    fake.transaction.error = new DOMException('Commit failed', 'UnknownError')
    fake.transaction.onerror?.()

    await expect(saving).rejects.toThrow('Commit failed')
    expect(fake.database.close).toHaveBeenCalledOnce()
  })

  it('commits named banks to their independent object store', async () => {
    const fake = installIndexedDb()
    const snapshot = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    const bank = createNamedBank(snapshot, 'A', {
      description: 'Local snapshot',
      id: 'bank-1',
      name: 'My bank',
      now: '2026-08-13T12:00:00.000Z',
    })
    const saving = saveStoredNamedBank(bank)

    await openDatabase(fake.openRequest)
    fake.writeRequest.onsuccess?.()
    fake.transaction.oncomplete?.()

    await expect(saving).resolves.toBe('current')
    expect(fake.database.transaction).toHaveBeenCalledWith('named-banks', 'readwrite')
    expect(fake.put).toHaveBeenCalledWith(bank)
  })
})
