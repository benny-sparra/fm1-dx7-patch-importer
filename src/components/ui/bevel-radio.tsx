import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** The librarian's bevelled bank tab and patch cell: raised, with the chosen one tinted. */
function bevelClassName(selected: boolean) {
  return cn(
    'border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] transition-colors',
    selected
      ? 'border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-sel-bg)]'
      : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel3)] hover:bg-[var(--crt-bg-head)]',
  )
}

/** The boxed seven-segment slot code beside a patch's name, or a bank's letter in the rail. */
export function slotBadgeClassName(selected: boolean) {
  return cn(
    'font-seven-segment grid min-w-[26px] shrink-0 place-items-center border bg-[var(--crt-bg-well)] px-1.5 pt-1.5 pb-1 text-[18px] leading-none',
    selected
      ? 'border-[var(--crt-acc)] text-[var(--crt-acc-br)]'
      : 'border-[var(--crt-line)] text-[var(--crt-acc-lt)]',
  )
}

type BevelRadioProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'children' | 'className' | 'type'
> & {
  children: ReactNode
  /** Layout for the content, such as padding and gaps; the bevel and colours are fixed. */
  className?: string
}

/**
 * One choice of a radio group, drawn as a bevelled cell like the librarian's bank tabs and patch
 * cells. The native radio stays in the page, hidden, so the arrow keys and the group's name work.
 */
export function BevelRadio({ checked, children, className, ...props }: BevelRadioProps) {
  return (
    <label className="block cursor-pointer has-disabled:cursor-not-allowed">
      <input {...props} checked={checked} className="peer sr-only" type="radio" />
      <span
        className={cn(
          bevelClassName(Boolean(checked)),
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--crt-led)] peer-disabled:opacity-50',
          className ?? 'flex items-center gap-2 px-2 py-2',
        )}
      >
        {children}
      </span>
    </label>
  )
}
