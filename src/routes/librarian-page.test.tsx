// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { type MidiController } from '@/hooks/use-midi'

import { LibrarianPage } from './librarian-page'

const reportBankTransferFailure = vi.hoisted(() => vi.fn())

vi.mock('@/lib/monitoring', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/monitoring')>()),
  reportBankTransferFailure,
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.setItem('fm1-bank-selection-dialog-dismissed', 'true')
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  delete window.umami
})

const library = {
  addBank: vi.fn(),
  bankDescriptions: {},
  bankNames: { A: 'Studio Favourites', B: 'Electric Keys' },
  deleteBank: vi.fn(),
  getBankVoices: vi.fn(() => []),
  importBank: vi.fn(),
  loadDemoBank: vi.fn(),
  loadedBanks: ['A', 'B'],
  moveVoice: vi.fn(),
  namedBanks: [],
  patches: [
    { bank: 'A', family: 'Keys', id: 'bank-A-1', name: 'Alpha Piano', number: 1, program: 0 },
    { bank: 'B', family: 'Bass', id: 'bank-B-1', name: 'Beta Bass', number: 1, program: 32 },
  ],
  resetFactoryBanks: vi.fn(),
  updateBankInformation: vi.fn(),
  workspaceBanks: ['A', 'B'],
} as unknown as PatchLibrary

const midi = {
  hasMidiOutput: false,
  sendBank: vi.fn(),
} as unknown as MidiController

describe('LibrarianPage bank selection', () => {
  it('updates the patch grid when a bank is selected without breaking search', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={library}
          midi={midi}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    expect(screen.getByText('A01')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send Alpha Piano to FM1' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Send Beta Bass to FM1' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'B — Electric Keys' }))

    expect(screen.getByText('B01')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send Beta Bass to FM1' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Send Alpha Piano to FM1' })).toBeNull()

    await user.type(screen.getByPlaceholderText('Search by name'), 'no match')
    expect(screen.getByText('No patches match this search')).toBeTruthy()
  })
})

describe('LibrarianPage slot actions', () => {
  it('plays a slot on click, opens it on double click, and edits the lit slot', async () => {
    const user = userEvent.setup()
    const onEditPatch = vi.fn()
    const onSelectPatch = vi.fn()
    const { rerender } = render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={library}
          midi={midi}
          onBankDeleted={vi.fn()}
          onEditPatch={onEditPatch}
          onSelectPatch={onSelectPatch}
        />
      </ToastProvider>,
    )

    expect(screen.getByRole('button', { name: 'Edit' }).hasAttribute('disabled')).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Send Alpha Piano to FM1' }))
    expect(onSelectPatch).toHaveBeenCalledWith(library.patches[0])
    expect(onEditPatch).not.toHaveBeenCalled()

    await user.dblClick(screen.getByRole('button', { name: 'Send Alpha Piano to FM1' }))
    expect(onEditPatch).toHaveBeenCalledWith(library.patches[0])

    onEditPatch.mockClear()
    rerender(
      <ToastProvider>
        <LibrarianPage
          activePatchId="bank-A-1"
          library={library}
          midi={midi}
          onBankDeleted={vi.fn()}
          onEditPatch={onEditPatch}
          onSelectPatch={onSelectPatch}
        />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Edit A01' }))
    expect(onEditPatch).toHaveBeenCalledWith(library.patches[0])
  })
})

