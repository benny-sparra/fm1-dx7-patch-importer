// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import type { MidiController } from '@/hooks/use-midi'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { reloadPage } from '@/lib/reload-page'

import { LibrarianPage } from './librarian-page'

// Stands in for a copy-dialog chunk that fails, as a stale deployment's missing file would.
vi.mock('@/components/patches/copy-patch-dialog', () => ({
  CopyPatchDialog: () => {
    throw new Error('Failed to fetch dynamically imported module')
  },
}))

vi.mock('@/lib/reload-page', () => ({ reloadPage: vi.fn() }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.mocked(reloadPage).mockClear()
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

async function openFailingCopyDialog() {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const user = userEvent.setup()
  render(
    <ToastProvider>
      <LibrarianPage
        activePatchId="bank-A-1"
        library={library}
        midi={{ hasMidiOutput: false } as unknown as MidiController}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={vi.fn()}
      />
    </ToastProvider>,
  )

  await user.click(screen.getByRole('button', { name: 'Actions for Alpha Piano' }))
  await user.click(screen.getByRole('menuitem', { name: 'Copy to…' }))
  return user
}

describe('LibrarianPage copy dialog that fails to load', () => {
  it('explains the failure and keeps the librarian working', async () => {
    await openFailingCopyDialog()

    expect(
      await screen.findByText(
        'The copy options could not be opened. Reload the page and try again.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send Alpha Piano to FM1' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Actions for Alpha Piano' })).toBeTruthy()
  })

  it('reloads the app when the failure notice offers it', async () => {
    const user = await openFailingCopyDialog()

    const alert = await screen.findByRole('alert')
    await user.click(within(alert).getByRole('button', { name: 'Reload app' }))

    expect(reloadPage).toHaveBeenCalledTimes(1)
  })
})
