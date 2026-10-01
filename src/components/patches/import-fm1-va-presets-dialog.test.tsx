// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { setLocale } from '@/i18n'
import { makeDx7BankFile } from '@/lib/dx7'
import { makeDemoVoices, type PatchLibrarySnapshot } from '@/lib/patch-library'
import {
  fm1VaTestPatchName,
  makeFm1VaBackupBytes,
  makeFm1VaBackupFile,
} from '@/test/fm1-va-backup-file'
import { translatePageText } from '@/test/page-translator'

import { ImportFm1VaPresetsDialog } from './import-fm1-va-presets-dialog'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
  // Runs the focus-on-open frame at once, so it cannot land part-way through a test's clicks.
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

type LibraryOptions = {
  bankNames?: Record<string, string>
  importFetchedBanks?: PatchLibrary['importFetchedBanks']
  workspaceBanks?: string[]
}

function renderDialog({
  bankNames = {},
  importFetchedBanks = vi.fn(() => changed),
  workspaceBanks = ['A', 'B', 'C', 'D'],
}: LibraryOptions = {}) {
  const onClose = vi.fn()
  const onPlay = vi.fn()
  const undoChange = vi.fn()
  render(
    <ToastProvider>
      <ImportFm1VaPresetsDialog
        library={{ bankNames, importFetchedBanks, undoChange, workspaceBanks }}
        onClose={onClose}
        onPlay={onPlay}
      />
    </ToastProvider>,
  )
  const dialog = screen.getByRole<HTMLDialogElement>('dialog')
  return { dialog, importFetchedBanks, onClose, onPlay, undoChange, user: userEvent.setup() }
}

async function chooseFile(user: ReturnType<typeof userEvent.setup>, file = makeFm1VaBackupFile()) {
  await user.upload(screen.getByLabelText(/FM-1\+VA presets file|Presetdatei/), file)
}

/** A file whose contents arrive only when the test says, to order two reads by hand. */
function slowBackupFile(name: string) {
  const file = makeFm1VaBackupFile(name)
  let release = () => {}
  const contents = file.arrayBuffer()
  const arrived = new Promise<ArrayBuffer>((resolve) => {
    release = () => void contents.then(resolve)
  })
  Object.defineProperty(file, 'arrayBuffer', { value: () => arrived })
  return { file, release }
}

const bankSection = (bank: string) => screen.getByRole('region', { name: `FM1 bank ${bank}` })

