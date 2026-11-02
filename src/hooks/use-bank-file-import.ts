import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { useToast } from '@/components/ui/toast'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { createBankFileSelectionTarget } from '@/lib/bank-file-selection'

type Options = {
  bankDisplayName: (bank: string) => string
  library: Pick<PatchLibrary, 'workspaceBanks' | 'importBank'>
  setBankPendingImport: (request: { bank: string; file: File; opener: HTMLElement | null }) => void
  setDialogLoadError: (message: string) => void
  setImportError: (message: string) => void
}

/** Owns the empty-bank file chooser and the handoff to the replacement dialog. */
export function useBankFileImport({
  bankDisplayName,
  library,
  setBankPendingImport,
  setDialogLoadError,
  setImportError,
}: Options) {
  const { t } = useTranslation()
  const toast = useToast()
  const [isImporting, setIsImporting] = useState(false)
  const importTargetRef = useRef(createBankFileSelectionTarget())
  const emptyBankImportOpenerRef = useRef<HTMLElement | null>(null)
  const importSelectedBankFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const importTarget = importTargetRef.current.consume()
    if (!importTarget) return
    const banksAtStart = library.workspaceBanks
    setIsImporting(true)
    let archive: typeof import('@/lib/dx7-bank-archive')
    try {
      archive = await import('@/lib/dx7-bank-archive')
    } catch {
      setIsImporting(false)
      event.target.value = ''
      setDialogLoadError(t('banks.bankFileUnavailable'))
      return
    }
    try {
      const fileBanks = await archive.readDx7BankArchive(file)
      setImportError('')
      const [only] = fileBanks
      // Import directly only if the destination is still the same empty bank.
      if (
        fileBanks.length > 1 ||
        !only.voices ||
        !library.importBank(importTarget, only.voices, banksAtStart)
      ) {
        setBankPendingImport({ bank: importTarget, file, opener: emptyBankImportOpenerRef.current })
        return
      }
      trackAnalyticsEvent({ data: { source: 'file' }, name: 'bank_imported' })
      toast.success(t('toasts.bankImported', { bank: bankDisplayName(importTarget) }))
    } catch (error) {
      setImportError(bankErrorMessage(t, error, t('banks.importFailed')))
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }
  return { emptyBankImportOpenerRef, importSelectedBankFile, importTargetRef, isImporting }
}
