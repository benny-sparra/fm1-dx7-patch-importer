import { Copy } from 'lucide-react'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { useWorkspaceBankLabel } from '@/components/patches/workspace-bank-label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type Patch } from '@/data/patches'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { dx7BankVoiceCount } from '@/lib/dx7'
import { patchSlotCode, type PatchLibrarySnapshot } from '@/lib/patch-library'

type CopyPatchDialogProps = {
  library: Pick<
    PatchLibrary,
    'bankNames' | 'copyVoice' | 'loadedBanks' | 'patches' | 'workspaceBanks'
  >
  onClose: () => void
  onCopied: (target: Patch, changed: PatchLibrarySnapshot | null) => void
  source: Patch
}

/**
 * Chooses a slot in any loaded bank to copy a sound over, naming the sound it replaces. It opens as
 * soon as it is rendered and reports closing, so the page can drop it.
 */
export function CopyPatchDialog({ library, onClose, onCopied, source }: CopyPatchDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const replacesId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bankSelectRef = useRef<HTMLSelectElement>(null)
  const bankLabel = useWorkspaceBankLabel(library)
  const [choice, setChoice] = useState<{ bank: string; slot: number } | null>(null)
  const [error, setError] = useState('')
  // Copying is offered only into banks that already hold sounds, so every slot has one to replace.
  const targetBanks = library.workspaceBanks.filter((candidate) =>
    library.loadedBanks.includes(candidate),
  )
  // Another bank's matching slot is the likeliest target. A choice whose bank has since gone falls
  // back to that default rather than naming a missing bank.
  const otherBank = targetBanks.find((candidate) => candidate !== source.bank)
  const chosen =
    choice && targetBanks.includes(choice.bank)
      ? choice
      : { bank: otherBank ?? source.bank, slot: source.number }
  const { bank } = chosen
  // The sound's own slot is never a target, so its place goes to the next slot.
  const slot =
    bank === source.bank && chosen.slot === source.number
      ? (source.number % dx7BankVoiceCount) + 1
      : chosen.slot
  const targetPatches = library.patches.filter(
    (patch) => patch.bank === bank && patch.id !== source.id,
  )
  const target = targetPatches.find((patch) => patch.number === slot)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    window.requestAnimationFrame(() => bankSelectRef.current?.focus())
  }, [])

  const choose = (next: { bank: string; slot: number }) => {
    setChoice(next)
    setError('')
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!target) return
    try {
      const changed = library.copyVoice(source.id, bank, slot)
      dialogRef.current?.close()
      onCopied(target, changed)
    } catch (cause) {
      setError(bankErrorMessage(t, cause, t('banks.copyFailed')))
    }
  }

  return (
    <Dialog
      aria-describedby={replacesId}
      aria-labelledby={titleId}
      onClose={onClose}
      ref={dialogRef}
      size="md"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>{t('banks.copyDialogTitle', { name: source.name })}</DialogTitle>
        <DialogCloseButton label={t('common.close')} onClick={() => dialogRef.current?.close()} />
      </DialogHeader>
      <DialogBody>
        <form className="grid gap-4 p-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              {t('banks.copyTargetBank')}
              <select
                className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => choose({ bank: event.target.value, slot })}
                ref={bankSelectRef}
                value={bank}
              >
                {targetBanks.map((candidate) => (
                  <option key={candidate} value={candidate}>
                    {candidate} — {bankLabel(candidate)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {t('banks.copyTargetSlot')}
              <select
                className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 font-mono text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => choose({ bank, slot: Number(event.target.value) })}
                value={slot}
              >
                {targetPatches.map((patch) => (
                  <option key={patch.id} value={patch.number}>
                    {patchSlotCode(patch)} {patch.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {target ? (
            <p
              aria-live="polite"
              className="text-sm leading-6 text-[var(--crt-ink-2)]"
              id={replacesId}
            >
              {t('banks.copyReplaces', { name: target.name, slot: patchSlotCode(target) })}
            </p>
          ) : null}

          {error ? (
            <p
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button disabled={!target} type="submit">
              <Copy />
              {t('banks.copyAction', { slot: target ? patchSlotCode(target) : '' })}
            </Button>
          </div>
        </form>
      </DialogBody>
    </Dialog>
  )
}
