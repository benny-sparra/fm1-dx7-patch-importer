// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { makeWorkspaceWithCopies } from '@/test/factory-voices'
import { makeLibrarianLibrary, makeLibrarianMidi } from '@/test/librarian-fakes'

import { LibrarianPage } from './librarian-page'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderPage(loaded = true) {
  const workspace = makeWorkspaceWithCopies([{ name: 'MY BRASS', slot: 5 }])
  const library = makeLibrarianLibrary({
    ...workspace,
    loadedBanks: loaded ? workspace.loadedBanks : [],
  })
  const onSelectPatch = vi.fn()
  render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={makeLibrarianMidi()}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={onSelectPatch}
      />
    </ToastProvider>,
  )
  return { onSelectPatch, user: userEvent.setup() }
}

async function openDuplicates(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTitle('Library actions'))
  await user.click(screen.getByRole('button', { name: 'Find duplicate patches…' }))
  return screen.findByRole('dialog', { name: 'Duplicate patches' })
}

describe('LibrarianPage duplicate patches', () => {
  it('is not offered before any bank holds patches', async () => {
    const { user } = renderPage(false)

    await user.click(screen.getByTitle('Library actions'))

    expect(screen.getByRole('button', { name: 'Find duplicate patches…' })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('goes to the bank of the patch chosen and plays it', async () => {
    const { onSelectPatch, user } = renderPage()
    await openDuplicates(user)

    await user.click(
      await screen.findByRole('button', { name: 'Go to MY BRASS, patch 5 in Bank 2' }),
    )

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onSelectPatch).toHaveBeenCalledWith(expect.objectContaining({ id: 'bank-B-5' }))
    expect(screen.getByRole('button', { name: 'Send MY BRASS to FM1' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Send BRASS 1 to FM1' })).toBeNull()
  })

  it('moves focus to the slot of the patch chosen', async () => {
    const { user } = renderPage()
    await openDuplicates(user)

    await user.click(
      await screen.findByRole('button', { name: 'Go to MY BRASS, patch 5 in Bank 2' }),
    )

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Send MY BRASS to FM1' }),
      ),
    )
  })

  it('returns focus to the menu when it is closed', async () => {
    const { user } = renderPage()
    await openDuplicates(user)

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(document.activeElement).toBe(screen.getByTitle('Library actions'))
  })
})
