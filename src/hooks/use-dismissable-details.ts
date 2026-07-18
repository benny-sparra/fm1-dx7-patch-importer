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
      if (event.key === 'Escape') {
        detailsRef.current?.removeAttribute('open')
      }
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
