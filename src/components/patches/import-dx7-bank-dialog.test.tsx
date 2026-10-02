// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { setLocale } from '@/i18n'
import german from '@/i18n/locales/de'
import { makeDx7BankFile, updateDx7VoiceName } from '@/lib/dx7'
import { type PatchLibrarySnapshot, WorkspaceBankUnavailableError } from '@/lib/patch-library'
import { translatePageText } from '@/test/page-translator'

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
  await setLocale('en-GB')
})

const changed = {} as PatchLibrarySnapshot

const patchName = (index: number) => `SOUND ${String(index + 1).padStart(2, '0')}`

/** A valid 32-voice bank dump whose patches are named `prefix` 01 to `prefix` 32. */
function bankBytes(prefix = 'SOUND') {
  const voices = Array.from({ length: 32 }, (_, index) =>
    updateDx7VoiceName(
      { data: new Uint8Array(128), name: '' },
      patchName(index).replace('SOUND', prefix),
    ),
  )
  return makeDx7BankFile(voices)
}

/** A copy of a bank dump whose checksum no longer matches its data. */
function damagedBytes(bank: Uint8Array<ArrayBuffer>) {
  const copy = bank.slice()
  copy[copy.length - 2] ^= 0x01
  return copy
}

/** A valid 32-voice bank whose patches are named SOUND 01 to SOUND 32, or `prefix` 01 onwards. */
function syxFile(name = 'bank.syx', prefix = 'SOUND') {
  return new File([bankBytes(prefix)], name, { type: 'application/octet-stream' })
}

