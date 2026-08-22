import { useSortable, type AnimateLayoutChanges } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { type Patch } from '@/data/patches'
import { cn } from '@/lib/utils'

type PatchButtonProps = {
  disabled?: boolean
  disabledTitle?: string
  isActive?: boolean
  onEdit?: (patch: Patch) => void
  patch: Patch
}

const animateWhileSorting: AnimateLayoutChanges = ({ isSorting }) => isSorting

export function PatchButton({
  disabled = false,
  disabledTitle,
  isActive = false,
  onEdit,
  patch,
}: PatchButtonProps) {
  const { t } = useTranslation()
  const sortable = useSortable({
    animateLayoutChanges: animateWhileSorting,
    id: patch.id,
    disabled: disabled || patch.family !== 'DX7',
  })

  return (
    <div
      className={cn(
        'patch-edge-gradient group relative h-full min-h-16 touch-none overflow-hidden rounded-lg border border-border/70 bg-background/50 shadow-sm backdrop-blur-[3px] transition duration-200 before:absolute before:inset-y-0 before:left-0 before:w-0.5 hover:border-primary/70 hover:bg-background/70 data-[disabled=true]:opacity-50',
        isActive && 'border-primary ring-2 ring-primary/35',
      )}
      data-active={isActive}
      data-disabled={disabled}
      ref={sortable.setNodeRef}
      style={{
        opacity: sortable.isDragging ? 0.55 : 1,
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        zIndex: sortable.isDragging ? 10 : undefined,
      }}
      title={disabled ? disabledTitle : undefined}
    >
      {!disabled && onEdit ? (
        <button
          aria-current={isActive ? 'true' : undefined}
          aria-label={t('banks.edit', { name: patch.name })}
          className="absolute inset-0 z-0 cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
          onClick={() => onEdit(patch)}
          title={t('banks.openEditor', { name: patch.name })}
          type="button"
        />
      ) : null}
      <div className="pointer-events-none grid h-full min-h-16 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-1 p-2 pl-9 text-left">
        <span className="patch-slot font-dot-matrix flex size-11 items-center justify-center rounded-md border border-primary/15 bg-muted/70 text-sm font-bold text-[var(--hero-accent)] shadow-inner backdrop-blur-sm">
          {patch.bank}
          {patch.number.toString().padStart(2, '0')}
        </span>
        <span className="patch-name font-dot-matrix min-w-0 truncate text-sm font-bold whitespace-pre text-white">
          {patch.name}
        </span>
        {isActive ? (
          <span className="pointer-events-none absolute top-1 right-2 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black tracking-wide text-white uppercase">
            {t('banks.auditioning')}
          </span>
        ) : null}
      </div>
      {patch.family === 'DX7' ? (
        <button
          {...sortable.attributes}
          {...sortable.listeners}
          aria-label={t('banks.reorder', { name: patch.name })}
          className="absolute top-1/2 left-1.5 z-[1] -translate-y-1/2 cursor-grab rounded p-1 text-[var(--hero-accent)] hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
          title={t('banks.reorderTitle')}
          type="button"
        >
          <GripVertical className="size-4" />
        </button>
      ) : (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1.5 z-[1] -translate-y-1/2 p-1 text-muted-foreground/20"
        >
          <GripVertical className="size-4" />
        </span>
      )}
    </div>
  )
}
