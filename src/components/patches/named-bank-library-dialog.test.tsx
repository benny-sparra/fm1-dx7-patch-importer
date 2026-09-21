// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { NamedBankLibraryDialog } from '@/components/patches/named-bank-library-dialog'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { createNamedBank } from '@/lib/named-bank'
import {
  emptyPatchLibrary,
  importVoices,
  makeDemoVoices,
  WorkspaceBankUnavailableError,
} from '@/lib/patch-library'

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

afterEach(cleanup)

const library = {
  bankNames: { A: 'Current Bank' },
  loadedBanks: ['A'],
  namedBanks: [],
  namedBanksLoadFailed: false,
  namedBanksLoading: false,
  saveNamedBank: vi.fn(async () => undefined),
} as unknown as PatchLibrary

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