describe('LibrarianPage transfer analytics', () => {
  it('waits for confirmation in the bank guide before starting its first transfer', async () => {
    sessionStorage.removeItem('fm1-bank-selection-dialog-dismissed')
    const user = userEvent.setup()
    const connectedMidi = {
      hasMidiOutput: true,
      sendBank: vi.fn(async () => ({ ok: true }) as const),
      sysexAvailable: true,
    } as unknown as MidiController
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={library}
          midi={connectedMidi}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))
    const dialog = screen.getByRole('dialog', {
      name: 'Choose the destination bank on your FM1',
    })

    expect(connectedMidi.sendBank).not.toHaveBeenCalled()
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull()

    await user.click(within(dialog).getByRole('button', { name: 'Send to FM1' }))

    expect(connectedMidi.sendBank).toHaveBeenCalledOnce()
  })

  it('tracks a completed bank transfer after MIDI reports success', async () => {
    const user = userEvent.setup()
    const track = vi.fn()
    window.umami = { track }
    const connectedMidi = {
      hasMidiOutput: true,
      sendBank: vi.fn(async () => ({ ok: true }) as const),
      sysexAvailable: true,
    } as unknown as MidiController
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={library}
          midi={connectedMidi}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    expect(track).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('bank_transfer_completed', undefined)
  })

  it('shows recovery without attempting a bank transfer when SysEx is unavailable', async () => {
    const user = userEvent.setup()
    const track = vi.fn()
    window.umami = { track }
    const connectedMidi = {
      connectMidi: vi.fn(async () => undefined),
      disconnectMidi: vi.fn(async () => undefined),
      hasMidiOutput: true,
      isConnecting: false,
      midiAccess: true,
      sendBank: vi.fn(async () => ({ ok: true }) as const),
      sysexAvailable: false,
    } as unknown as MidiController
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={library}
          midi={connectedMidi}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    expect(screen.getByRole('dialog', { name: 'SysEx access unavailable.' })).toBeTruthy()
    expect(connectedMidi.sendBank).not.toHaveBeenCalled()
    expect(track).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('bank_transfer_failed', {
      reason: 'sysex_unavailable',
    })
  })

  it('reports an unexpected bank transfer rejection with safe operational context', async () => {
    const user = userEvent.setup()
    const transportError = new Error('Private browser transport failure')
    const connectedMidi = {
      channel: 6,
      hasMidiOutput: true,
      sendBank: vi.fn(async () => Promise.reject(transportError)),
      sysexAvailable: true,
    } as unknown as MidiController
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={library}
          midi={connectedMidi}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    expect(reportBankTransferFailure).toHaveBeenCalledOnce()
    expect(reportBankTransferFailure).toHaveBeenCalledWith({
      channel: 6,
      stage: 'page',
      sysexAvailable: true,
      voiceCount: 0,
    })
  })

  it('reconnects from the SysEx warning before restoring normal bank instructions', async () => {
    const user = userEvent.setup()
    const disconnectMidi = vi.fn(async () => undefined)
    const connectMidi = vi.fn(async () => undefined)
    const blockedMidi = {
      connectMidi,
      disconnectMidi,
      hasMidiOutput: true,
      isConnecting: false,
      midiAccess: true,
      sendBank: vi.fn(),
      sysexAvailable: false,
    } as unknown as MidiController
    const view = render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={library}
          midi={blockedMidi}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))
    await user.click(screen.getByRole('button', { name: 'Reconnect MIDI with SysEx' }))

    expect(disconnectMidi).toHaveBeenCalledOnce()
    expect(connectMidi).toHaveBeenCalledOnce()
    expect(disconnectMidi.mock.invocationCallOrder[0]).toBeLessThan(
      connectMidi.mock.invocationCallOrder[0],
    )
    expect(screen.getByRole('dialog', { name: 'SysEx access unavailable.' })).toBeTruthy()

    view.rerender(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={library}
          midi={{ ...blockedMidi, sysexAvailable: true }}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Choose the destination bank on your FM1',
    })
    await user.click(within(dialog).getByRole('button', { name: 'Send to FM1' }))

    expect(blockedMidi.sendBank).toHaveBeenCalledOnce()
  })
})

