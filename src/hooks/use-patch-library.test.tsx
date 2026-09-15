// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createNamedBank } from '@/lib/named-bank'
import {
  emptyPatchLibrary,
  importVoices,
  makeDemoVoices,
  WorkspaceBankUnavailableError,
} from '@/lib/patch-library'

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

  it('asks before leaving once a session-only workspace has been edited', async () => {
    storage.loadStoredPatchLibrary.mockRejectedValue(new Error('Storage unavailable'))
    const hook = renderHook(() => usePatchLibrary())
    await waitFor(() => expect(hook.result.current.persistenceStatus).toBe('load-error'))
    act(() => hook.result.current.continueWithoutWorkspaceSaving())
    await waitFor(() => expect(hook.result.current.persistenceStatus).toBe('session-only'))

    const untouched = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(untouched)
    expect(untouched.defaultPrevented).toBe(false)

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
    expect(hook.result.current.namedBanksLoadFailed).toBe(false)
  })

  it('saves a named bank from a change made earlier in the same event', async () => {
    storage.saveStoredNamedBank.mockResolvedValue('bank-1')
    const hook = await renderLoadedLibrary()
    let saving: Promise<unknown> | undefined

    act(() => {
      hook.result.current.loadDemoBank('A')
      saving = hook.result.current.saveNamedBank('A', 'Demo bank', '')
    })

    await act(async () => {
      await expect(saving).resolves.toMatchObject({ name: 'Demo bank' })
    })
    expect(storage.saveStoredNamedBank).toHaveBeenCalledOnce()
  })
})

describe('usePatchLibrary changes', () => {
  it('lets the caller catch a change that fails and leaves the workspace unchanged', async () => {
    const hook = await renderLoadedLibrary()
    const banksBefore = hook.result.current.workspaceBanks
    let caught: unknown

    act(() => {
      try {
        hook.result.current.addBank('Z', 'Stage', '', makeDemoVoices())
      } catch (error) {
        caught = error
      }
    })

    expect(caught).toBeInstanceOf(WorkspaceBankUnavailableError)
    expect(hook.result.current.workspaceBanks).toEqual(banksBefore)
    expect(hook.result.current.canUndo).toBe(false)
  })

  it('builds back-to-back changes in one event on top of each other', async () => {
    const hook = await renderLoadedLibrary()

    act(() => {
      hook.result.current.renameBank('A', 'Stage')
      hook.result.current.renameBank('B', 'Studio')
    })

    expect(hook.result.current.bankNames).toEqual({ A: 'Stage', B: 'Studio' })
  })

  it('undoes and redoes back-to-back steps in order', async () => {
    const hook = await renderLoadedLibrary()
    act(() => hook.result.current.renameBank('A', 'Stage'))
    act(() => hook.result.current.renameBank('B', 'Studio'))

    act(() => {
      hook.result.current.undo()
      hook.result.current.undo()
    })
    expect(hook.result.current.bankNames).toEqual({})

    act(() => hook.result.current.redo())
    expect(hook.result.current.bankNames).toEqual({ A: 'Stage' })
  })
})

describe('usePatchLibrary undo from a notification', () => {
  it('undoes a change while it is still the latest', async () => {
    const hook = await renderLoadedLibrary()
    let changed: ReturnType<typeof hook.result.current.deleteBank> = null
    act(() => {
      changed = hook.result.current.deleteBank('B')
    })
    if (!changed) throw new Error('Expected the bank to be deleted.')
    const deleted = changed

    let undone = false
    act(() => {
      undone = hook.result.current.undoChange(deleted)
    })

    expect(undone).toBe(true)
    expect(hook.result.current.workspaceBanks).toEqual(['A', 'B', 'C', 'D'])
  })

  it('leaves a later change alone when an older notification’s Undo is chosen', async () => {
    const hook = await renderLoadedLibrary()
    let changed: ReturnType<typeof hook.result.current.deleteBank> = null
    act(() => {
      changed = hook.result.current.deleteBank('B')
    })
    if (!changed) throw new Error('Expected the bank to be deleted.')
    const deleted = changed
    act(() => hook.result.current.renameBank('A', 'Stage'))

    let undone = true
    act(() => {
      undone = hook.result.current.undoChange(deleted)
    })

    expect(undone).toBe(false)
    expect(hook.result.current.bankNames).toEqual({ A: 'Stage' })
    expect(hook.result.current.workspaceBanks).toEqual(['A', 'B', 'C'])
  })

  it('reports no change when a deletion does not happen', async () => {
    const hook = await renderLoadedLibrary()
    let changed: ReturnType<typeof hook.result.current.deleteBank> = null

    act(() => {
      changed = hook.result.current.deleteBank('Z')
    })

    expect(changed).toBeNull()
  })
})

describe('usePatchLibrary copying a voice', () => {
  it('copies a voice into another bank and reverses it in one undo', async () => {
    const voices = makeDemoVoices()
    storage.loadStoredPatchLibrary.mockResolvedValue({
      ...importVoices(importVoices(emptyPatchLibrary(), 'A', voices), 'B', voices.toReversed()),
      savedAt: '2026-09-13T12:00:00.000Z',
      version: 5,
    })
    const hook = await renderLoadedLibrary()
    const original = hook.result.current.voices['bank-B-3']

    let changed: ReturnType<typeof hook.result.current.copyVoice> = null
    act(() => {
      changed = hook.result.current.copyVoice('bank-A-1', 'B', 3)
    })
    expect(changed).not.toBeNull()
    expect(hook.result.current.voices['bank-B-3'].name).toBe(voices[0].name)

    act(() => hook.result.current.undo())

    expect(hook.result.current.voices['bank-B-3']).toBe(original)
    expect(hook.result.current.canUndo).toBe(false)
  })
})
