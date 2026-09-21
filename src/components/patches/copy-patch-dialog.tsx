import { Copy } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
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
import { ErrorNotice } from '@/components/ui/error-notice'
import type { Patch } from '@/data/patches'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { dx7BankVoiceCount } from '@/lib/dx7'
import { patchSlotCode, type PatchLibrarySnapshot } from '@/lib/patch-library'
import { resolveGridKey } from '@/lib/patch-grid-navigation'
import { cn } from '@/lib/utils'

type CopyPatchDialogProps = {
  /** The bank to open on, such as the tab a slot was dropped on. */
  initialBank?: string
  library: Pick<
    PatchLibrary,
    'bankNames' | 'copyVoice' | 'loadedBanks' | 'patches' | 'workspaceBanks'
  >
  onClose: () => void
  onCopied: (target: Patch, changed: PatchLibrarySnapshot | null) => void
  source: Patch
}

type Choice = { bank: string; slot: number }

/**
 * The slot a move lands on, stepping past `avoided` in the direction of travel. A move that would
 * leave the bank to get past it stays where it was.
 */
function avoidSlot(next: number, previous: number, avoided: number) {
  if (next !== avoided) return next
  const step = next < previous ? -1 : 1
  const beyond = next + step
  if (beyond >= 1 && beyond <= dx7BankVoiceCount) return beyond
  return previous !== next ? previous : next - step
}

/**
 * Chooses a slot in any loaded bank to copy a sound over, naming the sound it replaces. The bank
 * tabs and slot grid move the choice, which an FM1-style readout shows.
 * It opens as soon as it is rendered and reports closing, so the page can drop it.
 */
export function CopyPatchDialog({
  initialBank,
  library,
  onClose,
  onCopied,
  source,
}: CopyPatchDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const replacesId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cellRefs = useRef(new Map<number, HTMLButtonElement>())
  const focusChosenCell = useRef(false)
  const bankLabel = useWorkspaceBankLabel(library)
  const [choice, setChoice] = useState<Choice | null>(
    initialBank ? { bank: initialBank, slot: source.number } : null,
  )
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
  const avoidedSlot = (candidate: string) => (candidate === source.bank ? source.number : 0)
  const slot = avoidSlot(chosen.slot, chosen.slot, avoidedSlot(bank))
  const targetPatches = library.patches.filter((patch) => patch.bank === bank)
  const target = targetPatches.find((patch) => patch.number === slot && patch.id !== source.id)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    window.requestAnimationFrame(() => cellRefs.current.get(slot)?.focus())
    // Opening happens once; later choices move focus themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!focusChosenCell.current) return
    focusChosenCell.current = false
    cellRefs.current.get(slot)?.focus()
  }, [bank, slot])

  const choose = (nextBank: string | undefined, nextSlot: number) => {
    if (!nextBank) return
    setChoice({ bank: nextBank, slot: avoidSlot(nextSlot, slot, avoidedSlot(nextBank)) })
    setError('')
  }

  const moveInGrid = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = targetPatches.findIndex((patch) => patch.number === slot)
    const next = resolveGridKey(event.key, index, () =>
      targetPatches.map(
        (patch) => cellRefs.current.get(patch.number)?.getBoundingClientRect().top ?? 0,
      ),
    )
    if (next === null) return
    event.preventDefault()
    focusChosenCell.current = true
    choose(bank, targetPatches[next]?.number ?? slot)
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
      size="xl"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>{t('banks.copyDialogTitle', { name: source.name })}</DialogTitle>
        <DialogCloseButton label={t('common.close')} onClick={() => dialogRef.current?.close()} />
      </DialogHeader>
      <DialogBody>
        <form className="grid gap-4 p-4 sm:p-5" onSubmit={submit}>
          {/* The readout repeats what the grid and the sentence below already say, for the eye. */}
          <div aria-hidden="true" className="crt-inset min-w-0 bg-[var(--crt-bg-1)] px-3 py-2.5">
            <p className="font-dot-matrix mb-2 truncate text-[13px] font-bold tracking-[0.1em] text-[var(--crt-acc-lt)] uppercase">
              {bankLabel(bank)}
            </p>
            <p
              className="copy-readout font-vt323 truncate pb-1 text-[30px] leading-[1.15] text-[var(--crt-led)] [text-shadow:0_0_10px_var(--crt-led-glow)]"
              key={`${bank}-${slot}`}
            >
              {target ? `${patchSlotCode(target)} ${target.name}` : '---'}
            </p>
            <p className="font-vt323 mt-0.5 truncate pb-0.5 text-lg leading-[1.2] text-[var(--crt-ink-3)]">
              ◂ {patchSlotCode(source)} {source.name} · {bankLabel(source.bank)}
            </p>
          </div>

          <div aria-label={t('banks.copyTargetBank')} className="flex flex-wrap gap-1" role="group">
            {targetBanks.map((candidate) => (
              <button
                aria-label={`${candidate} — ${bankLabel(candidate)}`}
                aria-pressed={candidate === bank}
                className={cn(
                  'font-vt323 grid min-w-9 cursor-pointer place-items-center border px-2 pt-1.5 pb-1 text-[18px] leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]',
                  candidate === bank
                    ? 'border-[var(--crt-acc)] bg-[var(--crt-sel-bg)] text-[var(--crt-acc-br)]'
                    : 'border-[var(--crt-line)] bg-[var(--crt-bg-well)] text-[var(--crt-acc-lt)] hover:bg-[var(--crt-bg-head)]',
                )}
                key={candidate}
                onClick={() => choose(candidate, slot)}
                title={bankLabel(candidate)}
                type="button"
              >
                {candidate}
              </button>
            ))}
          </div>

          <div
            aria-label={t('banks.copyTargetSlot')}
            className="grid grid-cols-4 gap-1 sm:grid-cols-8"
            role="group"
          >
            {targetPatches.map((patch) => {
              const isChosen = patch.number === slot
              return (
                <button
                  aria-label={`${patchSlotCode(patch)} ${patch.name}`}
                  aria-pressed={isChosen}
                  className={cn(
                    'font-vt323 cursor-pointer border py-1.5 text-[18px] leading-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:cursor-not-allowed disabled:opacity-35',
                    isChosen
                      ? 'border-[var(--crt-led)] bg-[var(--crt-bg-1)] text-[var(--crt-led)] shadow-[0_0_8px_var(--crt-led-glow)]'
                      : 'border-[var(--crt-line)] bg-[var(--crt-bg-well)] text-[var(--crt-acc-lt)] hover:bg-[var(--crt-bg-head)]',
                  )}
                  disabled={patch.id === source.id}
                  key={patch.id}
                  onClick={() => choose(bank, patch.number)}
                  onKeyDown={moveInGrid}
                  ref={(button) => {
                    if (button) cellRefs.current.set(patch.number, button)
                    else cellRefs.current.delete(patch.number)
                  }}
                  tabIndex={isChosen ? 0 : -1}
                  title={patch.name}
                  type="button"
                >
                  {patchSlotCode(patch)}
                </button>
              )
            })}
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

          {error ? <ErrorNotice>{error}</ErrorNotice> : null}

          <div className="flex justify-end">
            <Button disabled={!target} type="submit">
              <Copy />
              <span>{t('banks.copyAction', { slot: target ? patchSlotCode(target) : '' })}</span>
            </Button>
          </div>
        </form>
      </DialogBody>
    </Dialog>
  )
}
