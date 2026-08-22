// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { NamedBankLibraryDialog } from '@/components/patches/named-bank-library-dialog'
import { type PatchLibrary } from '@/hooks/use-patch-library'

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
  namedBanksError: '',
  namedBanksLoading: false,
  saveNamedBank: vi.fn(async () => undefined),
} as unknown as PatchLibrary

describe('NamedBankLibraryDialog boundaries', () => {
  it('opens the save flow with focused, labelled validation fields', async () => {
    const user = userEvent.setup()
    render(<NamedBankLibraryDialog destinationBank="A" library={library} />)
    await user.click(screen.getByRole('button', { name: 'Save bank' }))
    const name = screen.getByRole('textbox', { name: 'Bank name' })
    const description = screen.getByRole('textbox', { name: 'Description (optional)' })
    expect(document.activeElement).toBe(name)
    expect(name.getAttribute('required')).not.toBeNull()
    expect(name.getAttribute('maxlength')).toBe('80')
    expect(description.getAttribute('maxlength')).toBe('500')
  })

  it('opens the load/manage flow with a focused accessible search field', async () => {
    const user = userEvent.setup()
    render(<NamedBankLibraryDialog destinationBank="A" library={library} />)
    await user.click(screen.getByRole('button', { name: 'Load bank' }))
    const search = screen.getByRole('searchbox', { name: 'Search saved banks' })
    expect(document.activeElement).toBe(search)
    expect(screen.getByRole('heading', { name: 'My saved banks' })).toBeTruthy()
  })
})
