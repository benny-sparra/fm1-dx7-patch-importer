/** How many outlines a zoom draws between its two boxes, both included. */
export const zoomRectCount = 12
/** How long each outline waits after the one before it, about one frame. */
export const zoomRectStepMs = 16
/** How many outlines stay on screen at once, so each leaves a short trail. */
const zoomRectTrail = 3

type Box = Pick<DOMRect, 'height' | 'left' | 'top' | 'width'>

/** The part of an element inside the viewport, or nothing when none of it is on screen. */
export function visibleBox(element: Element | null): Box | undefined {
  if (!element) return undefined
  const rect = element.getBoundingClientRect()
  const left = Math.max(rect.left, 0)
  const top = Math.max(rect.top, 0)
  const right = Math.min(rect.right, window.innerWidth)
  const bottom = Math.min(rect.bottom, window.innerHeight)
  if (right <= left || bottom <= top) return undefined
  return { height: bottom - top, left, top, width: right - left }
}

/**
 * The classic Mac Finder's zoom rectangles: outlines stepping from one box to another, drawn as a
 * window opens from its icon or closes back into it. Each outline snaps on and off rather than
 * tweening, as they did. They are decoration only: hidden from assistive technology, never in the
 * way of the pointer, and hidden altogether when reduced motion is requested.
 */
export function zoomRects(from: Box | undefined, to: Box | undefined) {
  if (!from || !to) return
  const layer = document.createElement('div')
  layer.className = 'zoom-rects'
  layer.setAttribute('aria-hidden', 'true')
  for (let index = 0; index < zoomRectCount; index++) {
    const progress = index / (zoomRectCount - 1)
    const between = (start: number, end: number) => `${start + (end - start) * progress}px`
    const outline = document.createElement('div')
    outline.className = 'zoom-rect'
    Object.assign(outline.style, {
      animationDelay: `${index * zoomRectStepMs}ms`,
      animationDuration: `${zoomRectTrail * zoomRectStepMs}ms`,
      height: between(from.height, to.height),
      left: between(from.left, to.left),
      top: between(from.top, to.top),
      width: between(from.width, to.width),
    })
    layer.append(outline)
  }
  document.body.append(layer)
  // A timer rather than animationend, which never fires while reduced motion hides the layer.
  window.setTimeout(() => layer.remove(), (zoomRectCount - 1 + zoomRectTrail) * zoomRectStepMs)
}
