// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ComponentProps, useState } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { type MidiController } from '@/hooks/use-midi'
import { useLibrarianView } from '@/hooks/use-librarian-view'
import { translatePageText } from '@/test/page-translator'

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
    // A real dialog fires this as it closes, and dialogs the librarian mounts on demand rely on it.
    this.dispatchEvent(new Event('close'))
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
  canRedo: false,
  canUndo: true,
  copyVoice: vi.fn(),
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
  redo: vi.fn(),
  resetFactoryBanks: vi.fn(),
  undo: vi.fn(),
  undoChange: vi.fn(),
  updateBankInformation: vi.fn(),
  workspaceBanks: ['A', 'B'],
} as unknown as PatchLibrary

const midi = {
  hasMidiOutput: false,
  sendBank: vi.fn(),
} as unknown as MidiController

/** Renders the page with the shared library and MIDI stand-ins, and whatever a test changes. */
function renderLibrarianPage(props: Partial<ComponentProps<typeof LibrarianPage>> = {}) {
  return render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={midi}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onSelectPatch={vi.fn()}
        {...props}
      />
    </ToastProvider>,
  )
}

describe('LibrarianPage bank selection', () => {
  it('updates the patch grid when a bank is selected without breaking search', async () => {
    const user = userEvent.setup()
    renderLibrarianPage()

    expect(screen.getByText('A01')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send Alpha Piano to FM1' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Send Beta Bass to FM1' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'B — Electric Keys' }))

    expect(screen.getByText('B01')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send Beta Bass to FM1' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Send Alpha Piano to FM1' })).toBeNull()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'no match')
    expect(screen.getByText('No patches match this search')).toBeTruthy()
  })
})

