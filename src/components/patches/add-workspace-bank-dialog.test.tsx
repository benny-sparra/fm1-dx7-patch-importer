// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { AddWorkspaceBankDialog } from '@/components/patches/add-workspace-bank-dialog'
import { ToastProvider } from '@/components/ui/toast'
import { setLocale } from '@/i18n'
import english from '@/i18n/locales/en-GB'
import french from '@/i18n/locales/fr'
import { Dx7CatalogBankUnavailableError, makeDx7BankFile, updateDx7VoiceName } from '@/lib/dx7'
import { loadDx7CatalogBank } from '@/lib/dx7-bank-catalog'
import { makeDemoVoices } from '@/lib/patch-library'
import { translatePageText } from '@/test/page-translator'

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
  await setLocale('en-GB')
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
  const view = render(
    <ToastProvider>
      <AddWorkspaceBankDialog
        bank={bank}
        library={{ addBank }}
        onClose={onClose}
        onCreated={onCreated}
        suggestedName="Bank 5"
      />
    </ToastProvider>,
  )
  return { addBank, onClose, onCreated, user: userEvent.setup(), view }
}

type User = ReturnType<typeof userEvent.setup>

const nextButton = () => screen.getByRole('button', { name: 'Next' })
const backButton = () => screen.getByRole('button', { name: 'Back' })
const createButton = () => screen.getByRole('button', { name: 'Create bank' })

/** Moves from the title to the screen that chooses where the patches come from. */
async function toSourceScreen(user: User) {
  await user.click(nextButton())
}

/** Moves on to the built-in banks, leaving the first collection open. */
async function toCatalogScreen(user: User) {
  await toSourceScreen(user)
  await user.click(nextButton())
}

/** Moves on to choosing a DX7 SysEx file. */
async function toFileScreen(user: User) {
  await toSourceScreen(user)
  await user.click(screen.getByRole('radio', { name: 'Upload your own bank' }))
  await user.click(nextButton())
}

function collectionNames() {
  return within(screen.getByRole('group', { name: 'Collections' }))
    .getAllByRole('radio')
    .map((radio) => radio.getAttribute('aria-label'))
}

describe('AddWorkspaceBankDialog collections', () => {
  it('lists them alphabetically in English and keeps the product and author names', async () => {
    const { user } = renderDialog()
    await toCatalogScreen(user)

    expect(collectionNames()).toEqual([
      'Aquanode',
      'Factory',
      'FM-1 factory presets',
      'Grey Matter E!',
      'mene311',
      'VRC Voice ROMs',
    ])
  })

  it('names the factory collections in the interface language and sorts by those names', async () => {
    await setLocale('fr')
    const { user } = renderDialog()
    await user.click(screen.getByRole('button', { name: french.banks.wizardNext }))
    await user.click(screen.getByRole('button', { name: french.banks.wizardNext }))

    expect(collectionNames()).toEqual([
      'Aquanode',
      'Grey Matter E!',
      'mene311',
      french.banks.catalogFm1Factory,
      french.banks.catalogFactory,
      'VRC Voice ROMs',
    ])
  })

  it('credits mene311 on the collection holding their banks', async () => {
    const { user } = renderDialog()
    await toCatalogScreen(user)

    await user.click(screen.getByRole('radio', { name: 'mene311' }))

    expect(
      within(screen.getByRole('group', { name: 'Banks in mene311' })).getByRole('radio', {
        name: 'Synthwave Bass',
      }),
    ).toBeTruthy()
  })

  it('says how many banks each holds without reading it as a position in a list', async () => {
    const { user } = renderDialog()
    await toCatalogScreen(user)

    const grey = screen.getByRole('radio', { name: 'Grey Matter E!' })

    expect(grey.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById(grey.getAttribute('aria-describedby')!)?.textContent).toBe(
      '3 banks',
    )
  })

  it('counts a collection in the interface language', async () => {
    await setLocale('fr')
    const { user } = renderDialog()
    await user.click(screen.getByRole('button', { name: french.banks.wizardNext }))
    await user.click(screen.getByRole('button', { name: french.banks.wizardNext }))

    const grey = screen.getByRole('radio', { name: 'Grey Matter E!' })

    expect(document.getElementById(grey.getAttribute('aria-describedby')!)?.textContent).toBe(
      '3 banques',
    )
  })
})

