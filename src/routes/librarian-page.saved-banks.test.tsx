// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { type MidiController } from '@/hooks/use-midi'
import { type PatchLibrary } from '@/hooks/use-patch-library'

import { LibrarianPage } from './librarian-page'

// Stands in for a saved-bank chunk that fails, as a stale deployment's missing file would.
vi.mock('@/components/patches/named-bank-library-dialog', () => ({
  NamedBankLibraryDialog: () => {
    throw new Error('Failed to fetch dynamically imported module')
  },
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const library = {
  bankDescriptions: {},
  bankNames: { A: 'Studio Favourites' },
  getBankVoices: vi.fn(() => []),
  loadedBanks: ['A'],
  namedBanks: [],
  patches: [
    { bank: 'A', family: 'Keys', id: 'bank-A-1', name: 'Alpha Piano', number: 1, program: 0 },
  ],
  workspaceBanks: ['A'],
} as unknown as PatchLibrary

describe('LibrarianPage saved banks that fail to load', () => {
  it('explains the failure and keeps the librarian working', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={library}
          midi={{ hasMidiOutput: false } as unknown as MidiController}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    await user.click(screen.getAllByTitle('Actions for Studio Favourites')[0])
    await user.click(screen.getAllByRole('button', { name: 'Load bank' })[0])

    const alert = await screen.findByRole('alert')
    expect(
      within(alert).getByText('Saved banks could not be opened. Reload the page and try again.'),
    ).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Reload app' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send Alpha Piano to FM1' })).toBeTruthy()
  })
})
