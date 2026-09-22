import type { TFunction } from 'i18next'
import { HardDriveUpload, TriangleAlert } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorNotice } from '@/components/ui/error-notice'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import type { PatchLibrarySnapshot } from '@/lib/patch-library'
import {
  readWorkspaceBackupFile,
  type WorkspaceBackup,
  WorkspaceBackupError,
  workspaceBackupFileAccept,
} from '@/lib/workspace-backup'

type RestoreBackupDialogProps = {
  library: Pick<PatchLibrary, 'namedBanks' | 'namedBanksLoadFailed' | 'restoreBackup'>
  onClose: () => void
  onRestored: (savedAt: string, changed: PatchLibrarySnapshot | null) => void
}

/** Explains a backup file that cannot be restored, in the interface language. */
function backupFileErrorMessage(t: TFunction, error: unknown) {
  if (error instanceof WorkspaceBackupError) return t(`backup.errors.${error.problem}`)
  return t('backup.errors.read')
}

/**
 * Reads a backup file, shows what restoring it will change, and restores it once confirmed. It
 * opens as soon as it is rendered and reports closing, so the page can drop it.
 */
export function RestoreBackupDialog({ library, onClose, onRestored }: RestoreBackupDialogProps) {
  const { i18n, t } = useTranslation()
  const titleId = useId()
  const introId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [backup, setBackup] = useState<WorkspaceBackup | null>(null)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [reading, setReading] = useState(false)
  const [working, setWorking] = useState(false)
  // Each file chosen replaces the last, so a slow read of an earlier one cannot win.
  const readCount = useRef(0)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    window.requestAnimationFrame(() => fileInputRef.current?.focus())
  }, [])

  const chooseFile = async (file: File | undefined) => {
    const read = ++readCount.current
    setBackup(null)
    setError('')
    setFileName(file?.name ?? '')
    if (!file) return
    setReading(true)
    try {
      const parsed = await readWorkspaceBackupFile(file)
      if (read === readCount.current) setBackup(parsed)
    } catch (cause) {
      if (read === readCount.current) setError(backupFileErrorMessage(t, cause))
    } finally {
      if (read === readCount.current) setReading(false)
    }
  }

  const restore = async () => {
    if (!backup) return
    setWorking(true)
    setError('')
    try {
      const { changed } = await library.restoreBackup(backup)
      dialogRef.current?.close()
      onRestored(backup.savedAt, changed)
    } catch {
      setError(t('backup.errors.savedBanksFailed'))
      setWorking(false)
    }
  }

  const formatNumber = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value)
  const rows: [string, string][] = []
  if (backup) {
    const storedIds = new Set(library.namedBanks.map(({ id }) => id))
    const alreadyHere = backup.savedBanks.filter(({ id }) => storedIds.has(id)).length
    const savedAt = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(backup.savedAt))
    rows.push(
      [t('backup.backedUpAt'), savedAt],
      [t('backup.workspaceBanks'), formatNumber(backup.workspace.workspaceBanks.length)],
      [t('backup.patches'), formatNumber(Object.keys(backup.workspace.voices).length)],
      [t('backup.savedBanks'), formatNumber(backup.savedBanks.length)],
    )
    // Without the stored list, which saved banks are already here is unknown until restoring.
    if (!library.namedBanksLoadFailed && backup.savedBanks.length > 0) {
      rows.push(
        [t('backup.toAdd'), formatNumber(backup.savedBanks.length - alreadyHere)],
        [t('backup.alreadyHere'), formatNumber(alreadyHere)],
      )
    }
    if (backup.damagedSavedBankCount > 0) {
      rows.push([t('backup.unreadable'), formatNumber(backup.damagedSavedBankCount)])
    }
  }

  return (
    <Dialog
      aria-describedby={introId}
      aria-labelledby={titleId}
      closeOnBackdrop={!working}
      onCancel={(event) => {
        if (working) event.preventDefault()
      }}
      onClose={onClose}
      ref={dialogRef}
      size="md"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>{t('backup.restoreTitle')}</DialogTitle>
        <DialogCloseButton
          disabled={working}
          label={t('common.close')}
          onClick={() => dialogRef.current?.close()}
        />
      </DialogHeader>
      <DialogBody>
        <div className="grid gap-5 p-5">
          <p className="text-sm leading-6 text-[var(--crt-ink-3)]" id={introId}>
            {t('backup.restoreIntro')}
          </p>

          <label className="modal-input-surface flex min-h-11 cursor-pointer items-center rounded-md border border-dashed border-input px-3 text-sm transition-colors hover:bg-muted/50">
            <span className="min-w-0 truncate">
              {reading ? t('backup.reading') : fileName || t('backup.chooseFile')}
            </span>
            <input
              accept={workspaceBackupFileAccept}
              aria-label={t('backup.chooseFile')}
              className="sr-only"
              disabled={working}
              onChange={(event) => void chooseFile(event.target.files?.[0])}
              ref={fileInputRef}
              type="file"
            />
          </label>

          {backup ? (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border border-[var(--crt-line-lt)] p-3.5 text-sm">
                {rows.map(([term, value]) => (
                  <div className="contents" key={term}>
                    <dt className="text-[var(--crt-ink-3)]">{term}</dt>
                    <dd className="text-[var(--crt-ink)]">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <div className="grid gap-2">
                  <p>{t('backup.workspaceEffect')}</p>
                  <p>{t('backup.savedBanksEffect')}</p>
                </div>
              </div>
            </>
          ) : null}

          {error ? <ErrorNotice>{error}</ErrorNotice> : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              disabled={working || reading || !backup}
              onClick={() => void restore()}
              type="button"
              variant="destructive"
            >
              <HardDriveUpload />
              <span>{working ? t('backup.restoring') : t('backup.restoreAction')}</span>
            </Button>
          </div>
        </div>
      </DialogBody>
    </Dialog>
  )
}
