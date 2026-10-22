import { useLayoutEffect, type RefObject } from 'react'

/** The page's `scroll-padding-top` reads this in `src/index.css`. */
export const stickyHeaderOffsetProperty = '--sticky-header-height'

/**
 * Keeps the page's scroll padding as tall as a sticky header, which wraps to a second row on a
 * phone, so a control that takes focus scrolls into view below it rather than behind it (WCAG
 * 2.4.11). The property is on the root because the page scrolls there, and goes when the header
 * does, so the librarian keeps no padding. A bar that sticks only at some widths names them in
 * `whileMatching`, a media query, and leaves the padding alone otherwise. `clearance` adds a few
 * pixels of room, for a browser that scrolls a focused control to a hair under the bar.
 */
export function useStickyHeaderOffset(
  header: RefObject<HTMLElement | null>,
  whileMatching?: string,
  clearance = 0,
) {
  useLayoutEffect(() => {
    const element = header.current
    if (!element) return
    const root = document.documentElement
    const update = () => {
      if (whileMatching && typeof matchMedia === 'function' && !matchMedia(whileMatching).matches) {
        root.style.removeProperty(stickyHeaderOffsetProperty)
        return
      }
      root.style.setProperty(
        stickyHeaderOffsetProperty,
        `${Math.ceil(element.getBoundingClientRect().height) + clearance}px`,
      )
    }
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(element)
    return () => {
      observer?.disconnect()
      root.style.removeProperty(stickyHeaderOffsetProperty)
    }
  }, [header, whileMatching, clearance])
}
