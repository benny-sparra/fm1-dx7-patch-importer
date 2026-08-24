// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { type MidiController } from '@/hooks/use-midi'

import { LibrarianPage } from './librarian-page'

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
        <LibrarianPage activePatchId="" library={library} midi={midi} onEditPatch={vi.fn()} />
      </ToastProvider>,
    )

    expect(screen.getByText('A01')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit Alpha Piano' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit Beta Bass' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'B — Electric Keys' }))

    expect(screen.getByText('B01')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit Beta Bass' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit Alpha Piano' })).toBeNull()

    await user.type(screen.getByPlaceholderText('Search by name'), 'no match')
    expect(screen.getByText('No patches match this search')).toBeTruthy()
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
          onEditPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))
    const dialog = screen.getByRole('dialog', {
      name: 'Choose the destination bank on your FM1',
    })

    expect(connectedMidi.sendBank).not.toHaveBeenCalled()

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
          onEditPatch={vi.fn()}
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
          onEditPatch={vi.fn()}
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
          onEditPatch={vi.fn()}
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
          onEditPatch={vi.fn()}
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
