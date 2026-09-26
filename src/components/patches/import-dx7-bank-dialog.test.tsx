// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { setLocale } from '@/i18n'
import german from '@/i18n/locales/de'
import { Dx7BankFileError, makeDx7BankFile, updateDx7VoiceName } from '@/lib/dx7'
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

const patchName = (index: number) => `SOUND ${String(index + 1).padStart(2, '0')}`

/** A valid 32-voice bank whose patches are named SOUND 01 to SOUND 32, or `prefix` 01 onwards. */
function syxFile(name = 'bank.syx', prefix = 'SOUND') {
  const voices = Array.from({ length: 32 }, (_, index) =>
    updateDx7VoiceName(
      { data: new Uint8Array(128), name: '' },
      patchName(index).replace('SOUND', prefix),
    ),
  )
  return new File([makeDx7BankFile(voices)], name, { type: 'application/octet-stream' })
}

/** A file whose contents arrive only when the test says, to order two reads by hand. */
function slowSyxFile(name: string, prefix: string) {
  const file = syxFile(name, prefix)
  let release = () => {}
  const contents = file.arrayBuffer()
  const arrived = new Promise<ArrayBuffer>((resolve) => {
    release = () => void contents.then(resolve)
  })
  Object.defineProperty(file, 'arrayBuffer', { value: () => arrived })
  return { file, release }
}

function renderDialog(importBank: PatchLibrary['importBank']) {
  const onClose = vi.fn()
  const onPlay = vi.fn()
  const undoChange = vi.fn()
  render(
    <ToastProvider>
      <ImportDx7BankDialog
        bank="B"
        bankName="Leads"
        library={{ importBank, undoChange }}
        onClose={onClose}
        onPlay={onPlay}
      />
    </ToastProvider>,
  )
  const dialog = screen.getByRole<HTMLDialogElement>('dialog')
  return { dialog, onClose, onPlay, undoChange, user: userEvent.setup() }
}

async function chooseFile(user: ReturnType<typeof userEvent.setup>, file = syxFile()) {
  await user.upload(screen.getByLabelText(/SysEx|\.syx/), file)
}

async function chooseAndImport(user: ReturnType<typeof userEvent.setup>, file = syxFile()) {
  await chooseFile(user, file)
  await user.click(await screen.findByRole('button', { name: 'Replace bank contents' }))
}

const playButtons = () => screen.queryAllByRole('button', { name: /^Play / })

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

  it('lists the chosen file’s patches before anything is replaced', async () => {
    const importBank = vi.fn(async () => changed)
    const { user } = renderDialog(importBank)

    await chooseFile(user)

    expect(await screen.findByRole('heading', { name: 'Patches in this file' })).toBeTruthy()
    expect(playButtons()).toHaveLength(32)
    expect(screen.getByRole('button', { name: 'Play SOUND 17, patch 17' })).toBeTruthy()
    expect(importBank).not.toHaveBeenCalled()
  })

  it('plays a patch through the edit buffer and marks it as playing', async () => {
    const importBank = vi.fn(async () => changed)
    const { onPlay, user } = renderDialog(importBank)

    await chooseFile(user)
    const patch = await screen.findByRole('button', { name: 'Play SOUND 03, patch 3' })
    await user.click(patch)

    expect(onPlay).toHaveBeenCalledOnce()
    expect(onPlay.mock.calls[0][0].name).toBe('SOUND 03')
    expect(patch.getAttribute('aria-current')).toBe('true')
    expect(patch.textContent).toContain('Auditioning')
    expect(importBank).not.toHaveBeenCalled()
  })

  it('plays the same voice object each time a patch is clicked, so it is sent once', async () => {
    const { onPlay, user } = renderDialog(vi.fn())

    await chooseFile(user)
    const patch = await screen.findByRole('button', { name: 'Play SOUND 03, patch 3' })
    await user.click(patch)
    await user.click(patch)

    expect(onPlay.mock.calls[1][0]).toBe(onPlay.mock.calls[0][0])
  })

  it('changes nothing when closed after playing a patch', async () => {
    const importBank = vi.fn(async () => changed)
    const { onClose, user } = renderDialog(importBank)

    await chooseFile(user)
    await user.click(await screen.findByRole('button', { name: 'Play SOUND 03, patch 3' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(importBank).not.toHaveBeenCalled()
  })

  it('explains a file it cannot read as soon as it is chosen, and imports nothing', async () => {
    await setLocale('de')
    const importBank = vi.fn(async () => changed)
    const { user } = renderDialog(importBank)
    const damaged = new File([new Uint8Array(4104)], 'damaged.syx')

    await chooseFile(user, damaged)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(german.banks.fileErrors.format)
    expect(playButtons()).toHaveLength(0)
    expect(
      screen.getByRole('button', { name: 'Bankinhalt ersetzen' }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('lists the file chosen last when an earlier file finishes reading after it', async () => {
    const { user } = renderDialog(vi.fn())
    const first = slowSyxFile('first.syx', 'FIRST')
    const second = slowSyxFile('second.syx', 'LATER')

    await chooseFile(user, first.file)
    await chooseFile(user, second.file)
    second.release()
    await screen.findByRole('button', { name: 'Play LATER 01, patch 1' })
    first.release()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(screen.queryByRole('button', { name: 'Play FIRST 01, patch 1' })).toBeNull()
    expect(playButtons()).toHaveLength(32)
  })

  it('names each patch in the interface language', async () => {
    await setLocale('de')
    const { user } = renderDialog(vi.fn())

    await chooseFile(user)

    expect(
      await screen.findByRole('heading', { name: german.overwriteImport.previewTitle }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'SOUND 03 spielen, Sound 3' })).toBeTruthy()
  })

  it('tells the librarian it closed, so the chosen file goes with it', async () => {
    const { dialog, onClose, user } = renderDialog(vi.fn())

    await user.upload(screen.getByLabelText(/Choose a DX7 SysEx file/), syxFile())
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(dialog.open).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
