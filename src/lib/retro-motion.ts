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

/** How long a notification takes to step out, as `toast-step-out` in `src/index.css`. */
export const toastStepOutMs = 350

/** How long the photo screen's wake runs, as `photo-wake-flare` in `src/index.css`. */
export const photoWakeMs = 700

/** How long the wristwatch's second hand rests on each of its four positions. */
export const watchTickMs = 250

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

const watches = new WeakMap<HTMLElement, number>()

/**
 * Ticks the wristwatch under the pointer while it is over a Send button that is waiting
 * (`.barber-pole`): the cursor's second hand moves one quarter turn each `watchTickMs`, by way of
 * `data-watch`, which `src/index.css` draws a frame of the watch for. A browser cannot animate a
 * cursor itself. It runs only while the pointer is over such a button, and stops, leaving the
 * first frame, when the pointer leaves or the wait ends. Reduced motion leaves the first frame.
 */
export function tickWatchCursor(event: Event) {
  const button =
    event.target instanceof Element ? event.target.closest<HTMLElement>('.barber-pole') : null
  if (!button || watches.has(button) || !motionAllowed()) return
  let frame = 0
  const timer = window.setInterval(() => {
    if (!button.isConnected || !button.matches('.barber-pole:hover')) {
      window.clearInterval(timer)
      watches.delete(button)
      delete button.dataset.watch
      return
    }
    frame = (frame + 1) % 4
    button.dataset.watch = String(frame)
  }, watchTickMs)
  watches.set(button, timer)
}

/**
 * Leaves a notification that has just gone on the page for `toastStepOutMs` to step out, as it
 * stepped in. React has already removed it, so what steps out is the removed element itself,
 * put back where it was with its alert role taken off, hidden from assistive technology and inert,
 * so the notification is announced once and its buttons cannot be reached while it leaves.
 */
export function stepOutToast(removed: HTMLElement, parent: Node, before: Node | null) {
  if (!motionAllowed() || !parent.isConnected || !removed.classList.contains('toast-surface')) {
    return
  }
  removed.removeAttribute('role')
  removed.setAttribute('aria-hidden', 'true')
  removed.inert = true
  removed.classList.add('toast-step-out')
  parent.insertBefore(removed, before?.parentNode === parent ? before : null)
  window.setTimeout(() => removed.remove(), toastStepOutMs)
}

/**
 * Wakes the header photo's screen when it lights again: a bright scan line wipes down it and the
 * glass flares and settles. The photo's dark overlay has just gone, so a see-through copy of its
 * place is laid back over the lit screen for `photoWakeMs`. Decoration only, and it takes no room.
 */
export function wakePhotoScreen(overlay: HTMLElement, parent: Node) {
  if (!motionAllowed() || !parent.isConnected || !overlay.classList.contains('fm1-photo-screen')) {
    return
  }
  const wake = overlay.ownerDocument.createElement('span')
  wake.className = 'fm1-photo-screen fm1-photo-wake'
  wake.setAttribute('aria-hidden', 'true')
  parent.appendChild(wake)
  window.setTimeout(() => wake.remove(), photoWakeMs)
}

/**
 * Starts the page's idle decoration: the chosen menu item's flash, the scramble of a patch name
 * whose sound has just changed, which the slot's `patch-cell-changed` glow marks, the busy
 * wristwatch, the notifications' step out, and the header photo's wake. It watches
 * the page rather than living in its components, so none of it costs the initial JavaScript.
 * Returns what stops it.
 */
export function installRetroMotion(root: HTMLElement = document.body) {
  root.ownerDocument.addEventListener('click', flashChosenMenuItem, { capture: true })

  root.ownerDocument.addEventListener('pointerover', tickWatchCursor, { capture: true })

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (!(node instanceof HTMLElement)) continue
        stepOutToast(node, record.target, record.nextSibling)
        wakePhotoScreen(node, record.target)
      }
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
    root.ownerDocument.removeEventListener('pointerover', tickWatchCursor, { capture: true })
    observer.disconnect()
  }
}
