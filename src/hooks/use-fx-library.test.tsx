// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FxLibraryPresetConflictError, listStoredFxLibraryPresets } from '@/lib/fx-library-storage'
import { installFakeIndexedDb } from '@/test/fake-indexed-db'

import { useFxLibrary } from './use-fx-library'

const now = '2026-10-30T12:00:00.000Z'

beforeEach(() => {
  installFakeIndexedDb()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function openLibrary() {
  const hook = renderHook(() => useFxLibrary())
  await waitFor(() => expect(hook.result.current.status).toBe('ready'))
  return hook
}

describe('useFxLibrary', () => {
  it('saves an independent current-effects snapshot and keeps it across reopening', async () => {
    const hook = await openLibrary()
    const current = new Uint8Array(24)
    current[2] = 1

    await act(() => hook.result.current.save('  Stage  ', current))
    current[2] = 0

    expect(hook.result.current.presets[0]).toMatchObject({ name: 'Stage', version: 1 })
    expect(hook.result.current.presets[0].effects[2]).toBe(1)
    hook.unmount()

    const reopened = await openLibrary()
    expect(reopened.result.current.presets[0].effects[2]).toBe(1)
  })

  it('detects a stale update made by a second owner and reloads authoritative data', async () => {
    const first = await openLibrary()
    await act(() => first.result.current.save('Original', new Uint8Array(24)))
    const second = await openLibrary()
    const firstCopy = first.result.current.presets[0]
    const secondCopy = second.result.current.presets[0]

    await act(() => first.result.current.rename(firstCopy, 'First tab'))
    await act(async () => {
      await expect(second.result.current.rename(secondCopy, 'Second tab')).rejects.toBeInstanceOf(
        FxLibraryPresetConflictError,
      )
    })

    expect(second.result.current.presets[0].name).toBe('Original')
    await act(() => second.result.current.reload())
    expect(second.result.current.presets[0].name).toBe('First tab')
  })

  it('imports snapshots with fresh local identities without changing the input arrays', async () => {
    const hook = await openLibrary()
    const effects = new Uint8Array(24)
    effects[0] = 1

    await act(() => hook.result.current.importPresets([{ effects, name: 'Imported' }]))
    effects[0] = 0

    const stored = await listStoredFxLibraryPresets()
    expect(stored.presets).toHaveLength(1)
    expect(stored.presets[0].id).toBeTruthy()
    expect(stored.presets[0].effects[0]).toBe(1)
  })
})
