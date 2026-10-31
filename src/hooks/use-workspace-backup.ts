import { useCallback, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/components/ui/toast'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { getLastBackupTime, subscribeLastBackupTime } from '@/lib/last-backup'

export type BackupLibrary = Pick<
  PatchLibrary,
  | 'bankDescriptions'
  | 'bankNames'
  | 'effects'
  | 'eightBit'
  | 'favourites'
  | 'hasDamagedNamedBanks'
  | 'loadedBanks'
  | 'namedBanks'
  | 'namedBanksLoadFailed'
  | 'namedBanksLoading'
  | 'records'
  | 'virtualAnalog'
  | 'voices'
  | 'workspaceBanks'
>

/** When this browser last downloaded a backup, as an ISO date, or null. */
export function useLastBackupTime() {
  return useSyncExternalStore(subscribeLastBackupTime, getLastBackupTime)
}

/**
 * Downloads the workspace and the saved banks as one backup file. The backup code loads with the
 * first download rather than with the page; it resolves false when that code could not be loaded.
 */
export function useDownloadWorkspaceBackup(library: BackupLibrary) {
  const { t } = useTranslation()
  const toast = useToast()

  return useCallback(async () => {
    let backup: typeof import('@/lib/workspace-backup')
    let fxPresets: Awaited<
      ReturnType<(typeof import('@/lib/fx-library-storage'))['listStoredFxLibraryPresets']>
    >
    try {
      ;[backup, fxPresets] = await Promise.all([
        import('@/lib/workspace-backup'),
        import('@/lib/fx-library-storage').then((storage) => storage.listStoredFxLibraryPresets()),
      ])
    } catch {
      return false
    }
    const downloaded = backup.downloadWorkspaceBackup({
      damagedFxPresetCount: fxPresets.damagedCount,
      fxPresets: fxPresets.presets,
      hasDamagedNamedBanks: library.hasDamagedNamedBanks,
      namedBanks: library.namedBanks,
      namedBanksLoadFailed: library.namedBanksLoadFailed,
      workspace: {
        bankDescriptions: library.bankDescriptions,
        bankNames: library.bankNames,
        effects: library.effects,
        eightBit: library.eightBit,
        favourites: library.favourites,
        loadedBanks: library.loadedBanks,
        records: library.records,
        virtualAnalog: library.virtualAnalog,
        voices: library.voices,
        workspaceBanks: library.workspaceBanks,
      },
    })
    toast.success(t(`backup.${downloaded}`))
    return true
  }, [library, t, toast])
}
