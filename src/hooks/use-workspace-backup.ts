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
  | 'hasDamagedNamedBanks'
  | 'loadedBanks'
  | 'namedBanks'
  | 'namedBanksLoadFailed'
  | 'namedBanksLoading'
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
    try {
      backup = await import('@/lib/workspace-backup')
    } catch {
      return false
    }
    const downloaded = backup.downloadWorkspaceBackup({
      hasDamagedNamedBanks: library.hasDamagedNamedBanks,
      namedBanks: library.namedBanks,
      namedBanksLoadFailed: library.namedBanksLoadFailed,
      workspace: {
        bankDescriptions: library.bankDescriptions,
        bankNames: library.bankNames,
        effects: library.effects,
        loadedBanks: library.loadedBanks,
        voices: library.voices,
        workspaceBanks: library.workspaceBanks,
      },
    })
    toast.success(t(`backup.${downloaded}`))
    return true
  }, [library, t, toast])
}
