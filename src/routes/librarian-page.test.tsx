// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ComponentProps, useState } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { useLibrarianView } from '@/hooks/use-librarian-view'
import { makeDemoVoices } from '@/lib/patch-library'
import {
  makeLibrarianLibrary,
  makeLibrarianMidi,
  reorderSlotName,
  sendSlotName,
  slotMenuName,
} from '@/test/librarian-fakes'
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

const library = makeLibrarianLibrary({
  addBank: vi.fn(),
  canRedo: false,
  canUndo: true,
  copyVoice: vi.fn(),
  bankDescriptions: {},
  bankNames: { A: 'Studio Favourites', B: 'Electric Keys' },
  deleteBank: vi.fn(),
  effects: {},
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
  voices: {},
  workspaceBanks: ['A', 'B'],
})

const midi = makeLibrarianMidi({
  hasMidiOutput: false,
  sendBank: vi.fn(),
})

/** Renders the page with the shared library and MIDI stand-ins, and whatever a test changes. */
function librarianPage(props: Partial<ComponentProps<typeof LibrarianPage>> = {}) {
  return (
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={midi}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={vi.fn()}
        {...props}
      />
    </ToastProvider>
  )
}

function renderLibrarianPage(props: Partial<ComponentProps<typeof LibrarianPage>> = {}) {
  return render(librarianPage(props))
}

describe('LibrarianPage bank selection', () => {
  it('updates the patch grid when a bank is selected without breaking search', async () => {
    const user = userEvent.setup()
    renderLibrarianPage()

    expect(screen.getByText('A01')).toBeTruthy()
    expect(screen.getByRole('button', { name: sendSlotName('Alpha Piano') })).toBeTruthy()
    expect(screen.queryByRole('button', { name: sendSlotName('Beta Bass') })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'B — Electric Keys' }))

    expect(screen.getByText('B01')).toBeTruthy()
    expect(screen.getByRole('button', { name: sendSlotName('Beta Bass') })).toBeTruthy()
    expect(screen.queryByRole('button', { name: sendSlotName('Alpha Piano') })).toBeNull()

    await user.type(screen.getByPlaceholderText('Search'), 'no match')
    expect(await screen.findByText('No patches match this search')).toBeTruthy()
  })
})

