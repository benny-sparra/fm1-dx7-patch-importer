// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { setLocale } from '@/i18n'
import german from '@/i18n/locales/de'

import { BankInformationDialog } from './bank-information-dialog'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
  // Runs the focus-on-open frame at once, so it cannot land part-way through typing.
  window.requestAnimationFrame = (callback) => {
    callback(0)
    return 1
  }
})

afterEach(async () => {
  cleanup()
  await setLocale('en')
})

function renderDialog({
  bankDescriptions = {},
  bankNames = {},
}: Partial<Pick<PatchLibrary, 'bankDescriptions' | 'bankNames'>> = {}) {
  const updateBankInformation = vi.fn()
  const onClose = vi.fn()
  render(
    <ToastProvider>
      <BankInformationDialog
        bank="B"
        defaultTitle="Bank 2"
        library={{ bankDescriptions, bankNames, updateBankInformation } as unknown as PatchLibrary}
        onClose={onClose}
      />
    </ToastProvider>,
  )
  return { onClose, updateBankInformation, user: userEvent.setup() }
}

function titleField() {
  return screen.getByRole<HTMLInputElement>('textbox', { name: 'Bank name' })
}

function descriptionField() {
  return screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Description (optional)' })
}

describe('BankInformationDialog', () => {
  it('opens with the bank’s current title and description', async () => {
    const { user } = renderDialog({
      bankDescriptions: { B: 'Bright leads' },
      bankNames: { B: 'Leads' },
    })

    await user.click(screen.getByRole('button', { name: 'Bank information' }))

    expect(screen.getByRole('dialog', { name: 'Bank information' })).toBeTruthy()
    expect(titleField().value).toBe('Leads')
    expect(descriptionField().value).toBe('Bright leads')
  })

  it('offers the default title for a bank that was never named', async () => {
    const { user } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Bank information' }))

    expect(titleField().value).toBe('Bank 2')
    expect(descriptionField().value).toBe('')
  })

  it('saves a trimmed title and the description, then closes', async () => {
    const { onClose, updateBankInformation, user } = renderDialog({ bankNames: { B: 'Leads' } })

    await user.click(screen.getByRole('button', { name: 'Bank information' }))
    await user.clear(titleField())
    await user.type(titleField(), ' Solos ')
    await user.type(descriptionField(), 'For the gig')
    await user.click(screen.getByRole('button', { name: 'Update details' }))

    expect(updateBankInformation).toHaveBeenCalledWith('B', 'Solos', 'For the gig')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Updated “Solos”.')).toBeTruthy()
  })

  it('asks for a title rather than saving a blank one', async () => {
    const { onClose, updateBankInformation, user } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Bank information' }))
    await user.clear(titleField())
    await user.type(titleField(), '   ')
    await user.click(screen.getByRole('button', { name: 'Update details' }))

    expect(screen.getByRole('alert').textContent).toContain('Enter a name for the new bank.')
    expect(updateBankInformation).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('discards unsaved edits and the error when closed', async () => {
    const { onClose, updateBankInformation, user } = renderDialog({ bankNames: { B: 'Leads' } })

    await user.click(screen.getByRole('button', { name: 'Bank information' }))
    await user.clear(titleField())
    await user.type(titleField(), '   ')
    await user.click(screen.getByRole('button', { name: 'Update details' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByRole('button', { name: 'Bank information' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(updateBankInformation).not.toHaveBeenCalled()
    expect(titleField().value).toBe('Leads')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('labels the dialog in the interface language', async () => {
    await setLocale('de')
    const { user } = renderDialog()

    await user.click(screen.getByRole('button', { name: german.banks.bankInformation }))

    expect(screen.getByRole('dialog', { name: german.banks.bankInformation })).toBeTruthy()
    expect(screen.getByRole('button', { name: german.namedBanks.update })).toBeTruthy()
  })
})
