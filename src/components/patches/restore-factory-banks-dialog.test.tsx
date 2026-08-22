// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
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

    await user.click(screen.getByRole('button', { name: 'Restore four banks' }))

    expect(screen.getByRole('alert').textContent).toBe('Factory data could not be loaded.')
    expect(dialogRef.current?.open).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Restore four banks' }))

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

    await user.click(screen.getByRole('button', { name: 'Restore four banks' }))
    expect(screen.getByRole('button', { name: 'Importing…' })).toHaveProperty('disabled', true)
    expect(onRestore).toHaveBeenCalledOnce()

    finishRestore()
    await vi.waitFor(() => expect(dialogRef.current?.open).toBe(false))
  })
})
