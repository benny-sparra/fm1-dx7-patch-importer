// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import type { MidiController } from '@/hooks/use-midi'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import type { Dx7Voice } from '@/lib/dx7'
import { makeDemoVoices, type PatchLibrarySnapshot } from '@/lib/patch-library'

import { LibrarianPage } from './librarian-page'

const loadDx7CatalogBank = vi.hoisted(() => vi.fn<(bankId: string) => Promise<Dx7Voice[]>>())

vi.mock(import('@/lib/dx7-bank-catalog'), async (importOriginal) => ({
  ...(await importOriginal()),
  loadDx7CatalogBank,
}))

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
  vi.clearAllMocks()
})

const changed = { workspaceBanks: ['A'] } as unknown as PatchLibrarySnapshot

function renderPage() {
  const library = {
    bankDescriptions: {},
    bankNames: { A: 'Studio Favourites' },
    getBankVoices: vi.fn(() => []),
    hasDamagedNamedBanks: false,
    loadedBanks: ['A'],
    namedBanks: [],
    namedBanksLoadFailed: false,
    patches: [
      { bank: 'A', family: 'Keys', id: 'bank-A-1', name: 'Alpha Brass', number: 1, program: 0 },
    ],
    replaceVoice: vi.fn(() => changed),
    undoChange: vi.fn(),
    workspaceBanks: ['A'],
  } as unknown as PatchLibrary
  const onCloseEditor = vi.fn()
  const onEditPatch = vi.fn()
  render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={{ hasMidiOutput: false } as unknown as MidiController}
        onBankDeleted={vi.fn()}
        onCloseEditor={onCloseEditor}
        onEditPatch={onEditPatch}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={vi.fn()}
      />
    </ToastProvider>,
  )
  return { library, onCloseEditor, onEditPatch, user: userEvent.setup() }
}

async function search(user: ReturnType<typeof userEvent.setup>, query: string) {
  await user.type(screen.getByRole('searchbox', { name: 'Search' }), query)
}

describe('LibrarianPage search beyond the workspace', () => {
  it('lists matches from your banks under their own heading above other DX7 banks', async () => {
    const { user } = renderPage()

    await search(user, 'brass')

    expect(screen.getByRole('heading', { name: 'Your patch banks' })).toBeTruthy()
    const catalog = await screen.findByRole('region', { name: 'Other DX7 patch banks' })
    expect(
      within(catalog).getByRole('button', { name: 'Play BRASS 1 from ROM1A Master 01' }),
    ).toBeTruthy()
  })

  it('copies a catalog patch into a slot with the default effects and offers Undo', async () => {
    const voices = makeDemoVoices()
    loadDx7CatalogBank.mockResolvedValue(voices)
    const { library, user } = renderPage()
    await search(user, 'brass   1')

    await user.click(
      await screen.findByRole('button', { name: 'Copy BRASS 1 to a workspace bank' }),
    )
    await user.click(await screen.findByRole('button', { name: 'Replace A01' }))

    expect(library.replaceVoice).toHaveBeenCalledExactlyOnceWith('A', 1, voices[0], undefined)
    expect(await screen.findByText('Copied “BRASS 1” to A01 in “Studio Favourites”.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
  })

  it('opens the editor on the copy of a result that was double-clicked', async () => {
    loadDx7CatalogBank.mockResolvedValue(makeDemoVoices())
    const { onEditPatch, user } = renderPage()
    await search(user, 'brass   1')

    await user.dblClick(
      await screen.findByRole('button', { name: 'Play BRASS 1 from ROM1A Master 01' }),
    )
    await user.click(await screen.findByRole('button', { name: 'Replace A01 and edit' }))

    expect(onEditPatch).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'bank-A-1' }))
  })

  it('does not open the editor after copying from the copy button', async () => {
    loadDx7CatalogBank.mockResolvedValue(makeDemoVoices())
    const { onEditPatch, user } = renderPage()
    await search(user, 'brass   1')

    await user.click(
      await screen.findByRole('button', { name: 'Copy BRASS 1 to a workspace bank' }),
    )
    await user.click(await screen.findByRole('button', { name: 'Replace A01' }))

    expect(onEditPatch).not.toHaveBeenCalled()
  })

  it('closes the editor before undoing a copy that was opened in it', async () => {
    loadDx7CatalogBank.mockResolvedValue(makeDemoVoices())
    const { library, onCloseEditor, user } = renderPage()
    await search(user, 'brass   1')
    await user.dblClick(
      await screen.findByRole('button', { name: 'Play BRASS 1 from ROM1A Master 01' }),
    )
    await user.click(await screen.findByRole('button', { name: 'Replace A01 and edit' }))

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(onCloseEditor).toHaveBeenCalledOnce()
    expect(library.undoChange).toHaveBeenCalledExactlyOnceWith(changed)
    expect(vi.mocked(onCloseEditor).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(library.undoChange).mock.invocationCallOrder[0],
    )
  })
})
