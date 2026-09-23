import { useEffect, useEffectEvent } from 'react'

import { shouldRunShortcut, type KeyboardShortcut } from '@/lib/keyboard-shortcuts'

export type ShortcutBinding = KeyboardShortcut & {
  /** Defaults to enabled. A disabled binding lets the key press fall through. */
  enabled?: boolean
  onTrigger: () => void
}

/**
 * Binds view-level shortcuts for as long as the caller is mounted. The first
 * enabled binding that matches wins, and no other binding sees the event.
 */
export function useKeyboardShortcuts(bindings: readonly ShortcutBinding[]) {
  // Callers rebuild these handlers every render; the listener is bound once and
  // reads the current bindings when a key is actually pressed.
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    for (const binding of bindings) {
      if (binding.enabled === false) continue
      if (!shouldRunShortcut(event, binding)) continue

      event.preventDefault()
      binding.onTrigger()
      return
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
