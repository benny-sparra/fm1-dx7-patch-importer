import { useEffect, useState } from 'react'

import { normalizeFm1Colorway, type Fm1Colorway } from '@/lib/fm1-colorway'
import { applyFm1Favicon } from '@/lib/fm1-favicon'

const STORAGE_KEY = 'fm1-colourway'

function getStoredColorway(): Fm1Colorway {
  try {
    return normalizeFm1Colorway(localStorage.getItem(STORAGE_KEY))
  } catch {
    return 'black'
  }
}

export function useFm1Colorway() {
  const [colorway, setColorway] = useState<Fm1Colorway>(getStoredColorway)

  useEffect(() => {
    document.documentElement.dataset.fm1Colorway = colorway
    applyFm1Favicon(colorway)

    try {
      localStorage.setItem(STORAGE_KEY, colorway)
    } catch {
      // The selected finish still applies when storage is unavailable.
    }
  }, [colorway])

  return { colorway, setColorway }
}
