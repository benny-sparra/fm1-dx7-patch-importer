// @vitest-environment jsdom
import { cleanup, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import { setLocale } from '@/i18n'
import { createFxLibraryPreset } from '@/lib/fx-library-preset'
import {
  addStoredFxLibraryPreset,
  listStoredFxLibraryPresets,
  serializeFxMutation,
} from '@/lib/fx-library-storage'
import { installFakeIndexedDb } from '@/test/fake-indexed-db'
import { makeLibrarianLibrary } from '@/test/librarian-fakes'

import { useDownloadWorkspaceBackup } from './use-workspace-backup'

const downloads = vi.hoisted(() => ({ files: [] as Blob[] }))
const storage = vi.hoisted(() => ({ failList: false }))

vi.mock('@/lib/download-file', () => ({
  downloadFile: (blob: Blob) => downloads.files.push(blob),
}))
vi.mock('@/lib/fx-library-storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/fx-library-storage')>()
  return {
    ...original,
    listStoredFxLibraryPresets: () =>
      storage.failList
        ? Promise.reject(new Error('unreadable'))
        : original.listStoredFxLibraryPresets(),
  }
})

beforeAll(async () => {
  await setLocale('en-GB')
})

beforeEach(() => {
  downloads.files = []
  storage.failList = false
  installFakeIndexedDb()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const preset = createFxLibraryPreset({
  effects: new Uint8Array(24).fill(1),
  id: 'fx-1',
  name: 'Stage room',
  now: '2026-10-30T12:00:00.000Z',
})

function renderDownload(overrides: Parameters<typeof makeLibrarianLibrary>[0] = {}) {
  return renderHook(() => useDownloadWorkspaceBackup(makeLibrarianLibrary(overrides)), {
    wrapper: ToastProvider,
  })
}

async function backupFxIds() {
  const file = JSON.parse(await downloads.files[0].text()) as { fxPresets: { id: string }[] }
  return file.fxPresets.map(({ id }) => id)
}

describe('downloading a backup with FX presets', () => {
  it('waits for FX saves already started, so the file holds them', async () => {
    const { result } = renderDownload()
    void serializeFxMutation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      await addStoredFxLibraryPreset(preset)
    })

    await expect(result.current()).resolves.toBe(true)

    expect(await backupFxIds()).toEqual(['fx-1'])
  })

  it('still downloads everything else when the FX store cannot be read, and says so', async () => {
    storage.failList = true
    const { result } = renderDownload()

    await expect(result.current()).resolves.toBe(true)

    expect(await backupFxIds()).toEqual([])
    expect(
      await screen.findByText(
        'Downloading a backup. FX presets that could not be read are not in it.',
      ),
    ).toBeTruthy()
  })

  it('reports both when saved banks and FX presets are left out', async () => {
    storage.failList = true
    const { result } = renderDownload({ hasDamagedNamedBanks: true })

    await result.current()

    expect(
      await screen.findByText(
        'Downloading a backup. Saved banks and FX presets that could not be read are not in it.',
      ),
    ).toBeTruthy()
  })

  it('reports an FX preset left damaged in storage', async () => {
    await addStoredFxLibraryPreset(preset)
    const database = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('fm1-librarian')
      request.onsuccess = () => resolve(request.result)
    })
    await new Promise<void>((resolve) => {
      const write = database
        .transaction('fx-presets', 'readwrite')
        .objectStore('fx-presets')
        .put({ ...preset, effects: new Uint8Array(23) })
      write.onsuccess = () => resolve()
    })
    database.close()
    expect((await listStoredFxLibraryPresets()).damagedCount).toBe(1)
    const { result } = renderDownload()

    await result.current()

    expect(
      await screen.findByText(
        'Downloading a backup. FX presets that could not be read are not in it.',
      ),
    ).toBeTruthy()
  })
})
