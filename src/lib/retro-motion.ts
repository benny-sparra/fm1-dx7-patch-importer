// This module imports nothing: whatever it shared with the entry, Rolldown would split out of the
// entry, and each chunk it loads costs the entry a name in its preload list.

/** How long a chosen menu item flashes before its copy goes, as `menu-flash` in `src/index.css`. */
export const menuFlashMs = 320

/** How long a patch name scrambles before it settles: the lead, then one more letter each step. */
export const scrambleLeadMs = 60
export const scrambleLetterMs = 28
const scrambleTickMs = 30

/** What a scrambling letter shows, from the characters a DX7 name can hold. */
const scrambleGlyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#*+-=/<>?'

const menuSurfaces = '.menu-surface, .editor-menu-surface'

/**
 * Whether lazy decoration may move. Unlike `prefersReducedMotion`, a browser without media
 * queries, such as jsdom, counts as asking for reduced motion, as the editor's scopes do.
 */
function motionAllowed() {
  return (
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** The child indices from `root` down to `node`, so the same element can be found in a copy. */
function pathTo(root: Element, node: Element) {
  const path: number[] = []
  for (let current = node; current !== root; current = current.parentElement!) {
    path.unshift(Array.prototype.indexOf.call(current.parentElement!.children, current))
  }
  return path
}

function follow(root: Element, path: readonly number[]) {
  return path.reduce<Element | undefined>((node, index) => node?.children[index], root)
}

function isRendered(element: Element) {
  return element.isConnected && element.getClientRects().length > 0
}

/**
 * Flashes the item chosen in a menu as System 7 did: when a click on an item closes its menu, a
 * copy of the menu stays where it was for a moment with the item blinking inverted twice. The item's
 * own action runs at once, as it always did, so nothing waits on the flash, and a dialog the action
 * opens keeps its focus. The copy is decoration only: hidden from assistive technology, inert,
 * without ids, and never made when reduced motion is requested or when the menu stays open.
 */
export function flashChosenMenuItem(event: Event) {
  if (!motionAllowed() || !(event.target instanceof Element)) return
  const item = event.target.closest('button, [role^="menuitem"]')
  const surface = item?.closest(menuSurfaces)
  if (!item || !surface || item.matches(':disabled, [aria-disabled="true"]')) return
  const rect = surface.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return
  const ink = getComputedStyle(item).color
  const copy = surface.cloneNode(true) as HTMLElement
  const host = surface.closest('dialog') ?? document.body
  const path = pathTo(surface, item)

  // Taken before the click's handlers run, and shown only if they closed the menu.
  requestAnimationFrame(() => {
    if (isRendered(item)) return
    for (const node of [copy, ...copy.querySelectorAll('[id]')]) node.removeAttribute('id')
    copy.classList.add('menu-flash-copy')
    copy.setAttribute('aria-hidden', 'true')
    copy.inert = true
    Object.assign(copy.style, {
      bottom: 'auto',
      height: `${rect.height}px`,
      left: `${rect.left}px`,
      margin: '0',
      right: 'auto',
      top: `${rect.top}px`,
      transform: 'none',
      width: `${rect.width}px`,
    })
    const flashed = follow(copy, path) as HTMLElement | undefined
    flashed?.style.setProperty('--menu-flash-ink', ink)
    flashed?.classList.add('menu-flash')
    host.append(copy)
    window.setTimeout(() => copy.remove(), menuFlashMs)
  })
}

/**
 * The letters a name shows `elapsed` ms into its scramble: settled from the left, one letter each
 * `scrambleLetterMs` after `scrambleLeadMs`, with a random glyph in each place still to settle.
 * Spaces stay spaces, so the name keeps its shape. Undefined once every letter has settled.
 */
export function scrambledName(name: string, elapsed: number, random = Math.random) {
  if (elapsed >= scrambleLeadMs + (name.length - 1) * scrambleLetterMs) return undefined
  return Array.from(name, (letter, index) =>
    letter === ' ' || elapsed >= scrambleLeadMs + index * scrambleLetterMs
      ? letter
      : scrambleGlyphs[Math.floor(random() * scrambleGlyphs.length)],
  ).join('')
}

const scrambles = new WeakMap<HTMLElement, number>()

/**
 * Redraws a patch name like a character LCD: random glyphs that settle left to right. The glyphs
 * are drawn by `src/index.css` from `data-scramble`, over the name made see-through, and hidden
 * from assistive technology, so the name React rendered stays in place and is what is read.
 */
export function scramblePatchName(nameElement: HTMLElement) {
  if (!motionAllowed()) return
  window.clearInterval(scrambles.get(nameElement))
  const name = nameElement.textContent ?? ''
  const start = performance.now()
  const step = () => {
    const shown = nameElement.isConnected
      ? scrambledName(name, performance.now() - start)
      : undefined
    if (shown === undefined) {
      window.clearInterval(scrambles.get(nameElement))
      scrambles.delete(nameElement)
      delete nameElement.dataset.scramble
    } else {
      nameElement.dataset.scramble = shown
    }
  }
  scrambles.set(nameElement, window.setInterval(step, scrambleTickMs))
  step()
}

/**
 * Starts the page's idle decoration: the chosen menu item's flash, and the scramble of a patch
 * name whose sound has just changed, which the slot's `patch-cell-changed` glow marks. It watches
 * the page rather than living in its components, so none of it costs the initial JavaScript.
 * Returns what stops it.
 */
export function installRetroMotion(root: HTMLElement = document.body) {
  root.ownerDocument.addEventListener('click', flashChosenMenuItem, { capture: true })

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof HTMLElement) || !node.classList.contains('patch-cell-changed'))
          continue
        const name = node.parentElement?.querySelector<HTMLElement>('.patch-name')
        if (name) scramblePatchName(name)
      }
    }
  })
  observer.observe(root, { childList: true, subtree: true })

  return () => {
    root.ownerDocument.removeEventListener('click', flashChosenMenuItem, { capture: true })
    observer.disconnect()
  }
}