describe('LibrarianPage slot actions', () => {
  it('plays a slot on click, opens it on double click, and edits it from its menu', async () => {
    const user = userEvent.setup()
    const onEditPatch = vi.fn()
    const onSelectPatch = vi.fn()
    renderLibrarianPage({ onEditPatch, onSelectPatch })

    await user.click(screen.getByRole('button', { name: sendSlotName('Alpha Piano') }))
    expect(onSelectPatch).toHaveBeenCalledWith(library.patches[0])
    expect(onEditPatch).not.toHaveBeenCalled()

    await user.dblClick(screen.getByRole('button', { name: sendSlotName('Alpha Piano') }))
    expect(onEditPatch).toHaveBeenCalledWith(library.patches[0])

    onEditPatch.mockClear()
    onSelectPatch.mockClear()
    await user.click(screen.getByRole('button', { name: slotMenuName('Alpha Piano') }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(onEditPatch).toHaveBeenCalledExactlyOnceWith(library.patches[0])
    expect(onSelectPatch).not.toHaveBeenCalled()
  })
})

describe('LibrarianPage transfer analytics', () => {
  it('waits for confirmation in the bank guide before starting its first transfer', async () => {
    sessionStorage.removeItem('fm1-bank-selection-dialog-dismissed')
    const user = userEvent.setup()
    const connectedMidi = makeLibrarianMidi({
      hasMidiOutput: true,
      sendBank: vi.fn(async () => ({ ok: true }) as const),
      sysexAvailable: true,
    })
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
    const connectedMidi = makeLibrarianMidi({
      hasMidiOutput: true,
      sendBank: vi.fn(async () => ({ ok: true }) as const),
      sysexAvailable: true,
    })
    renderLibrarianPage({ midi: connectedMidi })

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    expect(track).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('bank_transfer_completed', undefined)
  })

  it('confirms a sent bank in one notification rather than on the page', async () => {
    const user = userEvent.setup()
    const connectedMidi = makeLibrarianMidi({
      hasMidiOutput: true,
      sendBank: vi.fn(async () => ({ ok: true }) as const),
      sysexAvailable: true,
    })
    renderLibrarianPage({ midi: connectedMidi })

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    expect(
      await screen.findAllByText(/was sent\. Choose its destination on the FM1\./),
    ).toHaveLength(1)
  })

  it('runs a barber pole on the Send button while its bank is on the way, until it arrives', async () => {
    const user = userEvent.setup()
    let finishSending = (): void => undefined
    const connectedMidi = makeLibrarianMidi({
      hasMidiOutput: true,
      sendBank: vi.fn(
        () =>
          new Promise<{ ok: true }>((resolve) => {
            finishSending = () => resolve({ ok: true })
          }),
      ),
      sysexAvailable: true,
    })
    renderLibrarianPage({ midi: connectedMidi })

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))
    const sending = screen.getByRole('button', { name: 'Sending…' })
    expect(sending.classList).toContain('barber-pole')
    expect(sending.getAttribute('aria-disabled')).toBe('true')
    expect(sending.hasAttribute('disabled')).toBe(false)

    finishSending()

    expect((await screen.findByRole('button', { name: 'Send to FM1' })).classList).not.toContain(
      'barber-pole',
    )
  })

  it('says Sending… in a status region while the bank is on the way, and ignores another press', async () => {
    const user = userEvent.setup()
    let finishSending = (): void => undefined
    const connectedMidi = makeLibrarianMidi({
      hasMidiOutput: true,
      sendBank: vi.fn(
        () =>
          new Promise<{ ok: true }>((resolve) => {
            finishSending = () => resolve({ ok: true })
          }),
      ),
      sysexAvailable: true,
    })
    renderLibrarianPage({ midi: connectedMidi })
    const status = screen
      .getAllByRole('status')
      .find((region) =>
        region.parentElement?.contains(screen.getByRole('button', { name: 'Send to FM1' })),
      )

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))
    await user.click(screen.getByRole('button', { name: 'Sending…' }))

    expect(status?.textContent).toBe('Sending…')
    expect(connectedMidi.sendBank).toHaveBeenCalledTimes(1)
    finishSending()
    await screen.findByRole('button', { name: 'Send to FM1' })
    expect(status?.textContent).toBe('')
  })

  it('shows a failed bank transfer as an error on the page', async () => {
    const user = userEvent.setup()
    const connectedMidi = makeLibrarianMidi({
      hasMidiOutput: true,
      sendBank: vi.fn(async () => ({ ok: false, reason: 'no_output' }) as const),
      sysexAvailable: true,
    })
    renderLibrarianPage({ midi: connectedMidi })

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'The bank was not sent. Open the MIDI log for details, then retry.',
    )
  })

  it('shows recovery without attempting a bank transfer when SysEx is unavailable', async () => {
    const user = userEvent.setup()
    const track = vi.fn()
    window.umami = { track }
    const connectedMidi = makeLibrarianMidi({
      connectMidi: vi.fn(async () => undefined),
      disconnectMidi: vi.fn(async () => undefined),
      hasMidiOutput: true,
      isConnecting: false,
      midiAccess: true,
      sendBank: vi.fn(async () => ({ ok: true }) as const),
      sysexAvailable: false,
    })
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
    const connectedMidi = makeLibrarianMidi({
      channel: 6,
      hasMidiOutput: true,
      sendBank: vi.fn(async () => Promise.reject(transportError)),
      sysexAvailable: true,
    })
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
    const blockedMidi = makeLibrarianMidi({
      connectMidi,
      disconnectMidi,
      hasMidiOutput: true,
      isConnecting: false,
      midiAccess: true,
      sendBank: vi.fn(),
      sysexAvailable: false,
    })
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
          onPlaySearchResult={vi.fn()}
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

    return { onEditPatch, search: screen.getByPlaceholderText('Search') }
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
    await user.click(screen.getByRole('button', { name: sendSlotName('Alpha Piano') }))
    await user.keyboard('{Escape}')

    expect((search as HTMLInputElement).value).toBe('')
  })

  it('opens the lit slot on Enter', async () => {
    const user = userEvent.setup()
    const { onEditPatch } = renderLibrarian({ activePatchId: 'bank-A-1' })

    screen.getByRole('button', { name: sendSlotName('Alpha Piano') }).focus()
    await user.keyboard('{Enter}')

    expect(onEditPatch).toHaveBeenCalledWith(library.patches[0])
  })

  it('plays an unlit slot on Enter rather than opening it', async () => {
    const user = userEvent.setup()
    const { onEditPatch } = renderLibrarian()

    screen.getByRole('button', { name: sendSlotName('Alpha Piano') }).focus()
    await user.keyboard('{Enter}')

    expect(onEditPatch).not.toHaveBeenCalled()
  })
})