describe('AddWorkspaceBankDialog screens', () => {
  it('opens on the title, suggesting a name for the new bank', () => {
    renderDialog()

    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Bank name' }).value).toBe(
      'Bank 5',
    )
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })

  it('shows the DX7 block cursor in the bank name field', () => {
    renderDialog()

    expect(screen.getByRole('textbox', { name: 'Bank name' }).classList).toContain('name-caret')
  })

  it('asks for a name rather than moving on with an untitled bank', async () => {
    const { user } = renderDialog()

    await user.clear(screen.getByRole('textbox', { name: 'Bank name' }))
    await user.type(screen.getByRole('textbox', { name: 'Bank name' }), '   ')
    await user.click(nextButton())

    expect(screen.getByRole('alert').textContent).toContain('Enter a name for the new bank.')
    expect(screen.getByRole('textbox', { name: 'Bank name' })).toBeTruthy()
  })

  it('moves on when Enter is pressed in the name field', async () => {
    const { user } = renderDialog()

    await user.type(screen.getByRole('textbox', { name: 'Bank name' }), '{Enter}')

    expect(screen.getByRole('radio', { name: 'Existing DX7 patch banks' })).toBeTruthy()
  })

  it('offers the built-in banks first and keeps the title when going back and forward', async () => {
    const { user } = renderDialog()
    await user.clear(screen.getByRole('textbox', { name: 'Bank name' }))
    await user.type(screen.getByRole('textbox', { name: 'Bank name' }), 'Leads')
    await toSourceScreen(user)

    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'Existing DX7 patch banks' }).checked,
    ).toBe(true)

    await user.click(backButton())

    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Bank name' }).value).toBe('Leads')
  })

  it('names the bank in the title, without its letter, on the screens after the name', async () => {
    const { user } = renderDialog()
    await user.clear(screen.getByRole('textbox', { name: 'Bank name' }))
    await user.type(screen.getByRole('textbox', { name: 'Bank name' }), '  Leads  ')

    expect(screen.getByRole('heading', { name: 'Add bank' })).toBeTruthy()
    await toSourceScreen(user)

    expect(screen.getByRole('heading', { name: 'Add bank: “Leads”' })).toBeTruthy()

    await user.click(backButton())

    expect(screen.getByRole('heading', { name: 'Add bank' })).toBeTruthy()
  })

  it('names the bank in the title in the interface language', async () => {
    await setLocale('fr')
    const { user } = renderDialog()
    await user.click(screen.getByRole('button', { name: french.banks.wizardNext }))

    expect(screen.getByRole('heading', { name: 'Ajouter la banque : « Bank 5 »' })).toBeTruthy()
  })

  it('moves focus to the first control of the screen it opens', async () => {
    const { user } = renderDialog()

    await toSourceScreen(user)

    expect(document.activeElement).toBe(
      screen.getByRole('radio', { name: 'Existing DX7 patch banks' }),
    )
  })

  it('switches screens after a page translator has replaced the dialog’s text', async () => {
    const { user, view } = renderDialog()
    translatePageText(view.container)

    await user.click(screen.getByRole('button', { hidden: true, name: 'Next' }))
    translatePageText(view.container)
    await user.click(screen.getByRole('button', { hidden: true, name: 'Next' }))

    expect(screen.getByRole('button', { hidden: true, name: 'Create bank' })).toBeTruthy()
  })
})

