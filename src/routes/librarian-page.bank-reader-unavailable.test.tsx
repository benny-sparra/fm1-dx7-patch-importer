// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { makeDx7BankFile } from '@/lib/dx7'
import { makeDemoVoices } from '@/lib/patch-library'
import { makeLibrarianLibrary, makeLibrarianMidi } from '@/test/librarian-fakes'

import { LibrarianPage } from './librarian-page'

// Stand in for a chunk that fails, as a stale deployment's missing file would.
vi.mock('@/lib/dx7-bank-archive', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
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
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const library = makeLibrarianLibrary({
    bankDescriptions: {},
    bankNames: { A: 'Studio Favourites', B: 'Electric Keys' },
    effects: {},
    getBankVoices: vi.fn(() => []),
    importBank: vi.fn(() => null),
    loadedBanks: ['A'],
    namedBanks: [],
    patches: [],
    undoChange: vi.fn(),
    voices: {},
    workspaceBanks: ['A', 'B'],
  })
  render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={makeLibrarianMidi()}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={vi.fn()}
      />
    </ToastProvider>,
  )
  return { library, user: userEvent.setup() }
}

async function openImport(user: ReturnType<typeof userEvent.setup>, bankName: string) {
  const menuToggle = screen.getAllByTitle(`Actions for ${bankName}`)[0]
  await user.click(menuToggle)
  await user.click(
    within(menuToggle.closest('details')!).getByRole('button', { name: 'Import DX7 bank…' }),
  )
}

const bankFile = () => new File([makeDx7BankFile(makeDemoVoices())], 'bank.syx')
const unavailable = 'Bank files could not be read. Reload the page and try again.'

describe('LibrarianPage bank import when the file reader fails to load', () => {
  it('explains it in the replacement dialog and offers a reload', async () => {
    const { library, user } = renderPage()
    await openImport(user, 'Studio Favourites')

    await user.upload(await screen.findByLabelText(/Choose a DX7 SysEx file/), bankFile())

    const alert = await within(screen.getByRole('dialog')).findByRole('alert')
    expect(within(alert).getByText(unavailable)).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Reload app' })).toBeTruthy()
    expect(library.importBank).not.toHaveBeenCalled()
  })

  it('explains it when importing into an empty bank and offers a reload', async () => {
    const { library, user } = renderPage()
    await openImport(user, 'Electric Keys')

    await user.upload(screen.getByLabelText('Import DX7 bank file'), bankFile())

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(unavailable)).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Reload app' })).toBeTruthy()
    expect(library.importBank).not.toHaveBeenCalled()
  })
})
