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
