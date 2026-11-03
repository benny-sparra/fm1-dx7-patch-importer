import { useLayoutEffect, useState } from 'react'

import {
  normalizeFm1Colorway,
  normalizeSmk37Colorway,
  type Colorway,
  type Fm1Colorway,
  type Smk37Colorway,
} from '@/lib/fm1-colorway'
import { applyFm1Favicon } from '@/lib/fm1-favicon'

const STORAGE_KEY = 'fm1-colourway'
// The SMK-37's finish is kept apart, so plugging an FM1 back in brings back its own.
const SMK37_STORAGE_KEY = 'smk37-colourway'

function readStoredValue(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function storeValue(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // The selected finish still applies when storage is unavailable.
  }
}

/**
 * The page's finish: the FM1's, or the SMK-37's while `device` is the SMK-37. Each device keeps
 * its own choice.
 */
export function useFm1Colorway(device: 'fm1' | 'smk37' = 'fm1') {
  const [fm1Colorway, setFm1Colorway] = useState<Fm1Colorway>(() =>
    normalizeFm1Colorway(readStoredValue(STORAGE_KEY)),
  )
  const [smk37Colorway, setSmk37Colorway] = useState<Smk37Colorway>(() =>
    normalizeSmk37Colorway(readStoredValue(SMK37_STORAGE_KEY)),
  )
  const colorway: Colorway = device === 'smk37' ? smk37Colorway : fm1Colorway

  // Before paint, so a stored finish never shows a frame of the default one.
  useLayoutEffect(() => {
    document.documentElement.dataset.fm1Colorway = colorway
    applyFm1Favicon(colorway)
  }, [colorway])

  useLayoutEffect(() => storeValue(STORAGE_KEY, fm1Colorway), [fm1Colorway])

  const setColorway = (next: Colorway) => {
    if (device === 'smk37') {
      const smk37 = normalizeSmk37Colorway(next)
      setSmk37Colorway(smk37)
      storeValue(SMK37_STORAGE_KEY, smk37)
    } else {
      setFm1Colorway(normalizeFm1Colorway(next))
    }
  }

  return { colorway, fm1Colorway, setColorway, smk37Colorway }
}
