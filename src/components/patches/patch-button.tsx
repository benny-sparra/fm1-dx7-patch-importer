import { useSortable, type AnimateLayoutChanges } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Send } from 'lucide-react'

import { type Patch } from '@/data/patches'
import { cn } from '@/lib/utils'

type PatchButtonProps = {
  disabled?: boolean
  disabledTitle?: string
  isActive?: boolean
  onEdit?: (patch: Patch) => void
  onSend?: (patch: Patch) => void
  patch: Patch
}

const animateWhileSorting: AnimateLayoutChanges = ({ isSorting }) => isSorting

export function PatchButton({
  disabled = false,
  disabledTitle,
  isActive = false,
  onEdit,
  onSend,
  patch,
}: PatchButtonProps) {
  const sortable = useSortable({
    animateLayoutChanges: animateWhileSorting,
    id: patch.id,
    disabled: disabled || patch.family !== 'DX7',
  })

  return (
    <div
      className={cn(
        'patch-edge-gradient group relative h-full min-h-16 touch-none overflow-hidden rounded-lg border border-border/70 bg-background/50 shadow-sm backdrop-blur-[3px] transition duration-200 before:absolute before:inset-y-0 before:left-0 before:w-0.5 hover:border-primary/70 hover:bg-background/70 hover:shadow-[0_7px_20px_hsl(315_100%_55%_/_0.13)] data-[disabled=true]:opacity-50',
        isActive && 'border-primary ring-2 ring-primary/35',
      )}
      data-active={isActive}
      data-disabled={disabled}
      ref={sortable.setNodeRef}
      style={{ opacity: sortable.isDragging ? 0.55 : 1, transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition, zIndex: sortable.isDragging ? 10 : undefined }}
      title={disabled ? disabledTitle : undefined}
    >
      {!disabled && onEdit ? (
          <button
            aria-current={isActive ? 'true' : undefined}
            aria-label={`Edit ${patch.name}`}
            className="absolute inset-0 z-0 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            onClick={() => onEdit(patch)}
            title={`Open ${patch.name} in the voice editor`}
            type="button"
          />
        ) : null}
        <div className="pointer-events-none grid h-full min-h-16 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-2 p-2 pl-9 text-left">
          <span className="flex size-11 items-center justify-center rounded-md border border-primary/15 bg-muted/70 font-mono text-sm font-bold text-primary shadow-inner backdrop-blur-sm">
            {patch.bank}{patch.number.toString().padStart(2, '0')}
          </span>
          <span className="min-w-0 truncate text-sm font-semibold">
            {patch.name}
          </span>
          {!disabled ? (
            <span className="pointer-events-auto relative z-[1] flex">
              <button
                aria-label={`Send ${patch.name} to FM1`}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onSend?.(patch)}
                title="Send this patch to the FM1 edit buffer"
                type="button"
              >
                <Send className="size-4" />
              </button>
            </span>
          ) : null}
          {isActive ? (
            <span className="pointer-events-none absolute right-2 top-1 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-primary">
              Auditioning
            </span>
          ) : null}
        </div>
        {patch.family === 'DX7' ? (
          <button {...sortable.attributes} {...sortable.listeners} aria-label={`Reorder ${patch.name}`} className="absolute left-1.5 top-1/2 z-[1] -translate-y-1/2 cursor-grab rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing" title="Drag to reorder; use arrow keys when focused" type="button">
            <GripVertical className="size-4" />
          </button>
        ) : (
          <span aria-hidden="true" className="absolute left-1.5 top-1/2 z-[1] -translate-y-1/2 p-1 text-muted-foreground/20">
            <GripVertical className="size-4" />
          </span>
      )}
    </div>
  )
}
