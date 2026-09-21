// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import type { MidiController } from '@/hooks/use-midi'
import type { PatchLibrary } from '@/hooks/use-patch-library'

import { LibrarianPage } from './librarian-page'

// Stand in for chunks that fail, as a stale deployment's missing files would.
vi.mock('@/components/patches/restore-backup-dialog', () => ({
  RestoreBackupDialog: () => {
    throw new Error('Failed to fetch dynamically imported module')
  },
}))
vi.mock('@/lib/workspace-backup', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

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
  bankNames: {},
  effects: {},
  getBankVoices: vi.fn(() => []),
  hasDamagedNamedBanks: false,
  loadedBanks: [],
  namedBanks: [],
  namedBanksLoadFailed: false,
  namedBanksLoading: false,
  patches: [],
  voices: {},
  workspaceBanks: ['A'],
} as unknown as PatchLibrary

async function chooseFromMenu(item: string) {
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
        onPlaySearchResult={vi.fn()}
        onSelectPatch={vi.fn()}
      />
    </ToastProvider>,
  )
  await user.click(screen.getByTitle('More bank file actions'))
  await user.click(screen.getByRole('button', { name: item }))
}

describe('LibrarianPage backups that fail to load', () => {
  it.each([
    ['downloading', 'Download backup'],
    ['restoring', 'Restore from backup…'],
  ])('explains the failure when %s a backup and offers a reload', async (_, item) => {
    await chooseFromMenu(item)

    const alert = await screen.findByRole('alert')
    expect(
      within(alert).getByText('Backups could not be opened. Reload the page and try again.'),
    ).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Reload app' })).toBeTruthy()
  })
})
