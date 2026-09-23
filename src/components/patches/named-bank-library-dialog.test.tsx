// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { NamedBankLibraryDialog } from '@/components/patches/named-bank-library-dialog'
import { downloadFile } from '@/lib/download-file'
import { createNamedBank } from '@/lib/named-bank'
import {
  emptyPatchLibrary,
  importVoices,
  makeDemoVoices,
  WorkspaceBankUnavailableError,
} from '@/lib/patch-library'

vi.mock('@/lib/download-file', () => ({ downloadFile: vi.fn() }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
  // jsdom lays nothing out, so it has no element scrolling.
  HTMLElement.prototype.scrollTo = () => {}
  window.requestAnimationFrame = (callback) => {
    callback(0)
    return 1
  }
})

afterEach(cleanup)

type DialogLibrary = ComponentProps<typeof NamedBankLibraryDialog>['library']

const library: DialogLibrary = {
  bankNames: { A: 'Current Bank' },
  copyNamedBank: vi.fn(),
  deleteNamedBank: vi.fn(),
  hasDamagedNamedBanks: false,
  loadSavedBank: vi.fn(),
  loadedBanks: ['A'],
  namedBanks: [],
  namedBanksLoadFailed: false,
  namedBanksLoading: false,
  saveNamedBank: vi.fn(),
  updateNamedBankDetails: vi.fn(),
  workspaceBanks: ['A'],
}

