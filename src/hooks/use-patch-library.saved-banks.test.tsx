// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { IDBObjectStore } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createNamedBank } from '@/lib/named-bank'
import { emptyPatchLibrary, importVoices, makeDemoVoices } from '@/lib/patch-library'
import { addStoredNamedBank, listStoredNamedBanks } from '@/lib/patch-library-storage'
import { installFakeIndexedDb } from '@/test/fake-indexed-db'

import { usePatchLibrary } from './use-patch-library'

// These tests run the hook against the real storage module on an in-memory IndexedDB, so a saved
// bank goes all the way to the object store and back. `use-patch-library.test.tsx` mocks storage.

function makeSavedBank(id: string, updatedAt: string) {
  return createNamedBank(importVoices(emptyPatchLibrary(), 'A', makeDemoVoices()), 'A', {
    description: '',
    id,
    name: `Saved ${id}`,
    now: updatedAt,
  })
}

async function storedBankIds() {
  const { banks } = await listStoredNamedBanks()
  return banks.map(({ id }) => id)
}

async function renderWithSavedBanks() {
  await addStoredNamedBank(makeSavedBank('older', '2026-09-01T10:00:00.000Z'))
  await addStoredNamedBank(makeSavedBank('newer', '2026-09-02T10:00:00.000Z'))
  const hook = renderHook(() => usePatchLibrary())
  await waitFor(() => expect(hook.result.current.namedBanksLoading).toBe(false))
  return hook
}

function listedBankIds(hook: Awaited<ReturnType<typeof renderWithSavedBanks>>) {
  return hook.result.current.namedBanks.map(({ id }) => id)
}

beforeEach(() => {
  installFakeIndexedDb()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('usePatchLibrary deleting a saved bank', () => {
  it('removes the bank from the saved-bank list', async () => {
    const hook = await renderWithSavedBanks()
    expect(listedBankIds(hook)).toEqual(['newer', 'older'])

    await act(() => hook.result.current.deleteNamedBank('newer'))

    expect(listedBankIds(hook)).toEqual(['older'])
  })

  it('removes the bank from browser storage, so it stays gone when the library opens again', async () => {
    const hook = await renderWithSavedBanks()

    await act(() => hook.result.current.deleteNamedBank('newer'))
    hook.unmount()
    const reopened = renderHook(() => usePatchLibrary())
    await waitFor(() => expect(reopened.result.current.namedBanksLoading).toBe(false))

    expect(reopened.result.current.namedBanks.map(({ id }) => id)).toEqual(['older'])
    expect(await storedBankIds()).toEqual(['older'])
  })

  it('reports a failed delete as a storage write failure and keeps the bank', async () => {
    const hook = await renderWithSavedBanks()
    const failingDelete = vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementation(() => {
      throw new DOMException('The quota was exceeded.', 'QuotaExceededError')
    })

    await act(async () => {
      await expect(hook.result.current.deleteNamedBank('newer')).rejects.toMatchObject({
        code: 'write-failed',
        name: 'PatchLibraryStorageError',
      })
    })

    expect(listedBankIds(hook)).toEqual(['newer', 'older'])
    failingDelete.mockRestore()
    expect(await storedBankIds()).toEqual(['newer', 'older'])
  })

  it('finishes deleting from storage when the library closes before the delete completes', async () => {
    const hook = await renderWithSavedBanks()

    const deleting = hook.result.current.deleteNamedBank('newer')
    hook.unmount()

    await expect(deleting).resolves.toBeUndefined()
    expect(await storedBankIds()).toEqual(['older'])
  })

  it('leaves the other saved banks alone when the bank is already gone', async () => {
    const hook = await renderWithSavedBanks()

    await act(() => hook.result.current.deleteNamedBank('missing'))

    expect(listedBankIds(hook)).toEqual(['newer', 'older'])
    expect(await storedBankIds()).toEqual(['newer', 'older'])
  })
})