describe('AddWorkspaceBankDialog creating a bank from the built-in banks', () => {
  it('has a bank selected as soon as a collection is open, so the bank can be created at once', async () => {
    vi.mocked(loadDx7CatalogBank).mockResolvedValue(catalogVoices)
    const { addBank, user } = renderDialog()
    await toCatalogScreen(user)

    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Aquazone' }).checked).toBe(true)
    await user.click(createButton())

    expect(loadDx7CatalogBank).toHaveBeenCalledWith('aquanode-aquazone')
    expect(addBank).toHaveBeenCalledWith('E', 'Bank 5', '', catalogVoices)
  })

  it('creates the bank from the chosen catalog bank and closes', async () => {
    vi.mocked(loadDx7CatalogBank).mockResolvedValue(catalogVoices)
    const { addBank, onClose, onCreated, user } = renderDialog()

    await user.clear(screen.getByRole('textbox', { name: 'Bank name' }))
    await user.type(screen.getByRole('textbox', { name: 'Bank name' }), '  Pianos  ')
    await user.type(screen.getByRole('textbox', { name: 'Description (optional)' }), 'Bright keys')
    await toCatalogScreen(user)
    await user.click(screen.getByRole('radio', { name: 'Factory' }))
    await user.click(screen.getByRole('radio', { name: 'ROM1A Master' }))
    await user.click(createButton())

    expect(loadDx7CatalogBank).toHaveBeenCalledWith('rom1a')
    expect(addBank).toHaveBeenCalledWith('E', 'Pianos', 'Bright keys', catalogVoices)
    expect(onCreated).toHaveBeenCalledWith('E')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Created “Pianos” from “ROM1A Master” in Factory.')).toBeTruthy()
  })

  it('names the collection and bank the patches came from in the toast, in the interface language', async () => {
    await setLocale('fr')
    vi.mocked(loadDx7CatalogBank).mockResolvedValue(catalogVoices)
    const { user } = renderDialog()
    await user.click(screen.getByRole('button', { name: french.banks.wizardNext }))
    await user.click(screen.getByRole('button', { name: french.banks.wizardNext }))

    await user.click(screen.getByRole('button', { name: french.banks.createBank }))

    expect(
      await screen.findByText('« Bank 5 » a été créée à partir de « Aquazone » dans Aquanode.'),
    ).toBeTruthy()
  })

  it('remembers the bank chosen in each collection while the dialog is open', async () => {
    const { user } = renderDialog()
    await toCatalogScreen(user)

    await user.click(screen.getByRole('radio', { name: 'Factory' }))
    await user.click(screen.getByRole('radio', { name: 'ROM1B Keyboard & Plucked' }))
    await user.click(screen.getByRole('radio', { name: 'mene311' }))
    await user.click(screen.getByRole('radio', { name: 'Factory' }))

    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'ROM1B Keyboard & Plucked' }).checked,
    ).toBe(true)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'ROM1A Master' }).checked).toBe(
      false,
    )
  })

  it('keeps the chosen bank when going back to the title and on again', async () => {
    const { user } = renderDialog()
    await toCatalogScreen(user)
    await user.click(screen.getByRole('radio', { name: 'Factory' }))
    await user.click(screen.getByRole('radio', { name: 'ROM1B Keyboard & Plucked' }))

    await user.click(backButton())
    await user.click(backButton())
    await user.click(nextButton())
    await user.click(nextButton())

    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'ROM1B Keyboard & Plucked' }).checked,
    ).toBe(true)
  })

  it('explains a catalog bank that could not be fetched', async () => {
    vi.mocked(loadDx7CatalogBank).mockRejectedValue(new Dx7CatalogBankUnavailableError('ROM1A'))
    const { addBank, user } = renderDialog()
    await toCatalogScreen(user)

    await user.click(createButton())

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(english.banks.catalogUnavailable)
    expect(addBank).not.toHaveBeenCalled()
  })

  it('shows the translated fallback for an unexpected failure', async () => {
    vi.mocked(loadDx7CatalogBank).mockRejectedValue(new Error('Unexpected browser failure'))
    const { user } = renderDialog()
    await toCatalogScreen(user)

    await user.click(createButton())

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('The bank could not be created.')
    expect(alert.textContent).not.toContain('Unexpected browser failure')
  })

  it('stays open on Escape and locks its controls while the bank is loading', async () => {
    vi.mocked(loadDx7CatalogBank).mockReturnValue(new Promise(() => {}))
    const { onClose, user } = renderDialog()
    await toCatalogScreen(user)

    await user.click(createButton())
    const dialog = screen.getByRole('dialog')
    const cancel = new Event('cancel', { cancelable: true })
    dialog.dispatchEvent(cancel)

    expect(cancel.defaultPrevented).toBe(true)
    expect(within(dialog).getByRole('button', { name: 'Close' }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(within(dialog).getByRole('button', { name: 'Back' }).hasAttribute('disabled')).toBe(true)
    expect(within(dialog).getByRole('button', { name: 'Creating…' })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not move on without a bank letter to put the new bank in', () => {
    renderDialog(null)

    expect(nextButton().hasAttribute('disabled')).toBe(true)
  })
})

describe('AddWorkspaceBankDialog creating a bank from a file', () => {
  it('waits for a file before moving on', async () => {
    const { user } = renderDialog()
    await toFileScreen(user)

    expect(nextButton().hasAttribute('disabled')).toBe(true)
  })

  it('creates the bank from an uploaded DX7 bank file', async () => {
    const { addBank, onCreated, user } = renderDialog()
    await toFileScreen(user)

    await user.upload(
      screen.getByLabelText('Choose a DX7 SysEx file'),
      syxFile(makeDx7BankFile(fileVoices)),
    )
    await vi.waitFor(() => expect(createButton()).toHaveProperty('disabled', false))
    await user.click(createButton())

    expect(addBank).toHaveBeenCalledWith('E', 'Bank 5', '', fileVoices)
    expect(onCreated).toHaveBeenCalledWith('E')
  })

  it('names the file the patches came from in the toast', async () => {
    const { user } = renderDialog()
    await toFileScreen(user)

    await user.upload(
      screen.getByLabelText('Choose a DX7 SysEx file'),
      syxFile(makeDx7BankFile(fileVoices), 'leads.syx'),
    )
    await vi.waitFor(() => expect(createButton()).toHaveProperty('disabled', false))
    await user.click(createButton())

    expect(await screen.findByText('Created “Bank 5” from the file “leads.syx”.')).toBeTruthy()
  })

  it('names the bank in a joined file in the toast', async () => {
    const { user } = renderDialog()
    const joined = new File([makeDx7BankFile(fileVoices), makeDx7BankFile(fileVoices)], 'set.syx')
    await toFileScreen(user)

    await user.upload(screen.getByLabelText('Choose a DX7 SysEx file'), joined)
    await vi.waitFor(() => expect(nextButton()).toHaveProperty('disabled', false))
    await user.click(nextButton())
    await user.click(await screen.findByRole('radio', { name: /^Bank 2: / }))
    await user.click(createButton())

    expect(
      await screen.findByText('Created “Bank 5” from bank 2 of the file “set.syx”.'),
    ).toBeTruthy()
  })

  it('asks which bank to use in a file that joins several, then creates it', async () => {
    const { addBank, user } = renderDialog()
    const otherVoices = makeDemoVoices().map((voice, index) =>
      index === 0 ? updateDx7VoiceName(voice, 'SECOND') : voice,
    )
    const joined = new File([makeDx7BankFile(fileVoices), makeDx7BankFile(otherVoices)], 'set.syx')
    await toFileScreen(user)

    await user.upload(screen.getByLabelText('Choose a DX7 SysEx file'), joined)
    await vi.waitFor(() => expect(nextButton()).toHaveProperty('disabled', false))
    expect(screen.queryByRole('button', { name: 'Create bank' })).toBeNull()
    await user.click(nextButton())
    await user.click(await screen.findByRole('radio', { name: /^Bank 2: SECOND, / }))
    await user.click(createButton())

    expect(addBank).toHaveBeenCalledWith('E', 'Bank 5', '', otherVoices)
  })

  it('shows no bank choice for a file holding one bank', async () => {
    const { user } = renderDialog()
    await toFileScreen(user)

    await user.upload(
      screen.getByLabelText('Choose a DX7 SysEx file'),
      syxFile(makeDx7BankFile(fileVoices)),
    )

    await vi.waitFor(() => expect(createButton()).toHaveProperty('disabled', false))
    expect(screen.queryByRole('group', { name: 'Banks in this file' })).toBeNull()
  })

  it('explains a file of the wrong size in the interface language and stays on the file', async () => {
    await setLocale('fr')
    const { addBank, onClose, user } = renderDialog()
    await user.click(screen.getByRole('button', { name: french.banks.wizardNext }))
    await user.click(screen.getByRole('radio', { name: french.banks.uploadSource }))
    await user.click(screen.getByRole('button', { name: french.banks.wizardNext }))

    await user.upload(
      screen.getByLabelText(french.banks.chooseSysexFile),
      syxFile(new Uint8Array(12)),
    )

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(french.banks.fileErrors.size.split('{{')[0])
    expect(alert.textContent).toContain('12')
    expect(screen.getByRole('button', { name: french.banks.wizardNext })).toHaveProperty(
      'disabled',
      true,
    )
    expect(addBank).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('clears an error about the file when going back', async () => {
    const { user } = renderDialog()
    await toFileScreen(user)
    await user.upload(screen.getByLabelText('Choose a DX7 SysEx file'), syxFile(new Uint8Array(12)))
    await screen.findByRole('alert')

    await user.click(backButton())

    expect(screen.queryByRole('alert')).toBeNull()
  })
})