describe('LibrarianPage keyboard shortcuts', () => {
  function renderLibrarian(overrides: { activePatchId?: string; onEditPatch?: () => void } = {}) {
    const onEditPatch = overrides.onEditPatch ?? vi.fn()
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId={overrides.activePatchId ?? ''}
          library={library}
          midi={midi}
          onBankDeleted={vi.fn()}
          onEditPatch={onEditPatch}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    return { onEditPatch, search: screen.getByPlaceholderText('Search by name') }
  }

  it('focuses the search field on the slash shortcut', async () => {
    const user = userEvent.setup()
    const { search } = renderLibrarian()

    await user.keyboard('/')

    expect(document.activeElement).toBe(search)
    expect((search as HTMLInputElement).value).toBe('')
  })

  it('focuses the search field on the find shortcut', async () => {
    const user = userEvent.setup()
    const { search } = renderLibrarian()

    await user.keyboard('{Meta>}f{/Meta}')

    expect(document.activeElement).toBe(search)
  })

  it('selects the existing query so the find shortcut can retype it', async () => {
    const user = userEvent.setup()
    const { search } = renderLibrarian()

    await user.type(search, 'Alpha')
    await user.keyboard('{Meta>}f{/Meta}')
    await user.keyboard('Beta')

    expect((search as HTMLInputElement).value).toBe('Beta')
  })

  it('types a slash into the search field instead of refocusing it', async () => {
    const user = userEvent.setup()
    const { search } = renderLibrarian()

    await user.type(search, 'a/b')

    expect((search as HTMLInputElement).value).toBe('a/b')
  })

  it('clears the search from the field itself on Escape', async () => {
    const user = userEvent.setup()
    const { search } = renderLibrarian()

    await user.type(search, 'Alpha')
    await user.keyboard('{Escape}')

    expect((search as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(search)
  })

  it('clears the search from elsewhere on the page on Escape', async () => {
    const user = userEvent.setup()
    const { search } = renderLibrarian()

    await user.type(search, 'Alpha')
    await user.click(screen.getByRole('button', { name: 'Send Alpha Piano to FM1' }))
    await user.keyboard('{Escape}')

    expect((search as HTMLInputElement).value).toBe('')
  })

  it('opens the lit slot on Enter', async () => {
    const user = userEvent.setup()
    const { onEditPatch } = renderLibrarian({ activePatchId: 'bank-A-1' })

    screen.getByRole('button', { name: 'Send Alpha Piano to FM1' }).focus()
    await user.keyboard('{Enter}')

    expect(onEditPatch).toHaveBeenCalledWith(library.patches[0])
  })

  it('plays an unlit slot on Enter rather than opening it', async () => {
    const user = userEvent.setup()
    const { onEditPatch } = renderLibrarian()

    screen.getByRole('button', { name: 'Send Alpha Piano to FM1' }).focus()
    await user.keyboard('{Enter}')

    expect(onEditPatch).not.toHaveBeenCalled()
  })
})

describe('LibrarianPage grid navigation', () => {
  // layOutInColumns patches a prototype, which would otherwise outlive its test.
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const gridPatches = Array.from({ length: 6 }, (_, index) => ({
    bank: 'A',
    family: 'Keys',
    id: `bank-A-${index + 1}`,
    name: `Slot ${index + 1}`,
    number: index + 1,
    program: index,
  }))

  const gridLibrary = {
    ...library,
    patches: gridPatches,
  } as unknown as PatchLibrary

  function renderGrid(activePatchId = '') {
    const onSelectPatch = vi.fn()
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId={activePatchId}
          library={gridLibrary}
          midi={midi}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onSelectPatch={onSelectPatch}
        />
      </ToastProvider>,
    )

    return { onSelectPatch, user: userEvent.setup() }
  }

  const slot = (number: number) =>
    screen.getByRole('button', { name: `Send Slot ${number} to FM1` })

  /** jsdom does no layout, so the row geometry has to be supplied. */
  function layOutInColumns(columns: number) {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const match = this.getAttribute('aria-label')?.match(/Send Slot (\d+) to FM1/)
      const row = match ? Math.floor((Number(match[1]) - 1) / columns) : 0

      return { top: row * 40 } as DOMRect
    })
  }

  it('makes the grid a single tab stop', () => {
    renderGrid()

    expect(slot(1).getAttribute('tabindex')).toBe('0')
    expect(slot(2).getAttribute('tabindex')).toBe('-1')
    expect(slot(6).getAttribute('tabindex')).toBe('-1')
  })

  it('opens the tab stop on the lit slot', () => {
    renderGrid('bank-A-4')

    expect(slot(4).getAttribute('tabindex')).toBe('0')
    expect(slot(1).getAttribute('tabindex')).toBe('-1')
  })

  it('steps along the row with the arrow keys', async () => {
    const { user } = renderGrid()

    slot(1).focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(slot(2))

    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(slot(1))
  })

  it('moves the tab stop to the slot the arrows reached', async () => {
    const { user } = renderGrid()

    slot(1).focus()
    await user.keyboard('{ArrowRight}')

    expect(slot(2).getAttribute('tabindex')).toBe('0')
    expect(slot(1).getAttribute('tabindex')).toBe('-1')
  })

  it('does not play a slot the arrows move onto', async () => {
    const { onSelectPatch, user } = renderGrid()

    slot(1).focus()
    await user.keyboard('{ArrowRight}{ArrowRight}{End}')

    expect(onSelectPatch).not.toHaveBeenCalled()
  })

  it('stops at the ends of the grid rather than wrapping', async () => {
    const { user } = renderGrid()

    slot(1).focus()
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(slot(1))

    slot(6).focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(slot(6))
  })

  it('jumps to the first and last slot', async () => {
    const { user } = renderGrid()

    slot(3).focus()
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(slot(6))

    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(slot(1))
  })

  it('steps a whole row at a time from the rendered layout', async () => {
    layOutInColumns(3)
    const { user } = renderGrid()

    slot(2).focus()
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(slot(5))

    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(slot(2))
  })

  it('still opens the lit slot on Enter after arrowing to it', async () => {
    const onEditPatch = vi.fn()
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId="bank-A-2"
          library={gridLibrary}
          midi={midi}
          onBankDeleted={vi.fn()}
          onEditPatch={onEditPatch}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )
    const user = userEvent.setup()

    slot(1).focus()
    await user.keyboard('{ArrowRight}{Enter}')

    expect(onEditPatch).toHaveBeenCalledWith(gridPatches[1])
  })
})