describe('ImportFm1VaPresetsDialog', () => {
  it('waits for a file before it can replace anything', () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'Import FM-1+VA presets' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Replace 0 banks' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  it('says that the presets’ effects are not imported', () => {
    renderDialog()

    const descriptionId = screen.getByRole('dialog').getAttribute('aria-describedby')

    expect(document.getElementById(descriptionId ?? '')?.textContent).toContain(
      'every imported patch starts with its effects off',
    )
  })

  it('shows the four FM1 banks of a chosen file, each ticked', async () => {
    const { user } = renderDialog()

    await chooseFile(user)

    for (const bank of ['A', 'B', 'C', 'D']) {
      expect(within(bankSection(bank)).getByRole<HTMLInputElement>('checkbox').checked).toBe(true)
    }
    expect(screen.getByRole('button', { name: 'Replace 4 banks' })).toBeTruthy()
  })

  it('lists each bank’s patches in slot order', async () => {
    const { user } = renderDialog()

    await chooseFile(user)

    const patches = within(bankSection('C')).getAllByRole('button')
    expect(patches).toHaveLength(32)
    expect(patches[0].getAttribute('aria-label')).toBe(`Play ${fm1VaTestPatchName(64)}, patch 1`)
  })

  it('plays a patch from the file when it is clicked', async () => {
    const { onPlay, user } = renderDialog()
    await chooseFile(user)

    await user.click(
      screen.getByRole('button', { name: `Play ${fm1VaTestPatchName(33)}, patch 2` }),
    )

    expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ name: fm1VaTestPatchName(33) }))
  })

  it('imports only the banks left ticked, and offers to undo it', async () => {
    const { dialog, importFetchedBanks, onClose, undoChange, user } = renderDialog()
    await chooseFile(user)

    await user.click(within(bankSection('C')).getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Replace 3 banks' }))

    const imported = vi.mocked(importFetchedBanks).mock.calls[0][0]
    expect(imported.map(({ bank }) => bank)).toEqual(['A', 'B', 'D'])
    expect(imported[2].voices[31]?.name).toBe(fm1VaTestPatchName(127))
    expect(dialog.open).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
    expect(await screen.findByText('Imported banks A, B and D from FM-1+VA.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(undoChange).toHaveBeenCalledWith(changed)
  })

  it('names the library bank each FM1 bank replaces', async () => {
    const { user } = renderDialog({ bankNames: { B: 'Leads' } })

    await chooseFile(user)

    expect(
      within(bankSection('A')).getByRole('checkbox', { name: 'Replace “Bank 1”' }),
    ).toBeTruthy()
    expect(within(bankSection('B')).getByRole('checkbox', { name: 'Replace “Leads”' })).toBeTruthy()
  })

  it('offers to add a bank the library does not have', async () => {
    const { user } = renderDialog({ workspaceBanks: ['A', 'B'] })

    await chooseFile(user)

    expect(
      within(bankSection('C')).getByRole('checkbox', { name: 'Add it as a new bank' }),
    ).toBeTruthy()
  })

  it('marks a damaged preset and keeps that slot out of the import', async () => {
    const { importFetchedBanks, user } = renderDialog()
    await chooseFile(user, makeFm1VaBackupFile('damaged.syx', [5]))

    expect(within(bankSection('A')).getByText('Damaged')).toBeTruthy()
    expect(
      screen.getByText('One preset in this file is damaged. Its slot keeps the patch it has now.'),
    ).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Replace 4 banks' }))
    expect(vi.mocked(importFetchedBanks).mock.calls[0][0][0].voices[5]).toBeNull()
  })

  it('cannot take a bank in which every preset is damaged', async () => {
    const { user } = renderDialog()
    const bankB = Array.from({ length: 32 }, (_, index) => 32 + index)

    await chooseFile(user, makeFm1VaBackupFile('damaged.syx', bankB))

    const checkbox = within(bankSection('B')).getByRole<HTMLInputElement>('checkbox')
    expect(checkbox.checked).toBe(false)
    expect(checkbox.disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Replace 3 banks' })).toBeTruthy()
  })

  it('explains a file of the wrong size', async () => {
    const { user } = renderDialog()
    const bank = new File([makeDx7BankFile(makeDemoVoices())], 'bank.syx')

    await chooseFile(user, bank)

    expect(screen.getByRole('alert').textContent).toBe(
      'This file is 4,104 bytes. A file from FM-1+VA’s “Save a backup” is exactly 29,568 bytes.',
    )
  })

  it('explains a file that FM-1+VA did not write', async () => {
    const { user } = renderDialog()
    const bytes = makeFm1VaBackupBytes()
    bytes[3] = 0x00

    await chooseFile(user, new File([bytes], 'other.syx'))

    expect(screen.getByRole('alert').textContent).toBe(
      'This file was not saved by FM-1+VA’s “Save a backup”.',
    )
  })

  it('explains a file in which no preset can be read', async () => {
    const { user } = renderDialog()
    const everySlot = Array.from({ length: 128 }, (_, slot) => slot)

    await chooseFile(user, makeFm1VaBackupFile('broken.syx', everySlot))

    expect(screen.getByRole('alert').textContent).toBe(
      'No preset in this file could be read. Save a new backup on FM-1+VA and try again.',
    )
  })

  it('shows the file chosen last when an earlier one finishes reading after it', async () => {
    const { user } = renderDialog()
    const first = slowBackupFile('first.syx')
    const second = slowBackupFile('second.syx')

    await chooseFile(user, first.file)
    await chooseFile(user, second.file)
    second.release()
    await screen.findByRole('button', { name: 'Replace 4 banks' })
    first.release()
    await first.file.arrayBuffer()

    expect(screen.getByText('second.syx')).toBeTruthy()
    expect(screen.getAllByRole('region', { name: /^FM1 bank / })).toHaveLength(4)
  })

  it('keeps the dialog open and explains a failed import', async () => {
    const { dialog, user } = renderDialog({
      importFetchedBanks: vi.fn(() => {
        throw new Error('storage')
      }),
    })
    await chooseFile(user)

    await user.click(screen.getByRole('button', { name: 'Replace 4 banks' }))

    expect(dialog.open).toBe(true)
    expect(screen.getByRole('alert').textContent).toBe('Import failed.')
  })

  it('updates the button after a page translator rewrites the dialog', async () => {
    const { user } = renderDialog()
    await chooseFile(user)
    translatePageText(screen.getByRole('dialog'))

    await user.click(within(bankSection('A')).getByRole('checkbox'))

    expect(screen.getByRole('button', { name: 'Replace 3 banks' })).toBeTruthy()
  })

  it('names the imported banks in the interface language', async () => {
    await setLocale('de')
    const { user } = renderDialog()
    await chooseFile(user)

    await user.click(
      within(screen.getByRole('region', { name: 'FM1-Bank C' })).getByRole('checkbox'),
    )
    await user.click(screen.getByRole('button', { name: '3 Bänke ersetzen' }))

    expect(await screen.findByText('Bänke A, B und D von FM-1+VA importiert.')).toBeTruthy()
  })
})
