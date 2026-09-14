import { EllipsisVertical } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef } from 'react'

import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { cn } from '@/lib/utils'

export type WorkspaceBankSelectorBank = {
  /** The translated name of the bank's actions menu. */
  actionsLabel: string
  description?: string
  id: string
  name: string
}

type WorkspaceBankRowProps = {
  bank: WorkspaceBankSelectorBank
  index: number
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void
  onSelect: () => void
  registerButton: (bank: string, button: HTMLButtonElement | null) => void
  renderActions: (bank: WorkspaceBankSelectorBank, closeActions: () => void) => ReactNode
  selected: boolean
}

function WorkspaceBankRow({
  bank,
  index,
  onKeyDown,
  onSelect,
  registerButton,
  renderActions,
  selected,
}: WorkspaceBankRowProps) {
  const detailsRef = useDismissableDetails()
  const descriptionId = useId()
  const closeActions = () => detailsRef.current?.removeAttribute('open')
  const selectionLabel = `${bank.id} — ${bank.name}`

  useEffect(() => {
    const details = detailsRef.current
    if (!selected) details?.removeAttribute('open')
  }, [detailsRef, selected])

  return (
    <li
      className={cn(
        // The narrow rail only has room for the slot badge and the menu button,
        // so the gutters tighten until the name has space to show.
        'relative flex w-full items-center gap-1 border-t border-r border-b border-l px-1.5 py-[7px] whitespace-nowrap transition-colors md:gap-[9px] md:px-2',
        'border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)]',
        selected
          ? 'bank-tab-active z-10 border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-sel-bg)]'
          : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] hover:bg-[var(--crt-bg-head)]',
      )}
    >
      <button
        aria-describedby={bank.description ? descriptionId : undefined}
        aria-label={selectionLabel}
        aria-pressed={selected}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-[9px] text-left focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
        onClick={onSelect}
        onKeyDown={(event) => onKeyDown(event, index)}
        ref={(button) => registerButton(bank.id, button)}
        tabIndex={selected ? 0 : -1}
        title={bank.description || bank.name}
        type="button"
      >
        <span
          className={cn(
            'font-vt323 grid w-[26px] shrink-0 place-items-center border bg-[var(--crt-bg-well)] px-1.5 pt-1.5 pb-1 text-[18px] leading-none',
            selected
              ? 'border-[var(--crt-acc)] text-[var(--crt-acc-br)]'
              : 'border-[var(--crt-line)] text-[var(--crt-acc-lt)]',
          )}
        >
          {bank.id}
        </span>
        <span
          className={cn(
            'font-dot-matrix hidden min-w-0 flex-1 truncate text-left text-[14px] font-bold md:block',
            selected ? 'text-[var(--crt-led)]' : 'text-[var(--crt-ink-2)]',
          )}
        >
          {bank.name}
        </span>
      </button>
      {bank.description ? (
        <span className="sr-only" id={descriptionId}>
          {bank.description}
        </span>
      ) : null}
      {/* The narrow rail has no room beside the badge, so there the menu lives
          next to the bank name above the grid instead. */}
      <details className="group relative hidden shrink-0 md:block" ref={detailsRef}>
        <summary
          aria-label={bank.actionsLabel}
          className={cn(
            'grid h-6 w-5 cursor-pointer list-none place-items-center border-t border-r border-b border-l border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--crt-led)] [&::-webkit-details-marker]:hidden',
            selected
              ? 'text-[var(--crt-led)] group-open:bg-[var(--crt-bg-1)]'
              : 'text-[var(--crt-ink-2)] group-open:bg-[var(--crt-bg-1)]',
          )}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            detailsRef.current?.toggleAttribute('open')
          }}
          title={bank.actionsLabel}
        >
          <EllipsisVertical className="size-3.5" />
        </summary>
        {/*
          The menu swings out to the right of the row, clear of the tab's
          edge, so it never covers the neighbouring banks.
        */}
        <div className="menu-surface absolute top-0 left-[calc(100%+10px)] z-40 min-w-56 border-t-2 border-r-2 border-b-2 border-l-2 border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel2)] p-1 text-[var(--crt-ink)] sm:w-[214px]">
          {renderActions(bank, closeActions)}
        </div>
      </details>
    </li>
  )
}

type WorkspaceBankSelectorProps = {
  banks: WorkspaceBankSelectorBank[]
  label: string
  onSelect: (bank: string) => void
  renderActions: (bank: WorkspaceBankSelectorBank, closeActions: () => void) => ReactNode
  selectedBank: string
}

/**
 * A named list of toggle buttons. Only the selected button is in the Tab order;
 * Up/Down wrap through the list, while Home/End jump to its bounds.
 */
export function WorkspaceBankSelector({
  banks,
  label,
  onSelect,
  renderActions,
  selectedBank,
}: WorkspaceBankSelectorProps) {
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const previousBanksRef = useRef(banks.map((bank) => bank.id))
  const previousSelectedBankRef = useRef(selectedBank)
  const effectiveSelectedBank = useMemo(
    () => (banks.some((bank) => bank.id === selectedBank) ? selectedBank : (banks[0]?.id ?? '')),
    [banks, selectedBank],
  )

  useEffect(() => {
    const selectedBankWasRemoved =
      previousBanksRef.current.includes(previousSelectedBankRef.current) &&
      !banks.some((bank) => bank.id === previousSelectedBankRef.current)

    if (selectedBankWasRemoved && effectiveSelectedBank) {
      buttonRefs.current.get(effectiveSelectedBank)?.focus()
    }
    previousBanksRef.current = banks.map((bank) => bank.id)
    previousSelectedBankRef.current = effectiveSelectedBank
  }, [banks, effectiveSelectedBank])

  const registerButton = (bank: string, button: HTMLButtonElement | null) => {
    if (button) buttonRefs.current.set(bank, button)
    else buttonRefs.current.delete(bank)
  }

  const selectFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (banks.length === 0) return
    const nextIndex =
      event.key === 'ArrowDown'
        ? (index + 1) % banks.length
        : event.key === 'ArrowUp'
          ? (index - 1 + banks.length) % banks.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? banks.length - 1
              : null

    if (nextIndex === null) return
    event.preventDefault()
    const nextBank = banks[nextIndex].id
    onSelect(nextBank)
    buttonRefs.current.get(nextBank)?.focus()
  }

  return (
    <ul aria-label={label} className="flex list-none flex-col gap-1.5 p-2">
      {banks.map((bank, index) => (
        <WorkspaceBankRow
          bank={bank}
          index={index}
          key={bank.id}
          onKeyDown={selectFromKeyboard}
          onSelect={() => onSelect(bank.id)}
          registerButton={registerButton}
          renderActions={renderActions}
          selected={effectiveSelectedBank === bank.id}
        />
      ))}
    </ul>
  )
}
