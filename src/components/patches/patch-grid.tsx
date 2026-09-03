import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  SortableContext,
} from '@dnd-kit/sortable'
import { FileMusic, Search } from 'lucide-react'
import { type ReactNode, type SVGProps } from 'react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpPopover } from '@/components/ui/help-popover'
import { type Patch } from '@/data/patches'
import { fm1KeyboardImage } from '@/lib/fm1-responsive-images'

import { PatchButton } from './patch-button'

type PatchGridProps = {
  activePatchId?: string
  actions?: ReactNode
  headerActions?: ReactNode
  isBankLoaded?: boolean
  isPatchDisabled?: (patch: Patch) => boolean
  onPatchMove: (patch: Patch, target: Patch) => void
  onPatchEdit?: (patch: Patch) => void
  onImportEmptyBank?: () => void
  onLoadDemoBank?: () => void
  patches: Patch[]
  search: string
  searchDisabled?: boolean
  setSearch: (search: string) => void
  toolbar?: ReactNode
}

function PixelBankIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 20 20" {...props}>
      <path
        d="M5 1h2v2h2V1h2v2h2V1h2v2h2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2h-2v2h-2v-2H9v2H7v-2H5v-2H3v-2H1v-2h2v-2H1V9h2V7H1V5h2V3h2V1Zm0 4v10h10V5H5Zm2 2h3v3H7V7Zm4 0h2v3h-2V7Zm-4 4h3v2H7v-2Zm4 0h2v2h-2v-2Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  )
}

export function PatchGrid({
  activePatchId = '',
  actions,
  headerActions,
  isBankLoaded = true,
  isPatchDisabled = () => false,
  onPatchMove,
  onPatchEdit,
  onImportEmptyBank,
  onLoadDemoBank,
  patches,
  search,
  searchDisabled = false,
  setSearch,
  toolbar,
}: PatchGridProps) {
  const { t } = useTranslation()
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
      <CardHeader className="patch-area-surface px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-2xl font-bold tracking-wide text-black">
            <PixelBankIcon aria-hidden="true" className="size-5 shrink-0 text-black" />
            {t('banks.gridTitle')}
            <HelpPopover
              className="text-black/70 hover:text-black"
              label={t('banks.gridTitle')}
              text={t('banks.gridDescription')}
            />
          </CardTitle>
          {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
        </div>
      </CardHeader>
      <div className="patch-area-surface flex min-w-0 items-stretch">
        {toolbar ? <div className="shrink-0">{toolbar}</div> : null}
        <div className="min-w-0 flex-1">
          <div className="font-vt323 flex flex-col gap-2 bg-primary p-3 sm:p-4 md:flex-row md:items-center">
            {actions ? (
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-[calc(50%-0.25rem)] sm:flex-none xl:w-[calc(25%-0.375rem)]">
                {actions}
              </div>
            ) : null}
            <label className="relative block w-full sm:ml-auto sm:w-[calc(50%-0.25rem)] sm:flex-none xl:w-[calc(25%-0.375rem)]">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label={t('banks.search')}
                className="patch-search-input h-10 w-full rounded-md border bg-white pr-3 pl-9 text-sm text-secondary-foreground ring-ring transition outline-none placeholder:text-secondary-foreground/60 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={searchDisabled}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('banks.search')}
                type="search"
                value={search}
              />
            </label>
          </div>
          <CardContent className="relative isolate space-y-4 overflow-hidden bg-primary px-3 pt-0 pb-3 sm:px-4 sm:pb-4">
            <img
              alt=""
              aria-hidden="true"
              className="patch-area-image pointer-events-none absolute inset-0 z-0 size-full object-contain object-center opacity-50"
              height={fm1KeyboardImage.height}
              sizes="(min-width: 1280px) 928px, (min-width: 1024px) calc(100vw - 352px), (min-width: 640px) calc(100vw - 328px), calc(100vw - 88px)"
              src={fm1KeyboardImage.src}
              srcSet={fm1KeyboardImage.srcSet}
              width={fm1KeyboardImage.width}
            />
            <div className="relative z-10">
              {patches.length > 0 ? (
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={finishReorder}
                  sensors={sensors}
                >
                  <SortableContext
                    items={patches.map((patch) => patch.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {patches.map((patch) => (
                        <div className="h-full w-full" key={patch.id}>
                          <PatchButton
                            disabled={isPatchDisabled(patch)}
                            disabledTitle={t('banks.importFirst', { bank: patch.bank })}
                            onEdit={onPatchEdit}
                            patch={patch}
                            isActive={patch.id === activePatchId}
                          />
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="grid min-h-72 place-items-center rounded-lg border border-dashed bg-background/70 p-6 text-center">
                  <div className="max-w-md">
                    <FileMusic className="mx-auto size-10 text-primary" />
                    <h3 className="mt-3 text-lg font-bold text-foreground">
                      {isBankLoaded ? t('banks.noMatches') : t('banks.bankEmpty')}
                    </h3>
                    {!isBankLoaded ? (
                      <>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {t('banks.emptyHelp')}
                        </p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                          <button
                            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                            onClick={onImportEmptyBank}
                            type="button"
                          >
                            {t('banks.import')}
                          </button>
                          <button
                            className="rounded-md border bg-background px-4 py-2 text-sm font-semibold text-foreground"
                            onClick={onLoadDemoBank}
                            type="button"
                          >
                            {t('banks.loadDemo')}
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
