import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Dx7Voice } from '@/lib/dx7'
import {
  favouriteSoundKeys,
  type FavouriteOrigin,
  makeFavouritePatches,
  moveFavourite as moveLibraryFavourite,
  toggleFavourite as toggleLibraryFavourite,
  favouritePatchId,
} from '@/lib/favourites'
import { createId } from '@/lib/id'
import {
  createNamedBank,
  duplicateNamedBank,
  loadNamedBank,
  renameNamedBank,
  type NamedBank,
} from '@/lib/named-bank'
import {
  bankOfVoiceId,
  copyVoice as copyLibraryVoice,
  createWorkspaceBank,
  deleteWorkspaceBank,
  emptyPatchLibrary,
  findLibrarySound,
  getBankVoices as selectBankVoices,
  importFetchedBanks as importLibraryFetchedBanks,
  importVoices,
  makeDemoVoices,
  makePatches,
  moveVoice as moveLibraryVoice,
  renameBank as renameLibraryBank,
  renameVoice as renameLibraryVoice,
  replaceVoice as replaceLibraryVoice,
  replaceWithVirtualAnalog as replaceLibraryWithVirtualAnalog,
  saveSound,
  updateBankInformation as updateLibraryBankInformation,
  type FetchedBank,
  type PatchLibrarySnapshot,
} from '@/lib/patch-library'
import {
  addStoredNamedBank,
  deleteStoredNamedBank,
  listStoredNamedBanks,
  loadStoredPatchLibrary,
  saveStoredNamedBank,
  saveStoredPatchLibrary,
} from '@/lib/patch-library-storage'
import {
  shouldWarnBeforeUnload,
  WorkspacePersistenceController,
  type WorkspacePersistenceState,
} from '@/lib/workspace-persistence'
import type { WorkspaceBackup } from '@/lib/workspace-backup'

type History = {
  future: PatchLibrarySnapshot[]
  past: PatchLibrarySnapshot[]
  present: PatchLibrarySnapshot
}

const historyLimit = 50

