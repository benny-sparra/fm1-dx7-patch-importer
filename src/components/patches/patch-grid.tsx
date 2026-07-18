import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { rectSortingStrategy, sortableKeyboardCoordinates, SortableContext } from '@dnd-kit/sortable'
import { ListMusic, Search } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { type Patch } from '@/data/patches'

import { PatchButton } from './patch-button'

type PatchGridProps = {
  actions?: ReactNode
  isPatchDisabled?: (patch: Patch) => boolean
  onPatchMove: (patch: Patch, target: Patch) => void
  onPatchRename: (id: string, name: string) => void
  patches: Patch[]
  search: string
  searchDisabled?: boolean
  setSearch: (search: string) => void
  toolbar?: ReactNode
}

export function PatchGrid({
  actions,
  isPatchDisabled = () => false,
  onPatchMove,
  onPatchRename,
  patches,
  search,
  searchDisabled = false,
  setSearch,
  toolbar,
}: PatchGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const finishReorder = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const source = patches.find((patch) => patch.id === active.id)
    const target = patches.find((patch) => patch.id === over.id)
    if (source && target && source.bank === target.bank) onPatchMove(source, target)
  }

  return (
    <Card className="synthwave-panel overflow-hidden border-primary/25 bg-card/95 backdrop-blur-sm">
      <CardHeader className="gap-5 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 tracking-wide">
            <ListMusic className="size-5 text-primary drop-shadow-[0_0_2px_currentColor]" />
            Patch banks
          </CardTitle>
          <CardDescription>
            Rename and arrange a 32-patch bank before copying it to the FM1.
          </CardDescription>
        </div>
        <div className="flex w-full flex-col gap-3">
          {toolbar}
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
            <label className="relative block w-full md:ml-auto md:w-56 md:flex-none xl:w-[calc(40%-0.3rem)]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none ring-ring transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={searchDisabled}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by patch name"
                value={search}
              />
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {patches.length > 0 ? (
          <DndContext collisionDetection={closestCenter} onDragEnd={finishReorder} sensors={sensors}>
          <SortableContext items={patches.map((patch) => patch.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <AnimatePresence mode="popLayout">
              {patches.map((patch, index) => (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="h-full w-full"
                  exit={{ opacity: 0, y: -6 }}
                  initial={{ opacity: 0, y: 8 }}
                  key={patch.id}
                  layout
                  transition={{
                    delay: index * 0.006,
                    duration: 0.16,
                    ease: 'easeOut',
                  }}
                >
                  <PatchButton
                    disabled={isPatchDisabled(patch)}
                    disabledTitle={`Import bank ${patch.bank} first`}
                    onRename={onPatchRename}
                    patch={patch}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          </SortableContext>
          </DndContext>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No patches match this search.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
