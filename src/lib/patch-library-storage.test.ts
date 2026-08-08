import { afterEach, describe, expect, it, vi } from 'vitest'

import { emptyPatchLibrary } from '@/lib/patch-library'
import { saveStoredPatchLibrary } from '@/lib/patch-library-storage'

type FakeRequest<T> = {
  error: DOMException | null
  onerror: (() => void) | null
  onsuccess: (() => void) | null
  result: T
}

function makeRequest<T>(result: T): FakeRequest<T> {
  return { error: null, onerror: null, onsuccess: null, result }
}

function installIndexedDb() {
  const writeRequest = makeRequest<IDBValidKey>('current')
  const transaction = {
    error: null as DOMException | null,
    onabort: null as (() => void) | null,
    oncomplete: null as (() => void) | null,
    onerror: null as (() => void) | null,
    objectStore: () => ({ put: () => writeRequest }),
  }
  const database = {
    close: vi.fn(),
    transaction: () => transaction,
  }
  const openRequest = {
    ...makeRequest(database),
    onupgradeneeded: null as (() => void) | null,
  }

  vi.stubGlobal('indexedDB', {
    open: () => openRequest,
  })

  return { database, openRequest, transaction, writeRequest }
}

async function openDatabase(openRequest: FakeRequest<unknown>) {
  openRequest.onsuccess?.()
  await Promise.resolve()
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('saveStoredPatchLibrary', () => {
  it('resolves only after the write transaction commits', async () => {
    const fake = installIndexedDb()
    const saving = saveStoredPatchLibrary(emptyPatchLibrary())
    let settled = false
    void saving.finally(() => { settled = true })

    await openDatabase(fake.openRequest)
    fake.writeRequest.onsuccess?.()
    await Promise.resolve()
    await Promise.resolve()

    expect(settled).toBe(false)

    fake.transaction.oncomplete?.()

    await expect(saving).resolves.toBe('current')
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
})
