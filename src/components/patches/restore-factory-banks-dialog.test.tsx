// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { translatePageText } from '@/test/page-translator'
import { RestoreFactoryBanksDialog } from './restore-factory-banks-dialog'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(cleanup)

describe('RestoreFactoryBanksDialog', () => {
  it('contains a failed factory load and allows a successful retry', async () => {
    const user = userEvent.setup()
    const onRestore = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('Factory data could not be loaded.'))
      .mockResolvedValueOnce()
    const onClose = vi.fn()
    render(<RestoreFactoryBanksDialog onClose={onClose} onRestore={onRestore} />)
    const dialog = screen.getByRole<HTMLDialogElement>('dialog')

    await user.click(screen.getByRole('button', { name: 'Reset four banks' }))

    expect(screen.getByRole('alert').textContent).toBe(
      'The banks could not be reset to the factory patches. Try again.',
    )
    expect(dialog.open).toBe(true)
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Reset four banks' }))

    expect(onRestore).toHaveBeenCalledTimes(2)
    expect(dialog.open).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not start duplicate restores while factory data is loading', async () => {
    const user = userEvent.setup()
    let finishRestore!: () => void
    const onRestore = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishRestore = resolve
        }),
    )
    const onClose = vi.fn()
    render(<RestoreFactoryBanksDialog onClose={onClose} onRestore={onRestore} />)
    const dialog = screen.getByRole<HTMLDialogElement>('dialog')

    await user.click(screen.getByRole('button', { name: 'Reset four banks' }))
    expect(screen.getByRole('button', { name: 'Resetting…' })).toHaveProperty('disabled', true)
    expect(onRestore).toHaveBeenCalledOnce()

    finishRestore()
    await vi.waitFor(() => expect(dialog.open).toBe(false))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows the restoring label after a page translator replaces the button text', async () => {
    const user = userEvent.setup()
    const onRestore = vi.fn(() => new Promise<void>(() => {}))
    const { container } = render(
      <RestoreFactoryBanksDialog onClose={vi.fn()} onRestore={onRestore} />,
    )
    translatePageText(container)

    await user.click(screen.getByRole('button', { name: 'Reset four banks' }))

    expect(screen.getByRole('button', { name: 'Resetting…' })).toBeTruthy()
  })
})
