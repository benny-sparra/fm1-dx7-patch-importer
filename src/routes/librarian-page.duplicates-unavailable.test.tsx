// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { makeLibrarianLibrary, makeLibrarianMidi } from '@/test/librarian-fakes'

import { LibrarianPage } from './librarian-page'

// Stand in for a chunk that fails, as a stale deployment's missing file would.
vi.mock('@/components/patches/duplicate-patches-dialog', () => ({
  DuplicatePatchesDialog: () => {
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

describe('LibrarianPage duplicate patches that fail to load', () => {
  it('explains the failure and offers a reload', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={makeLibrarianLibrary({ loadedBanks: ['A'], workspaceBanks: ['A'] })}
          midi={makeLibrarianMidi()}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onPlaySearchResult={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    await user.click(screen.getByTitle('Library actions'))
    await user.click(screen.getByRole('button', { name: 'Find duplicate patches…' }))

    const alert = await screen.findByRole('alert')
    expect(
      within(alert).getByText(
        'Duplicate patches could not be shown. Reload the page and try again.',
      ),
    ).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Reload app' })).toBeTruthy()
  })
})