describe('LibrarianPage moving a slot from its menu', () => {
  const dx7Patches = Array.from({ length: 3 }, (_, index) => ({
    bank: 'A',
    family: 'DX7',
    id: `bank-A-${index + 1}`,
    name: `Slot ${index + 1}`,
    number: index + 1,
    program: index,
  }))

  function renderSlots() {
    const moveVoice = vi.fn()
    renderLibrarianPage({ library: { ...library, moveVoice, patches: dx7Patches } })

    return { moveVoice, user: userEvent.setup() }
  }

  const openMenu = (user: ReturnType<typeof userEvent.setup>, name: string, label: string) =>
    user.click(screen.getByRole('button', { name: slotMenuName(name, label) }))

  it('moves a slot one place later in one change, and focuses it where it landed', async () => {
    const { moveVoice, user } = renderSlots()

    await openMenu(user, 'Slot 2', 'Actions for')
    await user.click(screen.getByRole('menuitem', { name: 'Move later' }))

    expect(moveVoice).toHaveBeenCalledExactlyOnceWith('A', 2, 3)
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: sendSlotName('Slot 3') }),
    )
  })

  it('moves a slot one place earlier', async () => {
    const { moveVoice, user } = renderSlots()

    await openMenu(user, 'Slot 2', 'Actions for')
    await user.click(screen.getByRole('menuitem', { name: 'Move earlier' }))

    expect(moveVoice).toHaveBeenCalledExactlyOnceWith('A', 2, 1)
  })

  it('cannot move the first slot earlier or the last slot later', async () => {
    const { user } = renderSlots()

    await openMenu(user, 'Slot 1', 'Actions for')
    expect(screen.getByRole('menuitem', { name: 'Move earlier' }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(screen.getByRole('menuitem', { name: 'Move later' }).hasAttribute('disabled')).toBe(
      false,
    )
    await user.keyboard('[Escape]')
    await openMenu(user, 'Slot 3', 'Actions for')

    expect(screen.getByRole('menuitem', { name: 'Move later' }).hasAttribute('disabled')).toBe(true)
  })

  it('heads a slot menu with Transfer and Order, leaving Edit bare at the top', async () => {
    const { user } = renderSlots()

    await openMenu(user, 'Slot 2', 'Actions for')

    const menu = screen.getByRole('menu')
    expect(within(menu).getByText('Transfer')).toBeTruthy()
    expect(within(menu).getByText('Order')).toBeTruthy()
    expect(within(menu).getAllByRole('menuitem')[0].textContent).toBe('Edit')
  })

  it('heads only Transfer while a search shows slots away from their banks', async () => {
    const { user } = renderSlots()

    await user.type(screen.getByPlaceholderText('Search'), 'slot')
    await openMenu(user, 'Slot 2', 'Actions for')

    const menu = screen.getByRole('menu')
    expect(within(menu).queryByText('Order')).toBeNull()
    expect(within(menu).getByText('Transfer')).toBeTruthy()
  })

  it('offers no move while a search shows slots away from their banks', async () => {
    const { user } = renderSlots()

    await user.type(screen.getByPlaceholderText('Search'), 'slot')
    await openMenu(user, 'Slot 2', 'Actions for')

    expect(screen.queryByRole('menuitem', { name: 'Move later' })).toBeNull()
  })

  it('words the items in the interface language', async () => {
    await setLocale('de')
    const { user } = renderSlots()

    await openMenu(user, 'Slot 2', 'Aktionen für')

    expect(screen.getByRole('menuitem', { name: 'Nach vorn verschieben' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Nach hinten verschieben' })).toBeTruthy()
    expect(screen.getByText('Reihenfolge')).toBeTruthy()
    expect(screen.getByText('Übertragen')).toBeTruthy()
    await setLocale('en-GB')
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
  }

  function renderGrid(activePatchId = '') {
    const onSelectPatch = vi.fn()
    renderLibrarianPage({ activePatchId, library: gridLibrary, onSelectPatch })

    return { onSelectPatch, user: userEvent.setup() }
  }

  const slot = (number: number) =>
    screen.getByRole('button', { name: sendSlotName(`Slot ${number}`) })

  /** jsdom does no layout, so the row geometry has to be supplied. */
  function layOutInColumns(columns: number) {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const match = this.getAttribute('aria-label')?.match(/Send \S+ Slot (\d+) to FM1/)
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
    }
    renderLibrarianPage({ library: slotLibrary, midi: makeLibrarianMidi({ hasMidiOutput: true }) })

    expect(
      screen.getByRole('button', { name: sendSlotName('Hardware Keys') }).getAttribute('title'),
    ).toBe('Click to play Hardware Keys on the FM1; double-click to edit')
    expect(
      screen.getByRole('button', { name: sendSlotName('Added Pad') }).getAttribute('title'),
    ).toBe('Click to play Added Pad through the FM1 edit buffer; double-click to edit')
  })
})

describe('LibrarianPage search', () => {
  it('finds a slot by the code shown on it', async () => {
    const user = userEvent.setup()
    renderLibrarianPage()

    await user.type(screen.getByPlaceholderText('Search'), 'a01')

    expect(screen.getByRole('button', { name: sendSlotName('Alpha Piano') })).toBeTruthy()
  })

  function renderLibrarian(
    props: {
      library?: ComponentProps<typeof LibrarianPage>['library']
      onSelectPatch?: () => void
    } = {},
  ) {
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

    await user.type(screen.getByPlaceholderText('Search'), 'bass')

    expect(screen.getByRole('button', { name: sendSlotName('Beta Bass') })).toBeTruthy()
    expect(screen.queryByRole('button', { name: sendSlotName('Alpha Piano') })).toBeNull()
  })

  it('lists matches from every bank in bank order', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), 'a')

    const results = screen.getAllByRole('button', { name: /^Send .* to FM1$/ })
    expect(results.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Send A01 Alpha Piano to FM1',
      'Send B01 Beta Bass to FM1',
    ])
  })

  it('plays a result without leaving the results', async () => {
    const onSelectPatch = vi.fn()
    const user = renderLibrarian({ onSelectPatch })

    await user.type(screen.getByPlaceholderText('Search'), 'bass')
    await user.click(screen.getByRole('button', { name: sendSlotName('Beta Bass') }))

    expect(onSelectPatch).toHaveBeenCalledExactlyOnceWith(library.patches[1])
    expect((screen.getByPlaceholderText('Search') as HTMLInputElement).value).toBe('bass')
    expect(screen.getByRole('button', { name: sendSlotName('Beta Bass') })).toBeTruthy()
  })

  it('leaves out banks that have nothing loaded', async () => {
    const user = renderLibrarian({ library: { ...library, loadedBanks: ['A'] } })

    await user.type(screen.getByPlaceholderText('Search'), 'beta')

    expect(screen.queryByRole('button', { name: sendSlotName('Beta Bass') })).toBeNull()
    expect(await screen.findByText('No patches match this search')).toBeTruthy()
  })

  it('searches from a bank that has nothing loaded', async () => {
    const user = renderLibrarian({ library: { ...library, loadedBanks: ['B'] } })

    await user.type(screen.getByPlaceholderText('Search'), 'bass')

    expect(screen.getByRole('button', { name: sendSlotName('Beta Bass') })).toBeTruthy()
  })

  it('disables the search when no bank has anything loaded', () => {
    renderLibrarian({ library: { ...library, loadedBanks: [] } })

    expect(screen.getByPlaceholderText('Search').hasAttribute('disabled')).toBe(true)
  })

  it('names the grid as search results in place of the bank while searching', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), 'bass')

    expect(screen.getByText('Search results: “bass”')).toBeTruthy()
    expect(isBankTitled('Studio Favourites')).toBe(false)
  })

  it('names the bank each result comes from', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), 'beta')

    const slot = screen.getByRole('button', { name: sendSlotName('Beta Bass') }).parentElement
    expect(slot?.textContent).toContain('Electric Keys')
  })

  it('leaves the bank name off slots once the search is cleared', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), 'alpha')
    await user.clear(screen.getByPlaceholderText('Search'))

    const slot = screen.getByRole('button', { name: sendSlotName('Alpha Piano') }).parentElement
    expect(slot?.textContent).not.toContain('Studio Favourites')
  })

  it('clears a result’s bank name after a page translator rewrites the text', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), 'alpha')
    translatePageText(document.body)
    await user.clear(screen.getByPlaceholderText('Search'))

    const slot = screen.getByRole('button', { name: sendSlotName('Alpha Piano') }).parentElement
    expect(slot?.textContent).toContain('Alpha Piano')
    expect(slot?.textContent).not.toContain('Studio Favourites')
  })

  it('quotes the search without the spaces around it', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), '  bass ')

    expect(screen.getByText('Search results: “bass”')).toBeTruthy()
  })

  it('quotes the search in the interface language', async () => {
    await setLocale('de')
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Suchen'), 'bass')

    expect(screen.getByText('Suchergebnisse: „bass“')).toBeTruthy()
    await setLocale('en-GB')
  })

  it('shows the bank again once the search is cleared', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), 'bass')
    await user.clear(screen.getByPlaceholderText('Search'))

    expect(screen.queryByText(/^Search results/)).toBeNull()
    expect(isBankTitled('Studio Favourites')).toBe(true)
  })

  it('keeps the bank name current after a page translator rewrites the text', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), 'bass')
    translatePageText(document.body)
    await user.clear(screen.getByPlaceholderText('Search'))

    expect(screen.queryByText(/^Search results/)).toBeNull()
    expect(isBankTitled('Studio Favourites')).toBe(true)
  })

  it('marks Send to FM1 aria-disabled with its reason while showing search results', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), 'bass')

    const send = screen.getByRole('button', {
      name: 'Send to FM1',
      description: 'Choose a bank to send it to the FM1',
    })
    expect(send.getAttribute('aria-disabled')).toBe('true')
    expect(send.hasAttribute('disabled')).toBe(false)
  })

  it('does nothing when Send to FM1 is pressed while showing search results', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), 'bass')
    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('enables sending again once the search is cleared', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), 'bass')
    await user.clear(screen.getByPlaceholderText('Search'))

    const send = screen.getByRole('button', { name: 'Send to FM1' })
    expect(send.hasAttribute('disabled')).toBe(false)
    expect(screen.queryByText('Choose a bank to send it to the FM1')).toBeNull()
  })

  it('says to import the bank first when Send to FM1 has nothing to send', async () => {
    const user = userEvent.setup()
    const connectedMidi = makeLibrarianMidi({
      hasMidiOutput: true,
      midiAccess: true,
      sysexAvailable: true,
    })
    renderLibrarianPage({ library: { ...library, loadedBanks: [] }, midi: connectedMidi })
    const send = screen.getByRole('button', {
      name: 'Send to FM1',
      description: 'Import bank Studio Favourites first',
    })

    expect(send.getAttribute('aria-disabled')).toBe('true')
    await user.click(send)

    expect(connectedMidi.sendBank).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('reads why Send to FM1 cannot act in the interface language', async () => {
    await setLocale('de')
    try {
      renderLibrarianPage({
        library: { ...library, loadedBanks: [] },
        midi: makeLibrarianMidi({ hasMidiOutput: true, midiAccess: true, sysexAvailable: true }),
      })

      expect(
        screen.getByRole('button', {
          name: 'An FM1 senden',
          description: 'Zuerst Bank Studio Favourites importieren',
        }),
      ).toBeTruthy()
    } finally {
      await setLocale('en-GB')
    }
  })

  it('shows no bank as selected while showing search results', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), 'bass')

    expect(
      screen.getByRole('button', { name: 'A — Studio Favourites' }).getAttribute('aria-pressed'),
    ).toBe('false')
    expect(
      screen.getByRole('button', { name: 'B — Electric Keys' }).getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('selects the bank again once the search is cleared', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), 'bass')
    await user.clear(screen.getByPlaceholderText('Search'))

    expect(
      screen.getByRole('button', { name: 'A — Studio Favourites' }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('returns to the bank of the last result played when the search is cleared', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), 'bass')
    await user.click(screen.getByRole('button', { name: sendSlotName('Beta Bass') }))
    await user.clear(screen.getByPlaceholderText('Search'))

    expect(
      screen.getByRole('button', { name: 'B — Electric Keys' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(screen.getByRole('button', { name: sendSlotName('Beta Bass') })).toBeTruthy()
  })

  // Only a slot holding a DX7 voice has a grip to drag.
  const voicedLibrary = {
    ...library,
    patches: library.patches.map((patch) => ({ ...patch, family: 'DX7' })),
  }

  it('offers no reordering while showing search results', async () => {
    const user = renderLibrarian({ library: voicedLibrary })

    expect(screen.getByRole('button', { name: reorderSlotName('Alpha Piano') })).toBeTruthy()
    await user.type(screen.getByPlaceholderText('Search'), 'a')

    expect(screen.getByRole('button', { name: sendSlotName('Alpha Piano') })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Reorder / })).toBeNull()
  })

  it('offers reordering again once the search is cleared', async () => {
    const user = renderLibrarian({ library: voicedLibrary })

    await user.type(screen.getByPlaceholderText('Search'), 'alpha')
    await user.clear(screen.getByPlaceholderText('Search'))

    expect(screen.getByRole('button', { name: reorderSlotName('Alpha Piano') })).toBeTruthy()
  })

  it('reads a slot’s drag instructions and announcements in the interface language', async () => {
    await setLocale('de')
    const user = renderLibrarian({ library: voicedLibrary })
    const grip = screen.getByRole('button', { name: /^A01 Alpha Piano verschieben$/ })

    expect(grip.getAttribute('aria-roledescription')).toBe('sortierbares Element')
    expect(
      document.getElementById(grip.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toMatch(/^Um ein Element zu verschieben/)
    grip.focus()
    await user.keyboard('[Space]')

    expect(await screen.findByText('A01 Alpha Piano wurde aufgenommen.')).toBeTruthy()
    await user.keyboard('[Escape]')
    expect(
      await screen.findByText('Das Verschieben von A01 Alpha Piano wurde abgebrochen.'),
    ).toBeTruthy()
    await setLocale('en-GB')
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
              onPlaySearchResult={vi.fn()}
              onSelectPatch={vi.fn()}
              view={view}
            />
          )}
        </ToastProvider>
      )
    }
    render(<EditorRoundTrip />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('Search'), 'bass')
    await user.click(screen.getByRole('button', { name: 'Toggle editor' }))
    await user.click(screen.getByRole('button', { name: 'Toggle editor' }))

    expect((screen.getByPlaceholderText('Search') as HTMLInputElement).value).toBe('bass')
    expect(screen.getByRole('button', { name: sendSlotName('Beta Bass') })).toBeTruthy()
  })

  it('clears the search when a bank is chosen', async () => {
    const user = renderLibrarian()

    await user.type(screen.getByPlaceholderText('Search'), 'alpha')
    await user.click(screen.getByRole('button', { name: 'B — Electric Keys' }))

    expect((screen.getByPlaceholderText('Search') as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('button', { name: sendSlotName('Beta Bass') })).toBeTruthy()
    expect(screen.queryByRole('button', { name: sendSlotName('Alpha Piano') })).toBeNull()
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
    await user.click(screen.getAllByRole('button', { name: 'Delete bank…' })[0])
    const dialog = screen.getByRole('dialog', { name: 'Delete bank' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete bank' }))

    expect(onBankDeleted).toHaveBeenCalledExactlyOnceWith('A')
    expect(library.deleteBank).toHaveBeenCalledExactlyOnceWith('A')
    expect(
      screen.getByRole('button', { name: 'A — Studio Favourites' }).getAttribute('aria-pressed'),
    ).toBe('true')
  })
})

describe('LibrarianPage bank menu dialogs', () => {
  function syxFile() {
    return new File([new Uint8Array(4104)], 'bank.syx', { type: 'application/octet-stream' })
  }

  it('returns focus to the bank menu when deleting a bank is cancelled', async () => {
    const user = userEvent.setup()
    renderLibrarianPage()
    const bankMenu = screen.getAllByTitle('Actions for Studio Favourites')[0]

    await user.click(bankMenu)
    await user.click(screen.getAllByRole('button', { name: 'Delete bank…' })[0])
    const dialog = screen.getByRole('dialog', { name: 'Delete bank' })
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(library.deleteBank).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(bankMenu)
  })

  it('forgets the chosen file when importing over a bank is closed and opened again', async () => {
    const user = userEvent.setup()
    renderLibrarianPage()
    const openImport = async () => {
      await user.click(screen.getAllByTitle('Actions for Studio Favourites')[0])
      await user.click(screen.getAllByRole('button', { name: 'Import DX7 bank…' })[0])
      return screen.findByRole('dialog', { name: 'Import over “Studio Favourites”?' })
    }

    const dialog = await openImport()
    await user.upload(within(dialog).getByLabelText(/Choose a DX7 SysEx file/), syxFile())
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    const reopened = await openImport()

    expect(within(reopened).getByText('Choose a DX7 SysEx file')).toBeTruthy()
    expect(within(reopened).getByRole('button', { name: 'Next' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  it('returns focus to the bank file menu when the factory reset is closed', async () => {
    const user = userEvent.setup()
    renderLibrarianPage()
    const fileMenu = screen.getByTitle('Library actions')

    await user.click(fileMenu)
    await user.click(screen.getByRole('button', { name: 'Reset to factory patches…' }))
    await user.click(screen.getByRole('button', { name: 'Close factory reset' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(fileMenu)
  })

  it('returns focus to Send to FM1 when the MIDI connection message is closed', async () => {
    const user = userEvent.setup()
    renderLibrarianPage()
    const send = screen.getByRole('button', { name: 'Send to FM1' })

    await user.click(send)
    const dialog = screen.getByRole('dialog', { name: 'Connect MIDI to send this bank' })
    await user.click(within(dialog).getByRole('button', { name: 'Close MIDI connection message' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(send)
  })

  it('goes on to send the bank from the MIDI connection message once MIDI reaches the FM1', async () => {
    const user = userEvent.setup()
    const offlineMidi = makeLibrarianMidi()
    const { rerender } = renderLibrarianPage({ midi: offlineMidi })

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))
    await user.click(screen.getByRole('button', { name: 'Switch MIDI online' }))
    rerender(
      librarianPage({
        midi: {
          ...offlineMidi,
          hasMidiOutput: true,
          midiAccess: true,
          selectedOutputId: 'out-1',
          sysexAvailable: true,
        },
      }),
    )
    const message = screen.getByRole('dialog', { name: 'Connect MIDI to send this bank' })
    await user.click(within(message).getByRole('button', { name: 'Send to FM1' }))

    expect(offlineMidi.connectMidi).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Connect MIDI to send this bank' })).toBeNull()
    expect(offlineMidi.sendBank).toHaveBeenCalledTimes(1)
  })
})

describe('LibrarianPage while MIDI has no output', () => {
  const offlineSlotTitle =
    'MIDI is offline, so a click only selects Alpha Piano; double-click to edit'

  const offlineNote = 'Switch MIDI online to send. Until then, clicking a patch only selects it.'

  it('marks Send to FM1 aria-disabled with its reason as its description, keeps it focusable, and sends nothing', async () => {
    const user = userEvent.setup()
    const offlineMidi = makeLibrarianMidi()
    renderLibrarianPage({ midi: offlineMidi })
    const send = screen.getByRole('button', { name: 'Send to FM1' })

    expect(send.getAttribute('aria-disabled')).toBe('true')
    expect(send.hasAttribute('disabled')).toBe(false)
    expect(screen.getByText(offlineNote)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send to FM1', description: offlineNote })).toBe(send)
    send.focus()
    expect(document.activeElement).toBe(send)

    await user.click(send)

    expect(offlineMidi.sendBank).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Connect MIDI to send this bank' })).toBeTruthy()
  })

  it('says to choose an output while MIDI is online without one', () => {
    renderLibrarianPage({ midi: makeLibrarianMidi({ midiAccess: true }) })

    expect(
      screen
        .getByRole('button', {
          name: 'Send to FM1',
          description:
            'Choose a MIDI output in Settings to send. Until then, clicking a patch only selects it.',
        })
        .getAttribute('aria-disabled'),
    ).toBe('true')
  })

  it('shows no reason while MIDI left connected is connecting', () => {
    renderLibrarianPage({ midi: makeLibrarianMidi({ isConnecting: true }) })

    expect(screen.queryByText(offlineNote)).toBeNull()
  })

  it('clears the reason and leaves Send to FM1 live once MIDI comes online', () => {
    const { rerender } = renderLibrarianPage()
    expect(screen.getByText(offlineNote)).toBeTruthy()

    rerender(
      librarianPage({
        midi: makeLibrarianMidi({ hasMidiOutput: true, midiAccess: true, sysexAvailable: true }),
      }),
    )
    const send = screen.getByRole('button', { name: 'Send to FM1' })

    expect(send.hasAttribute('aria-disabled')).toBe(false)
    expect(send.hasAttribute('aria-describedby')).toBe(false)
    expect(screen.queryByText(offlineNote)).toBeNull()
  })

  it('says what an FM1 whose firmware is not identified gets, and leaves Send to FM1 live', () => {
    renderLibrarianPage({
      midi: makeLibrarianMidi({
        firmware: { identity: 'XR-9_015', kind: 'unidentified' },
        hasMidiOutput: true,
        midiAccess: true,
        sysexAvailable: true,
      }),
    })
    const send = screen.getByRole('button', {
      name: 'Send to FM1',
      description:
        'Firmware not identified: the FM1 gets a plain DX7 bank, and patches as unsaved edits.',
    })

    expect(send.hasAttribute('aria-disabled')).toBe(false)
  })

  it('says in a slot’s description that MIDI is offline, and not once it is online', () => {
    const { unmount } = renderLibrarianPage()
    expect(
      screen.getByRole('button', {
        name: sendSlotName('Alpha Piano'),
        description: offlineSlotTitle,
      }),
    ).toBeTruthy()
    unmount()

    renderLibrarianPage({ midi: makeLibrarianMidi({ hasMidiOutput: true }) })
    expect(
      screen.getByRole('button', { name: sendSlotName('Alpha Piano') }).getAttribute('title'),
    ).toBe('Click to play Alpha Piano on the FM1; double-click to edit')
  })

  it('shows both offline messages in Ukrainian without breaking under a page translator', async () => {
    await setLocale('uk')
    try {
      const { rerender } = renderLibrarianPage()
      const send = screen.getByRole('button', { name: 'Надіслати на FM1' })
      expect(send.getAttribute('aria-disabled')).toBe('true')
      expect(
        screen.getByText('Увімкніть MIDI, щоб надсилати. Доти клік на патчі лише вибирає його.'),
      ).toBeTruthy()
      expect(
        screen.getByTitle('MIDI офлайн, тож клік лише вибирає Alpha Piano; двічі — щоб редагувати'),
      ).toBeTruthy()

      translatePageText(document.body)
      rerender(librarianPage({ midi: makeLibrarianMidi({ midiAccess: true }) }))
      expect(
        screen.getByText(
          'Оберіть MIDI-вихід у налаштуваннях, щоб надсилати. Доти клік на патчі лише вибирає його.',
        ),
      ).toBeTruthy()
    } finally {
      await setLocale('en-GB')
    }
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

    await user.type(screen.getByPlaceholderText('Search'), 'Alp')
    await user.keyboard('{Meta>}z{/Meta}')

    expect(library.undo).not.toHaveBeenCalled()
  })

  it('offers to undo a deleted bank from its notification', async () => {
    const deleted = { workspaceBanks: ['A'] }
    vi.mocked(library.deleteBank).mockReturnValueOnce(deleted as never)
    const user = renderLibrarian()

    await user.click(screen.getAllByTitle('Actions for Studio Favourites')[0])
    await user.click(screen.getAllByRole('button', { name: 'Delete bank…' })[0])
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
    await user.click(screen.getAllByRole('button', { name: 'Load bank…' })[0])

    expect(await screen.findByRole('heading', { name: 'My saved banks' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Save bank…' }).length).toBeGreaterThan(0)
  })
})

describe('LibrarianPage copying a sound', () => {
  afterEach(async () => {
    await setLocale('en-GB')
  })

  function renderLibrarian(activePatchId: string) {
    renderLibrarianPage({ activePatchId })
    return userEvent.setup()
  }

  it('copies a slot from its menu and offers to undo it from the notification', async () => {
    const changed = { workspaceBanks: ['A', 'B'] }
    vi.mocked(library.copyVoice).mockReturnValueOnce(changed as never)
    const user = renderLibrarian('')

    await user.click(screen.getByRole('button', { name: slotMenuName('Alpha Piano') }))
    await user.click(screen.getByRole('menuitem', { name: 'Copy to…' }))
    const dialog = await screen.findByRole('dialog', { name: 'Copy Alpha Piano' })
    await user.click(within(dialog).getByRole('button', { name: 'Replace B01' }))

    expect(library.copyVoice).toHaveBeenCalledExactlyOnceWith('bank-A-1', 'B', 1)
    expect(screen.getByText('Copied “Alpha Piano” to B01 in “Electric Keys”.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(library.undoChange).toHaveBeenCalledExactlyOnceWith(changed)
  })

  it('swaps a slot from the copy dialog and offers to undo it from the notification', async () => {
    const changed = { workspaceBanks: ['A', 'B'] }
    vi.mocked(library.swapVoices).mockReturnValueOnce(changed as never)
    const user = renderLibrarian('')

    await user.click(screen.getByRole('button', { name: slotMenuName('Alpha Piano') }))
    await user.click(screen.getByRole('menuitem', { name: 'Copy to…' }))
    const dialog = await screen.findByRole('dialog', { name: 'Copy Alpha Piano' })
    await user.click(within(dialog).getByRole('button', { name: 'Swap with B01' }))

    expect(library.swapVoices).toHaveBeenCalledExactlyOnceWith('bank-A-1', 'B', 1)
    expect(library.copyVoice).not.toHaveBeenCalled()
    expect(screen.getByText('Swapped “Alpha Piano” and “Beta Bass”.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(library.undoChange).toHaveBeenCalledExactlyOnceWith(changed)
  })

  it('reports the swap in the interface language', async () => {
    vi.mocked(library.swapVoices).mockReturnValueOnce({} as never)
    await setLocale('de')
    const user = renderLibrarian('bank-A-1')

    await user.click(
      screen.getByRole('button', { name: slotMenuName('Alpha Piano', 'Aktionen für') }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'Kopieren nach…' }))
    await user.click(await screen.findByRole('button', { name: 'Mit B01 tauschen' }))

    expect(screen.getByText('„Alpha Piano“ und „Beta Bass“ wurden getauscht.')).toBeTruthy()
  })

  it('reports the copy in the interface language', async () => {
    vi.mocked(library.copyVoice).mockReturnValueOnce({} as never)
    await setLocale('de')
    const user = renderLibrarian('bank-A-1')

    await user.click(
      screen.getByRole('button', { name: slotMenuName('Alpha Piano', 'Aktionen für') }),
    )
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
    const addBank = screen.getByRole('button', { name: 'Add new bank…' })
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(addBank)
    await user.click(addBank)

    expect(await screen.findAllByRole('dialog')).toHaveLength(1)
  })

  it('returns focus to the trigger when the dialog is closed', async () => {
    const user = renderLibrarian()
    const addBank = screen.getByRole('button', { name: 'Add new bank…' })

    await user.click(addBank)
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(document.activeElement).toBe(addBank)
  })
})

describe('LibrarianPage changed slots', () => {
  const [pianoVoice, organVoice] = makeDemoVoices()

  function renderWithVoices(voices: ComponentProps<typeof LibrarianPage>['library']['voices']) {
    const page = (slotVoices: typeof voices) => (
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={{ ...library, voices: slotVoices }}
          midi={midi}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onPlaySearchResult={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>
    )
    const view = render(page(voices))
    return { changeVoices: (next: typeof voices) => view.rerender(page(next)) }
  }

  function glowIn(patchId: string) {
    return document.querySelector(`[data-patch-id="${patchId}"] .patch-cell-changed`)
  }

  it('shows the slots of the bank it opens without lighting them', () => {
    renderWithVoices({ 'bank-A-1': pianoVoice })

    expect(glowIn('bank-A-1')).toBeNull()
  })

  it('lights a slot whose sound changes while its bank is shown, out of the accessibility tree', () => {
    const { changeVoices } = renderWithVoices({ 'bank-A-1': pianoVoice })

    changeVoices({ 'bank-A-1': organVoice })

    expect(glowIn('bank-A-1')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('leaves a slot unlit when only the library around it changes', () => {
    const { changeVoices } = renderWithVoices({ 'bank-A-1': pianoVoice })

    changeVoices({ 'bank-A-1': pianoVoice, 'bank-B-1': organVoice })

    expect(glowIn('bank-A-1')).toBeNull()
  })
})
