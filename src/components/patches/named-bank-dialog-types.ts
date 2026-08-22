import { type PatchLibrary } from '@/hooks/use-patch-library'

export type NamedBankLibraryDialogProps = {
  destinationBank: string
  library: PatchLibrary
  onClose?: () => void
}
