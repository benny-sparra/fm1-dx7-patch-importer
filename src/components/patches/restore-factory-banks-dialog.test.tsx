// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
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
    const dialogRef = createRef<HTMLDialogElement>()
    render(<RestoreFactoryBanksDialog dialogRef={dialogRef} onRestore={onRestore} />)
    dialogRef.current?.showModal()

    await user.click(screen.getByRole('button', { name: 'Reset four banks' }))

    expect(screen.getByRole('alert').textContent).toBe(
      'The banks could not be reset to the factory patches. Try again.',
    )
    expect(dialogRef.current?.open).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Reset four banks' }))

    expect(onRestore).toHaveBeenCalledTimes(2)
    expect(dialogRef.current?.open).toBe(false)
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
    const dialogRef = createRef<HTMLDialogElement>()
    render(<RestoreFactoryBanksDialog dialogRef={dialogRef} onRestore={onRestore} />)
    dialogRef.current?.showModal()

    await user.click(screen.getByRole('button', { name: 'Reset four banks' }))
    expect(screen.getByRole('button', { name: 'Resetting…' })).toHaveProperty('disabled', true)
    expect(onRestore).toHaveBeenCalledOnce()

    finishRestore()
    await vi.waitFor(() => expect(dialogRef.current?.open).toBe(false))
  })

  it('shows the restoring label after a page translator replaces the button text', async () => {
    const user = userEvent.setup()
    const onRestore = vi.fn(() => new Promise<void>(() => {}))
    const dialogRef = createRef<HTMLDialogElement>()
    const { container } = render(
      <RestoreFactoryBanksDialog dialogRef={dialogRef} onRestore={onRestore} />,
    )
    dialogRef.current?.showModal()
    translatePageText(container)

    await user.click(screen.getByRole('button', { name: 'Reset four banks' }))

    expect(screen.getByRole('button', { name: 'Resetting…' })).toBeTruthy()
  })
})