export function usePatchLibrary() {
  const [history, setHistory] = useState<History>({
    future: [],
    past: [],
    present: emptyPatchLibrary(),
  })
  // Mirrors the latest history ahead of React's render, so each change is worked out where its
  // caller can catch a failure, and back-to-back changes in one event build on each other.
  const historyRef = useRef(history)
  const replaceHistory = useCallback((next: History) => {
    historyRef.current = next
    setHistory(next)
  }, [])
  const [namedBanks, setNamedBanks] = useState<NamedBank[]>([])
  const [hasDamagedNamedBanks, setHasDamagedNamedBanks] = useState(false)
  const [namedBanksLoadFailed, setNamedBanksLoadFailed] = useState(false)
  const [namedBanksLoading, setNamedBanksLoading] = useState(true)
  const [persistence, setPersistence] = useState<WorkspacePersistenceState>({
    error: null,
    hasSaveFailure: false,
    hasUnsavedChanges: false,
    status: 'loading',
    workspace: null,
  })
  const persistenceController = useRef<WorkspacePersistenceController | null>(null)

  useEffect(() => {
    const controller = new WorkspacePersistenceController({
      createFactory: async () => {
        const { makeFactoryPatchLibrary } = await import('@/lib/factory-patch-library')
        return makeFactoryPatchLibrary()
      },
      load: async () => {
        const stored = await loadStoredPatchLibrary()
        return stored
          ? {
              bankDescriptions: stored.bankDescriptions,
              bankNames: stored.bankNames,
              effects: stored.effects,
              favourites: stored.favourites,
              loadedBanks: stored.loadedBanks,
              records: stored.records,
              virtualAnalog: stored.virtualAnalog,
              voices: stored.voices,
              workspaceBanks: stored.workspaceBanks,
            }
          : null
      },
      onWorkspaceLoaded: (workspace) => {
        const loaded = { future: [], past: [], present: workspace }
        historyRef.current = loaded
        setHistory(loaded)
      },
      save: saveStoredPatchLibrary,
    })
    persistenceController.current = controller
    const unsubscribe = controller.subscribe(setPersistence)
    controller.start()
    return () => {
      unsubscribe()
      controller.dispose()
      if (persistenceController.current === controller) persistenceController.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void listStoredNamedBanks()
      .then(({ banks, damagedCount }) => {
        if (cancelled) return
        setNamedBanks(banks)
        setHasDamagedNamedBanks(damagedCount > 0)
      })
      .catch(() => {
        if (!cancelled) setNamedBanksLoadFailed(true)
      })
      .finally(() => {
        if (!cancelled) setNamedBanksLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    persistenceController.current?.updateWorkspace(history.present)
  }, [history.present])

  useEffect(() => {
    if (!shouldWarnBeforeUnload(persistence)) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [persistence])

  useEffect(() => {
    // Autosave waits for edits to settle, so write straight away when the page may be closing.
    const flushPendingSave = () => persistenceController.current?.flushPendingSave()
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') flushPendingSave()
    }
    window.addEventListener('pagehide', flushPendingSave)
    document.addEventListener('visibilitychange', flushWhenHidden)
    return () => {
      window.removeEventListener('pagehide', flushPendingSave)
      document.removeEventListener('visibilitychange', flushWhenHidden)
    }
  }, [])

  const retryWorkspaceLoading = useCallback(() => {
    persistenceController.current?.retryLoading()
  }, [])

  const continueWithoutWorkspaceSaving = useCallback(() => {
    persistenceController.current?.continueWithoutSaving()
  }, [])

  const retryWorkspaceSaving = useCallback(() => {
    persistenceController.current?.retrySaving()
  }, [])

  /** Applies a change and returns the workspace it produced, or null when nothing changed. */
  const commit = useCallback(
    (update: (current: PatchLibrarySnapshot) => PatchLibrarySnapshot) => {
      const current = historyRef.current
      const next = update(current.present)
      if (next === current.present) return null
      replaceHistory({
        future: [],
        past: [...current.past, current.present].slice(-historyLimit),
        present: next,
      })
      return next
    },
    [replaceHistory],
  )

  const importBank = useCallback(
    (bank: string, imported: Dx7Voice[]) =>
      commit((current) => importVoices(current, bank, imported)),
    [commit],
  )

  const importFetchedBanks = useCallback(
    (banks: readonly FetchedBank[]) =>
      commit((current) => importLibraryFetchedBanks(current, banks)),
    [commit],
  )

  const loadDemoBank = useCallback(
    (bank: string) => {
      commit((current) => importVoices(current, bank, makeDemoVoices()))
    },
    [commit],
  )

  const updateVoice = useCallback(
    (id: string, update: (voice: Dx7Voice) => Dx7Voice) => {
      commit((current) =>
        current.voices[id]
          ? { ...current, voices: { ...current.voices, [id]: update(current.voices[id]) } }
          : current,
      )
    },
    [commit],
  )

  /**
   * Saves a sound from the editor, in a slot or in Favourites, with the other copies that sounded
   * the same (`saveSound`). Returns how many other copies it updated.
   */
  const updatePatch = useCallback(
    (id: string, voice: Dx7Voice, effects: Uint8Array, record?: Uint8Array) => {
      let linked = 0
      commit((current) => {
        const saved = saveSound(current, id, voice, effects, record)
        linked = saved.linked
        return saved.snapshot
      })
      return linked
    },
    [commit],
  )

  /**
   * Adds a slot's sound to Favourites, or takes it out when it is there already, as its heart does.
   * A favourite's own heart takes it out. Returns whether it was added, and the change to undo.
   */
  const toggleFavourite = useCallback(
    (patchId: string) => {
      let added = false
      const changed = commit((current) => {
        const sound = findLibrarySound(current, patchId)
        if (!sound) return current
        const bank = bankOfVoiceId(patchId)
        const origin: FavouriteOrigin =
          bank && current.bankNames[bank]
            ? { bankName: current.bankNames[bank] }
            : { bankNumber: current.workspaceBanks.indexOf(bank ?? '') + 1 }
        const toggled = toggleLibraryFavourite(current, sound, origin, createId())
        added = toggled.added
        return toggled.snapshot
      })
      return { added, changed }
    },
    [commit],
  )

  /** Adds or removes a sound from outside the workspace, such as a search result. */
  const toggleFavouriteSound = useCallback(
    (
      sound: { effects?: Uint8Array; record?: Uint8Array; voice: Dx7Voice },
      origin: FavouriteOrigin,
    ) => {
      let added = false
      const changed = commit((current) => {
        const toggled = toggleLibraryFavourite(current, sound, origin, createId())
        added = toggled.added
        return toggled.snapshot
      })
      return { added, changed }
    },
    [commit],
  )

  const moveFavourite = useCallback(
    (from: number, to: number) => {
      commit((current) => moveLibraryFavourite(current, from, to))
    },
    [commit],
  )

  const renameVoice = useCallback(
    (id: string, name: string) => {
      commit((current) => renameLibraryVoice(current, id, name))
    },
    [commit],
  )

  const renameBank = useCallback(
    (bank: string, name: string) => {
      commit((current) => renameLibraryBank(current, bank, name))
    },
    [commit],
  )

  const updateBankInformation = useCallback(
    (bank: string, title: string, description: string) => {
      commit((current) => updateLibraryBankInformation(current, bank, title, description))
    },
    [commit],
  )

  const moveVoice = useCallback(
    (bank: string, from: number, to: number) => {
      commit((current) => moveLibraryVoice(current, bank, from, to))
    },
    [commit],
  )

  const copyVoice = useCallback(
    (sourceId: string, bank: string, slot: number) =>
      commit((current) => copyLibraryVoice(current, sourceId, bank, slot)),
    [commit],
  )

  const replaceVoice = useCallback(
    (bank: string, slot: number, voice: Dx7Voice, effects?: Uint8Array, record?: Uint8Array) =>
      commit((current) => replaceLibraryVoice(current, bank, slot, voice, effects, record)),
    [commit],
  )

  const replaceWithVirtualAnalog = useCallback(
    (
      bank: string,
      slot: number,
      virtualAnalog: Uint8Array,
      effects: Uint8Array | undefined,
      record: Uint8Array,
    ) =>
      commit((current) =>
        replaceLibraryWithVirtualAnalog(current, bank, slot, virtualAnalog, effects, record),
      ),
    [commit],
  )

  const deleteBank = useCallback(
    (bank: string) => commit((current) => deleteWorkspaceBank(current, bank)),
    [commit],
  )

  const addBank = useCallback(
    (bank: string, name: string, description: string, voices: Dx7Voice[]) => {
      commit((current) => createWorkspaceBank(current, bank, name, description, voices))
    },
    [commit],
  )

  const resetFactoryBanks = useCallback(async () => {
    const { restoreFactoryPatchLibrary } = await import('@/lib/factory-patch-library')
    return commit((current) => restoreFactoryPatchLibrary(current))
  }, [commit])

  const saveNamedBank = useCallback(
    async (sourceBank: string, name: string, description: string) => {
      const now = new Date().toISOString()
      const bank = createNamedBank(historyRef.current.present, sourceBank, {
        description,
        id: createId(),
        name,
        now,
      })
      await saveStoredNamedBank(bank)
      setNamedBanks((current) => [bank, ...current])
      return bank
    },
    [],
  )

  const loadSavedBank = useCallback(
    (bank: NamedBank, destinationBank: string) =>
      commit((current) => loadNamedBank(current, destinationBank, bank)),
    [commit],
  )

  const updateNamedBankDetails = useCallback(
    async (bank: NamedBank, name: string, description: string) => {
      const updated = renameNamedBank(bank, name, description, new Date().toISOString())
      await saveStoredNamedBank(updated)
      setNamedBanks((current) =>
        current
          .map((candidate) => (candidate.id === updated.id ? updated : candidate))
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
      )
      return updated
    },
    [],
  )

  const copyNamedBank = useCallback(async (bank: NamedBank) => {
    const duplicate = duplicateNamedBank(bank, createId(), new Date().toISOString())
    await saveStoredNamedBank(duplicate)
    setNamedBanks((current) => [duplicate, ...current])
    return duplicate
  }, [])

  const deleteNamedBank = useCallback(async (id: string) => {
    await deleteStoredNamedBank(id)
    setNamedBanks((current) => current.filter((bank) => bank.id !== id))
  }, [])

  /**
   * Restores a backup. Its saved banks are added first, and one whose id is already stored is kept
   * as it is, so nothing stored is overwritten and a retry after a failure is safe. The workspace is
   * replaced only once every saved bank is stored, as one change that Undo reverses; Undo does not
   * remove the added saved banks.
   */
  const restoreBackup = useCallback(
    async (backup: WorkspaceBackup) => {
      const added: NamedBank[] = []
      let kept = 0
      try {
        for (const bank of backup.savedBanks) {
          if (await addStoredNamedBank(bank)) added.push(bank)
          else kept += 1
        }
      } finally {
        if (added.length > 0) {
          setNamedBanks((current) =>
            [...added, ...current].sort((left, right) =>
              right.updatedAt.localeCompare(left.updatedAt),
            ),
          )
        }
      }
      const changed = commit(() => backup.workspace)
      return { added: added.length, changed, kept }
    },
    [commit],
  )

  const undo = useCallback(() => {
    const current = historyRef.current
    const previous = current.past.at(-1)
    if (!previous) return
    replaceHistory({
      future: [current.present, ...current.future],
      past: current.past.slice(0, -1),
      present: previous,
    })
  }, [replaceHistory])

  const redo = useCallback(() => {
    const current = historyRef.current
    const next = current.future[0]
    if (!next) return
    replaceHistory({
      future: current.future.slice(1),
      past: [...current.past, current.present].slice(-historyLimit),
      present: next,
    })
  }, [replaceHistory])

  /**
   * Undoes one change, but only while it is still the latest, so an Undo offered in a notification
   * cannot reverse something done afterwards.
   */
  const undoChange = useCallback(
    (changed: PatchLibrarySnapshot) => {
      if (historyRef.current.present !== changed) return false
      undo()
      return true
    },
    [undo],
  )

  const { favourites } = history.present
  const patches = useMemo(
    () => [...makePatches(history.present), ...makeFavouritePatches(history.present.favourites)],
    [history.present],
  )
  // Every sound by patch id, the favourites with the workspace slots, so playing, editing, and
  // copying find a favourite as they find a slot.
  const voices = useMemo(
    () => ({
      ...history.present.voices,
      ...Object.fromEntries(
        favourites.map((favourite) => [favouritePatchId(favourite.id), favourite.voice]),
      ),
    }),
    [favourites, history.present.voices],
  )
  const effects = useMemo(
    () => ({
      ...history.present.effects,
      ...Object.fromEntries(
        favourites.map((favourite) => [favouritePatchId(favourite.id), favourite.effects]),
      ),
    }),
    [favourites, history.present.effects],
  )
  const records = useMemo(
    () => ({
      ...history.present.records,
      ...Object.fromEntries(
        favourites.flatMap((favourite) =>
          favourite.record ? [[favouritePatchId(favourite.id), favourite.record]] : [],
        ),
      ),
    }),
    [favourites, history.present.records],
  )
  const favouriteKeys = useMemo(() => favouriteSoundKeys(favourites), [favourites])
  const getBankVoices = useCallback(
    (bank: string, initVoice?: Dx7Voice) => selectBankVoices(history.present, bank, initVoice),
    [history.present],
  )

  return {
    addBank,
    canRedo: history.future.length > 0,
    canUndo: history.past.length > 0,
    copyNamedBank,
    copyVoice,
    continueWithoutWorkspaceSaving,
    deleteNamedBank,
    deleteBank,
    favouriteKeys,
    favourites,
    getBankVoices,
    hasDamagedNamedBanks,
    importBank,
    importFetchedBanks,
    loadDemoBank,
    loadSavedBank,
    bankDescriptions: history.present.bankDescriptions,
    bankNames: history.present.bankNames,
    loadedBanks: history.present.loadedBanks,
    moveFavourite,
    moveVoice,
    namedBanks,
    namedBanksLoadFailed,
    namedBanksLoading,
    patches,
    persistenceError: persistence.error,
    persistenceStatus: persistence.status,
    redo,
    renameBank,
    renameVoice,
    replaceVoice,
    replaceWithVirtualAnalog,
    retryWorkspaceLoading,
    retryWorkspaceSaving,
    resetFactoryBanks,
    restoreBackup,
    saveNamedBank,
    toggleFavourite,
    toggleFavouriteSound,
    undo,
    undoChange,
    updatePatch,
    updateBankInformation,
    updateNamedBankDetails,
    updateVoice,
    effects,
    records,
    virtualAnalog: history.present.virtualAnalog,
    voices,
    workspaceBanks: history.present.workspaceBanks,
    workspaceHasUnsavedChanges: persistence.hasUnsavedChanges,
    workspaceLoading: persistence.status === 'loading',
  }
}

export type PatchLibrary = ReturnType<typeof usePatchLibrary>