describe('NamedBankLibraryDialog boundaries', () => {
  it('opens the save flow with focused, labelled validation fields', () => {
    render(<NamedBankLibraryDialog destinationBank="A" library={library} mode="save" />)
    const name = screen.getByRole('textbox', { name: 'Bank name' })
    const description = screen.getByRole('textbox', { name: 'Description (optional)' })
    expect(document.activeElement).toBe(name)
    expect(name.getAttribute('required')).not.toBeNull()
    expect(name.getAttribute('maxlength')).toBe('80')
    expect(description.getAttribute('maxlength')).toBe('500')
  })

  it('opens the load/manage flow with a focused accessible search field', () => {
    render(<NamedBankLibraryDialog destinationBank="A" library={library} mode="load" />)
    const search = screen.getByRole('searchbox', { name: 'Search saved banks' })
    expect(document.activeElement).toBe(search)
    expect(screen.getByRole('heading', { name: 'My saved banks' })).toBeTruthy()
  })

  it('keeps the load dialog open and explains when a saved bank cannot be loaded', async () => {
    const user = userEvent.setup()
    const bank = createNamedBank(importVoices(emptyPatchLibrary(), 'A', makeDemoVoices()), 'A', {
      description: '',
      id: 'bank-1',
      name: 'Stage',
      now: '2026-09-13T12:00:00.000Z',
    })
    const loadSavedBank = vi.fn(() => {
      throw new WorkspaceBankUnavailableError()
    })
    render(
      <NamedBankLibraryDialog
        destinationBank="A"
        mode="load"
        library={{ ...library, loadSavedBank, namedBanks: [bank] }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Load' }))
    await user.click(screen.getByRole('button', { name: 'Replace patches' }))

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe(
      'That workspace bank is no longer available. Close this dialog and try again.',
    )
    expect(alert.closest('dialog')?.open).toBe(true)
  })

  it('tells the user when damaged saved banks are hidden from the list', () => {
    render(
      <NamedBankLibraryDialog
        destinationBank="A"
        mode="load"
        library={{ ...library, hasDamagedNamedBanks: true }}
      />,
    )
    expect(
      screen.getByText(
        'Some saved banks could not be read, so they are hidden. They remain unchanged in browser storage.',
      ),
    ).toBeTruthy()
  })

  it('explains in the interface language when saved banks cannot be loaded', () => {
    render(
      <NamedBankLibraryDialog
        destinationBank="A"
        mode="load"
        library={{ ...library, namedBanksLoadFailed: true }}
      />,
    )
    expect(screen.getByRole('alert').textContent).toBe(
      'Saved banks could not be loaded from browser storage.',
    )
  })
})

describe('NamedBankLibraryDialog saved bank actions', () => {
  function makeSavedBank(updatedAt = '2026-09-13T12:00:00.000Z') {
    return createNamedBank(importVoices(emptyPatchLibrary(), 'A', makeDemoVoices()), 'A', {
      description: '',
      id: 'bank-1',
      name: 'Stage',
      now: updatedAt,
    })
  }

  afterEach(async () => {
    vi.restoreAllMocks()
    await setLocale('en')
  })

  it('asks inside the dialog before deleting, and keeps the bank when cancelled', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm')
    const deleteNamedBank = vi.fn(async () => undefined)
    render(
      <NamedBankLibraryDialog
        destinationBank="A"
        mode="load"
        library={{ ...library, deleteNamedBank, namedBanks: [makeSavedBank()] }}
      />,
    )
    const deleteButton = screen.getByRole('button', { name: 'Delete Stage' })

    await user.click(deleteButton)
    expect(screen.getByText('Permanently delete “Stage” from this browser?')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete bank' }))

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByText('Permanently delete “Stage” from this browser?')).toBeNull()
    expect(deleteNamedBank).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(deleteButton)
  })

  it('deletes a saved bank once the in-dialog confirmation is accepted', async () => {
    const user = userEvent.setup()
    const deleteNamedBank = vi.fn(async () => undefined)
    render(
      <NamedBankLibraryDialog
        destinationBank="A"
        mode="load"
        library={{ ...library, deleteNamedBank, namedBanks: [makeSavedBank()] }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete Stage' }))
    await user.click(screen.getByRole('button', { name: 'Delete bank' }))

    expect(deleteNamedBank).toHaveBeenCalledExactlyOnceWith('bank-1')
  })

  it('shows saved bank dates in the interface language', async () => {
    const updatedAt = '2026-08-25T12:00:00.000Z'
    await setLocale('fr')
    render(
      <NamedBankLibraryDialog
        destinationBank="A"
        mode="load"
        library={{ ...library, namedBanks: [makeSavedBank(updatedAt)] }}
      />,
    )

    expect(
      screen.getByText(new Date(updatedAt).toLocaleDateString('fr'), { exact: false }),
    ).toBeTruthy()
  })
})

describe('NamedBankLibraryDialog loading', () => {
  function makeSavedBank() {
    return createNamedBank(importVoices(emptyPatchLibrary(), 'A', makeDemoVoices()), 'A', {
      description: '',
      id: 'bank-1',
      name: 'Stage',
      now: '2026-09-13T12:00:00.000Z',
    })
  }

  it('asks before a saved bank replaces the sounds in a loaded bank, and keeps them when cancelled', async () => {
    const user = userEvent.setup()
    const loadSavedBank = vi.fn()
    render(
      <NamedBankLibraryDialog
        destinationBank="A"
        mode="load"
        library={{ ...library, loadSavedBank, namedBanks: [makeSavedBank()] }}
      />,
    )
    const loadButton = screen.getByRole('button', { name: 'Load' })

    await user.click(loadButton)
    expect(screen.getByText('Replace the 32 patches in “Current Bank” with “Stage”?')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Replace patches' }))

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(loadSavedBank).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(loadButton)
  })

  it('loads once the replacement is confirmed and reports the change', async () => {
    const user = userEvent.setup()
    const bank = makeSavedBank()
    const changed = emptyPatchLibrary()
    const loadSavedBank = vi.fn(() => changed)
    const onLoaded = vi.fn()
    render(
      <NamedBankLibraryDialog
        destinationBank="A"
        mode="load"
        library={{ ...library, loadSavedBank, namedBanks: [bank] }}
        onLoaded={onLoaded}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Load' }))
    await user.click(screen.getByRole('button', { name: 'Replace patches' }))

    expect(loadSavedBank).toHaveBeenCalledExactlyOnceWith(bank, 'A')
    expect(onLoaded).toHaveBeenCalledExactlyOnceWith(bank, changed)
    expect(
      screen.getByRole('heading', { name: 'My saved banks', hidden: true }).closest('dialog')?.open,
    ).toBe(false)
  })

  it('loads straight away into a bank with no sounds', async () => {
    const user = userEvent.setup()
    const bank = makeSavedBank()
    const loadSavedBank = vi.fn(() => null)
    render(
      <NamedBankLibraryDialog
        destinationBank="A"
        mode="load"
        library={{ ...library, loadedBanks: [], loadSavedBank, namedBanks: [bank] }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Load' }))

    expect(loadSavedBank).toHaveBeenCalledExactlyOnceWith(bank, 'A')
    expect(screen.queryByText(/Replace the 32 patches/)).toBeNull()
  })
})

describe('NamedBankLibraryDialog managing saved banks', () => {
  function makeSavedBank(id: string, name: string, description = '') {
    return createNamedBank(importVoices(emptyPatchLibrary(), 'A', makeDemoVoices()), 'A', {
      description,
      id,
      name,
      now: '2026-09-13T12:00:00.000Z',
    })
  }

  const stage = makeSavedBank('bank-1', 'Stage', 'Saturday gig')
  const studio = makeSavedBank('bank-2', 'Studio', 'Pads for mixing')

  afterEach(() => {
    vi.mocked(downloadFile).mockClear()
  })

  function renderLoadDialog(overrides: Partial<DialogLibrary> = {}) {
    render(
      <NamedBankLibraryDialog
        destinationBank="A"
        mode="load"
        library={{ ...library, namedBanks: [stage, studio], ...overrides }}
      />,
    )
    return userEvent.setup()
  }

  it('finds saved banks by name or description', async () => {
    const user = renderLoadDialog()

    await user.type(screen.getByRole('searchbox', { name: 'Search saved banks' }), 'mixing')

    expect(screen.queryByRole('button', { name: 'Edit Stage' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Edit Studio' })).toBeTruthy()
  })

  it('says when no saved bank matches the search', async () => {
    const user = renderLoadDialog()

    await user.type(screen.getByRole('searchbox', { name: 'Search saved banks' }), 'zzz')

    expect(screen.getByText('No saved banks match this search.')).toBeTruthy()
  })

  it('edits a saved bank’s name and description', async () => {
    const updateNamedBankDetails = vi.fn(async () => stage)
    const user = renderLoadDialog({ updateNamedBankDetails })
    // The edit form renders before the frame that focuses it, as in a browser.
    const frame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => window.setTimeout(() => callback(0)))

    await user.click(screen.getByRole('button', { name: 'Edit Stage' }))
    const name = screen.getByRole<HTMLInputElement>('textbox', { name: 'Bank name' })
    expect(name.value).toBe('Stage')
    await waitFor(() => expect(document.activeElement).toBe(name))
    frame.mockRestore()
    await user.clear(name)
    await user.type(name, 'Stage 2')
    await user.click(screen.getByRole('button', { name: 'Update details' }))

    expect(updateNamedBankDetails).toHaveBeenCalledExactlyOnceWith(stage, 'Stage 2', 'Saturday gig')
    expect(screen.getByText('Updated “Stage 2”.')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Bank name' })).toBeNull()
  })

  it('explains a failed edit without showing the browser error', async () => {
    const updateNamedBankDetails = vi.fn(async () => {
      throw new Error('QuotaExceededError')
    })
    const user = renderLoadDialog({ updateNamedBankDetails })

    await user.click(screen.getByRole('button', { name: 'Edit Stage' }))
    await user.click(screen.getByRole('button', { name: 'Update details' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('The saved-bank operation failed.')
    expect(alert.textContent).not.toContain('QuotaExceededError')
  })

  it('downloads a saved bank as a DX7 SysEx file', async () => {
    const user = renderLoadDialog()

    await user.click(screen.getByRole('button', { name: 'Download Stage as SysEx' }))

    expect(downloadFile).toHaveBeenCalledExactlyOnceWith(expect.any(Blob), 'fm1-Stage.syx')
    expect(vi.mocked(downloadFile).mock.calls[0][0].size).toBe(4104)
    expect(screen.getByText('Downloaded “Stage”.')).toBeTruthy()
  })

  it('duplicates a saved bank and reports the copy', async () => {
    const copyNamedBank = vi.fn(async () => makeSavedBank('bank-3', 'Stage copy'))
    const user = renderLoadDialog({ copyNamedBank })

    await user.click(screen.getByRole('button', { name: 'Duplicate Stage' }))

    expect(copyNamedBank).toHaveBeenCalledExactlyOnceWith(stage)
    expect(await screen.findByText('Created “Stage copy”.')).toBeTruthy()
  })

  it('locks the other saved-bank actions while one is working', async () => {
    const copyNamedBank = vi.fn(() => new Promise<never>(() => {}))
    const user = renderLoadDialog({ copyNamedBank })

    await user.click(screen.getByRole('button', { name: 'Duplicate Stage' }))

    expect(screen.getByRole('button', { name: 'Duplicate Studio' }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(screen.getByRole('button', { name: 'Delete Stage' }).hasAttribute('disabled')).toBe(true)
  })
})
