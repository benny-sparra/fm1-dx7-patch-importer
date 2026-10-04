// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { makeLibrarianLibrary, makeLibrarianMidi } from '@/test/librarian-fakes'

import { LibrarianPage } from './librarian-page'

// Stand in for a chunk that fails, as a stale deployment's missing file would.
vi.mock('@/components/patches/import-dx7-bank-dialog', () => ({
  ImportDx7BankDialog: () => {
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

describe('LibrarianPage bank import dialog that fails to load', () => {
  it('explains the failure and offers a reload', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={makeLibrarianLibrary({
            bankDescriptions: {},
            bankNames: { A: 'Studio Favourites' },
            effects: {},
            getBankVoices: vi.fn(() => []),
            loadedBanks: ['A'],
            namedBanks: [],
            patches: [],
            voices: {},
            workspaceBanks: ['A'],
          })}
          midi={makeLibrarianMidi()}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onPlaySearchResult={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    const menuToggle = screen.getAllByTitle('Actions for Studio Favourites')[0]
    await user.click(menuToggle)
    await user.click(
      within(menuToggle.closest('details')!).getByRole('button', { name: 'Import DX7 bank…' }),
    )

    const alert = await screen.findByRole('alert')
    expect(
      within(alert).getByText('Bank files could not be read. Reload the page and try again.'),
    ).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Reload app' })).toBeTruthy()
  })
})
