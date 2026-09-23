// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { PatchLibrary } from '@/hooks/use-patch-library'
import { setLocale } from '@/i18n'
import german from '@/i18n/locales/de'

import { SaveNamedBankDialog } from './save-named-bank-dialog'

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

afterEach(async () => {
  cleanup()
  await setLocale('en')
})

function renderDialog(
  saveNamedBank: PatchLibrary['saveNamedBank'] = vi.fn(async () => ({}) as never),
) {
  const onClose = vi.fn()
  render(
    <SaveNamedBankDialog
      destinationBank="B"
      library={{
        bankNames: { B: 'Leads' },
        saveNamedBank,
        workspaceBanks: ['A', 'B', 'C', 'D'],
      }}
      onClose={onClose}
    />,
  )
  return { onClose, saveNamedBank, user: userEvent.setup() }
}

function nameField() {
  return screen.getByRole<HTMLInputElement>('textbox', { name: 'Bank name' })
}

describe('SaveNamedBankDialog', () => {
  it('opens named for the workspace bank, with its name ready to type over', () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'Save workspace bank Leads' })).toBeTruthy()
    expect(nameField().value).toBe('Leads')
    expect(document.activeElement).toBe(nameField())
  })

  it('saves the bank under the chosen name and description, then closes', async () => {
    const { onClose, saveNamedBank, user } = renderDialog()

    await user.clear(nameField())
    await user.type(nameField(), 'Gig set')
    await user.type(screen.getByRole('textbox', { name: 'Description (optional)' }), 'Saturday')
    await user.click(screen.getByRole('button', { name: 'Save bank' }))

    expect(saveNamedBank).toHaveBeenCalledWith('B', 'Gig set', 'Saturday')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('explains a failed save in the interface language and keeps what was typed', async () => {
    await setLocale('de')
    const { onClose, user } = renderDialog(
      vi.fn(async () => {
        throw new Error('QuotaExceededError')
      }),
    )

    await user.click(screen.getByRole('button', { name: german.namedBanks.save }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(german.namedBanks.operationFailed)
    expect(alert.textContent).not.toContain('QuotaExceededError')
    expect(
      screen.getByRole<HTMLInputElement>('textbox', { name: german.namedBanks.name }).value,
    ).toBe('Leads')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('stays open on Escape and cannot save twice while saving', async () => {
    const saveNamedBank = vi.fn(() => new Promise<never>(() => {}))
    const { onClose, user } = renderDialog(saveNamedBank)

    await user.click(screen.getByRole('button', { name: 'Save bank' }))
    const cancel = new Event('cancel', { cancelable: true })
    screen.getByRole('dialog').dispatchEvent(cancel)

    expect(cancel.defaultPrevented).toBe(true)
    expect(screen.getByRole('button', { name: 'Save bank' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Close' }).hasAttribute('disabled')).toBe(true)
    expect(saveNamedBank).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes without saving from its close button', async () => {
    const { onClose, saveNamedBank, user } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(saveNamedBank).not.toHaveBeenCalled()
  })
})
