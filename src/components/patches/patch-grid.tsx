import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { rectSortingStrategy, sortableKeyboardCoordinates, SortableContext } from '@dnd-kit/sortable'
import { ListMusic, Search } from 'lucide-react'
import { type ReactNode } from 'react'

import fm1Keyboard from '@/assets/fm1-keyboard.webp'
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
      <CardHeader className="gap-5 bg-white pb-3">
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
      <CardContent className="relative isolate space-y-4 overflow-hidden bg-white pb-6 pt-0">
        <img
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 size-full object-contain object-center opacity-50"
          src={fm1Keyboard}
        />
        <div className="relative z-10">
        {patches.length > 0 ? (
          <DndContext collisionDetection={closestCenter} onDragEnd={finishReorder} sensors={sensors}>
          <SortableContext items={patches.map((patch) => patch.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {patches.map((patch) => (
                <div
                  className="h-full w-full"
                  key={patch.id}
                >
                  <PatchButton
                    disabled={isPatchDisabled(patch)}
                    disabledTitle={`Import bank ${patch.bank} first`}
                    onRename={onPatchRename}
                    patch={patch}
                  />
                </div>
              ))}
          </div>
          </SortableContext>
          </DndContext>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No patches match this search.
          </div>
        )}
        </div>
      </CardContent>
    </Card>
  )
}
