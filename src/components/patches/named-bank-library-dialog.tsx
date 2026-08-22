import { LoadNamedBankDialog } from '@/components/patches/load-named-bank-dialog'
import { type NamedBankLibraryDialogProps } from '@/components/patches/named-bank-dialog-types'
import { SaveNamedBankDialog } from '@/components/patches/save-named-bank-dialog'

export function NamedBankLibraryDialog(props: NamedBankLibraryDialogProps) {
  return (
    <>
      <SaveNamedBankDialog {...props} />
      <LoadNamedBankDialog {...props} />
    </>
  )
}
