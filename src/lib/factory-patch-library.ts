import { encodedFm1FactoryBanks } from '@/data/fm1-factory-banks'
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
  const restored = browserBanks.reduce((current, bank) => {
    const binary = atob(encodedFm1FactoryBanks[bank])
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return importVoices(current, bank, parseDx7Bank(bytes.buffer))
  }, cleared)
  // A restored bank holds the factory sounds again, so a title or description written for the
  // sounds it replaced no longer applies. Added banks keep theirs.
  return {
    ...restored,
    bankDescriptions: withoutFactoryBanks(restored.bankDescriptions),
    bankNames: withoutFactoryBanks(restored.bankNames),
  }
}

function withoutFactoryBanks(values: Record<string, string>) {
  const factoryBanks: readonly string[] = browserBanks
  return Object.fromEntries(Object.entries(values).filter(([bank]) => !factoryBanks.includes(bank)))
}

export function initializePatchLibrary(stored: PatchLibrarySnapshot | null) {
  return stored ?? makeFactoryPatchLibrary()
}
