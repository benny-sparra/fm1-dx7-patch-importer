// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

import {
  editorShortcuts,
  librarianShortcuts,
  formatShortcut,
  isApplePlatform,
  isTypingTarget,
  matchesShortcut,
  shouldRunShortcut,
} from '@/lib/keyboard-shortcuts'

function keyEvent(init: KeyboardEventInit & { target?: Element } = { key: 'z' }) {
  const { target, ...eventInit } = init
  const event = new KeyboardEvent('keydown', { cancelable: true, ...eventInit })
  if (target) Object.defineProperty(event, 'target', { value: target })

  return event
}

function appendElement(html: string) {
  document.body.insertAdjacentHTML('beforeend', html)

  return document.body.lastElementChild as HTMLElement
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('matchesShortcut', () => {
  it('accepts Command on Apple keyboards and Control elsewhere for the same binding', () => {
    expect(matchesShortcut(keyEvent({ key: 'z', metaKey: true }), editorShortcuts.undo)).toBe(true)
    expect(matchesShortcut(keyEvent({ key: 'z', ctrlKey: true }), editorShortcuts.undo)).toBe(true)
  })

  it('matches the key case-insensitively, as a shifted key press reports uppercase', () => {
    expect(
      matchesShortcut(keyEvent({ key: 'Z', metaKey: true, shiftKey: true }), editorShortcuts.redo),
    ).toBe(true)
  })

  it('keeps redo out of undo, so the shifted press is not handled twice', () => {
    const redoPress = keyEvent({ key: 'z', metaKey: true, shiftKey: true })

    expect(matchesShortcut(redoPress, editorShortcuts.undo)).toBe(false)
    expect(matchesShortcut(redoPress, editorShortcuts.redo)).toBe(true)
  })

  it('rejects an unmodified press of a modified shortcut', () => {
    expect(matchesShortcut(keyEvent({ key: 's' }), editorShortcuts.save)).toBe(false)
  })

  it('rejects a modified press of a bare shortcut', () => {
    expect(matchesShortcut(keyEvent({ key: 'Escape', metaKey: true }), editorShortcuts.back)).toBe(
      false,
    )
  })

  it('leaves Alt combinations to the browser and the operating system', () => {
    expect(
      matchesShortcut(keyEvent({ altKey: true, key: 'z', metaKey: true }), editorShortcuts.undo),
    ).toBe(false)
  })
})

describe('isTypingTarget', () => {
  it('recognizes the text fields a key press belongs to', () => {
    expect(isTypingTarget(appendElement('<input />'))).toBe(true)
    expect(isTypingTarget(appendElement('<textarea></textarea>'))).toBe(true)
    expect(isTypingTarget(appendElement('<select></select>'))).toBe(true)
  })

  it('recognizes a contenteditable region', () => {
    const editable = appendElement('<div contenteditable="true"></div>')
    // jsdom does not implement isContentEditable from the attribute alone.
    Object.defineProperty(editable, 'isContentEditable', { value: true })

    expect(isTypingTarget(editable)).toBe(true)
  })

  it('does not treat a button or a missing target as typing', () => {
    expect(isTypingTarget(appendElement('<button type="button"></button>'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})

describe('shouldRunShortcut', () => {
  it('runs a matching shortcut against a plain page', () => {
    expect(shouldRunShortcut(keyEvent({ key: 'Escape' }), editorShortcuts.back)).toBe(true)
  })

  it('yields every shortcut to an open native dialog', () => {
    appendElement('<dialog open></dialog>')

    expect(shouldRunShortcut(keyEvent({ key: 'Escape' }), editorShortcuts.back)).toBe(false)
    expect(shouldRunShortcut(keyEvent({ key: 's', metaKey: true }), editorShortcuts.save)).toBe(
      false,
    )
  })

  it('lets modified shortcuts through a dialog that only claims plain keys', () => {
    appendElement('<dialog open data-plain-keys-only></dialog>')

    expect(shouldRunShortcut(keyEvent({ key: 's', metaKey: true }), editorShortcuts.save)).toBe(
      true,
    )
    expect(shouldRunShortcut(keyEvent({ key: 'Escape' }), editorShortcuts.back)).toBe(false)
  })

  it('yields a modified shortcut when an ordinary dialog is also open', () => {
    appendElement('<dialog open data-plain-keys-only></dialog>')
    appendElement('<dialog open></dialog>')

    expect(shouldRunShortcut(keyEvent({ key: 's', metaKey: true }), editorShortcuts.save)).toBe(
      false,
    )
  })

  it('still saves while the patch name field has focus', () => {
    const nameField = appendElement('<input />')

    expect(
      shouldRunShortcut(keyEvent({ key: 's', metaKey: true, target: nameField }), {
        ...editorShortcuts.save,
      }),
    ).toBe(true)
  })

  it('leaves a bare key to the field being typed into', () => {
    const nameField = appendElement('<input />')

    expect(
      shouldRunShortcut(keyEvent({ key: 'Escape', target: nameField }), editorShortcuts.back),
    ).toBe(false)
  })

  it('lets an open header menu close on Escape before the view reacts', () => {
    appendElement('<details open><summary>Presets</summary></details>')

    expect(shouldRunShortcut(keyEvent({ key: 'Escape' }), editorShortcuts.back)).toBe(false)
  })

  it('ignores a key press another handler has already taken', () => {
    const event = keyEvent({ key: 'Escape' })
    event.preventDefault()

    expect(shouldRunShortcut(event, editorShortcuts.back)).toBe(false)
  })
})

describe('librarianShortcuts', () => {
  it('reaches the search field from both the slash and the find shortcut', () => {
    expect(matchesShortcut(keyEvent({ key: '/' }), librarianShortcuts.search)).toBe(true)
    expect(matchesShortcut(keyEvent({ key: 'f', metaKey: true }), librarianShortcuts.find)).toBe(
      true,
    )
  })

  it('lets the slash be typed into the search field rather than refocusing it', () => {
    const searchField = appendElement('<input type="search" />')

    expect(
      shouldRunShortcut(keyEvent({ key: '/', target: searchField }), librarianShortcuts.search),
    ).toBe(false)
  })

  it('still reaches the search field from the find shortcut while typing', () => {
    const searchField = appendElement('<input type="search" />')

    expect(
      shouldRunShortcut(keyEvent({ key: 'f', metaKey: true, target: searchField }), {
        ...librarianShortcuts.find,
      }),
    ).toBe(true)
  })
})

describe('formatShortcut', () => {
  it('uses Apple symbols without separators', () => {
    expect(formatShortcut(editorShortcuts.undo, true)).toBe('⌘Z')
    expect(formatShortcut(editorShortcuts.redo, true)).toBe('⌘⇧Z')
    expect(formatShortcut(editorShortcuts.back, true)).toBe('Esc')
  })

  it('spells the modifiers out on other platforms', () => {
    expect(formatShortcut(editorShortcuts.undo, false)).toBe('Ctrl+Z')
    expect(formatShortcut(editorShortcuts.redo, false)).toBe('Ctrl+Shift+Z')
  })

  it('leaves a punctuation key as itself', () => {
    expect(formatShortcut(librarianShortcuts.search, true)).toBe('/')
  })
})

describe('isApplePlatform', () => {
  it('prefers the user-agent client hint when the browser provides one', () => {
    expect(
      isApplePlatform({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        userAgentData: { platform: 'macOS' },
      } as unknown as Navigator),
    ).toBe(true)
  })

  it('falls back to the user agent string', () => {
    expect(
      isApplePlatform({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' } as Navigator),
    ).toBe(true)
    expect(isApplePlatform({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)' } as Navigator)).toBe(false)
  })
})

describe('library undo shortcuts', () => {
  it('leaves undo to the text field being typed into', () => {
    const search = appendElement('<input type="search" />')

    expect(
      shouldRunShortcut(
        keyEvent({ key: 'z', metaKey: true, target: search }),
        librarianShortcuts.undo,
      ),
    ).toBe(false)
  })

  it('undoes the library from anywhere else on the page', () => {
    expect(shouldRunShortcut(keyEvent({ key: 'z', metaKey: true }), librarianShortcuts.undo)).toBe(
      true,
    )
    expect(
      shouldRunShortcut(
        keyEvent({ key: 'z', metaKey: true, shiftKey: true }),
        librarianShortcuts.redo,
      ),
    ).toBe(true)
  })
})
