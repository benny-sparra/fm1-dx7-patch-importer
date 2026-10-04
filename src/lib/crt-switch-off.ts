import { visibleBox } from './zoom-rects'

/** How long a switch-off lasts, as `crt-switch-off` in `src/index.css` animates it. */
export const crtSwitchOffMs = 420

/**
 * Switches off a copy of an element like a CRT, over whatever replaces it: the picture squeezes
 * into a bright line, then a dot, then fades. Call it just before the element's content goes. The
 * copy is decoration only: hidden from assistive technology, inert, without ids that could clash
 * with the page's own, and hidden altogether when reduced motion is requested.
 */
export function crtSwitchOff(element: Element | null) {
  const box = visibleBox(element)
  if (!element || !box) return
  const rect = element.getBoundingClientRect()
  const layer = document.createElement('div')
  layer.className = 'crt-switch-off'
  layer.setAttribute('aria-hidden', 'true')
  layer.inert = true
  Object.assign(layer.style, {
    height: `${box.height}px`,
    left: `${box.left}px`,
    overflow: 'hidden',
    top: `${box.top}px`,
    width: `${box.width}px`,
  })
  const picture = document.createElement('div')
  picture.className = 'crt-switch-off-picture'
  // The whole element keeps its own layout, and collapses towards the middle of the part on screen.
  Object.assign(picture.style, {
    height: `${rect.height}px`,
    marginLeft: `${rect.left - box.left}px`,
    marginTop: `${rect.top - box.top}px`,
    transformOrigin: `${box.left - rect.left + box.width / 2}px ${box.top - rect.top + box.height / 2}px`,
    width: `${rect.width}px`,
  })
  const copy = element.cloneNode(true) as Element
  for (const node of [copy, ...copy.querySelectorAll('[id]')]) node.removeAttribute('id')
  picture.append(copy)
  layer.append(picture)
  document.body.append(layer)
  window.setTimeout(() => layer.remove(), crtSwitchOffMs)
}
