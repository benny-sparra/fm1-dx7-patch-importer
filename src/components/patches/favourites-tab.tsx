import { useDndContext, useDroppable } from '@dnd-kit/core'
import { useTranslation } from 'react-i18next'

import { favouritesBank } from '@/lib/favourites'
import { cn } from '@/lib/utils'

import { bankDropId } from './bank-drop'
import { PixelHeartIcon } from './favourite-button'

type FavouritesTabProps = {
  count: number
  onSelect: () => void
  selected: boolean
}

/**
 * Favourites' place in the bank rail, below the workspace banks. It shares the grid's drag context,
 * so a slot dropped on it is added to Favourites.
 */
export function FavouritesTab({ count, onSelect, selected }: FavouritesTabProps) {
  const { i18n, t } = useTranslation()
  // As on a bank tab, a keyboard drag stays in the grid, where the heart is the keyboard route.
  const { activatorEvent } = useDndContext()
  const droppable = useDroppable({
    disabled: activatorEvent instanceof KeyboardEvent,
    id: bankDropId(favouritesBank),
  })
  const isDropTarget = droppable.isOver && droppable.active?.data.current?.bank !== favouritesBank
  const title = t('favourites.title')

  return (
    <div
      className={cn(
        'bank-tab relative mx-2 mb-2 flex items-center border-t border-r border-b border-l px-1.5 py-[7px] whitespace-nowrap transition-colors md:px-2',
        'border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)]',
        selected
          ? 'bank-tab-active z-10 border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-sel-bg)]'
          : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] hover:bg-[var(--crt-bg-head)]',
      )}
      data-drop-target={isDropTarget || undefined}
      ref={droppable.setNodeRef}
    >
      <button
        aria-label={title}
        aria-pressed={selected}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-[9px] text-left focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
        onClick={onSelect}
        title={t('favourites.tabTitle')}
        type="button"
      >
        <span
          className={cn(
            'grid h-[26px] w-[26px] shrink-0 place-items-center border bg-[var(--crt-bg-well)]',
            selected
              ? 'border-[var(--crt-acc)] text-[var(--crt-acc-br)]'
              : 'border-[var(--crt-line)] text-[var(--crt-acc-lt)]',
          )}
        >
          <PixelHeartIcon aria-hidden="true" className="size-3.5" filled />
        </span>
        <span
          className={cn(
            'font-dot-matrix hidden min-w-0 flex-1 truncate text-left text-[14px] font-bold md:block',
            selected ? 'text-[var(--crt-led)]' : 'text-[var(--crt-ink-2)]',
          )}
        >
          {title}
        </span>
        {/* The tab keeps a stable name; opening it lists the favourites a screen reader counts. */}
        <span
          aria-hidden="true"
          className="font-vt323 hidden shrink-0 text-[18px] leading-none text-[var(--crt-ink-3)] md:block"
        >
          {new Intl.NumberFormat(i18n.resolvedLanguage).format(count)}
        </span>
      </button>
    </div>
  )
}
