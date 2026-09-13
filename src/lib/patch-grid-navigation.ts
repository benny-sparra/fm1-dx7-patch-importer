/**
 * Arrow-key movement across the patch grid.
 *
 * Movement only ever changes which slot has focus. Selecting a slot sends a
 * Program Change and auditions it on the FM1, so selection stays on a
 * deliberate press rather than following the arrows.
 */

const navigationKeys = ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home'] as const

export type GridNavigationKey = (typeof navigationKeys)[number]

export function isGridNavigationKey(key: string): key is GridNavigationKey {
  return (navigationKeys as readonly string[]).includes(key)
}

/**
 * The grid's column count is a responsive CSS decision, so it is counted from
 * where the slots actually landed: every slot sharing the first one's top edge
 * is on the first row. Sub-pixel layout means the comparison needs a tolerance.
 */
export function countGridColumns(tops: readonly number[]) {
  if (tops.length === 0) return 1
  const firstTop = tops[0]

  return Math.max(1, tops.filter((top) => Math.abs(top - firstTop) < 1).length)
}

/**
 * The index the key moves to, clamped at the edges: an arrow off the end of a
 * row stays put rather than wrapping onto another row, matching how a grid of
 * slots reads. Returns the current index when the key changes nothing.
 */
export function resolveGridNavigation(
  key: GridNavigationKey,
  index: number,
  count: number,
  columns: number,
) {
  if (count === 0) return index
  const last = count - 1
  const clamp = (target: number) => Math.min(Math.max(target, 0), last)

  switch (key) {
    case 'ArrowRight':
      return clamp(index + 1)
    case 'ArrowLeft':
      return clamp(index - 1)
    case 'ArrowDown':
      // A short final row would otherwise trap focus above the last slots.
      return index + columns > last ? last : index + columns
    case 'ArrowUp':
      return index - columns < 0 ? index : index - columns
    case 'Home':
      return 0
    case 'End':
      return last
  }
}
