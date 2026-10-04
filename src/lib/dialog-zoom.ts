import { visibleBox, zoomRects, zoomRectsArriveMs } from './zoom-rects'

type Box = NonNullable<ReturnType<typeof visibleBox>>

/** How long after a click a dialog opening still counts as opened by it, as its chunk may load. */
export const dialogOpenerWindowMs = 2000

type Click = {
  /** What a dialog the click opens closes back into: the control, or the menu it sits in. */
  anchor: Element
  box: Box | undefined
  time: number
}

let lastClick: Click | undefined

/** A control in a menu goes as the menu closes, so its dialog closes back into the menu's toggle. */
function anchorFor(control: Element) {
  const menu = control.closest('details')
  const toggle = menu?.querySelector(':scope > summary')
  return toggle && toggle !== control ? toggle : control
}

/**
 * Remembers where each click lands, before a menu closing over the control can take it off the
 * screen, so the dialog the click opens can zoom out of it.
 */
export function rememberDialogOpeners() {
  document.addEventListener(
    'click',
    (event) => {
      const control =
        event.target instanceof Element ? event.target.closest('a, button, label, summary') : null
      lastClick = control
        ? { anchor: anchorFor(control), box: visibleBox(control), time: performance.now() }
        : undefined
    },
    { capture: true },
  )
}

function recentClick() {
  return lastClick?.box && performance.now() - lastClick.time <= dialogOpenerWindowMs
    ? lastClick
    : undefined
}

/**
 * Called as a dialog is about to open, before it is drawn: a dialog a click just opened stays
 * hidden until its zoom arrives, as a Finder window appeared only once its outlines had grown.
 */
export function holdDialogForZoom(dialog: HTMLDialogElement) {
  if (recentClick()) dialog.dataset.zooming = ''
}

/**
 * Zooms an opening dialog out of the control just clicked to open it, then shows it. A dialog that
 * opens by itself, such as the guide on a first visit, does not zoom. Returns what the dialog
 * closes back into, or nothing when it did not zoom.
 */
export function zoomDialogOpen(dialog: HTMLDialogElement) {
  const click = recentClick()
  lastClick = undefined
  const to = visibleBox(dialog)
  if (!click?.box || !to) {
    delete dialog.dataset.zooming
    return undefined
  }
  zoomRects(click.box, to)
  window.setTimeout(() => delete dialog.dataset.zooming, zoomRectsArriveMs)
  return click.anchor
}

/**
 * Zooms a closing dialog back into what opened it, or failing that the control focus returns to,
 * once its `close` handlers have returned focus. Called just before the dialog hides, while it
 * still has a box to zoom from.
 */
export function zoomDialogClosed(dialog: HTMLDialogElement, anchor: Element) {
  const from = visibleBox(dialog)
  delete dialog.dataset.zooming
  dialog.addEventListener(
    'close',
    () =>
      requestAnimationFrame(() => {
        const focused = document.activeElement
        const to =
          visibleBox(anchor) ??
          (focused && focused !== document.body ? visibleBox(focused) : undefined)
        zoomRects(from, to)
      }),
    { once: true },
  )
}
