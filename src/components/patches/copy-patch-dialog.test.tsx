// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { CopyPatchDialog } from '@/components/patches/copy-patch-dialog'
import { type Patch } from '@/data/patches'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { type PatchLibrarySnapshot, WorkspaceBankUnavailableError } from '@/lib/patch-library'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(() => {
  cleanup()
})

function slot(bank: string, number: number, name: string): Patch {
  return { bank, family: 'DX7', id: `bank-${bank}-${number}`, name, number }
}

const alpha = slot('A', 1, 'Alpha Piano')
const patches = [
  alpha,
  slot('A', 2, 'Alpha Organ'),
  slot('B', 1, 'Beta Bass'),
  slot('B', 2, 'Beta Brass'),
  slot('C', 1, 'Empty'),
]

function renderDialog({
  copyVoice = vi.fn<PatchLibrary['copyVoice']>(() => null),
  loadedBanks = ['A', 'B'],
  onClose = vi.fn(),
}: {
  copyVoice?: PatchLibrary['copyVoice']
  loadedBanks?: string[]
  onClose?: () => void
} = {}) {
  const onCopied = vi.fn<Parameters<typeof CopyPatchDialog>[0]['onCopied']>()
  const library = {
    bankNames: { B: 'Keys' },
    copyVoice,
    loadedBanks,
    patches,
    workspaceBanks: ['A', 'B', 'C'],
  } as unknown as PatchLibrary
  render(<CopyPatchDialog library={library} onClose={onClose} onCopied={onCopied} source={alpha} />)
  return {
    copyVoice,
    dialog: screen.getByRole('dialog'),
    onClose,
    onCopied,
    user: userEvent.setup(),
  }
}

describe('CopyPatchDialog', () => {
  it('opens as soon as it is shown, with no Cancel button beside its close control', () => {
    const { dialog } = renderDialog()

    expect((dialog as HTMLDialogElement).open).toBe(true)
    expect(within(dialog).queryByRole('button', { name: 'Cancel' })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeTruthy()
  })

  it('starts on the same slot in another loaded bank and names the sound it replaces', () => {
    const { dialog } = renderDialog()

    expect(
      (within(dialog).getByRole('combobox', { name: 'Target bank' }) as HTMLSelectElement).value,
    ).toBe('B')
    expect(within(dialog).getByRole('button', { name: 'Replace B01' })).toBeTruthy()
    expect(
      screen.getByRole('dialog', {
        description: 'This replaces “Beta Bass” in B01. You can undo this action.',
      }),
    ).toBeTruthy()
  })

  it('offers only banks that hold sounds', () => {
    const { dialog } = renderDialog()

    const options = within(within(dialog).getByRole('combobox', { name: 'Target bank' }))
      .getAllByRole('option')
      .map((option) => option.textContent)

    expect(options).toEqual(['A — Bank 1', 'B — Keys'])
  })

  it('copies over the chosen slot, closes, and reports the change', async () => {
    const changed = { workspaceBanks: ['A', 'B', 'C'] } as unknown as PatchLibrarySnapshot
    const copyVoice = vi.fn<PatchLibrary['copyVoice']>(() => changed)
    const { dialog, onClose, onCopied, user } = renderDialog({ copyVoice })

    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Target slot' }), '2')
    await user.click(within(dialog).getByRole('button', { name: 'Replace B02' }))

    expect(copyVoice).toHaveBeenCalledExactlyOnceWith('bank-A-1', 'B', 2)
    expect((dialog as HTMLDialogElement).open).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
    expect(onCopied).toHaveBeenCalledExactlyOnceWith(patches[3], changed)
  })

  it('starts on the next slot when the sound’s own bank is the only one with sounds', () => {
    const { dialog } = renderDialog({ loadedBanks: ['A'] })

    expect(within(dialog).getByRole('button', { name: 'Replace A02' })).toBeTruthy()
  })

  it('leaves the sound’s own slot out of the choices', async () => {
    const { dialog, user } = renderDialog()

    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Target bank' }), 'A')

    const slots = within(within(dialog).getByRole('combobox', { name: 'Target slot' }))
      .getAllByRole('option')
      .map((option) => option.textContent)
    expect(slots).toEqual(['A02 Alpha Organ'])
    expect(within(dialog).getByRole('button', { name: 'Replace A02' })).toBeTruthy()
  })

  it('explains a target bank that is no longer available in translated text', async () => {
    const copyVoice = vi.fn<PatchLibrary['copyVoice']>(() => {
      throw new WorkspaceBankUnavailableError()
    })
    const { dialog, onCopied, user } = renderDialog({ copyVoice })

    await user.click(within(dialog).getByRole('button', { name: 'Replace B01' }))

    expect(within(dialog).getByRole('alert').textContent).toBe(
      'That workspace bank is no longer available. Close this dialog and try again.',
    )
    expect((dialog as HTMLDialogElement).open).toBe(true)
    expect(onCopied).not.toHaveBeenCalled()
  })
})
