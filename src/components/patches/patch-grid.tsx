import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  SortableContext,
} from '@dnd-kit/sortable'
import { FileMusic, Search } from 'lucide-react'
import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  type SVGProps,
} from 'react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpPopover } from '@/components/ui/help-popover'
import type { Patch } from '@/data/patches'
import { formatShortcut, isApplePlatform, librarianShortcuts } from '@/lib/keyboard-shortcuts'
import { resolveGridKey } from '@/lib/patch-grid-navigation'
import { cn } from '@/lib/utils'

import { droppedBank, patchDragCollision } from './bank-drop'
import { PatchButton } from './patch-button'

type PatchGridProps = {
  activePatchId?: string
  actions?: ReactNode
  bankLabel?: (bank: string) => string
  headerActions?: ReactNode
  isBankLoaded?: boolean
  isPatchDisabled?: (patch: Patch) => boolean
  onPatchCopy?: (patch: Patch) => void
  onPatchDownload?: (patch: Patch) => void
  onPatchReplace?: (patch: Patch) => void
  onPatchMove: (patch: Patch, target: Patch) => void
  /** A slot dragged onto a bank tab in the `toolbar`, other than its own bank's. */
  onPatchDropOnBank?: (patch: Patch, bank: string) => void
  onPatchEdit?: (patch: Patch) => void
  onPatchSelect?: (patch: Patch) => void
  onImportEmptyBank?: () => void
  onLoadDemoBank?: () => void
  patches: Patch[]
  /** Off while the grid shows slots from several banks, which cannot be reordered together. */
  reorderable?: boolean
  search: string
  searchDisabled?: boolean
  searchRef?: RefObject<HTMLInputElement | null>
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
  bankLabel = (bank) => bank,
  headerActions,
  isBankLoaded = true,
  isPatchDisabled = () => false,
  onPatchCopy,
  onPatchDownload,
  onPatchReplace,
  onPatchMove,
  onPatchDropOnBank,
  onPatchEdit,
  onPatchSelect,
  onImportEmptyBank,
  onLoadDemoBank,
  patches,
  reorderable = true,
  search,
  searchDisabled = false,
  searchRef,
  setSearch,
  toolbar,
}: PatchGridProps) {
  const { t } = useTranslation()
  const searchHint = useMemo(() => formatShortcut(librarianShortcuts.search, isApplePlatform()), [])
  const slotRefs = useRef(new Map<string, HTMLButtonElement>())
  const [focusedPatchId, setFocusedPatchId] = useState('')
  const [draggedId, setDraggedId] = useState<UniqueIdentifier | null>(null)
  // The grid is a single tab stop. It opens on the lit slot so Tab lands where
  // the user last was, and follows the arrows from there.
  const rovingPatchId = [focusedPatchId, activePatchId].find((candidate) =>
    patches.some((patch) => patch.id === candidate),
  )
  const rovingSlot = rovingPatchId ?? patches[0]?.id

  const registerSlot = (patchId: string, button: HTMLButtonElement | null) => {
    if (button) slotRefs.current.set(patchId, button)
    else slotRefs.current.delete(patchId)
  }

  const navigateSlots = (event: KeyboardEvent<HTMLButtonElement>, patch: Patch) => {
    // A disabled slot renders no button, so the order comes from what is there.
    const slotIds = patches.map(({ id }) => id).filter((id) => slotRefs.current.has(id))
    const next = resolveGridKey(event.key, slotIds.indexOf(patch.id), () =>
      slotIds.map((id) => slotRefs.current.get(id)?.getBoundingClientRect().top ?? 0),
    )
    if (next === null) return

    // Claimed even when the edge stops the move, so the panel does not scroll.
    event.preventDefault()
    const nextId = slotIds[next]
    if (nextId === patch.id) return

    setFocusedPatchId(nextId)
    slotRefs.current.get(nextId)?.focus()
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const finishDrag = ({ active, over }: DragEndEvent) => {
    setDraggedId(null)
    if (!over || active.id === over.id) return
    const source = patches.find((patch) => patch.id === active.id)
    const bank = droppedBank(over.id)
    if (bank !== undefined) {
      if (source && bank !== source.bank) onPatchDropOnBank?.(source, bank)
      return
    }
    const target = patches.find((patch) => patch.id === over.id)
    if (source && target && source.bank === target.bank) onPatchMove(source, target)
  }

  return (
    <Card className="synthwave-panel overflow-hidden">
      <CardHeader className="crt-hatch border-b border-[var(--crt-shadow)] px-[9px] py-1.5">
        {/* Search covers every bank, so it sits above the bank rail rather than beside one bank. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <CardTitle className="font-dot-matrix flex items-center gap-2 text-[13px] font-bold tracking-[0.14em] text-[var(--crt-acc-lt)] uppercase">
            <PixelBankIcon aria-hidden="true" className="size-4 shrink-0" />
            {t('banks.gridTitle')}
            <HelpPopover
              className="text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]"
              label={t('banks.gridTitle')}
              text={t('banks.gridDescription')}
            />
          </CardTitle>
          <label className="relative order-last block w-full sm:order-none sm:ml-auto sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[var(--crt-ink-3)]" />
            <input
              aria-label={t('banks.search')}
              className="patch-search-input crt-inset h-7 w-full pr-2.5 pl-8 text-xs tracking-[0.06em] transition outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={searchDisabled}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                // The page-level Escape stays out of text fields, so the
                // field clears itself where the user is most likely to press it.
                if (event.key !== 'Escape' || !search) return
                event.preventDefault()
                setSearch('')
              }}
              placeholder={t('banks.search')}
              ref={searchRef}
              title={`${t('banks.search')} (${searchHint})`}
              type="search"
              value={search}
            />
          </label>
          {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
        </div>
      </CardHeader>
      {/* The bank rail shares the grid's drag context, so a slot can be dropped on a bank's tab. */}
      <DndContext
        collisionDetection={patchDragCollision}
        onDragCancel={() => setDraggedId(null)}
        onDragEnd={finishDrag}
        onDragStart={({ active }) => setDraggedId(active.id)}
        sensors={sensors}
      >
        <div className="patch-area-surface flex min-w-0 items-stretch">
          {toolbar ? <div className="shrink-0">{toolbar}</div> : null}
          <div className="min-w-0 flex-1">
            <div className="crt-hatch flex flex-wrap items-center gap-2 border-b border-[var(--crt-shadow)] p-2 sm:px-[9px]">
              {actions ? (
                <div className="flex w-full max-w-full min-w-0 flex-wrap items-center gap-2">
                  {actions}
                </div>
              ) : null}
            </div>
            {/*
            The hardware photo used to sit behind the grid as a half-opacity
            watermark. Against the terminal's near-black panel it washed the
            slots out rather than receding, and the masthead already carries
            the same photo, so the grid is now a plain well.
          */}
            {/* A dragged slot has to reach the bank tabs, so the grid stops clipping and rises above the rail. */}
            <CardContent
              className={cn(
                'relative isolate space-y-4 bg-[var(--crt-bg-panel)] p-[9px]',
                draggedId === null ? 'overflow-hidden' : 'z-20',
              )}
            >
              <div className="relative z-10">
                {patches.length > 0 ? (
                  <SortableContext
                    items={patches.map((patch) => patch.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
                      {patches.map((patch) => (
                        <div className="h-full w-full" key={patch.id}>
                          <PatchButton
                            disabled={isPatchDisabled(patch)}
                            disabledTitle={t('banks.importFirst', { bank: bankLabel(patch.bank) })}
                            onCopy={onPatchCopy}
                            onDownload={onPatchDownload}
                            onReplace={onPatchReplace}
                            onEdit={onPatchEdit}
                            onNavigate={navigateSlots}
                            onSelect={onPatchSelect}
                            patch={patch}
                            reorderable={reorderable}
                            isActive={patch.id === activePatchId}
                            registerButton={registerSlot}
                            tabIndex={patch.id === rovingSlot ? 0 : -1}
                          />
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                ) : (
                  <div className="grid min-h-72 place-items-center border border-dashed border-[var(--crt-line)] bg-[var(--crt-bg-well)] p-6 text-center">
                    <div className="max-w-md">
                      <FileMusic className="mx-auto size-10 text-[var(--crt-acc-dim)]" />
                      <h3 className="font-dot-matrix mt-3 text-base font-bold tracking-[0.08em] text-[var(--crt-acc-lt)] uppercase">
                        {isBankLoaded ? t('banks.noMatches') : t('banks.bankEmpty')}
                      </h3>
                      {!isBankLoaded ? (
                        <>
                          <p className="mt-1 text-xs leading-6 text-[var(--crt-ink-3)]">
                            {t('banks.emptyHelp')}
                          </p>
                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            <button
                              className="crt-raised-lit cursor-pointer bg-[var(--crt-btn)] px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-white"
                              onClick={onImportEmptyBank}
                              type="button"
                            >
                              {t('banks.import')}
                            </button>
                            <button
                              className="crt-raised-thin cursor-pointer bg-[var(--crt-btn-face)] px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-[var(--crt-ink-2)]"
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
      </DndContext>
    </Card>
  )
}
