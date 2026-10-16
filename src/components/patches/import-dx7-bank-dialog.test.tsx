// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { setLocale } from '@/i18n'
import german from '@/i18n/locales/de'
import ukrainian from '@/i18n/locales/uk'
import { makeDx7BankFile, updateDx7VoiceName } from '@/lib/dx7'
import { type PatchLibrarySnapshot, WorkspaceBankUnavailableError } from '@/lib/patch-library'
import { translatePageText } from '@/test/page-translator'

import { ImportDx7BankDialog } from './import-dx7-bank-dialog'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
    this.dispatchEvent(new Event('toggle'))
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
  const view = render(
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
  return { dialog, onClose, onPlay, undoChange, user: userEvent.setup(), view }
}

type User = ReturnType<typeof userEvent.setup>

const nextButton = (name = 'Next') => screen.getByRole('button', { hidden: true, name })
const backButton = () => screen.queryByRole('button', { name: 'Back' })
const replaceButton = () => screen.getByRole('button', { name: 'Replace bank contents' })

async function chooseFile(user: User, file = syxFile()) {
  await user.upload(screen.getByLabelText(/SysEx|\.syx/), file)
}

/** Moves on once the file has been read, which the file reader's own chunk can delay. */
async function moveOn(user: User, name = 'Next') {
  const next = nextButton(name)
  await waitFor(() => expect(next).toHaveProperty('disabled', false))
  await user.click(next)
}

/** Chooses a file holding one bank and moves on to its patches. */
async function toPreview(user: User, file = syxFile()) {
  await chooseFile(user, file)
  await moveOn(user)
}

async function chooseAndImport(user: User, file = syxFile()) {
  await toPreview(user, file)
  await user.click(replaceButton())
}

const playButtons = () => screen.queryAllByRole('button', { name: /^Play / })

