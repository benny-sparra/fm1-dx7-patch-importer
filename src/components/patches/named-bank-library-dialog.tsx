import { LoadNamedBankDialog } from '@/components/patches/load-named-bank-dialog'
import { type NamedBankLibraryDialogProps } from '@/components/patches/named-bank-dialog-types'
import { SaveNamedBankDialog } from '@/components/patches/save-named-bank-dialog'

/**
 * The saved-bank dialog a bank menu asked for. The librarian loads this module on first use, so the
 * saved-bank screens stay out of the first page load.
 */
export function NamedBankLibraryDialog({
  mode,
  ...props
}: NamedBankLibraryDialogProps & { mode: 'load' | 'save' }) {
  return mode === 'save' ? <SaveNamedBankDialog {...props} /> : <LoadNamedBankDialog {...props} />
}
