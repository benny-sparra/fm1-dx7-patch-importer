// Only the lazy Effects view opens a menu beside its trigger, so this stays out of the entry.
import type { MenuPosition } from '@/lib/help-popover'

/**
 * Places a menu beside its trigger, level with its top, as a bank tab's menu swings out of the
 * rail, so it covers none of the rows below. Without room on the right it returns undefined, and
 * the menu opens under its trigger instead.
 */
export function positionMenuBeside(
  trigger: Pick<DOMRect, 'right' | 'top'>,
  menuWidth: number,
  menuHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  gap = 10,
  margin = 12,
): MenuPosition | undefined {
  const left = trigger.right + gap
  if (left + menuWidth > viewportWidth - margin) return undefined
  if (menuHeight > viewportHeight - margin * 2) return undefined
  return {
    left,
    top: Math.max(margin, Math.min(trigger.top, viewportHeight - menuHeight - margin)),
  }
}
