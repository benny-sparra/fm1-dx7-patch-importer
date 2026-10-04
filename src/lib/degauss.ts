/** How long a degauss lasts, as `degauss` and `degauss-wobble` in `src/index.css` animate it. */
export const degaussMs = 700

let settle: number | undefined

/**
 * Degausses the screen as a CRT did at the press of its button: the picture shudders, its colours
 * swirl into blotches, then it settles. The blotches are a layer of their own over the page:
 * hidden from assistive technology, never in the way of the pointer, and, like the shudder, left
 * out when reduced motion is requested. Pressing it again part-way starts it afresh.
 */
export function degauss(screen: HTMLElement | null) {
  if (!screen) return
  window.clearTimeout(settle)
  document.querySelector('.degauss')?.remove()
  // Removed and read back first, so a degauss part-way through starts its shudder again.
  delete screen.dataset.degauss
  void screen.offsetWidth
  screen.dataset.degauss = ''
  const blotches = document.createElement('div')
  blotches.className = 'degauss'
  blotches.setAttribute('aria-hidden', 'true')
  document.body.append(blotches)
  // A timer rather than animationend, which never fires while reduced motion leaves it out.
  settle = window.setTimeout(() => {
    delete screen.dataset.degauss
    blotches.remove()
  }, degaussMs)
}
