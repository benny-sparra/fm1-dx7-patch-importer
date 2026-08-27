import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { parseDx7Bank, type Dx7Voice } from '@/lib/dx7'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import { createId } from '@/lib/id'
import {
  createNamedBank,
  duplicateNamedBank,
  loadNamedBank,
  renameNamedBank,
  type NamedBank,
} from '@/lib/named-bank'
import {
  createWorkspaceBank,
  deleteWorkspaceBank,
  emptyPatchLibrary,
  getBankVoices as selectBankVoices,
  importVoices,
  makeDemoVoices,
  makePatches,
  moveVoice as moveLibraryVoice,
  renameBank as renameLibraryBank,
  renameVoice as renameLibraryVoice,
  updateBankInformation as updateLibraryBankInformation,
  type PatchLibrarySnapshot,
} from '@/lib/patch-library'
import {
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
  const [namedBanks, setNamedBanks] = useState<NamedBank[]>([])
  const [namedBanksError, setNamedBanksError] = useState('')
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
              loadedBanks: stored.loadedBanks,
              voices: stored.voices,
              workspaceBanks: stored.workspaceBanks,
            }
          : null
      },
      onWorkspaceLoaded: (workspace) => {
        setHistory({
          future: [],
          past: [],
          present: workspace,
        })
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
      .then((banks) => {
        if (!cancelled) setNamedBanks(banks)
      })
      .catch((error) => {
        if (!cancelled)
          setNamedBanksError(error instanceof Error ? error.message : 'Could not load saved banks.')
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

  const retryWorkspaceLoading = useCallback(() => {
    persistenceController.current?.retryLoading()
  }, [])

  const continueWithoutWorkspaceSaving = useCallback(() => {
    persistenceController.current?.continueWithoutSaving()
  }, [])

  const retryWorkspaceSaving = useCallback(() => {
    persistenceController.current?.retrySaving()
  }, [])

  const commit = useCallback((update: (current: PatchLibrarySnapshot) => PatchLibrarySnapshot) => {
    setHistory((current) => {
      const next = update(current.present)
      if (next === current.present) return current
      return {
        future: [],
        past: [...current.past, current.present].slice(-historyLimit),
        present: next,
      }
    })
  }, [])

  const importBank = useCallback(
    async (bank: string, file: File) => {
      const imported = parseDx7Bank(await file.arrayBuffer())
      commit((current) => importVoices(current, bank, imported))
    },
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

  const updatePatch = useCallback(
    (id: string, voice: Dx7Voice, effects: Uint8Array) => {
      commit((current) =>
        current.voices[id]
          ? {
              ...current,
              effects: { ...current.effects, [id]: normalizeFm1Effects(effects) },
              voices: { ...current.voices, [id]: voice },
            }
          : current,
      )
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

  const deleteBank = useCallback(
    (bank: string) => {
      commit((current) => deleteWorkspaceBank(current, bank))
    },
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
    commit((current) => restoreFactoryPatchLibrary(current))
  }, [commit])

  const saveNamedBank = useCallback(
    async (sourceBank: string, name: string, description: string) => {
      const now = new Date().toISOString()
      const bank = createNamedBank(history.present, sourceBank, {
        description,
        id: createId(),
        name,
        now,
      })
      await saveStoredNamedBank(bank)
      setNamedBanks((current) => [bank, ...current])
      setNamedBanksError('')
      return bank
    },
    [history.present],
  )

  const loadSavedBank = useCallback(
    (bank: NamedBank, destinationBank: string) => {
      commit((current) => loadNamedBank(current, destinationBank, bank))
    },
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
      setNamedBanksError('')
      return updated
    },
    [],
  )

  const copyNamedBank = useCallback(async (bank: NamedBank) => {
    const duplicate = duplicateNamedBank(bank, createId(), new Date().toISOString())
    await saveStoredNamedBank(duplicate)
    setNamedBanks((current) => [duplicate, ...current])
    setNamedBanksError('')
    return duplicate
  }, [])

  const deleteNamedBank = useCallback(async (id: string) => {
    await deleteStoredNamedBank(id)
    setNamedBanks((current) => current.filter((bank) => bank.id !== id))
    setNamedBanksError('')
  }, [])

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1)
      if (!previous) return current
      return {
        future: [current.present, ...current.future],
        past: current.past.slice(0, -1),
        present: previous,
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((current) => {
      const next = current.future[0]
      if (!next) return current
      return {
        future: current.future.slice(1),
        past: [...current.past, current.present].slice(-historyLimit),
        present: next,
      }
    })
  }, [])

  const patches = useMemo(() => makePatches(history.present), [history.present])
  const getBankVoices = useCallback(
    (bank: string) => selectBankVoices(history.present, bank),
    [history.present],
  )

  return {
    addBank,
    canRedo: history.future.length > 0,
    canUndo: history.past.length > 0,
    copyNamedBank,
    continueWithoutWorkspaceSaving,
    deleteNamedBank,
    deleteBank,
    getBankVoices,
    importBank,
    loadDemoBank,
    loadSavedBank,
    bankDescriptions: history.present.bankDescriptions,
    bankNames: history.present.bankNames,
    loadedBanks: history.present.loadedBanks,
    moveVoice,
    namedBanks,
    namedBanksError,
    namedBanksLoading,
    patches,
    persistenceError: persistence.error,
    persistenceStatus: persistence.status,
    redo,
    renameBank,
    renameVoice,
    retryWorkspaceLoading,
    retryWorkspaceSaving,
    resetFactoryBanks,
    saveNamedBank,
    undo,
    updatePatch,
    updateBankInformation,
    updateNamedBankDetails,
    updateVoice,
    effects: history.present.effects,
    voices: history.present.voices,
    workspaceBanks: history.present.workspaceBanks,
    workspaceHasUnsavedChanges: persistence.hasUnsavedChanges,
    workspaceLoading: persistence.status === 'loading',
  }
}

export type PatchLibrary = ReturnType<typeof usePatchLibrary>
