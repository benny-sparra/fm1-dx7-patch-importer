// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { AddWorkspaceBankDialog } from '@/components/patches/add-workspace-bank-dialog'
import { ToastProvider } from '@/components/ui/toast'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { setLocale } from '@/i18n'
import english from '@/i18n/locales/en'
import french from '@/i18n/locales/fr'
import { makeDx7BankFile, updateDx7VoiceName } from '@/lib/dx7'
import { Dx7CatalogBankUnavailableError, loadDx7CatalogBank } from '@/lib/dx7-bank-catalog'
import { makeDemoVoices } from '@/lib/patch-library'

vi.mock('@/lib/dx7-bank-catalog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/dx7-bank-catalog')>()),
  loadDx7CatalogBank: vi.fn(),
}))

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
  vi.mocked(loadDx7CatalogBank).mockReset()
  await setLocale('en')
})

const catalogVoices = makeDemoVoices()
const fileVoices = makeDemoVoices().map((voice, index) =>
  index === 0 ? updateDx7VoiceName(voice, 'FROM FILE') : voice,
)

function syxFile(bytes: Uint8Array<ArrayBuffer>, name = 'bank.syx') {
  return new File([bytes], name, { type: 'application/octet-stream' })
}

function renderDialog(bank: string | null = 'E') {
  const addBank = vi.fn()
  const onClose = vi.fn()
  const onCreated = vi.fn()
  render(
    <ToastProvider>
      <AddWorkspaceBankDialog
        bank={bank}
        library={{ addBank } as unknown as PatchLibrary}
        onClose={onClose}
        onCreated={onCreated}
        suggestedName="Bank 5"
      />
    </ToastProvider>,
  )
  return { addBank, onClose, onCreated, user: userEvent.setup() }
}

function renderCatalogGroups() {
  renderDialog()
  return Array.from(document.querySelectorAll('optgroup'), (group) => group.label)
}

function createButton() {
  return screen.getByRole('button', { name: 'Create bank' })
}

describe('AddWorkspaceBankDialog catalog groups', () => {
  it('names the factory groups in English and keeps the product names', () => {
    expect(renderCatalogGroups()).toEqual([
      'Factory',
      'FM-1 factory presets',
      'VRC Voice ROMs',
      'Grey Matter E!',
    ])
  })

  it('names the factory groups in the interface language', async () => {
    await setLocale('fr')

    expect(renderCatalogGroups()).toEqual([
      french.banks.catalogFactory,
      french.banks.catalogFm1Factory,
      'VRC Voice ROMs',
      'Grey Matter E!',
    ])
  })
})

