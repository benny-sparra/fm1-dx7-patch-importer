// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { HelpDialog } from '@/components/help-dialog'
import type { Fm1Firmware } from '@/lib/fm1-firmware'
import { translatePageText } from '@/test/page-translator'

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

const midiWith = (firmware: Fm1Firmware) => ({ firmware })

// The guide is mounted only once it has been asked for, so rendering it opens it. Asked for, it
// opens on the full guide; a first visit opens it on the welcome.
async function openHelp({
  firmware = { kind: 'checking' },
  firstVisit = false,
}: { firmware?: Fm1Firmware; firstVisit?: boolean } = {}) {
  const user = userEvent.setup()
  render(
    <HelpDialog
      colorway="black"
      firstVisit={firstVisit}
      midi={midiWith(firmware)}
      onClose={vi.fn()}
    />,
  )

  return user
}

// A browser with Web MIDI, and Safari, which has none, on a secure page.
const useBrowserWithWebMidi = () =>
  vi.stubGlobal('navigator', { requestMIDIAccess: vi.fn(), userAgent: 'Mozilla/5.0 Chrome/140' })
const useBrowserWithoutWebMidi = () => {
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh) Version/18.0 Safari/605.1.15' })
  vi.stubGlobal('isSecureContext', true)
}

const visiblePanel = () => screen.getByRole('tabpanel')

const openShortcuts = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('tab', { name: 'Keyboard shortcuts' }))

describe('HelpDialog welcome', () => {
  it('greets a first visit with what the site does and three steps', async () => {
    useBrowserWithWebMidi()
    await openHelp({ firstVisit: true })

    const dialog = screen.getByRole('dialog', { name: 'Welcome to the FM1 editor & librarian' })
    expect(
      within(dialog).getByText('Edit and organise patches for your M-VAVE FM1, in the browser.'),
    ).toBeTruthy()
    const steps = within(within(dialog).getByRole('list')).getAllByRole('listitem')
    expect(steps.map((step) => step.textContent)).toEqual([
      '1Plug in the FM1 and switch MIDI online.',
      '2Click a patch to hear it, double-click to edit.',
      '3Send to FM1 puts a whole bank on the synth.',
    ])
    expect(within(dialog).queryByRole('tablist')).toBeNull()
  })

  it('notes that the banks are saved in this browser', async () => {
    useBrowserWithWebMidi()
    await openHelp({ firstVisit: true })

    expect(
      screen.getByText('Your banks are saved in this browser. Back them up from Library actions.'),
    ).toBeTruthy()
  })

  it('says nothing about the browser when it can reach the FM1', async () => {
    useBrowserWithWebMidi()
    await openHelp({ firstVisit: true })

    expect(screen.queryByText('This browser can’t connect to the FM1.')).toBeNull()
  })

  it('swaps the steps for where the site works in a browser without Web MIDI', async () => {
    useBrowserWithoutWebMidi()
    await openHelp({ firstVisit: true })

    expect(screen.getByText('This browser can’t connect to the FM1.')).toBeTruthy()
    expect(
      screen.getByText(
        'Open this page in Chrome, Edge or Firefox on a computer, or Chrome on Android.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('You can still browse and edit patches here.')).toBeTruthy()
    expect(screen.queryByText('Plug in the FM1 and switch MIDI online.')).toBeNull()
  })

  it('opens the full guide in place and moves focus to its first tab', async () => {
    const user = await openHelp({ firstVisit: true })

    await user.click(screen.getByRole('button', { name: 'Full guide' }))

    expect(screen.getByRole('dialog', { name: 'Guide' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Getting started' }))
  })

  it('survives a page translator when it swaps the welcome for the guide', async () => {
    const user = await openHelp({ firstVisit: true })
    translatePageText(screen.getByRole('dialog'))

    await user.click(screen.getByRole('button', { name: 'Full guide' }))

    expect(screen.getByRole('tab', { name: 'Getting started' })).toBeTruthy()
  })
})

describe('HelpDialog sections', () => {
  it('opens on the numbered walkthrough when it is asked for', async () => {
    await openHelp()

    expect(screen.getByRole('dialog', { name: 'Guide' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Getting started' }).getAttribute('aria-selected')).toBe(
      'true',
    )
    expect(within(visiblePanel()).getByText('Connect your FM1')).toBeTruthy()
    expect(within(visiblePanel()).getByText('Keep a backup')).toBeTruthy()
  })

  it('swaps the walkthrough for the shortcuts when that tab is chosen', async () => {
    const user = await openHelp()

    await openShortcuts(user)

    expect(within(visiblePanel()).getByText('Jump to search')).toBeTruthy()
    // The editor rows reuse the labels from the buttons they mirror.
    expect(within(visiblePanel()).getByText('Save to library')).toBeTruthy()
    expect(within(visiblePanel()).queryByText('Connect your FM1')).toBeNull()
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

describe('HelpDialog firmware note', () => {
  it('describes Baud Girl’s firmware once the FM1 is identified as running it', async () => {
    await openHelp({ firmware: { identity: 'FM-1_097', kind: 'fm1-va' } })

    expect(within(visiblePanel()).getByText('Baud Girl (FM-1+VA)')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'baudgirl.com' })
    expect(link.getAttribute('href')).toBe('https://baudgirl.com/work/FM-1+VA')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it.each([
    { firmware: { kind: 'checking' } },
    { firmware: { identity: 'FM-1_001', kind: 'mvave' } },
    { firmware: { identity: 'FM-1_910', kind: 'felucca' } },
  ] satisfies Array<{ firmware: Fm1Firmware }>)(
    'leaves it out while the firmware is $firmware.kind',
    async ({ firmware }) => {
      await openHelp({ firmware })

      expect(screen.queryByText('Baud Girl (FM-1+VA)')).toBeNull()
    },
  )
})

describe('HelpDialog browser support', () => {
  it('says nothing about the browser when it can reach the FM1', async () => {
    useBrowserWithWebMidi()
    await openHelp()

    expect(screen.queryByText('This browser can’t connect to the FM1.')).toBeNull()
  })

  it('says where the site works in a browser without Web MIDI', async () => {
    useBrowserWithoutWebMidi()
    await openHelp()

    expect(screen.getByText('This browser can’t connect to the FM1.')).toBeTruthy()
    expect(within(visiblePanel()).getByText('Connect your FM1')).toBeTruthy()
  })
})
