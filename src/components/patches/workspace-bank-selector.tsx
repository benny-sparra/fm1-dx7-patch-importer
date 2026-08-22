import { EllipsisVertical } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef } from 'react'

import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { cn } from '@/lib/utils'

export type WorkspaceBankSelectorBank = {
  actionsLabel?: string
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
        'relative -mr-px flex w-full items-center gap-1 border-y border-r border-l-4 px-2 py-2 whitespace-nowrap transition-colors',
        selected
          ? 'bank-tab-active z-10 border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-transparent text-foreground/80 hover:border-y-border hover:border-l-border hover:bg-muted/60 hover:text-foreground',
      )}
    >
      <button
        aria-describedby={bank.description ? descriptionId : undefined}
        aria-label={selectionLabel}
        aria-pressed={selected}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={onSelect}
        onKeyDown={(event) => onKeyDown(event, index)}
        ref={(button) => registerButton(bank.id, button)}
        tabIndex={selected ? 0 : -1}
        title={bank.description || bank.name}
        type="button"
      >
        <span className="font-vt323 grid size-8 shrink-0 place-items-center rounded border border-current/50 text-base font-bold">
          {bank.id}
        </span>
        <span className="font-dot-matrix hidden min-w-0 flex-1 truncate px-2 py-1 text-left text-base font-bold sm:block">
          {bank.name}
        </span>
      </button>
      {bank.description ? (
        <span className="sr-only" id={descriptionId}>
          {bank.description}
        </span>
      ) : null}
      <details className="group relative shrink-0" ref={detailsRef}>
        <summary
          aria-label={bank.actionsLabel ?? `Actions for ${bank.name}`}
          className={cn(
            'grid size-8 cursor-pointer list-none place-items-center rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring [&::-webkit-details-marker]:hidden',
            selected ? 'hover:bg-primary-foreground/15' : 'hover:bg-foreground/10',
          )}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            detailsRef.current?.toggleAttribute('open')
          }}
          title={bank.actionsLabel ?? `Actions for ${bank.name}`}
        >
          <EllipsisVertical className="size-4" />
        </summary>
        <div className="font-vt323 absolute top-0 left-full z-40 min-w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
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
    <ul aria-label={label} className="flex list-none flex-col p-0">
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
