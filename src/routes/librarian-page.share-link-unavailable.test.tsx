// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import type { MidiController } from '@/hooks/use-midi'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { makeDemoVoices } from '@/lib/patch-library'
import { makePatchShareFragment } from '@/lib/patch-share-link'
import { reloadPage } from '@/lib/reload-page'

import { LibrarianPage } from './librarian-page'

// Stands in for a link reader chunk that fails, as a stale deployment's missing file would.
vi.mock('@/lib/patch-share-link-reader', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

vi.mock('@/lib/reload-page', () => ({ reloadPage: vi.fn() }))

afterEach(() => {
  cleanup()
  vi.mocked(reloadPage).mockClear()
  window.history.replaceState(null, '', '/')
})

const library = {
  bankDescriptions: {},
  bankNames: { A: 'Studio Favourites' },
  getBankVoices: vi.fn(() => []),
  loadedBanks: ['A'],
  namedBanks: [],
  patches: [{ bank: 'A', family: 'DX7', id: 'bank-A-1', name: 'ALPHA', number: 1, program: 0 }],
  replaceVoice: vi.fn(),
  workspaceBanks: ['A'],
} as unknown as PatchLibrary

function openSharedLink() {
  const fragment = makePatchShareFragment(makeDemoVoices()[0], undefined)
  window.history.replaceState(null, '', `/#${fragment}`)
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
}

describe('LibrarianPage share link whose reader fails to load', () => {
  it('explains the failure and keeps the librarian working', async () => {
    openSharedLink()

    expect(
      await screen.findByText(
        'Share links could not be opened. Reload the page, then open the link again.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Actions for ALPHA' })).toBeTruthy()
    expect(library.replaceVoice).not.toHaveBeenCalled()
  })

  it('reloads the app when the failure notice offers it', async () => {
    const user = userEvent.setup()
    openSharedLink()

    const alert = await screen.findByRole('alert')
    await user.click(within(alert).getByRole('button', { name: 'Reload app' }))

    expect(reloadPage).toHaveBeenCalledOnce()
  })
})
