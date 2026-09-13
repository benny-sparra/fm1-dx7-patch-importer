/**
 * Application-level keyboard shortcuts.
 *
 * Widget keyboard behaviour (rotary controls, envelope points, the bank list)
 * stays with the widget that owns it. This module only covers the shortcuts
 * that act on a whole view, and the rules that decide when such a shortcut is
 * allowed to run at all.
 */

export type KeyboardShortcut = {
  /** Compared case-insensitively against `KeyboardEvent.key`. */
  key: string
  /** Command on Apple platforms, Control elsewhere; either is accepted. */
  mod?: boolean
  shift?: boolean
}

const typingElements = ['input', 'select', 'textarea']

const applePlatformPattern = /mac|iphone|ipad|ipod/i

type NavigatorWithPlatformData = Navigator & {
  userAgentData?: { platform?: string }
}

export function isApplePlatform(navigatorObject: Navigator = navigator) {
  const platform = (navigatorObject as NavigatorWithPlatformData).userAgentData?.platform

  return applePlatformPattern.test(platform || navigatorObject.userAgent)
}

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true

  return typingElements.includes(target.localName)
}

/** The modifier state of a key press, from either a DOM or a React event. */
export type ShortcutKeyEvent = Pick<
  KeyboardEvent,
  'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'
>

export function matchesShortcut(event: ShortcutKeyEvent, shortcut: KeyboardShortcut) {
  if (event.altKey) return false
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) return false
  if (event.shiftKey !== Boolean(shortcut.shift)) return false

  return event.metaKey || event.ctrlKey ? Boolean(shortcut.mod) : !shortcut.mod
}

/**
 * Decides whether a matching key press should reach the shortcut rather than
 * whatever already owns the keyboard.
 */
export function shouldRunShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut,
  ownerDocument: Document = document,
) {
  if (event.defaultPrevented) return false
  if (!matchesShortcut(event, shortcut)) return false

  // An open native dialog owns the keyboard: the unsaved-changes prompt needs
  // Escape, and the piano keyboard plays plain letter keys as notes.
  if (ownerDocument.querySelector('dialog[open]')) return false

  // A modified shortcut is unambiguous, so it still works while typing a name.
  if (shortcut.mod) return true

  if (isTypingTarget(event.target)) return false

  // Escape closes an open header menu first.
  return !ownerDocument.querySelector('details[open]')
}

const keyLabels: Record<string, string> = {
  enter: 'Enter',
  escape: 'Esc',
}

export function formatShortcut(shortcut: KeyboardShortcut, onApplePlatform: boolean) {
  const parts = []
  if (shortcut.mod) parts.push(onApplePlatform ? '⌘' : 'Ctrl')
  if (shortcut.shift) parts.push(onApplePlatform ? '⇧' : 'Shift')
  parts.push(keyLabels[shortcut.key.toLowerCase()] ?? shortcut.key.toUpperCase())

  return parts.join(onApplePlatform ? '' : '+')
}

/**
 * Shared by the editor page, which binds these, and the editor header, which
 * shows them as hints on the matching buttons.
 */
export const editorShortcuts = {
  back: { key: 'Escape' },
  redo: { key: 'z', mod: true, shift: true },
  save: { key: 's', mod: true },
  undo: { key: 'z', mod: true },
} as const satisfies Record<string, KeyboardShortcut>

/**
 * Shared by the librarian page, which binds these, and the patch grid, which
 * shows the search hint in the field's tooltip.
 */
export const librarianShortcuts = {
  clearSearch: { key: 'Escape' },
  // Both reach the search field: the slash is the cheap one, and taking the
  // browser's find shortcut is worth it in a view whose only text is a name.
  find: { key: 'f', mod: true },
  // Handled by the slot itself rather than the page, so it can act on the
  // slot the user is actually on. Defined here so the help dialog agrees.
  openSlot: { key: 'Enter' },
  search: { key: '/' },
} as const satisfies Record<string, KeyboardShortcut>
