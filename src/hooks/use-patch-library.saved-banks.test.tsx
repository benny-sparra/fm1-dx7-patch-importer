// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { IDBObjectStore } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createNamedBank } from '@/lib/named-bank'
import { emptyPatchLibrary, importVoices, makeDemoVoices } from '@/lib/patch-library'
import {
  addStoredNamedBank,
  listStoredNamedBanks,
  saveStoredPatchLibrary,
} from '@/lib/patch-library-storage'
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

async function storedBanks() {
  const { banks } = await listStoredNamedBanks()
  return banks
}

async function storedBankIds() {
  return (await storedBanks()).map(({ id }) => id)
}

async function renderWithSavedBanks() {
  // A stored workspace keeps the hook from autosaving a new factory one while a test runs, so the
  // only writes are the saved-bank changes under test.
  await saveStoredPatchLibrary(emptyPatchLibrary())
  await addStoredNamedBank(makeSavedBank('older', '2026-09-01T10:00:00.000Z'))
  await addStoredNamedBank(makeSavedBank('newer', '2026-09-02T10:00:00.000Z'))
  const hook = renderHook(() => usePatchLibrary())
  await waitFor(() => expect(hook.result.current.namedBanksLoading).toBe(false))
  return hook
}

function listedBankIds(hook: Awaited<ReturnType<typeof renderWithSavedBanks>>) {
  return hook.result.current.namedBanks.map(({ id }) => id)
}

function listedBank(hook: Awaited<ReturnType<typeof renderWithSavedBanks>>, id: string) {
  const bank = hook.result.current.namedBanks.find((candidate) => candidate.id === id)
  if (!bank) throw new Error(`Saved bank ${id} is not listed.`)
  return bank
}

/** Makes every write to IndexedDB fail, as a full disk does, until the returned spy is restored. */
function failStorageWrites() {
  return vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
    throw new DOMException('The quota was exceeded.', 'QuotaExceededError')
  })
}

const now = '2026-09-10T12:00:00.000Z'

beforeEach(() => {
  installFakeIndexedDb()
  // Only the clock is fixed; IndexedDB and waitFor keep their real timers.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
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

describe('usePatchLibrary renaming a saved bank', () => {
  it('lists the new details and moves the bank to the top as the latest change', async () => {
    const hook = await renderWithSavedBanks()

    await act(() =>
      hook.result.current.updateNamedBankDetails(listedBank(hook, 'older'), 'Stage', 'For the gig'),
    )

    expect(listedBankIds(hook)).toEqual(['older', 'newer'])
    expect(listedBank(hook, 'older')).toMatchObject({
      description: 'For the gig',
      name: 'Stage',
      updatedAt: now,
    })
  })

  it('stores the new details, so they are kept when the library opens again', async () => {
    const hook = await renderWithSavedBanks()

    await act(() =>
      hook.result.current.updateNamedBankDetails(listedBank(hook, 'older'), 'Stage', 'For the gig'),
    )
    hook.unmount()
    const reopened = renderHook(() => usePatchLibrary())
    await waitFor(() => expect(reopened.result.current.namedBanksLoading).toBe(false))

    expect(reopened.result.current.namedBanks[0]).toMatchObject({
      description: 'For the gig',
      id: 'older',
      name: 'Stage',
    })
  })

  it('keeps the old details listed and stored when the rename cannot be saved', async () => {
    const hook = await renderWithSavedBanks()
    const failingWrites = failStorageWrites()

    await act(async () => {
      await expect(
        hook.result.current.updateNamedBankDetails(listedBank(hook, 'older'), 'Stage', ''),
      ).rejects.toMatchObject({ code: 'write-failed', name: 'PatchLibraryStorageError' })
    })

    expect(listedBankIds(hook)).toEqual(['newer', 'older'])
    expect(listedBank(hook, 'older').name).toBe('Saved older')
    failingWrites.mockRestore()
    expect((await storedBanks()).map(({ name }) => name)).toEqual(['Saved newer', 'Saved older'])
  })

  it('finishes storing the rename when the library closes before it completes', async () => {
    const hook = await renderWithSavedBanks()

    const renaming = hook.result.current.updateNamedBankDetails(
      listedBank(hook, 'older'),
      'Stage',
      '',
    )
    hook.unmount()

    await expect(renaming).resolves.toMatchObject({ id: 'older', name: 'Stage' })
    expect((await storedBanks())[0]).toMatchObject({ id: 'older', name: 'Stage' })
  })
})

describe('usePatchLibrary copying a saved bank', () => {
  it('lists the copy first under a new id, with the same patches', async () => {
    const hook = await renderWithSavedBanks()
    const original = listedBank(hook, 'older')

    let copy: Awaited<ReturnType<typeof hook.result.current.copyNamedBank>> | undefined
    await act(async () => {
      copy = await hook.result.current.copyNamedBank(original)
    })

    expect(copy?.id).not.toMatch(/^(older|newer)$/)
    expect(listedBankIds(hook)).toEqual([copy?.id, 'newer', 'older'])
    expect(hook.result.current.namedBanks[0]).toMatchObject({
      createdAt: now,
      name: 'Saved older copy',
      slots: original.slots,
      updatedAt: now,
    })
  })

  it('stores the copy beside the original, so both are kept when the library opens again', async () => {
    const hook = await renderWithSavedBanks()

    await act(() => hook.result.current.copyNamedBank(listedBank(hook, 'older')))
    hook.unmount()
    const reopened = renderHook(() => usePatchLibrary())
    await waitFor(() => expect(reopened.result.current.namedBanksLoading).toBe(false))

    expect(reopened.result.current.namedBanks.map(({ name }) => name)).toEqual([
      'Saved older copy',
      'Saved newer',
      'Saved older',
    ])
  })

  it('lists and stores no copy when it cannot be saved', async () => {
    const hook = await renderWithSavedBanks()
    const failingWrites = failStorageWrites()

    await act(async () => {
      await expect(
        hook.result.current.copyNamedBank(listedBank(hook, 'older')),
      ).rejects.toMatchObject({ code: 'write-failed', name: 'PatchLibraryStorageError' })
    })

    expect(listedBankIds(hook)).toEqual(['newer', 'older'])
    failingWrites.mockRestore()
    expect(await storedBankIds()).toEqual(['newer', 'older'])
  })

  it('finishes storing the copy when the library closes before it completes', async () => {
    const hook = await renderWithSavedBanks()

    const copying = hook.result.current.copyNamedBank(listedBank(hook, 'older'))
    hook.unmount()

    const copy = await copying
    expect(await storedBankIds()).toEqual([copy.id, 'newer', 'older'])
  })
})
