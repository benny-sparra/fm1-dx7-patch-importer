import { afterEach, describe, expect, it, vi } from 'vitest'

import { createNamedBank } from '@/lib/named-bank'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import { emptyPatchLibrary, importVoices, makeDemoVoices } from '@/lib/patch-library'
import {
  addStoredNamedBank,
  listStoredNamedBanks,
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
  const add = vi.fn(() => writeRequest)
  const transaction = {
    error: null as DOMException | null,
    onabort: null as (() => void) | null,
    oncomplete: null as (() => void) | null,
    onerror: null as (() => void) | null,
    objectStore: () => ({ add, get: () => readRequest, getAll: () => readRequest, put }),
  }
  const database = {
    close: vi.fn(),
    createObjectStore: vi.fn(),
    objectStoreNames: { contains: vi.fn(() => false) },
    transaction: vi.fn(() => transaction),
  }
  const openRequest = {
    ...makeRequest(database),
    onblocked: null as (() => void) | null,
    onupgradeneeded: null as (() => void) | null,
  }

  const open = vi.fn(() => openRequest)
  vi.stubGlobal('indexedDB', { open })

  return { add, database, open, openRequest, put, readRequest, transaction, writeRequest }
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

  it('loads version 1 workspaces, which stored no effects, with default effects', async () => {
    const [voice] = makeDemoVoices()
    const fake = installIndexedDb({
      loadedBanks: ['A'],
      savedAt: '2026-07-01T12:00:00.000Z',
      version: 1,
      voices: { 'bank-A-1': voice },
    })
    const loading = loadStoredPatchLibrary()

    await openDatabase(fake.openRequest)
    fake.readRequest.onsuccess?.()
    fake.transaction.oncomplete?.()

    await expect(loading).resolves.toEqual({
      bankDescriptions: {},
      bankNames: {},
      effects: { 'bank-A-1': makeDefaultFm1Effects() },
      loadedBanks: ['A'],
      savedAt: '2026-07-01T12:00:00.000Z',
      version: 5,
      voices: { 'bank-A-1': voice },
      workspaceBanks: ['A', 'B', 'C', 'D'],
    })
    expect(fake.put).not.toHaveBeenCalled()
  })

  it('keeps bank names from version 3 workspaces and gives them the four standard banks', async () => {
    const fake = installIndexedDb({
      bankNames: { A: '  Pianos  ', B: 'Leads' },
      effects: {},
      loadedBanks: ['A', 'B'],
      savedAt: '2026-08-14T12:00:00.000Z',
      version: 3,
      voices: {},
    })
    const loading = loadStoredPatchLibrary()

    await openDatabase(fake.openRequest)
    fake.readRequest.onsuccess?.()
    fake.transaction.oncomplete?.()

    await expect(loading).resolves.toMatchObject({
      bankDescriptions: {},
      bankNames: { A: 'Pianos', B: 'Leads' },
      loadedBanks: ['A', 'B'],
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

describe('loadStoredPatchLibrary voice data', () => {
  function version5Record(voices: Record<string, unknown>) {
    return {
      bankDescriptions: {},
      bankNames: {},
      effects: {},
      loadedBanks: ['A'],
      savedAt: '2026-09-13T12:00:00.000Z',
      version: 5,
      voices,
      workspaceBanks: ['A', 'B', 'C', 'D'],
    }
  }

  async function loadRecord(record: unknown) {
    const fake = installIndexedDb(record)
    const loading = loadStoredPatchLibrary()
    await openDatabase(fake.openRequest)
    fake.readRequest.onsuccess?.()
    fake.transaction.oncomplete?.()
    return { fake, loading }
  }

  it('treats undefined voice slots left by earlier moves as empty', async () => {
    const [voice] = makeDemoVoices()
    const { loading } = await loadRecord(
      version5Record({ 'bank-A-1': voice, 'bank-A-2': undefined }),
    )

    const loaded = await loading
    expect(loaded?.voices).toEqual({ 'bank-A-1': voice })
    expect(Object.keys(loaded?.effects ?? {})).toEqual(['bank-A-1'])
  })

  it('masks stored voice bytes above seven bits', async () => {
    const [voice] = makeDemoVoices()
    const data = voice.data.slice()
    data[0] |= 0x80
    const { loading } = await loadRecord(version5Record({ 'bank-A-1': { data, name: voice.name } }))

    const loaded = await loading
    expect(loaded?.voices['bank-A-1']).toEqual(voice)
  })

  it('classifies an unreadable voice as incompatible without changing the record', async () => {
    const { fake, loading } = await loadRecord(
      version5Record({ 'bank-A-1': { data: new Uint8Array(100), name: 'SHORT' } }),
    )

    await expect(loading).rejects.toMatchObject({ code: 'incompatible' })
    expect(fake.put).not.toHaveBeenCalled()
  })
})

describe('addStoredNamedBank', () => {
  function makeBank() {
    const snapshot = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    return createNamedBank(snapshot, 'A', {
      description: '',
      id: 'bank-1',
      name: 'Backed up',
      now: '2026-09-21T12:00:00.000Z',
    })
  }

  it('adds a saved bank without replacing a record', async () => {
    const fake = installIndexedDb()
    const bank = makeBank()
    const adding = addStoredNamedBank(bank)

    await openDatabase(fake.openRequest)
    fake.writeRequest.onsuccess?.()
    fake.transaction.oncomplete?.()

    await expect(adding).resolves.toBe(true)
    expect(fake.add).toHaveBeenCalledWith(bank)
    expect(fake.put).not.toHaveBeenCalled()
  })

  it('reports a saved bank whose id is already stored as not added', async () => {
    const fake = installIndexedDb()
    const adding = addStoredNamedBank(makeBank())

    await openDatabase(fake.openRequest)
    fake.writeRequest.error = new DOMException('Key already exists.', 'ConstraintError')
    fake.writeRequest.onerror?.()

    await expect(adding).resolves.toBe(false)
  })

  it('reports any other failure as a write failure', async () => {
    const fake = installIndexedDb()
    const adding = addStoredNamedBank(makeBank())

    await openDatabase(fake.openRequest)
    fake.writeRequest.error = new DOMException('Quota exceeded.', 'QuotaExceededError')
    fake.writeRequest.onerror?.()

    await expect(adding).rejects.toMatchObject({ code: 'write-failed' })
  })
})

describe('listStoredNamedBanks', () => {
  it('lists readable saved banks newest first and counts damaged ones without changing them', async () => {
    const snapshot = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    const older = createNamedBank(snapshot, 'A', {
      description: '',
      id: 'older',
      name: 'Older',
      now: '2026-08-01T12:00:00.000Z',
    })
    const newer = createNamedBank(snapshot, 'A', {
      description: '',
      id: 'newer',
      name: 'Newer',
      now: '2026-09-01T12:00:00.000Z',
    })
    const damaged = { ...older, id: 'damaged', slots: older.slots.slice(1) }
    const fake = installIndexedDb([older, damaged, newer])
    const listing = listStoredNamedBanks()

    await openDatabase(fake.openRequest)
    fake.readRequest.onsuccess?.()
    fake.transaction.oncomplete?.()

    await expect(listing).resolves.toEqual({ banks: [newer, older], damagedCount: 1 })
    expect(fake.put).not.toHaveBeenCalled()
  })
})

// A workspace that cannot be opened must reject rather than resolve as missing: a missing workspace
// is replaced with factory patches and saved, which would overwrite the user's own.
describe('opening browser storage', () => {
  it('reports storage as unavailable when the browser has no IndexedDB', async () => {
    expect('indexedDB' in globalThis).toBe(false)

    await expect(loadStoredPatchLibrary()).rejects.toMatchObject({
      code: 'unavailable',
      technicalMessage: 'Browser storage is unavailable.',
    })
  })

  it('reports storage as unavailable when opening it throws', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new DOMException('Storage is disabled.', 'SecurityError')
      },
    })

    await expect(loadStoredPatchLibrary()).rejects.toMatchObject({
      code: 'unavailable',
      technicalMessage: 'SecurityError: Storage is disabled.',
    })
  })

  it('reports storage as unavailable when the open request fails', async () => {
    const fake = installIndexedDb()
    const loading = loadStoredPatchLibrary()

    fake.openRequest.error = new DOMException('The database is damaged.', 'UnknownError')
    fake.openRequest.onerror?.()

    await expect(loading).rejects.toMatchObject({
      code: 'unavailable',
      technicalMessage: 'UnknownError: The database is damaged.',
    })
    expect(fake.database.transaction).not.toHaveBeenCalled()
  })

  it('reports storage as unavailable while another tab blocks the upgrade', async () => {
    const fake = installIndexedDb()
    const loading = loadStoredPatchLibrary()

    fake.openRequest.onblocked?.()

    await expect(loading).rejects.toMatchObject({
      code: 'unavailable',
      technicalMessage: 'Browser storage is blocked by another open tab.',
    })
  })

  it('closes a database that opens after it was reported blocked, without reading it', async () => {
    const fake = installIndexedDb({ version: 5 })
    const loading = loadStoredPatchLibrary()

    fake.openRequest.onblocked?.()
    await openDatabase(fake.openRequest)

    await expect(loading).rejects.toMatchObject({ code: 'unavailable' })
    expect(fake.database.close).toHaveBeenCalledOnce()
    expect(fake.database.transaction).not.toHaveBeenCalled()
  })

  it('reports a save as unavailable, not as a failed write, when storage cannot be opened', async () => {
    const fake = installIndexedDb()
    const saving = saveStoredPatchLibrary(emptyPatchLibrary())

    fake.openRequest.onblocked?.()

    await expect(saving).rejects.toMatchObject({ code: 'unavailable' })
    expect(fake.put).not.toHaveBeenCalled()
  })

  it('closes the database and reports a read failure when a read cannot start', async () => {
    const fake = installIndexedDb()
    fake.database.transaction.mockImplementation(() => {
      throw new DOMException('The store is missing.', 'NotFoundError')
    })
    const loading = loadStoredPatchLibrary()

    await openDatabase(fake.openRequest)

    await expect(loading).rejects.toMatchObject({
      code: 'read-failed',
      technicalMessage: 'NotFoundError: The store is missing.',
    })
    expect(fake.database.close).toHaveBeenCalledOnce()
  })

  it('closes the database and reports a write failure when a write cannot start', async () => {
    const fake = installIndexedDb()
    fake.database.transaction.mockImplementation(() => {
      throw new DOMException('The store is missing.', 'NotFoundError')
    })
    const saving = saveStoredPatchLibrary(emptyPatchLibrary())

    await openDatabase(fake.openRequest)

    await expect(saving).rejects.toMatchObject({ code: 'write-failed' })
    expect(fake.database.close).toHaveBeenCalledOnce()
    expect(fake.put).not.toHaveBeenCalled()
  })
})
