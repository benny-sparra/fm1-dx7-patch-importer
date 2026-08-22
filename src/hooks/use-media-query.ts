import { useEffect, useState } from 'react'

function getMediaQueryList(query: string) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  try {
    return window.matchMedia(query)
  } catch {
    return null
  }
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => getMediaQueryList(query)?.matches ?? false)

  useEffect(() => {
    const mediaQueryList = getMediaQueryList(query)
    if (!mediaQueryList) return

    const updateMatch = (event: MediaQueryListEvent | MediaQueryList) => setMatches(event.matches)
    updateMatch(mediaQueryList)

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', updateMatch)
      return () => mediaQueryList.removeEventListener('change', updateMatch)
    }
    if (typeof mediaQueryList.addListener === 'function') {
      mediaQueryList.addListener(updateMatch)
      return () => mediaQueryList.removeListener(updateMatch)
    }
  }, [query])

  return matches
}
