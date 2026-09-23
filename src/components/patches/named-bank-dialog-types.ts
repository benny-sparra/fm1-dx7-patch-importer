import type { PatchLibrary } from '@/hooks/use-patch-library'
import type { NamedBank } from '@/lib/named-bank'
import type { PatchLibrarySnapshot } from '@/lib/patch-library'

type NamedBankDialogProps<Library> = {
  destinationBank: string
  library: Library
  onClose?: () => void
  /** Called once a saved bank has been loaded, with the workspace the load produced. */
  onLoaded?: (bank: NamedBank, changed: PatchLibrarySnapshot | null) => void
}

export type LoadNamedBankDialogProps = NamedBankDialogProps<
  Pick<
    PatchLibrary,
    | 'bankNames'
    | 'copyNamedBank'
    | 'deleteNamedBank'
    | 'hasDamagedNamedBanks'
    | 'loadSavedBank'
    | 'loadedBanks'
    | 'namedBanks'
    | 'namedBanksLoadFailed'
    | 'namedBanksLoading'
    | 'updateNamedBankDetails'
    | 'workspaceBanks'
  >
>

export type SaveNamedBankDialogProps = NamedBankDialogProps<
  Pick<PatchLibrary, 'bankNames' | 'saveNamedBank' | 'workspaceBanks'>
>

export type NamedBankLibraryDialogProps = NamedBankDialogProps<
  LoadNamedBankDialogProps['library'] & SaveNamedBankDialogProps['library']
>
