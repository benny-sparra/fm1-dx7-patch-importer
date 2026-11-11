import { useCallback, useEffect, useRef, useState } from 'react'

import { createId } from '@/lib/id'
import {
  createFxLibraryPreset,
  duplicateFxLibraryPreset,
  renameFxLibraryPreset,
  updateFxLibraryPreset,
  type FxLibraryPreset,
} from '@/lib/fx-library-preset'
import type { PortableFxPreset } from '@/lib/fx-preset-file'
import {
  addStoredFxLibraryPreset,
  addStoredFxLibraryPresets,
  deleteStoredFxLibraryPreset,
  listStoredFxLibraryPresets,
  mergeStoredFxLibraryPresets,
  serializeFxMutation,
  updateStoredFxLibraryPreset,
} from '@/lib/fx-library-storage'

type FxLibraryStatus = 'error' | 'loading' | 'ready'

const retiredOwnerCommitListeners = new Set<() => void>()

/** Owns the named browser FX collection. Current live values remain in `v16-effects.ts`. */
export function useFxLibrary() {
  const [presets, setPresets] = useState<FxLibraryPreset[]>([])
  const [damagedCount, setDamagedCount] = useState(0)
  const [status, setStatus] = useState<FxLibraryStatus>('loading')
  const [loadError, setLoadError] = useState<unknown>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const mounted = useRef(true)
  const loaded = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const reload = useCallback(async () => {
    if (!loaded.current && mounted.current) setStatus('loading')
    try {
      const result = await listStoredFxLibraryPresets()
      if (mounted.current) {
        setPresets(result.presets)
        setDamagedCount(result.damagedCount)
        setLoadError(null)
        setStatus('ready')
        loaded.current = true
      }
      return result.presets
    } catch (error) {
      if (mounted.current) {
        setLoadError(error)
        setStatus('error')
      }
      throw error
    }
  }, [])

  useEffect(() => {
    void reload().catch(() => undefined)
  }, [reload])

  const serialize = useCallback(<T>(operation: () => Promise<T>) => {
    if (mounted.current) setPendingCount((count) => count + 1)
    const result = serializeFxMutation(async () => {
      const value = await operation()
      // A toast's Undo can outlive its view; refresh the library that replaced that owner.
      if (!mounted.current) retiredOwnerCommitListeners.forEach((refresh) => refresh())
      return value
    })
    return result.finally(() => {
      if (mounted.current) setPendingCount((count) => Math.max(0, count - 1))
    })
  }, [])

  const requireReady = useCallback(() => {
    if (status !== 'ready') throw new Error('The FX preset library has not loaded.')
  }, [status])

  /** Saves `effects` as a new preset, with the effect order when it is known. */
  const save = useCallback(
    (name: string, effects: Uint8Array, order?: readonly number[] | null) => {
      requireReady()
      const record = createFxLibraryPreset({
        effects,
        id: createId(),
        name,
        now: new Date().toISOString(),
        order,
      })
      return serialize(async () => {
        await addStoredFxLibraryPreset(record)
        if (mounted.current) setPresets((current) => [...current, record])
        return record
      })
    },
    [requireReady, serialize],
  )

  const rename = useCallback(
    (preset: FxLibraryPreset, name: string) => {
      requireReady()
      const record = renameFxLibraryPreset(preset, name, new Date().toISOString())
      return serialize(async () => {
        await updateStoredFxLibraryPreset(record, preset)
        if (mounted.current) {
          setPresets((current) =>
            current.map((candidate) => (candidate.id === record.id ? record : candidate)),
          )
        }
        return record
      })
    },
    [requireReady, serialize],
  )

  /** Overwrites `preset`; an `order` of `undefined` keeps the preset's own (`updateFxLibraryPreset`). */
  const update = useCallback(
    (preset: FxLibraryPreset, effects: Uint8Array, order?: readonly number[] | null) => {
      requireReady()
      const record = updateFxLibraryPreset(preset, effects, new Date().toISOString(), order)
      return serialize(async () => {
        await updateStoredFxLibraryPreset(record, preset)
        if (mounted.current) {
          setPresets((current) =>
            current.map((candidate) => (candidate.id === record.id ? record : candidate)),
          )
        }
        return record
      })
    },
    [requireReady, serialize],
  )

  const duplicate = useCallback(
    (preset: FxLibraryPreset) => {
      requireReady()
      const record = duplicateFxLibraryPreset(preset, createId(), new Date().toISOString())
      return serialize(async () => {
        await addStoredFxLibraryPreset(record)
        if (mounted.current) setPresets((current) => [...current, record])
        return record
      })
    },
    [requireReady, serialize],
  )

  const remove = useCallback(
    (preset: FxLibraryPreset) => {
      requireReady()
      return serialize(async () => {
        await deleteStoredFxLibraryPreset(preset)
        if (mounted.current) {
          setPresets((current) => current.filter((candidate) => candidate.id !== preset.id))
        }
      })
    },
    [requireReady, serialize],
  )

  const importPresets = useCallback(
    (portable: readonly PortableFxPreset[]) => {
      requireReady()
      const now = new Date().toISOString()
      const records = portable.map(({ effects, name, order }) =>
        createFxLibraryPreset({ effects, id: createId(), name, now, order }),
      )
      return serialize(async () => {
        await addStoredFxLibraryPresets(records)
        if (mounted.current) setPresets((current) => [...current, ...records])
        return records
      })
    },
    [requireReady, serialize],
  )

  const restorePresets = useCallback(
    (records: readonly FxLibraryPreset[]) => {
      requireReady()
      return serialize(async () => {
        const result = await mergeStoredFxLibraryPresets(records)
        if (mounted.current && result.added.length) {
          setPresets((current) => [...current, ...result.added])
        }
        return { added: result.added.length, kept: result.kept }
      })
    },
    [requireReady, serialize],
  )

  const pending = pendingCount > 0

  useEffect(() => {
    const refresh = () => {
      if (!pending) void reload().catch(() => undefined)
    }
    window.addEventListener('focus', refresh)
    retiredOwnerCommitListeners.add(refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      retiredOwnerCommitListeners.delete(refresh)
    }
  }, [pending, reload])

  useEffect(() => {
    if (!pending) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [pending])

  return {
    damagedCount,
    delete: remove,
    duplicate,
    importPresets,
    loadError,
    pending,
    presets,
    reload,
    restorePresets,
    rename,
    save,
    status,
    update,
  }
}

export type FxLibrary = ReturnType<typeof useFxLibrary>
