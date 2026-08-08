import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { parseDx7Bank, type Dx7Voice } from '@/lib/dx7'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import {
  clearLibraryBank,
  emptyPatchLibrary,
  getBankVoices as selectBankVoices,
  importVoices,
  initializePatchLibrary,
  makeDemoVoices,
  makeFactoryPatchLibrary,
  makePatches,
  moveVoice as moveLibraryVoice,
  renameVoice as renameLibraryVoice,
  type PatchLibrarySnapshot,
} from '@/lib/patch-library'
import {
  loadStoredPatchLibrary,
  saveStoredPatchLibrary,
} from '@/lib/patch-library-storage'

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
  const hydrated = useRef(false)
  const storageAvailable = useRef(true)

  useEffect(() => {
    let cancelled = false
    void loadStoredPatchLibrary()
      .then((stored) => {
        if (cancelled) return
        const savedLibrary = stored ? {
          effects: stored.effects,
          loadedBanks: stored.loadedBanks,
          voices: stored.voices,
        } : null
        setHistory({
          future: [],
          past: [],
          present: initializePatchLibrary(savedLibrary),
        })
        hydrated.current = true
      })
      .catch(() => {
        if (cancelled) return
        setHistory({ future: [], past: [], present: makeFactoryPatchLibrary() })
        hydrated.current = true
        storageAvailable.current = false
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!hydrated.current || !storageAvailable.current) return
    const timeout = window.setTimeout(() => {
      void saveStoredPatchLibrary(history.present)
        .catch(() => { storageAvailable.current = false })
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [history.present])

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

  const importBank = useCallback(async (bank: string, file: File) => {
    const imported = parseDx7Bank(await file.arrayBuffer())
    commit((current) => importVoices(current, bank, imported))
  }, [commit])

  const loadDemoBank = useCallback((bank: string) => {
    commit((current) => importVoices(current, bank, makeDemoVoices()))
  }, [commit])

  const updateVoice = useCallback((id: string, update: (voice: Dx7Voice) => Dx7Voice) => {
    commit((current) => current.voices[id]
      ? { ...current, voices: { ...current.voices, [id]: update(current.voices[id]) } }
      : current)
  }, [commit])

  const updatePatch = useCallback((
    id: string,
    voice: Dx7Voice,
    effects: Uint8Array,
  ) => {
    commit((current) => current.voices[id]
      ? {
          ...current,
          effects: { ...current.effects, [id]: normalizeFm1Effects(effects) },
          voices: { ...current.voices, [id]: voice },
        }
      : current)
  }, [commit])

  const renameVoice = useCallback((id: string, name: string) => {
    commit((current) => renameLibraryVoice(current, id, name))
  }, [commit])

  const moveVoice = useCallback((bank: string, from: number, to: number) => {
    commit((current) => moveLibraryVoice(current, bank, from, to))
  }, [commit])

  const clearBank = useCallback((bank: string) => {
    commit((current) => clearLibraryBank(current, bank))
  }, [commit])

  const clearAllBanks = useCallback(async () => {
    const emptyLibrary = emptyPatchLibrary()
    setHistory({ future: [], past: [], present: emptyLibrary })
    try {
      // Keep an explicit empty record so a deliberate clear is not mistaken for first use.
      await saveStoredPatchLibrary(emptyLibrary)
      storageAvailable.current = true
    } catch {
      storageAvailable.current = false
    }
  }, [])

  const resetFactoryBanks = useCallback(() => {
    commit(() => makeFactoryPatchLibrary())
  }, [commit])

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
    canRedo: history.future.length > 0,
    canUndo: history.past.length > 0,
    clearAllBanks,
    clearBank,
    getBankVoices,
    importBank,
    loadDemoBank,
    loadedBanks: history.present.loadedBanks,
    moveVoice,
    patches,
    redo,
    renameVoice,
    resetFactoryBanks,
    undo,
    updatePatch,
    updateVoice,
    effects: history.present.effects,
    voices: history.present.voices,
  }
}

export type PatchLibrary = ReturnType<typeof usePatchLibrary>
