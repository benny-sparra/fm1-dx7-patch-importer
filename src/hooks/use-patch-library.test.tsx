// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createNamedBank } from '@/lib/named-bank'
import { emptyPatchLibrary, importVoices, makeDemoVoices } from '@/lib/patch-library'

import { usePatchLibrary } from './use-patch-library'

const storage = vi.hoisted(() => ({
  deleteStoredNamedBank: vi.fn(),
  listStoredNamedBanks: vi.fn(),
  loadStoredPatchLibrary: vi.fn(),
  PatchLibraryStorageError: class PatchLibraryStorageError extends Error {},
  saveStoredNamedBank: vi.fn(),
  saveStoredPatchLibrary: vi.fn(),
}))

vi.mock('@/lib/patch-library-storage', () => storage)

beforeEach(() => {
  storage.loadStoredPatchLibrary.mockResolvedValue({
    ...emptyPatchLibrary(),
    savedAt: '2026-09-13T12:00:00.000Z',
    version: 5,
  })
  storage.listStoredNamedBanks.mockResolvedValue({ banks: [], damagedCount: 0 })
  storage.saveStoredPatchLibrary.mockResolvedValue('current')
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
})

async function renderLoadedLibrary() {
  const hook = renderHook(() => usePatchLibrary())
  await waitFor(() => expect(hook.result.current.persistenceStatus).toBe('ready'))
  return hook
}

describe('usePatchLibrary page lifecycle', () => {
  it('saves an edit waiting for autosave when the page is hidden', async () => {
    const hook = await renderLoadedLibrary()
    act(() => hook.result.current.renameBank('A', 'Stage'))
    expect(storage.saveStoredPatchLibrary).not.toHaveBeenCalled()

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(storage.saveStoredPatchLibrary).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ bankNames: { A: 'Stage' } }),
    )
  })

  it('saves an edit waiting for autosave when the page is unloaded', async () => {
    const hook = await renderLoadedLibrary()
    act(() => hook.result.current.renameBank('A', 'Stage'))

    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })

    expect(storage.saveStoredPatchLibrary).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ bankNames: { A: 'Stage' } }),
    )
  })

  it('does not write when the page is hidden with nothing waiting to save', async () => {
    await renderLoadedLibrary()

    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })

    expect(storage.saveStoredPatchLibrary).not.toHaveBeenCalled()
  })

  it('asks before leaving while an edit has not been saved', async () => {
    const hook = await renderLoadedLibrary()
    act(() => hook.result.current.renameBank('A', 'Stage'))

    const leaving = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(leaving)

    expect(leaving.defaultPrevented).toBe(true)
  })
})

describe('usePatchLibrary saved banks', () => {
  it('lists readable saved banks and reports that others are damaged', async () => {
    const bank = createNamedBank(importVoices(emptyPatchLibrary(), 'A', makeDemoVoices()), 'A', {
      description: '',
      id: 'bank-1',
      name: 'Readable',
      now: '2026-09-13T12:00:00.000Z',
    })
    storage.listStoredNamedBanks.mockResolvedValue({ banks: [bank], damagedCount: 1 })

    const hook = renderHook(() => usePatchLibrary())

    await waitFor(() => expect(hook.result.current.namedBanksLoading).toBe(false))
    expect(hook.result.current.namedBanks).toEqual([bank])
    expect(hook.result.current.hasDamagedNamedBanks).toBe(true)
    expect(hook.result.current.namedBanksError).toBe('')
  })
})
