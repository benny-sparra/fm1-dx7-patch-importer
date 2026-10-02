import { Files } from 'lucide-react'
import { useEffect, useId, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useWorkspaceBankLabel } from '@/components/patches/workspace-bank-label'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Patch } from '@/data/patches'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { findDuplicatePatches } from '@/lib/duplicate-patches'
import { patchSlotCode } from '@/lib/patch-library'

type DuplicatePatchesDialogProps = {
  library: Pick<
    PatchLibrary,
    'bankNames' | 'effects' | 'loadedBanks' | 'patches' | 'voices' | 'workspaceBanks'
  >
  /** Called once the dialog has closed, with the patch chosen to go to, if one was. */
  onClose: (chosen: Patch | null) => void
}

/**
 * Lists the patches in the loaded banks that share their voice settings, so the copies an imported
 * archive brought in can be found. It only reads the library: choosing a patch closes the dialog
 * for the librarian to go to it.
 */
export function DuplicatePatchesDialog({ library, onClose }: DuplicatePatchesDialogProps) {
  const { i18n, t } = useTranslation()
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const firstPatchRef = useRef<HTMLButtonElement>(null)
  const chosen = useRef<Patch | null>(null)
  const workspaceBankLabel = useWorkspaceBankLabel(library)
  const numberFormat = new Intl.NumberFormat(i18n.resolvedLanguage)

  // Worked out as the dialog opens; the library cannot change behind a modal dialog.
  const groups = useMemo(
    () =>
      findDuplicatePatches(library.patches, library.voices, library.effects, library.loadedBanks),
    [library.effects, library.loadedBanks, library.patches, library.voices],
  )

  // The librarian mounts this dialog only while it is wanted, so it opens itself as it appears,
  // on the first patch listed, or on its close button when there are none.
  useEffect(() => {
    dialogRef.current?.showModal()
    firstPatchRef.current?.focus()
  }, [])

  const goTo = (patch: Patch) => {
    chosen.current = patch
    dialogRef.current?.close()
  }

  return (
    <Dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      onClose={() => onClose(chosen.current)}
      ref={dialogRef}
      size="xl"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>{t('duplicates.title')}</DialogTitle>
        <DialogCloseButton label={t('common.close')} onClick={() => dialogRef.current?.close()} />
      </DialogHeader>
      <DialogBody>
        <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]" id={descriptionId}>
          {t('duplicates.help')}
        </p>
        {groups.length === 0 ? (
          <p className="p-4 text-sm">{t('duplicates.none')}</p>
        ) : (
          <ul className="grid gap-4 p-4">
            {groups.map(({ effectsDiffer, patches }, groupIndex) => {
              const headingId = `${titleId}-${groupIndex}`
              return (
                <li key={patches[0].id}>
                  <section aria-labelledby={headingId} className="grid gap-1.5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold" id={headingId}>
                      <Files
                        aria-hidden="true"
                        className="size-4 shrink-0 text-[var(--crt-acc-lt)]"
                      />
                      {t('duplicates.group', {
                        count: patches.length - 1,
                        name: patches[0].name.trim(),
                      })}
                    </h3>
                    {effectsDiffer ? (
                      <p className="text-xs text-[var(--crt-ink-3)]">
                        {t('duplicates.effectsDiffer')}
                      </p>
                    ) : null}
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {patches.map((patch, index) => {
                        const bank = workspaceBankLabel(patch.bank)
                        return (
                          <li key={patch.id}>
                            <button
                              aria-label={t('duplicates.goTo', {
                                bank,
                                name: patch.name.trim(),
                                number: numberFormat.format(patch.number),
                              })}
                              className="patch-cell flex min-h-9 w-full cursor-pointer items-center gap-1.5 border border-[var(--crt-line)] bg-[var(--crt-bg-panel3)] px-1.5 py-1 text-left transition-colors duration-150 hover:bg-[var(--crt-bg-head)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)]"
                              onClick={() => goTo(patch)}
                              ref={groupIndex === 0 && index === 0 ? firstPatchRef : undefined}
                              type="button"
                            >
                              <span className="font-vt323 shrink-0 text-[16px] leading-none text-[var(--crt-acc-lt)]">
                                {patchSlotCode(patch)}
                              </span>
                              <span className="font-dot-matrix min-w-0 truncate text-[13px] font-bold whitespace-pre text-[var(--crt-ink)]">
                                {patch.name}
                              </span>
                              <span className="ml-auto min-w-0 shrink truncate text-xs text-[var(--crt-ink-3)]">
                                {bank}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                </li>
              )
            })}
          </ul>
        )}
      </DialogBody>
    </Dialog>
  )
}
