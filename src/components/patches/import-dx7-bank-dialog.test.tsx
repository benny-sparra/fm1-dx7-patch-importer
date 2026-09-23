// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { setLocale } from '@/i18n'
import german from '@/i18n/locales/de'
import { Dx7BankFileError } from '@/lib/dx7'
import type { PatchLibrarySnapshot } from '@/lib/patch-library'

import { ImportDx7BankDialog } from './import-dx7-bank-dialog'

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

const changed = {} as PatchLibrarySnapshot

function syxFile(name = 'bank.syx') {
  return new File([new Uint8Array(4104)], name, { type: 'application/octet-stream' })
}

function renderDialog(importBank: PatchLibrary['importBank']) {
  const onClose = vi.fn()
  const undoChange = vi.fn()
  render(
    <ToastProvider>
      <ImportDx7BankDialog
        bank="B"
        bankName="Leads"
        library={{ importBank, undoChange }}
        onClose={onClose}
      />
    </ToastProvider>,
  )
  const dialog = screen.getByRole<HTMLDialogElement>('dialog')
  return { dialog, onClose, undoChange, user: userEvent.setup() }
}

async function chooseAndImport(user: ReturnType<typeof userEvent.setup>, file = syxFile()) {
  await user.upload(screen.getByLabelText(/Choose a DX7 SysEx file/), file)
  await user.click(screen.getByRole('button', { name: 'Replace bank contents' }))
}

describe('ImportDx7BankDialog', () => {
  it('names the bank it will replace and waits for a file', () => {
    renderDialog(vi.fn())

    expect(screen.getByRole('dialog', { name: 'Import over “Leads”?' })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Replace bank contents' }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('imports the chosen file into its bank and offers to undo it', async () => {
    const importBank = vi.fn(async () => changed)
    const { dialog, onClose, undoChange, user } = renderDialog(importBank)
    const file = syxFile()

    await chooseAndImport(user, file)

    expect(importBank).toHaveBeenCalledWith('B', file)
    expect(dialog.open).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
    expect(await screen.findByText('Imported patches into “Leads”.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(undoChange).toHaveBeenCalledWith(changed)
  })

  it('offers no undo when the import changed nothing', async () => {
    const { user } = renderDialog(vi.fn(async () => null))

    await chooseAndImport(user)

    expect(await screen.findByText('Imported patches into “Leads”.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  })

  it('explains a damaged file in the interface language and stays open', async () => {
    await setLocale('de')
    const { dialog, user } = renderDialog(
      vi.fn(async () => {
        throw new Dx7BankFileError('checksum', 'Checksum mismatch', 4104)
      }),
    )

    await user.upload(screen.getByLabelText(/SysEx/), syxFile())
    await user.click(screen.getByRole('button', { name: 'Bankinhalt ersetzen' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(german.banks.fileErrors.damaged)
    expect(alert.textContent).not.toContain('Checksum mismatch')
    expect(dialog.open).toBe(true)
  })

  it('shows the translated fallback rather than an unexpected error message', async () => {
    const { user } = renderDialog(
      vi.fn(async () => {
        throw new Error('QuotaExceededError')
      }),
    )

    await chooseAndImport(user)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Import failed.')
    expect(alert.textContent).not.toContain('QuotaExceededError')
  })

  it('clears the error once another file is chosen', async () => {
    const { user } = renderDialog(
      vi.fn(async () => {
        throw new Error('failed')
      }),
    )

    await chooseAndImport(user)
    await screen.findByRole('alert')
    await user.upload(screen.getByLabelText(/Choose a DX7 SysEx file|bank\.syx/), syxFile('b.syx'))

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('stays open on Escape while the file is importing', async () => {
    const { dialog, user } = renderDialog(vi.fn(() => new Promise<never>(() => {})))

    await chooseAndImport(user)
    const cancel = new Event('cancel', { cancelable: true })
    dialog.dispatchEvent(cancel)

    expect(cancel.defaultPrevented).toBe(true)
    expect(screen.getByRole('button', { name: 'Close' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Importing…' })).toBeTruthy()
  })

  it('tells the librarian it closed, so the chosen file goes with it', async () => {
    const { dialog, onClose, user } = renderDialog(vi.fn())

    await user.upload(screen.getByLabelText(/Choose a DX7 SysEx file/), syxFile())
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(dialog.open).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
