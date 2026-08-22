// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { type MidiController } from '@/hooks/use-midi'

import { LibrarianPage } from './librarian-page'

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
  it('tracks a completed bank transfer after MIDI reports success', async () => {
    const user = userEvent.setup()
    const track = vi.fn()
    window.umami = { track }
    const connectedMidi = {
      hasMidiOutput: true,
      sendBank: vi.fn(async () => ({ ok: true }) as const),
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

  it('tracks a sanitized bank transfer failure reason', async () => {
    const user = userEvent.setup()
    const track = vi.fn()
    window.umami = { track }
    const connectedMidi = {
      hasMidiOutput: true,
      sendBank: vi.fn(async () => ({ ok: false, reason: 'sysex_unavailable' }) as const),
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
    expect(track).toHaveBeenCalledWith('bank_transfer_failed', {
      reason: 'sysex_unavailable',
    })
  })
})
