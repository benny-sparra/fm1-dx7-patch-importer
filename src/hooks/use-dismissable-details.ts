import { useEffect, useRef } from 'react'

export function useDismissableDetails() {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      const details = detailsRef.current
      if (details?.open && !details.contains(event.target as Node)) {
        details.removeAttribute('open')
      }
    }

    const closeMenuFromKeyboard = (event: KeyboardEvent) => {
      const details = detailsRef.current
      if (event.key !== 'Escape' || !details?.open) return
      // Claim the key, so a view's own Escape shortcut does not also run once the menu has closed.
      event.preventDefault()
      const focusWasInside = details.contains(document.activeElement)
      details.removeAttribute('open')
      // Focus left inside a closed menu would be hidden and fall back to the page.
      if (focusWasInside) details.querySelector('summary')?.focus()
    }

    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeMenuFromKeyboard)

    return () => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', closeMenuFromKeyboard)
    }
  }, [])

  return detailsRef
}