describe('ImportDx7BankDialog screens', () => {
  it('opens on the file, naming the bank it will replace, with no way back', () => {
    renderDialog(vi.fn())

    expect(screen.getByRole('dialog', { name: 'Import over “Leads”?' })).toBeTruthy()
    expect(screen.getByText('Choose a standard 32-voice DX7 SysEx bank file.')).toBeTruthy()
    expect(screen.getByText('A standard 32-voice DX7 bank in a .syx file')).toBeTruthy()
    expect(backButton()).toBeNull()
    expect(nextButton().hasAttribute('disabled')).toBe(true)
  })

  it('focuses the file chooser as it opens', () => {
    renderDialog(vi.fn())

    expect(document.activeElement).toBe(screen.getByLabelText('Choose a DX7 SysEx file'))
  })

  it('goes straight to the patches for a file holding one bank, and back to the file', async () => {
    const { user } = renderDialog(vi.fn())

    await toPreview(user)

    expect(screen.queryByRole('group', { name: 'Banks in this file' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Patches in this file' })).toBeTruthy()
    expect(replaceButton()).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()

    await user.click(backButton()!)

    expect(screen.getByText('bank.syx')).toBeTruthy()
    expect(backButton()).toBeNull()
  })

  it('asks which bank to use in a file that joins several, then shows its patches', async () => {
    const { user } = renderDialog(vi.fn())
    await chooseFile(user, archiveFile([bankBytes('FIRST'), bankBytes('LATER')]))
    await moveOn(user)

    expect(screen.getByText('Choose which of the banks in the file to use.')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Banks in this file' })).toBeTruthy()
    expect(playButtons()).toHaveLength(0)

    await moveOn(user)

    expect(screen.getByRole('button', { name: 'Play FIRST 01, patch 1' })).toBeTruthy()
    await user.click(backButton()!)
    expect(screen.getByRole('group', { name: 'Banks in this file' })).toBeTruthy()
  })

  it('moves focus to the first control of the screen it opens', async () => {
    const { user } = renderDialog(vi.fn())
    await chooseFile(user, archiveFile([damagedBytes(bankBytes('FIRST')), bankBytes('LATER')]))
    await moveOn(user)

    expect(document.activeElement).toBe(screen.getByRole('radio', { name: /^Bank 2: / }))

    await moveOn(user)

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Play LATER 01, patch 1' }),
    )
  })

  it('warns that the bank is replaced only on the screen that replaces it', async () => {
    const { user } = renderDialog(vi.fn())
    await chooseFile(user)

    expect(screen.queryByText(/will be wiped/)).toBeNull()
    await moveOn(user)

    expect(screen.getByText(/will be wiped/)).toBeTruthy()
  })

  it('switches screens after a page translator has replaced the dialog’s text', async () => {
    const importBank = vi.fn<PatchLibrary['importBank']>(() => changed)
    const { user, view } = renderDialog(importBank)
    await chooseFile(user, archiveFile([bankBytes('FIRST'), bankBytes('LATER')]))
    translatePageText(view.container)

    await moveOn(user)
    translatePageText(view.container)
    await moveOn(user)
    translatePageText(view.container)
    await user.click(screen.getByRole('button', { hidden: true, name: 'Replace bank contents' }))

    expect(importBank).toHaveBeenCalledOnce()
  })
})

describe('ImportDx7BankDialog importing', () => {
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
    await moveOn(user, german.banks.wizardNext)
    await user.click(screen.getByRole('button', { name: 'Bankinhalt ersetzen' }))

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

  it('clears the error when going back to choose another file', async () => {
    const { user } = renderDialog(
      vi.fn(() => {
        throw new Error('failed')
      }),
    )

    await chooseAndImport(user)
    await screen.findByRole('alert')
    await user.click(backButton()!)

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('imports into an empty bank without warning that it replaces anything', async () => {
    const importBank = vi.fn<PatchLibrary['importBank']>(() => changed)
    const { user } = renderDialog(importBank, { replacing: false })

    expect(screen.getByRole('dialog', { name: 'Import into “Leads”' })).toBeTruthy()
    await toPreview(user)
    expect(screen.queryByText(/will be wiped/)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Import bank' }))

    expect(importBank).toHaveBeenCalledOnce()
  })

  it('tells the librarian it closed, so the chosen file goes with it', async () => {
    const { dialog, onClose, user } = renderDialog(vi.fn())

    await user.upload(screen.getByLabelText(/Choose a DX7 SysEx file/), syxFile())
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(dialog.open).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('ImportDx7BankDialog preview', () => {
  it('lists the chosen file’s patches before anything is replaced', async () => {
    const importBank = vi.fn(() => changed)
    const { user } = renderDialog(importBank)

    await toPreview(user)

    expect(playButtons()).toHaveLength(32)
    expect(screen.getByRole('button', { name: 'Play SOUND 17, patch 17' })).toBeTruthy()
    expect(importBank).not.toHaveBeenCalled()
  })

  it('plays a patch through the edit buffer and marks it as playing', async () => {
    const importBank = vi.fn(() => changed)
    const { onPlay, user } = renderDialog(importBank)

    await toPreview(user)
    const patch = screen.getByRole('button', { name: 'Play SOUND 03, patch 3' })
    await user.click(patch)

    expect(onPlay).toHaveBeenCalledOnce()
    expect(onPlay.mock.calls[0][0].name).toBe('SOUND 03')
    expect(patch.getAttribute('aria-current')).toBe('true')
    expect(patch.textContent).toContain('Auditioning')
    expect(importBank).not.toHaveBeenCalled()
  })

  it('plays the same voice object each time a patch is clicked, so it is sent once', async () => {
    const { onPlay, user } = renderDialog(vi.fn())

    await toPreview(user)
    const patch = screen.getByRole('button', { name: 'Play SOUND 03, patch 3' })
    await user.click(patch)
    await user.click(patch)

    expect(onPlay.mock.calls[1][0]).toBe(onPlay.mock.calls[0][0])
  })

  it('changes nothing when closed after playing a patch', async () => {
    const importBank = vi.fn(() => changed)
    const { onClose, user } = renderDialog(importBank)

    await toPreview(user)
    await user.click(screen.getByRole('button', { name: 'Play SOUND 03, patch 3' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(importBank).not.toHaveBeenCalled()
  })

  it('names each patch in the interface language', async () => {
    await setLocale('de')
    const { user } = renderDialog(vi.fn())

    await chooseFile(user)
    await moveOn(user, german.banks.wizardNext)

    expect(screen.getByRole('heading', { name: german.overwriteImport.previewTitle })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'SOUND 03 spielen, Sound 3' })).toBeTruthy()
  })
})

describe('ImportDx7BankDialog reading the file', () => {
  it('explains a file it cannot read as soon as it is chosen, and stays on the file', async () => {
    await setLocale('de')
    const { user } = renderDialog(vi.fn())
    const damaged = new File([new Uint8Array(4104)], 'damaged.syx')

    await chooseFile(user, damaged)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(german.banks.fileErrors.format)
    expect(nextButton(german.banks.wizardNext).hasAttribute('disabled')).toBe(true)
  })

  it('lists the file chosen last when an earlier file finishes reading after it', async () => {
    const { user } = renderDialog(vi.fn())
    const first = slowSyxFile('first.syx', 'FIRST')
    const second = slowSyxFile('second.syx', 'LATER')

    await chooseFile(user, first.file)
    await chooseFile(user, second.file)
    second.release()
    await moveOn(user)
    first.release()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(screen.getByRole('button', { name: 'Play LATER 01, patch 1' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Play FIRST 01, patch 1' })).toBeNull()
    expect(playButtons()).toHaveLength(32)
  })

  it('offers a choice of bank when the file joins several, starting on the first', async () => {
    const { user } = renderDialog(vi.fn())

    await chooseFile(
      user,
      archiveFile([bankBytes('FIRST'), bankBytes('LATER'), bankBytes('THIRD')]),
    )
    await moveOn(user)

    const picker = screen.getByRole('group', { name: 'Banks in this file' })
    expect(within(picker).getAllByRole('radio')).toHaveLength(3)
    expect(within(picker).getByRole('radio', { name: /^Bank 1: FIRST 01, / })).toHaveProperty(
      'checked',
      true,
    )
  })

  it('previews and imports the bank chosen from the file', async () => {
    const importBank = vi.fn<PatchLibrary['importBank']>(() => changed)
    const { user } = renderDialog(importBank)
    await chooseFile(user, archiveFile([bankBytes('FIRST'), bankBytes('LATER')]))
    await moveOn(user)

    await user.click(screen.getByRole('radio', { name: /^Bank 2: / }))
    await moveOn(user)
    expect(screen.getByRole('button', { name: 'Play LATER 01, patch 1' })).toBeTruthy()
    await user.click(replaceButton())

    expect(importBank.mock.calls[0][1][0].name).toBe('LATER 01')
  })

  it('marks a damaged bank in the file and starts on one it can read', async () => {
    const { user } = renderDialog(vi.fn())

    await chooseFile(user, archiveFile([damagedBytes(bankBytes('FIRST')), bankBytes('LATER')]))
    await moveOn(user)

    const damaged = screen.getByRole('radio', { name: 'Bank 1: Damaged' })
    expect(damaged).toHaveProperty('disabled', true)
    expect(screen.getByRole('radio', { name: /^Bank 2: / })).toHaveProperty('checked', true)
    expect(screen.getByText(/One of them is damaged and cannot be imported\./)).toBeTruthy()
  })

  it('shows the banks of a file chosen again after a page translator rewrote the dialog', async () => {
    const { user, view } = renderDialog(vi.fn())
    await chooseFile(user, archiveFile([bankBytes('FIRST'), bankBytes('LATER')]))
    await moveOn(user)
    translatePageText(view.container)

    await user.click(screen.getByRole('button', { hidden: true, name: 'Back' }))
    await chooseFile(
      user,
      archiveFile([damagedBytes(bankBytes('FIRST')), bankBytes('LATER'), bankBytes('THIRD')]),
    )
    await moveOn(user)

    expect(screen.getByRole('radio', { name: /^Bank 3: THIRD 01, / })).toBeTruthy()
    expect(screen.getByText('One of them is damaged and cannot be imported.')).toBeTruthy()
  })

  it('opens on the banks of a file chosen before it opened, and can go back to the file', async () => {
    const { user } = renderDialog(vi.fn(), {
      initialFile: archiveFile([bankBytes('FIRST'), bankBytes('LATER')], 'collection.syx'),
      replacing: false,
    })

    expect(await screen.findByRole('group', { name: 'Banks in this file' })).toBeTruthy()
    await user.click(backButton()!)
    expect(screen.getByText('collection.syx')).toBeTruthy()
  })

  it('counts the banks in a file in the interface language', async () => {
    await setLocale('de')
    const { user } = renderDialog(vi.fn())

    await chooseFile(
      user,
      archiveFile([bankBytes('FIRST'), bankBytes('LATER'), bankBytes('THIRD')]),
    )
    await moveOn(user, german.banks.wizardNext)

    expect(
      screen.getByText(
        'Diese Datei enthält 3 DX7-Bänke. Wähle die Bank, die du importieren möchtest.',
      ),
    ).toBeTruthy()
  })

  it('steps through the screens in Ukrainian', async () => {
    await setLocale('uk')
    const { user } = renderDialog(vi.fn())

    await chooseFile(user, archiveFile([bankBytes('FIRST'), bankBytes('LATER')]))
    await moveOn(user, ukrainian.banks.wizardNext)
    await moveOn(user, ukrainian.banks.wizardNext)

    expect(screen.getByRole('button', { name: ukrainian.banks.wizardBack })).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: ukrainian.overwriteImport.previewTitle }),
    ).toBeTruthy()
  })
})
