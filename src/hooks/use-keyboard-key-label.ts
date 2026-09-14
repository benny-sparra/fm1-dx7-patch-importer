import { useCallback, useEffect, useState } from 'react'

import { qwertyKeyLabel } from '@/lib/piano-keyboard'

type NavigatorWithKeyboard = Navigator & {
  keyboard?: { getLayoutMap?: () => Promise<ReadonlyMap<string, string>> }
}

/**
 * Names a physical key (`KeyboardEvent.code`) by the letter it types on the user's layout, so a
 * key on an AZERTY keyboard is labelled with its French letter. Browsers without the Keyboard Map
 * API, or pages that may not use it, get the QWERTY letter instead.
 */
export function useKeyboardKeyLabel() {
  const [layout, setLayout] = useState<ReadonlyMap<string, string> | null>(null)

  useEffect(() => {
    let cancelled = false
    try {
      void (navigator as NavigatorWithKeyboard).keyboard
        ?.getLayoutMap?.()
        .then((layoutMap) => {
          if (!cancelled) setLayout(layoutMap)
        })
        .catch(() => undefined)
    } catch {
      // The QWERTY letters remain.
    }
    return () => {
      cancelled = true
    }
  }, [])

  return useCallback(
    (code: string) => (layout?.get(code) || qwertyKeyLabel(code)).toUpperCase(),
    [layout],
  )
}