describe('LibrarianPage slot actions', () => {
  it('plays a slot on click, opens it on double click, and edits it from its menu', async () => {
    const user = userEvent.setup()
    const onEditPatch = vi.fn()
    const onSelectPatch = vi.fn()
    renderLibrarianPage({ onEditPatch, onSelectPatch })

    await user.click(screen.getByRole('button', { name: 'Send Alpha Piano to FM1' }))
    expect(onSelectPatch).toHaveBeenCalledWith(library.patches[0])
    expect(onEditPatch).not.toHaveBeenCalled()

    await user.dblClick(screen.getByRole('button', { name: 'Send Alpha Piano to FM1' }))
    expect(onEditPatch).toHaveBeenCalledWith(library.patches[0])

    onEditPatch.mockClear()
    onSelectPatch.mockClear()
    await user.click(screen.getByRole('button', { name: 'Actions for Alpha Piano' }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(onEditPatch).toHaveBeenCalledExactlyOnceWith(library.patches[0])
    expect(onSelectPatch).not.toHaveBeenCalled()
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
    renderLibrarianPage({ midi: connectedMidi })

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
    renderLibrarianPage({ midi: connectedMidi })

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
    renderLibrarianPage({ midi: connectedMidi })

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
    renderLibrarianPage({ midi: connectedMidi })

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
    const view = renderLibrarianPage({ midi: blockedMidi })

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
    renderLibrarianPage({ activePatchId: overrides.activePatchId ?? '', onEditPatch })

    return { onEditPatch, search: screen.getByPlaceholderText('Search all banks') }
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
    renderLibrarianPage({ activePatchId, library: gridLibrary, onSelectPatch })

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
    renderLibrarianPage({ activePatchId: 'bank-A-2', library: gridLibrary, onEditPatch })
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
    renderLibrarianPage({ library: slotLibrary })

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
    renderLibrarianPage()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'a01')

    expect(screen.getByRole('button', { name: 'Send Alpha Piano to FM1' })).toBeTruthy()
  })

  function renderLibrarian(props: { library?: PatchLibrary; onSelectPatch?: () => void } = {}) {
    renderLibrarianPage({
      library: props.library ?? library,
      onSelectPatch: props.onSelectPatch ?? vi.fn(),
    })
    return userEvent.setup()
  }

  // A bank's name shows in the rail and, while the grid shows that bank, above the grid too.
  const isBankTitled = (name: string) => screen.getAllByText(name).length === 2

  it('finds a patch in a bank other than the one shown', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'bass')

    expect(screen.getByRole('button', { name: 'Send Beta Bass to FM1' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Send Alpha Piano to FM1' })).toBeNull()
  })

  it('lists matches from every bank in bank order', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'a')

    const results = screen.getAllByRole('button', { name: /^Send .* to FM1$/ })
    expect(results.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Send Alpha Piano to FM1',
      'Send Beta Bass to FM1',
    ])
  })

  it('plays a result without leaving the results', async () => {
    const onSelectPatch = vi.fn()
    const user = renderLibrarian({ onSelectPatch })

    await user.type(screen.getByPlaceholderText('Search all banks'), 'bass')
    await user.click(screen.getByRole('button', { name: 'Send Beta Bass to FM1' }))

    expect(onSelectPatch).toHaveBeenCalledExactlyOnceWith(library.patches[1])
    expect((screen.getByPlaceholderText('Search all banks') as HTMLInputElement).value).toBe('bass')
    expect(screen.getByRole('button', { name: 'Send Beta Bass to FM1' })).toBeTruthy()
  })

  it('leaves out banks that have nothing loaded', async () => {
    const user = renderLibrarian({ library: { ...library, loadedBanks: ['A'] } as PatchLibrary })

    await user.type(screen.getByPlaceholderText('Search all banks'), 'bass')

    expect(screen.queryByRole('button', { name: 'Send Beta Bass to FM1' })).toBeNull()
    expect(screen.getByText('No patches match this search')).toBeTruthy()
  })

  it('searches from a bank that has nothing loaded', async () => {
    const user = renderLibrarian({ library: { ...library, loadedBanks: ['B'] } as PatchLibrary })

    await user.type(screen.getByPlaceholderText('Search all banks'), 'bass')

    expect(screen.getByRole('button', { name: 'Send Beta Bass to FM1' })).toBeTruthy()
  })

  it('disables the search when no bank has anything loaded', () => {
    renderLibrarian({ library: { ...library, loadedBanks: [] } as unknown as PatchLibrary })

    expect(screen.getByPlaceholderText('Search all banks').hasAttribute('disabled')).toBe(true)
  })

  it('names the grid as search results in place of the bank while searching', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'bass')

    expect(screen.getByText('Search results')).toBeTruthy()
    expect(isBankTitled('Studio Favourites')).toBe(false)
  })

  it('shows the bank again once the search is cleared', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'bass')
    await user.clear(screen.getByPlaceholderText('Search all banks'))

    expect(screen.queryByText('Search results')).toBeNull()
    expect(isBankTitled('Studio Favourites')).toBe(true)
  })

  it('keeps the bank name current after a page translator rewrites the text', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'bass')
    translatePageText(document.body)
    await user.clear(screen.getByPlaceholderText('Search all banks'))

    expect(screen.queryByText('Search results')).toBeNull()
    expect(isBankTitled('Studio Favourites')).toBe(true)
  })

  it('disables sending a bank while showing search results', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'bass')

    const send = screen.getByRole('button', { name: 'Send to FM1' })
    expect(send.hasAttribute('disabled')).toBe(true)
    expect(send.getAttribute('title')).toBe('Choose a bank to send it to the FM1')
  })

  it('enables sending again once the search is cleared', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'bass')
    await user.clear(screen.getByPlaceholderText('Search all banks'))

    expect(screen.getByRole('button', { name: 'Send to FM1' }).hasAttribute('disabled')).toBe(false)
  })

  it('shows no bank as selected while showing search results', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'bass')

    expect(
      screen.getByRole('button', { name: 'A — Studio Favourites' }).getAttribute('aria-pressed'),
    ).toBe('false')
    expect(
      screen.getByRole('button', { name: 'B — Electric Keys' }).getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('selects the bank again once the search is cleared', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'bass')
    await user.clear(screen.getByPlaceholderText('Search all banks'))

    expect(
      screen.getByRole('button', { name: 'A — Studio Favourites' }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('returns to the bank of the last result played when the search is cleared', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'bass')
    await user.click(screen.getByRole('button', { name: 'Send Beta Bass to FM1' }))
    await user.clear(screen.getByPlaceholderText('Search all banks'))

    expect(
      screen.getByRole('button', { name: 'B — Electric Keys' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(screen.getByRole('button', { name: 'Send Beta Bass to FM1' })).toBeTruthy()
  })

  // Only a slot holding a DX7 voice has a grip to drag.
  const voicedLibrary = {
    ...library,
    patches: library.patches.map((patch) => ({ ...patch, family: 'DX7' })),
  } as PatchLibrary

  it('offers no reordering while showing search results', async () => {
    const user = renderLibrarian({ library: voicedLibrary })

    expect(screen.getByRole('button', { name: 'Reorder Alpha Piano' })).toBeTruthy()
    await user.type(screen.getByPlaceholderText('Search all banks'), 'a')

    expect(screen.getByRole('button', { name: 'Send Alpha Piano to FM1' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Reorder / })).toBeNull()
  })

  it('offers reordering again once the search is cleared', async () => {
    const user = renderLibrarian({ library: voicedLibrary })

    await user.type(screen.getByPlaceholderText('Search all banks'), 'alpha')
    await user.clear(screen.getByPlaceholderText('Search all banks'))

    expect(screen.getByRole('button', { name: 'Reorder Alpha Piano' })).toBeTruthy()
  })

  it('keeps the search results after the page is replaced and shown again', async () => {
    function EditorRoundTrip() {
      const view = useLibrarianView()
      const [isEditing, setIsEditing] = useState(false)
      return (
        <ToastProvider>
          <button onClick={() => setIsEditing((current) => !current)} type="button">
            Toggle editor
          </button>
          {isEditing ? null : (
            <LibrarianPage
              activePatchId=""
              library={library}
              midi={midi}
              onBankDeleted={vi.fn()}
              onEditPatch={vi.fn()}
              onSelectPatch={vi.fn()}
              view={view}
            />
          )}
        </ToastProvider>
      )
    }
    render(<EditorRoundTrip />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'bass')
    await user.click(screen.getByRole('button', { name: 'Toggle editor' }))
    await user.click(screen.getByRole('button', { name: 'Toggle editor' }))

    expect((screen.getByPlaceholderText('Search all banks') as HTMLInputElement).value).toBe('bass')
    expect(screen.getByRole('button', { name: 'Send Beta Bass to FM1' })).toBeTruthy()
  })

  it('clears the search when a bank is chosen', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'alpha')
    await user.click(screen.getByRole('button', { name: 'B — Electric Keys' }))

    expect((screen.getByPlaceholderText('Search all banks') as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('button', { name: 'Send Beta Bass to FM1' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Send Alpha Piano to FM1' })).toBeNull()
    expect(
      screen.getByRole('button', { name: 'B — Electric Keys' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(isBankTitled('Electric Keys')).toBe(true)
    expect(screen.getByRole('button', { name: 'Send to FM1' }).hasAttribute('disabled')).toBe(false)
  })
})

describe('LibrarianPage bank deletion', () => {
  it('shows the bank that moves into the deleted bank’s letter', async () => {
    const user = userEvent.setup()
    const onBankDeleted = vi.fn()
    renderLibrarianPage({ onBankDeleted })

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

describe('LibrarianPage undo', () => {
  function renderLibrarian() {
    renderLibrarianPage()
    return userEvent.setup()
  }

  it('undoes the last library change with the undo shortcut', async () => {
    const user = renderLibrarian()

    await user.keyboard('{Meta>}z{/Meta}')

    expect(library.undo).toHaveBeenCalledOnce()
    expect(screen.getByText('Undid the last change.')).toBeTruthy()
  })

  it('leaves the undo shortcut to the search field while typing', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search all banks'), 'Alp')
    await user.keyboard('{Meta>}z{/Meta}')

    expect(library.undo).not.toHaveBeenCalled()
  })

  it('offers to undo a deleted bank from its notification', async () => {
    const deleted = { workspaceBanks: ['A'] }
    vi.mocked(library.deleteBank).mockReturnValueOnce(deleted as never)
    const user = renderLibrarian()

    await user.click(screen.getAllByTitle('Actions for Studio Favourites')[0])
    await user.click(screen.getAllByRole('button', { name: 'Delete bank' })[0])
    const dialog = screen.getByRole('dialog', { name: 'Delete bank' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete bank' }))
    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(library.undoChange).toHaveBeenCalledExactlyOnceWith(deleted)
  })
})

describe('LibrarianPage saved banks', () => {
  it('offers to save and load saved banks from a bank’s menu', async () => {
    const user = userEvent.setup()
    renderLibrarianPage()

    await user.click(screen.getAllByTitle('Actions for Studio Favourites')[0])
    await user.click(screen.getAllByRole('button', { name: 'Load bank' })[0])

    expect(await screen.findByRole('heading', { name: 'My saved banks' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Save bank' }).length).toBeGreaterThan(0)
  })
})

describe('LibrarianPage copying a sound', () => {
  afterEach(async () => {
    await setLocale('en')
  })

  function renderLibrarian(activePatchId: string) {
    renderLibrarianPage({ activePatchId })
    return userEvent.setup()
  }

  it('copies a slot from its menu and offers to undo it from the notification', async () => {
    const changed = { workspaceBanks: ['A', 'B'] }
    vi.mocked(library.copyVoice).mockReturnValueOnce(changed as never)
    const user = renderLibrarian('')

    await user.click(screen.getByRole('button', { name: 'Actions for Alpha Piano' }))
    await user.click(screen.getByRole('menuitem', { name: 'Copy to…' }))
    const dialog = await screen.findByRole('dialog', { name: 'Copy Alpha Piano' })
    await user.click(within(dialog).getByRole('button', { name: 'Replace B01' }))

    expect(library.copyVoice).toHaveBeenCalledExactlyOnceWith('bank-A-1', 'B', 1)
    expect(screen.getByText('Copied “Alpha Piano” to B01 in “Electric Keys”.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(library.undoChange).toHaveBeenCalledExactlyOnceWith(changed)
  })

  it('reports the copy in the interface language', async () => {
    vi.mocked(library.copyVoice).mockReturnValueOnce({} as never)
    await setLocale('de')
    const user = renderLibrarian('bank-A-1')

    await user.click(screen.getByRole('button', { name: 'Aktionen für Alpha Piano' }))
    await user.click(screen.getByRole('menuitem', { name: 'Kopieren nach…' }))
    await user.click(await screen.findByRole('button', { name: 'B01 ersetzen' }))

    expect(
      screen.getByText('„Alpha Piano“ wurde nach B01 in „Electric Keys“ kopiert.'),
    ).toBeTruthy()
  })
})

describe('LibrarianPage add bank dialog', () => {
  function renderLibrarian() {
    renderLibrarianPage()
    return userEvent.setup()
  }

  it('opens the lazily loaded dialog once however often its trigger is activated', async () => {
    const user = renderLibrarian()

    // The trigger stays eager, so it is there before the dialog's chunk has been asked for.
    const addBank = screen.getByRole('button', { name: 'Add new bank' })
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(addBank)
    await user.click(addBank)

    expect(await screen.findAllByRole('dialog')).toHaveLength(1)
  })

  it('returns focus to the trigger when the dialog is closed', async () => {
    const user = renderLibrarian()
    const addBank = screen.getByRole('button', { name: 'Add new bank' })

    await user.click(addBank)
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(document.activeElement).toBe(addBank)
  })
})
