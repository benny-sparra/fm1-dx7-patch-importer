import { encodedDx7FactoryBanks } from '@/data/dx7-factory-banks'
import { parseDx7Bank } from '@/lib/dx7'
import {
  browserBanks,
  clearLibraryBank,
  emptyPatchLibrary,
  importVoices,
  type PatchLibrarySnapshot,
} from '@/lib/patch-library'

export function makeFactoryPatchLibrary(): PatchLibrarySnapshot {
  return restoreFactoryPatchLibrary(emptyPatchLibrary())
}

export function restoreFactoryPatchLibrary(snapshot: PatchLibrarySnapshot): PatchLibrarySnapshot {
  const prepared =
    snapshot.workspaceBanks.length >= browserBanks.length
      ? snapshot
      : {
          ...snapshot,
          workspaceBanks: Array.from({ length: browserBanks.length }, (_, index) =>
            String.fromCharCode(65 + index),
          ),
        }
  const cleared = browserBanks.reduce((current, bank) => clearLibraryBank(current, bank), prepared)
  return browserBanks.reduce((current, bank) => {
    const binary = atob(encodedDx7FactoryBanks[bank])
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return importVoices(current, bank, parseDx7Bank(bytes.buffer))
  }, cleared)
}

export function initializePatchLibrary(stored: PatchLibrarySnapshot | null) {
  return stored ?? makeFactoryPatchLibrary()
}
