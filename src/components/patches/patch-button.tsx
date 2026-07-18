import { useSortable, type AnimateLayoutChanges } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { type Patch } from '@/data/patches'

type PatchButtonProps = { disabled?: boolean; disabledTitle?: string; onRename: (id: string, name: string) => void; patch: Patch }

const animateWhileSorting: AnimateLayoutChanges = ({ isSorting }) => isSorting

export function PatchButton({ disabled = false, disabledTitle, onRename, patch }: PatchButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(patch.name)
  const sortable = useSortable({
    animateLayoutChanges: animateWhileSorting,
    id: patch.id,
    disabled: disabled || patch.family !== 'DX7',
  })

  const openRenameDialog = () => {
    setName(patch.name)
    dialogRef.current?.showModal()
    requestAnimationFrame(() => inputRef.current?.select())
  }

  const closeRenameDialog = () => dialogRef.current?.close()

  const saveName = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    onRename(patch.id, trimmedName)
    closeRenameDialog()
  }

  return (
    <>
      <motion.div
        className="patch-edge-gradient group relative h-full min-h-16 touch-none overflow-hidden rounded-lg border border-border/70 bg-background/50 shadow-sm backdrop-blur-[3px] transition duration-200 before:absolute before:inset-y-0 before:left-0 before:w-0.5 hover:border-primary/70 hover:bg-background/70 hover:shadow-[0_7px_20px_hsl(315_100%_55%_/_0.13)] data-[disabled=true]:opacity-50"
        data-disabled={disabled}
        ref={sortable.setNodeRef}
        style={{ opacity: sortable.isDragging ? 0.55 : 1, transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition, zIndex: sortable.isDragging ? 10 : undefined }}
        title={disabled ? disabledTitle : undefined}
      >
        <div className="pointer-events-none grid h-full min-h-16 grid-cols-[2.75rem_1fr] items-center gap-2 p-2 pl-9 text-left">
          <span className="flex size-11 items-center justify-center rounded-md border border-primary/15 bg-muted/70 font-mono text-sm font-bold text-primary shadow-inner backdrop-blur-sm">
            {patch.bank}{patch.number.toString().padStart(2, '0')}
          </span>
          <button
            className="pointer-events-auto relative z-[1] min-w-0 cursor-text truncate rounded-sm text-left text-sm font-semibold hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
            disabled={disabled}
            onClick={openRenameDialog}
            title={`Rename ${patch.name}`}
            type="button"
          >
            {patch.name}
          </button>
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
      </motion.div>

      <dialog
        aria-labelledby={`rename-patch-${patch.id}`}
        className="fixed inset-0 z-50 m-auto w-[min(420px,calc(100vw-2rem))] rounded-lg border border-primary/30 bg-card p-0 text-card-foreground shadow-2xl"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeRenameDialog()
        }}
        ref={dialogRef}
      >
        <form onSubmit={(event) => { event.preventDefault(); saveName() }}>
          <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
            <h2 className="text-lg font-bold" id={`rename-patch-${patch.id}`}>Rename patch</h2>
            <Button aria-label="Close rename patch dialog" onClick={closeRenameDialog} size="icon" type="button" variant="ghost">
              <X />
            </Button>
          </div>
          <div className="p-5">
            <label className="text-sm font-medium" htmlFor={`patch-name-${patch.id}`}>Patch name</label>
            <input
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              id={`patch-name-${patch.id}`}
              maxLength={10}
              onChange={(event) => setName(event.target.value)}
              ref={inputRef}
              required
              value={name}
            />
            <p className="mt-1 text-xs text-muted-foreground">{name.length}/10 characters</p>
          </div>
          <div className="flex justify-end gap-2 border-t px-5 py-4">
            <Button disabled={!name.trim() || name.trim() === patch.name} type="submit">Save</Button>
          </div>
        </form>
      </dialog>
    </>
  )
}