describe('AddWorkspaceBankDialog creating a bank', () => {
  it('suggests a name for the new bank as it opens', () => {
    renderDialog()

    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Bank name' }).value).toBe(
      'Bank 5',
    )
  })

  it('waits for a sound source before offering to create the bank', () => {
    renderDialog()

    expect(createButton().hasAttribute('disabled')).toBe(true)
  })

  it('asks for a name rather than creating an untitled bank', async () => {
    const { addBank, user } = renderDialog()

    await user.clear(screen.getByRole('textbox', { name: 'Bank name' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'DX7 catalog bank' }), 'rom1a')
    // The field is `required`, so the browser would stop an empty submit; the dialog checks too.
    await user.type(screen.getByRole('textbox', { name: 'Bank name' }), '   ')
    await user.click(createButton())

    expect(screen.getByRole('alert').textContent).toContain('Enter a name for the new bank.')
    expect(addBank).not.toHaveBeenCalled()
  })

  it('creates the bank from a catalog bank and closes', async () => {
    vi.mocked(loadDx7CatalogBank).mockResolvedValue(catalogVoices)
    const { addBank, onClose, onCreated, user } = renderDialog()

    await user.clear(screen.getByRole('textbox', { name: 'Bank name' }))
    await user.type(screen.getByRole('textbox', { name: 'Bank name' }), '  Pianos  ')
    await user.type(screen.getByRole('textbox', { name: 'Description (optional)' }), 'Bright keys')
    await user.selectOptions(screen.getByRole('combobox', { name: 'DX7 catalog bank' }), 'rom1a')
    await user.click(createButton())

    expect(loadDx7CatalogBank).toHaveBeenCalledWith('rom1a')
    expect(addBank).toHaveBeenCalledWith('E', 'Pianos', 'Bright keys', catalogVoices)
    expect(onCreated).toHaveBeenCalledWith('E')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Created “Pianos”.')).toBeTruthy()
  })

  it('creates the bank from an uploaded DX7 bank file', async () => {
    const { addBank, onCreated, user } = renderDialog()

    await user.click(screen.getByRole('radio', { name: 'Upload your own bank' }))
    await user.upload(
      screen.getByLabelText('Choose a DX7 SysEx file'),
      syxFile(makeDx7BankFile(fileVoices)),
    )
    await user.click(createButton())

    expect(addBank).toHaveBeenCalledWith('E', 'Bank 5', '', fileVoices)
    expect(onCreated).toHaveBeenCalledWith('E')
  })

  it('explains a file of the wrong size in the interface language and stays open', async () => {
    await setLocale('fr')
    const { addBank, onClose, user } = renderDialog()

    await user.click(screen.getByRole('radio', { name: french.banks.uploadSource }))
    await user.upload(
      screen.getByLabelText(french.banks.chooseSysexFile),
      syxFile(new Uint8Array(12)),
    )
    await user.click(screen.getByRole('button', { name: french.banks.createBank }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(french.banks.fileErrors.size.split('{{')[0])
    expect(alert.textContent).toContain('12')
    expect(addBank).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('explains a catalog bank that could not be fetched', async () => {
    vi.mocked(loadDx7CatalogBank).mockRejectedValue(new Dx7CatalogBankUnavailableError('ROM1A'))
    const { addBank, user } = renderDialog()

    await user.selectOptions(screen.getByRole('combobox', { name: 'DX7 catalog bank' }), 'rom1a')
    await user.click(createButton())

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(english.banks.catalogUnavailable)
    expect(addBank).not.toHaveBeenCalled()
  })

  it('shows the translated fallback for an unexpected failure', async () => {
    vi.mocked(loadDx7CatalogBank).mockRejectedValue(new Error('Unexpected browser failure'))
    const { user } = renderDialog()

    await user.selectOptions(screen.getByRole('combobox', { name: 'DX7 catalog bank' }), 'rom1a')
    await user.click(createButton())

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('The bank could not be created.')
    expect(alert.textContent).not.toContain('Unexpected browser failure')
  })

  it('stays open on Escape and locks its controls while the bank is loading', async () => {
    vi.mocked(loadDx7CatalogBank).mockReturnValue(new Promise(() => {}))
    const { onClose, user } = renderDialog()

    await user.selectOptions(screen.getByRole('combobox', { name: 'DX7 catalog bank' }), 'rom1a')
    await user.click(createButton())
    const dialog = screen.getByRole('dialog')
    const cancel = new Event('cancel', { cancelable: true })
    dialog.dispatchEvent(cancel)

    expect(cancel.defaultPrevented).toBe(true)
    expect(within(dialog).getByRole('button', { name: 'Close' }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(within(dialog).getByRole('button', { name: 'Importing…' })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('forgets a chosen catalog bank when switching to an upload and back', async () => {
    const { user } = renderDialog()

    await user.selectOptions(screen.getByRole('combobox', { name: 'DX7 catalog bank' }), 'rom1a')
    await user.click(screen.getByRole('radio', { name: 'Upload your own bank' }))
    await user.click(screen.getByRole('radio', { name: 'Existing DX7 patch banks' }))

    expect(
      screen.getByRole<HTMLSelectElement>('combobox', { name: 'DX7 catalog bank' }).value,
    ).toBe('')
    expect(createButton().hasAttribute('disabled')).toBe(true)
  })
})