describe('LibrarianPage slot tooltips', () => {
  it('explains that a slot with no FM1 program plays through the edit buffer', () => {
    const slotLibrary = {
      ...library,
      patches: [
        { bank: 'A', family: 'DX7', id: 'bank-A-1', name: 'Hardware Keys', number: 1, program: 0 },
        { bank: 'A', family: 'DX7', id: 'bank-A-2', name: 'Added Pad', number: 2 },
      ],
    } as unknown as PatchLibrary
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={slotLibrary}
          midi={midi}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    expect(
      screen.getByRole('button', { name: 'Send Hardware Keys to FM1' }).getAttribute('title'),
    ).toBe('Click to play Hardware Keys on the FM1; double-click to edit')
    expect(
      screen.getByRole('button', { name: 'Send Added Pad to FM1' }).getAttribute('title'),
    ).toBe('Click to play Added Pad through the FM1 edit buffer; double-click to edit')
  })
})

describe('LibrarianPage search', () => {
  it('finds a slot by the code shown on it', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={library}
          midi={midi}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    await user.type(screen.getByPlaceholderText('Search by name'), 'a01')

    expect(screen.getByRole('button', { name: 'Send Alpha Piano to FM1' })).toBeTruthy()
  })
})

describe('LibrarianPage bank deletion', () => {
  it('shows the bank that moves into the deleted bank’s letter', async () => {
    const user = userEvent.setup()
    const onBankDeleted = vi.fn()
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={library}
          midi={midi}
          onBankDeleted={onBankDeleted}
          onEditPatch={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    await user.click(screen.getAllByTitle('Actions for Studio Favourites')[0])
    await user.click(screen.getAllByRole('button', { name: 'Delete bank' })[0])
    const dialog = screen.getByRole('dialog', { name: 'Delete bank' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete bank' }))

    expect(onBankDeleted).toHaveBeenCalledExactlyOnceWith('A')
    expect(library.deleteBank).toHaveBeenCalledExactlyOnceWith('A')
    expect(
      screen.getByRole('button', { name: 'A — Studio Favourites' }).getAttribute('aria-pressed'),
    ).toBe('true')
  })
})
