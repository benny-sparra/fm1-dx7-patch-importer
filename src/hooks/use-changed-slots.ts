import { useEffect, useState } from 'react'

/** How long a changed slot glows; `patch-cell-changed` in `src/index.css` fades over the same. */
export const changedSlotGlowMs = 900

/** The slots to light, with a key that a later change replaces so their glow starts again. */
export type ChangedSlots = { ids: ReadonlySet<string>; key: number }

/** Each slot's sound by patch id, as the parts whose identity changes when the sound does. */
export type SlotSounds = ReadonlyMap<string, readonly unknown[]>

function changedIds(before: SlotSounds, after: SlotSounds) {
  const ids = new Set<string>()
  for (const [id, parts] of after) {
    const previous = before.get(id)
    if (!previous || parts.some((part, index) => part !== previous[index])) ids.add(id)
  }
  return ids
}

/**
 * The slots whose sound changed while they stayed on screen, such as by Undo, a copy, or an import,
 * so the grid can light them once. A change of `view`, such as another bank or search, starts
 * afresh, so slots coming into view never count as changed.
 */
export function useChangedSlots(view: string, sounds: SlotSounds): ChangedSlots | null {
  const [previous, setPrevious] = useState({ key: 0, sounds, view })
  const [changed, setChanged] = useState<ChangedSlots | null>(null)

  if (previous.sounds !== sounds || previous.view !== view) {
    const ids = previous.view === view ? changedIds(previous.sounds, sounds) : new Set<string>()
    const key = ids.size > 0 ? previous.key + 1 : previous.key
    setPrevious({ key, sounds, view })
    if (ids.size > 0) setChanged({ ids, key })
    else if (previous.view !== view && changed) setChanged(null)
  }

  useEffect(() => {
    if (!changed) return
    const timer = window.setTimeout(() => setChanged(null), changedSlotGlowMs)
    return () => window.clearTimeout(timer)
  }, [changed])

  return changed
}
