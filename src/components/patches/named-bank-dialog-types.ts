import { type PatchLibrary } from '@/hooks/use-patch-library'
import { type NamedBank } from '@/lib/named-bank'
import { type PatchLibrarySnapshot } from '@/lib/patch-library'

export type NamedBankLibraryDialogProps = {
  destinationBank: string
  library: PatchLibrary
  onClose?: () => void
  /** Called once a saved bank has been loaded, with the workspace the load produced. */
  onLoaded?: (bank: NamedBank, changed: PatchLibrarySnapshot | null) => void
}
