// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { HelpDialog } from '@/components/help-dialog'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
  }
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})

// The guide is mounted only once it has been asked for, so rendering it opens it.
async function openHelp() {
  const user = userEvent.setup()
  render(<HelpDialog onClose={vi.fn()} />)

  return user
}

const visiblePanel = () => screen.getByRole('tabpanel')

const openShortcuts = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('tab', { name: 'Keyboard shortcuts' }))

describe('HelpDialog sections', () => {
  it('opens on the numbered walkthrough', async () => {
    await openHelp()

    expect(screen.getByRole('tab', { name: 'Getting started' }).getAttribute('aria-selected')).toBe(
      'true',
    )
    // The step titles carry their number and icon in the same element.
    expect(within(visiblePanel()).getByText(/Build your library/)).toBeTruthy()
    expect(within(visiblePanel()).getByText(/Transfer the patches/)).toBeTruthy()
  })

  it('swaps the walkthrough for the shortcuts when that tab is chosen', async () => {
    const user = await openHelp()

    await openShortcuts(user)

    expect(within(visiblePanel()).getByText('Jump to search')).toBeTruthy()
    // The editor rows reuse the labels from the buttons they mirror.
    expect(within(visiblePanel()).getByText('Save to Library')).toBeTruthy()
    expect(within(visiblePanel()).queryByText(/Build your library/)).toBeNull()
  })

  it('moves between tabs with the arrow keys', async () => {
    const user = await openHelp()

    screen.getByRole('tab', { name: 'Getting started' }).focus()
    await user.keyboard('{ArrowRight}')

    const shortcutsTab = screen.getByRole('tab', { name: 'Keyboard shortcuts' })
    expect(document.activeElement).toBe(shortcutsTab)
    expect(shortcutsTab.getAttribute('aria-selected')).toBe('true')
    expect(within(visiblePanel()).getByText('Jump to search')).toBeTruthy()
  })

  it('wraps from the first tab round to the last', async () => {
    const user = await openHelp()

    screen.getByRole('tab', { name: 'Getting started' }).focus()
    await user.keyboard('{ArrowLeft}')

    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Keyboard shortcuts' }))
  })

  it('keeps only the selected tab in the tab order', async () => {
    await openHelp()

    expect(screen.getByRole('tab', { name: 'Getting started' }).getAttribute('tabindex')).toBe('0')
    expect(screen.getByRole('tab', { name: 'Keyboard shortcuts' }).getAttribute('tabindex')).toBe(
      '-1',
    )
  })
})

describe('HelpDialog shortcuts', () => {
  it('groups the shortcuts by the view they act on', async () => {
    const user = await openHelp()
    await openShortcuts(user)

    const panel = within(visiblePanel())
    expect(panel.getByText('Patch banks')).toBeTruthy()
    expect(panel.getByText('Voice editor')).toBeTruthy()
    expect(panel.getByText('Open the lit slot')).toBeTruthy()
    expect(panel.getByText('Back to patch banks')).toBeTruthy()
    expect(panel.getByText('Stop comparing and return to your edits')).toBeTruthy()
  })

  it('writes the keys with Apple symbols on an Apple platform', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' })
    const user = await openHelp()
    await openShortcuts(user)

    const panel = within(visiblePanel())
    expect(panel.getByText('⌘F')).toBeTruthy()
    // Undo and redo are listed for both the banks and the editor.
    expect(panel.getAllByText('⌘Z')).toHaveLength(2)
    expect(panel.getAllByText('⌘⇧Z')).toHaveLength(2)
    expect(panel.getByText('Enter')).toBeTruthy()
    // Escape clears the search in the banks, leaves the editor, and stops comparing.
    expect(panel.getAllByText('Esc')).toHaveLength(3)
  })

  it('spells the modifiers out on other platforms', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' })
    const user = await openHelp()
    await openShortcuts(user)

    const panel = within(visiblePanel())
    expect(panel.getByText('Ctrl+F')).toBeTruthy()
    expect(panel.getByText('Ctrl+S')).toBeTruthy()
    expect(panel.getAllByText('Ctrl+Shift+Z')).toHaveLength(2)
  })

  it('pairs every listed key with the action it performs', async () => {
    const user = await openHelp()
    await openShortcuts(user)

    expect(within(visiblePanel()).getAllByRole('term')).toHaveLength(10)
    expect(within(visiblePanel()).getAllByRole('definition')).toHaveLength(10)
  })
})
