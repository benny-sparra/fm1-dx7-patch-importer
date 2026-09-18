import { useSortable, type AnimateLayoutChanges } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { type Patch } from '@/data/patches'
import { librarianShortcuts, matchesShortcut } from '@/lib/keyboard-shortcuts'
import { patchSlotCode } from '@/lib/patch-library'
import { cn } from '@/lib/utils'

import { PatchSlotMenu } from './patch-slot-menu'

type PatchButtonProps = {
  disabled?: boolean
  disabledTitle?: string
  isActive?: boolean
  onCopy?: (patch: Patch) => void
  onEdit?: (patch: Patch) => void
  /** Arrow-key navigation across the grid, owned by the grid itself. */
  onNavigate?: (event: KeyboardEvent<HTMLButtonElement>, patch: Patch) => void
  onSelect?: (patch: Patch) => void
  patch: Patch
  /** False while the slot is shown away from its bank, such as in search results. */
  reorderable?: boolean
  registerButton?: (patchId: string, button: HTMLButtonElement | null) => void
  /** The grid is one tab stop: only its roving slot is reachable with Tab. */
  tabIndex?: number
}

const animateWhileSorting: AnimateLayoutChanges = ({ isSorting }) => isSorting

export function PatchButton({
  disabled = false,
  disabledTitle,
  isActive = false,
  onCopy,
  onEdit,
  onNavigate,
  onSelect,
  patch,
  reorderable = true,
  registerButton,
  tabIndex,
}: PatchButtonProps) {
  const { t } = useTranslation()
  // Set by a click and cleared when the selection animation finishes, so the
  // animation plays only in response to the user and never on mount.
  const [flash, setFlash] = useState(false)
  const canReorder = reorderable && patch.family === 'DX7'
  const sortable = useSortable({
    animateLayoutChanges: animateWhileSorting,
    id: patch.id,
    disabled: disabled || !canReorder,
  })

  return (
    <div
      className={cn(
        'patch-cell patch-edge-gradient group relative flex h-full min-h-12 items-center gap-2 px-2 py-2 transition-colors duration-150',
        'border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)]',
        'data-[disabled=true]:opacity-50',
        isActive
          ? 'border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-sel-bg)]'
          : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel3)] hover:bg-[var(--crt-bg-head)]',
      )}
      data-active={isActive}
      data-disabled={disabled}
      data-flash={flash}
      onAnimationEnd={(event) => {
        if (event.animationName === 'patch-cell-select') setFlash(false)
      }}
      ref={sortable.setNodeRef}
      style={{
        opacity: sortable.isDragging ? 0.55 : 1,
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        zIndex: sortable.isDragging ? 10 : undefined,
      }}
      title={disabled ? disabledTitle : undefined}
    >
      {/*
        A single click plays the slot on the FM1; a double click opens it in
        the editor. Enter matches that from the keyboard: it plays an unlit
        slot, then opens the lit one. The toolbar's Edit button remains the
        signposted route.
      */}
      {!disabled && (onSelect || onEdit) ? (
        <button
          aria-current={isActive ? 'true' : undefined}
          aria-label={t('banks.sendPatch', { name: patch.name })}
          className="absolute inset-0 z-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)]"
          onClick={() => {
            setFlash(true)
            onSelect?.(patch)
          }}
          onDoubleClick={() => onEdit?.(patch)}
          onKeyDown={(event) => {
            if (matchesShortcut(event, librarianShortcuts.openSlot)) {
              if (!isActive || !onEdit) return
              // Claim the key so it does not also fire the button's own click.
              event.preventDefault()
              onEdit(patch)
              return
            }
            onNavigate?.(event, patch)
          }}
          ref={(button) => registerButton?.(patch.id, button)}
          tabIndex={tabIndex}
          title={
            isActive
              ? t('banks.slotEditTitle', { name: patch.name })
              : patch.program === undefined
                ? t('banks.slotEditBufferTitle', { name: patch.name })
                : t('banks.slotTitle', { name: patch.name })
          }
          type="button"
        />
      ) : null}
      {/* Only the grip starts a drag, so only the grip stops touch scrolling. */}
      {!reorderable ? (
        // Keeps the slot code where it sits in a bank, without a grip that cannot move anything.
        <span aria-hidden="true" className="-my-1 -mr-2 -ml-4 size-6 shrink-0" />
      ) : canReorder ? (
        <button
          {...sortable.attributes}
          {...sortable.listeners}
          aria-label={t('banks.reorder', { name: patch.name })}
          className="z-[1] -my-1 -mr-2 -ml-4 grid size-6 shrink-0 cursor-grab touch-none place-items-center text-[var(--crt-ink-4)] transition-colors hover:text-[var(--crt-acc-lt)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--crt-led)] active:cursor-grabbing"
          title={t('banks.reorderTitle')}
          type="button"
        >
          <GripVertical aria-hidden="true" className="size-3.5" />
        </button>
      ) : (
        <span
          aria-hidden="true"
          className="-my-1 -mr-2 -ml-4 grid size-6 shrink-0 place-items-center text-[var(--crt-line-dk)]"
        >
          <GripVertical className="size-3.5" />
        </span>
      )}
      <span
        className={cn(
          'patch-slot font-vt323 pointer-events-none shrink-0 border px-1.5 pt-1.5 pb-1 text-[18px] leading-none',
          'bg-[var(--crt-bg-well)]',
          isActive
            ? 'border-[var(--crt-acc)] text-[var(--crt-acc-br)]'
            : 'border-[var(--crt-line)] text-[var(--crt-acc-lt)]',
        )}
      >
        {patchSlotCode(patch)}
      </span>
      <span
        className={cn(
          'patch-name font-dot-matrix pointer-events-none min-w-0 flex-1 truncate text-[14px] font-bold whitespace-pre',
          isActive ? 'text-white' : 'text-[var(--crt-ink)]',
        )}
      >
        {patch.name}
      </span>
      {/* Above the slot's own button, like the grip, so opening it does not also play the slot. */}
      {!disabled && (onEdit || onCopy) ? (
        <PatchSlotMenu
          name={patch.name}
          onCopy={onCopy && (() => onCopy(patch))}
          onEdit={onEdit && (() => onEdit(patch))}
        />
      ) : null}
      {isActive ? <span className="sr-only">{t('banks.auditioning')}</span> : null}
    </div>
  )
}