/** A file joining the given bank dumps one after another, as DX7 archive collections do. */
function archiveFile(banks: Uint8Array<ArrayBuffer>[], name = 'archive.syx') {
  return new File(banks, name, { type: 'application/octet-stream' })
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

function renderDialog(
  importBank: PatchLibrary['importBank'],
  { initialFile, replacing = true }: { initialFile?: File; replacing?: boolean } = {},
) {
  const onClose = vi.fn()
  const onPlay = vi.fn()
  const undoChange = vi.fn()
  render(
    <ToastProvider>
      <ImportDx7BankDialog
        bank="B"
        bankName="Leads"
        initialFile={initialFile}
        library={{ importBank, undoChange }}
        onClose={onClose}
        onPlay={onPlay}
        replacing={replacing}
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
    const importBank = vi.fn<PatchLibrary['importBank']>(() => changed)
    const { dialog, onClose, undoChange, user } = renderDialog(importBank)

    await chooseAndImport(user)

    expect(importBank).toHaveBeenCalledOnce()
    expect(importBank.mock.calls[0][0]).toBe('B')
    expect(importBank.mock.calls[0][1].map((voice) => voice.name)).toEqual(
      Array.from({ length: 32 }, (_, index) => patchName(index)),
    )
    expect(dialog.open).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
    expect(await screen.findByText('Imported patches into “Leads”.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(undoChange).toHaveBeenCalledWith(changed)
  })

  it('offers no undo when the import changed nothing', async () => {
    const { user } = renderDialog(vi.fn(() => null))

    await chooseAndImport(user)

    expect(await screen.findByText('Imported patches into “Leads”.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  })

  it('explains a bank the library can no longer take, in the interface language', async () => {
    await setLocale('de')
    const { dialog, user } = renderDialog(
      vi.fn(() => {
        throw new WorkspaceBankUnavailableError()
      }),
    )

    await user.upload(screen.getByLabelText(/SysEx/), syxFile())
    await user.click(await screen.findByRole('button', { name: 'Bankinhalt ersetzen' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(german.banks.bankUnavailable)
    expect(dialog.open).toBe(true)
  })

  it('shows the translated fallback rather than an unexpected error message', async () => {
    const { user } = renderDialog(
      vi.fn(() => {
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
      vi.fn(() => {
        throw new Error('failed')
      }),
    )

    await chooseAndImport(user)
    await screen.findByRole('alert')
    await user.upload(screen.getByLabelText(/Choose a DX7 SysEx file|bank\.syx/), syxFile('b.syx'))

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('lists the chosen file’s patches before anything is replaced', async () => {
    const importBank = vi.fn(() => changed)
    const { user } = renderDialog(importBank)

    await chooseFile(user)

    expect(await screen.findByRole('heading', { name: 'Patches in this file' })).toBeTruthy()
    expect(playButtons()).toHaveLength(32)
    expect(screen.getByRole('button', { name: 'Play SOUND 17, patch 17' })).toBeTruthy()
    expect(importBank).not.toHaveBeenCalled()
  })

  it('plays a patch through the edit buffer and marks it as playing', async () => {
    const importBank = vi.fn(() => changed)
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
    const importBank = vi.fn(() => changed)
    const { onClose, user } = renderDialog(importBank)

    await chooseFile(user)
    await user.click(await screen.findByRole('button', { name: 'Play SOUND 03, patch 3' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(importBank).not.toHaveBeenCalled()
  })

  it('explains a file it cannot read as soon as it is chosen, and imports nothing', async () => {
    await setLocale('de')
    const importBank = vi.fn(() => changed)
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

  it('offers a choice of bank when the file joins several, starting on the first', async () => {
    const { user } = renderDialog(vi.fn())

    await chooseFile(
      user,
      archiveFile([bankBytes('FIRST'), bankBytes('LATER'), bankBytes('THIRD')]),
    )

    const picker = await screen.findByRole('group', { name: 'Banks in this file' })
    expect(within(picker).getAllByRole('radio')).toHaveLength(3)
    expect(within(picker).getByRole('radio', { name: /^Bank 1: FIRST 01, / })).toHaveProperty(
      'checked',
      true,
    )
    expect(screen.getByRole('button', { name: 'Play FIRST 01, patch 1' })).toBeTruthy()
  })

  it('previews and imports the bank chosen from the file', async () => {
    const importBank = vi.fn<PatchLibrary['importBank']>(() => changed)
    const { user } = renderDialog(importBank)
    await chooseFile(user, archiveFile([bankBytes('FIRST'), bankBytes('LATER')]))

    await user.click(await screen.findByRole('radio', { name: /^Bank 2: / }))
    expect(screen.getByRole('button', { name: 'Play LATER 01, patch 1' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Replace bank contents' }))

    expect(importBank.mock.calls[0][1][0].name).toBe('LATER 01')
  })

  it('marks a damaged bank in the file and starts on one it can read', async () => {
    const { user } = renderDialog(vi.fn())

    await chooseFile(user, archiveFile([damagedBytes(bankBytes('FIRST')), bankBytes('LATER')]))

    const damaged = await screen.findByRole('radio', { name: 'Bank 1: Damaged' })
    expect(damaged).toHaveProperty('disabled', true)
    expect(screen.getByRole('radio', { name: /^Bank 2: / })).toHaveProperty('checked', true)
    expect(screen.getByText(/One of them is damaged and cannot be imported\./)).toBeTruthy()
  })

  it('updates the bank choice after a page translator rewrites the dialog', async () => {
    const { user } = renderDialog(vi.fn())
    await chooseFile(user, archiveFile([bankBytes('FIRST'), bankBytes('LATER')]))
    await screen.findByRole('group', { name: 'Banks in this file' })
    translatePageText(screen.getByRole('dialog'))

    await chooseFile(
      user,
      archiveFile([damagedBytes(bankBytes('FIRST')), bankBytes('LATER'), bankBytes('THIRD')]),
    )

    expect(await screen.findByRole('radio', { name: /^Bank 3: THIRD 01, / })).toBeTruthy()
    expect(screen.getByText('One of them is damaged and cannot be imported.')).toBeTruthy()
  })

  it('shows no choice for a file holding one bank', async () => {
    const { user } = renderDialog(vi.fn())

    await chooseFile(user)

    await screen.findByRole('button', { name: 'Play SOUND 01, patch 1' })
    expect(screen.queryByRole('group', { name: 'Banks in this file' })).toBeNull()
  })

  it('reads a file chosen before it opened', async () => {
    renderDialog(vi.fn(), {
      initialFile: archiveFile([bankBytes('FIRST'), bankBytes('LATER')], 'collection.syx'),
    })

    expect(await screen.findByRole('group', { name: 'Banks in this file' })).toBeTruthy()
    expect(screen.getByText('collection.syx')).toBeTruthy()
  })

  it('imports into an empty bank without warning that it replaces anything', async () => {
    renderDialog(vi.fn(), { replacing: false })

    expect(screen.getByRole('dialog', { name: 'Import into “Leads”' })).toBeTruthy()
    expect(screen.queryByText(/will be wiped/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Import bank' })).toBeTruthy()
  })

  it('counts the banks in a file in the interface language', async () => {
    await setLocale('de')
    const { user } = renderDialog(vi.fn())

    await chooseFile(
      user,
      archiveFile([bankBytes('FIRST'), bankBytes('LATER'), bankBytes('THIRD')]),
    )

    expect(
      await screen.findByText(
        'Diese Datei enthält 3 DX7-Bänke. Wähle die Bank, die du importieren möchtest.',
      ),
    ).toBeTruthy()
  })

  it('tells the librarian it closed, so the chosen file goes with it', async () => {
    const { dialog, onClose, user } = renderDialog(vi.fn())

    await user.upload(screen.getByLabelText(/Choose a DX7 SysEx file/), syxFile())
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(dialog.open).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
