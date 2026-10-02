// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { makeDx7BankFile, updateDx7VoiceName } from '@/lib/dx7'
import { makeDemoVoices } from '@/lib/patch-library'
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

/** A bank dump whose first patch is called `name`. */
function bankBytes(name: string) {
  return makeDx7BankFile(
    makeDemoVoices().map((voice, index) => (index === 0 ? updateDx7VoiceName(voice, name) : voice)),
  )
}

// Bank B has no patches, so importing into it skips the replacement dialog for a single bank.
function renderPage() {
  const library = makeLibrarianLibrary({
    bankDescriptions: {},
    bankNames: { A: 'Studio Favourites', B: 'Electric Keys' },
    effects: {},
    getBankVoices: vi.fn(() => []),
    importBank: vi.fn(() => null),
    loadedBanks: ['A'],
    namedBanks: [],
    patches: [
      { bank: 'A', family: 'Keys', id: 'bank-A-1', name: 'Alpha Piano', number: 1, program: 0 },
    ],
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

async function importIntoEmptyBank(user: ReturnType<typeof userEvent.setup>, file: File) {
  const menuToggle = screen.getAllByTitle('Actions for Electric Keys')[0]
  await user.click(menuToggle)
  const menu = menuToggle.closest('details')!
  await user.click(within(menu).getByRole('button', { name: 'Import DX7 bank' }))
  await user.upload(screen.getByLabelText('Import DX7 bank file'), file)
}

describe('LibrarianPage bank import into an empty bank', () => {
  it('imports a file holding one bank at once', async () => {
    const { library, user } = renderPage()

    await importIntoEmptyBank(user, new File([bankBytes('ONLY ONE')], 'one.syx'))

    await waitFor(() => expect(library.importBank).toHaveBeenCalledOnce())
    expect(vi.mocked(library.importBank).mock.calls[0][0]).toBe('B')
    expect(vi.mocked(library.importBank).mock.calls[0][1][0].name).toBe('ONLY ONE')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('asks which bank to import when the file joins several', async () => {
    const { library, user } = renderPage()

    await importIntoEmptyBank(
      user,
      new File([bankBytes('FIRST'), bankBytes('SECOND')], 'collection.syx'),
    )

    const dialog = await screen.findByRole('dialog', { name: 'Import into “Electric Keys”' })
    expect(await within(dialog).findByRole('group', { name: 'Banks in this file' })).toBeTruthy()
    expect(within(dialog).getByText('collection.syx')).toBeTruthy()
    expect(library.importBank).not.toHaveBeenCalled()
  })

  it('imports the bank chosen from that file', async () => {
    const { library, user } = renderPage()
    await importIntoEmptyBank(
      user,
      new File([bankBytes('FIRST'), bankBytes('SECOND')], 'collection.syx'),
    )

    await user.click(await screen.findByRole('radio', { name: /^Bank 2: SECOND, / }))
    await user.click(screen.getByRole('button', { name: 'Import bank' }))

    expect(vi.mocked(library.importBank).mock.calls[0][0]).toBe('B')
    expect(vi.mocked(library.importBank).mock.calls[0][1][0].name).toBe('SECOND')
  })

  it('returns focus to the bank’s menu when that choice is closed', async () => {
    const { user } = renderPage()
    await importIntoEmptyBank(
      user,
      new File([bankBytes('FIRST'), bankBytes('SECOND')], 'collection.syx'),
    )

    const dialog = await screen.findByRole('dialog', { name: 'Import into “Electric Keys”' })
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(document.activeElement).toBe(screen.getAllByTitle('Actions for Electric Keys')[0])
  })
})
