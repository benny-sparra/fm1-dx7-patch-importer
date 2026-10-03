// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import { emptyPatchLibrary, importVoices, makeDemoVoices } from '@/lib/patch-library'
import { fm1VaTestPatchName, makeFm1VaBackupFile } from '@/test/fm1-va-backup-file'
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
  window.requestAnimationFrame = (callback) => {
    callback(0)
    return 1
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderPage() {
  const workspace = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
  const changed = emptyPatchLibrary()
  const library = makeLibrarianLibrary({
    ...workspace,
    getBankVoices: vi.fn(() => makeDemoVoices()),
    hasDamagedNamedBanks: false,
    importFetchedBanks: vi.fn(() => changed),
    namedBanks: [],
    namedBanksLoadFailed: false,
    namedBanksLoading: false,
    patches: [],
    undoChange: vi.fn(() => true),
  })
  const onPlaySearchResult = vi.fn()
  render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={makeLibrarianMidi()}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={onPlaySearchResult}
        onSelectPatch={vi.fn()}
      />
    </ToastProvider>,
  )
  return { changed, library, onPlaySearchResult, user: userEvent.setup() }
}

async function openImport(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTitle('Library actions'))
  await user.click(screen.getByRole('button', { name: 'Import FM-1+VA presets…' }))
  return screen.findByRole('dialog', { name: 'Import FM-1+VA presets' })
}

describe('LibrarianPage FM-1+VA import', () => {
  it('describes the file the menu item reads', async () => {
    const { user } = renderPage()

    await user.click(screen.getByTitle('Library actions'))

    expect(
      screen
        .getByRole('button', { name: 'Import FM-1+VA presets…' })
        .getAttribute('aria-describedby'),
    ).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Other files' }).textContent).toContain(
      'For Baud Girl’s FM-1+VA firmware',
    )
  })

  it('imports the FM1 banks from the file and offers to undo it', async () => {
    const { changed, library, user } = renderPage()
    await openImport(user)

    await user.upload(screen.getByLabelText(/FM-1\+VA presets file/), makeFm1VaBackupFile())
    await user.click(await screen.findByRole('button', { name: 'Replace 4 banks' }))

    expect(library.importFetchedBanks).toHaveBeenCalledOnce()
    expect(await screen.findByText('Imported banks A, B, C and D from FM-1+VA.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(library.undoChange).toHaveBeenCalledWith(changed)
  })

  it('plays a patch from the file with the effects its record holds', async () => {
    const { onPlaySearchResult, user } = renderPage()
    await openImport(user)
    await user.upload(screen.getByLabelText(/FM-1\+VA presets file/), makeFm1VaBackupFile())
    await user.click(await screen.findByRole('button', { name: 'Expand FM1 bank A' }))

    await user.click(screen.getByRole('button', { name: `Play ${fm1VaTestPatchName(0)}, patch 1` }))

    // The test file's records are blank, so they hold every effect off at 0.
    expect(onPlaySearchResult).toHaveBeenCalledWith(
      expect.objectContaining({ name: fm1VaTestPatchName(0) }),
      makeDefaultFm1Effects(),
    )
  })

  it('returns focus to the menu toggle when the dialog closes', async () => {
    const { user } = renderPage()
    await openImport(user)

    await user.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => expect(document.activeElement).toBe(screen.getByTitle('Library actions')))
  })
})
