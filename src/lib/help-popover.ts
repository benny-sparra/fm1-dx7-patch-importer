export type HelpPopoverPosition = {
  left: number
  top: number
}

type Rect = Pick<DOMRect, 'bottom' | 'left' | 'top'>

export function positionHelpPopover(
  trigger: Rect,
  popoverWidth: number,
  popoverHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  gap = 8,
  margin = 12,
): HelpPopoverPosition {
  const left = Math.max(margin, Math.min(trigger.left - 8, viewportWidth - popoverWidth - margin))
  const roomBelow = viewportHeight - trigger.bottom - margin
  const preferredTop =
    roomBelow >= popoverHeight + gap ? trigger.bottom + gap : trigger.top - popoverHeight - gap

  return {
    left,
    top: Math.max(margin, Math.min(preferredTop, viewportHeight - popoverHeight - margin)),
  }
}

export type MenuPosition = HelpPopoverPosition & { maxHeight?: number }

/**
 * Places a menu as `positionHelpPopover` places a popover, except that a menu too tall for either
 * side of its trigger, as on a short phone screen, scrolls on the roomier side rather than being
 * clamped over the trigger and the row it acts on, where a tap meant for that row's neighbour
 * would choose an item.
 */
export function positionMenu(
  trigger: Rect,
  menuWidth: number,
  menuHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  gap = 8,
  margin = 12,
): MenuPosition {
  const position = positionHelpPopover(
    trigger,
    menuWidth,
    menuHeight,
    viewportWidth,
    viewportHeight,
    gap,
    margin,
  )
  const roomAbove = trigger.top - gap - margin
  const roomBelow = viewportHeight - trigger.bottom - gap - margin
  if (menuHeight <= Math.max(roomAbove, roomBelow)) return position
  return roomBelow >= roomAbove
    ? { left: position.left, maxHeight: roomBelow, top: trigger.bottom + gap }
    : { left: position.left, maxHeight: roomAbove, top: margin }
}
