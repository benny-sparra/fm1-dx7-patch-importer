import { useLayoutEffect, type RefObject } from 'react'

/** The page's `scroll-padding-top` reads this in `src/index.css`. */
export const stickyHeaderOffsetProperty = '--sticky-header-height'

/**
 * Keeps the page's scroll padding as tall as a sticky header, which wraps to a second row on a
 * phone, so a control that takes focus scrolls into view below it rather than behind it (WCAG
 * 2.4.11). The property is on the root because the page scrolls there, and goes when the header
 * does, so the librarian keeps no padding.
 */
export function useStickyHeaderOffset(header: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = header.current
    if (!element) return
    const root = document.documentElement
    const update = () =>
      root.style.setProperty(
        stickyHeaderOffsetProperty,
        `${Math.ceil(element.getBoundingClientRect().height)}px`,
      )
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(element)
    return () => {
      observer?.disconnect()
      root.style.removeProperty(stickyHeaderOffsetProperty)
    }
  }, [header])
}
