// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
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
  slot('A', 3, 'Alpha Bells'),
  slot('B', 1, 'Beta Bass'),
  slot('B', 2, 'Beta Brass'),
  slot('B', 3, 'Beta Strings'),
  slot('C', 1, 'Empty'),
]

function renderDialog({
  copyVoice = vi.fn<PatchLibrary['copyVoice']>(() => null),
  loadedBanks = ['A', 'B'],
}: {
  copyVoice?: PatchLibrary['copyVoice']
  loadedBanks?: string[]
} = {}) {
  const onClose = vi.fn()
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

const pressed = (name: string) =>
  screen.getByRole('button', { name }).getAttribute('aria-pressed') === 'true'

describe('CopyPatchDialog', () => {
  it('opens as soon as it is shown, with no Cancel button beside its close control', () => {
    const { dialog } = renderDialog()

    expect((dialog as HTMLDialogElement).open).toBe(true)
    expect(within(dialog).queryByRole('button', { name: 'Cancel' })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeTruthy()
  })

  it('starts on the same slot in another loaded bank and names the sound it replaces', () => {
    renderDialog()

    expect(pressed('B — Keys')).toBe(true)
    expect(pressed('B01 Beta Bass')).toBe(true)
    expect(screen.getByRole('button', { name: 'Replace B01' })).toBeTruthy()
    expect(
      screen.getByRole('dialog', {
        description: 'This replaces “Beta Bass” in B01. You can undo this action.',
      }),
    ).toBeTruthy()
  })

  it('shows the choice and both bank names on a readout hidden from assistive technology', async () => {
    const { user } = renderDialog()
    const readout = () => screen.getByText('B02 Beta Brass', { selector: '.copy-readout' })

    await user.click(screen.getByRole('button', { name: 'B02 Beta Brass' }))

    expect(readout().closest('[aria-hidden="true"]')).toBeTruthy()
    expect(readout().parentElement?.textContent).toContain('Keys')
    expect(readout().parentElement?.textContent).toContain('A01 Alpha Piano · Bank 1')
  })

  it('offers only banks that hold sounds', () => {
    renderDialog()

    const banks = within(screen.getByRole('group', { name: 'Bank' }))
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'))

    expect(banks).toEqual(['A — Bank 1', 'B — Keys'])
  })

  it('copies over the slot chosen in the grid, closes, and reports the change', async () => {
    const changed = { workspaceBanks: ['A', 'B', 'C'] } as unknown as PatchLibrarySnapshot
    const copyVoice = vi.fn<PatchLibrary['copyVoice']>(() => changed)
    const { dialog, onClose, onCopied, user } = renderDialog({ copyVoice })

    await user.click(screen.getByRole('button', { name: 'B02 Beta Brass' }))
    await user.click(screen.getByRole('button', { name: 'Replace B02' }))

    expect(copyVoice).toHaveBeenCalledExactlyOnceWith('bank-A-1', 'B', 2)
    expect(onCopied).toHaveBeenCalledExactlyOnceWith(patches[4], changed)
    expect((dialog as HTMLDialogElement).open).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('will not let the sound’s own slot be chosen, and steps past it when changing bank', async () => {
    const { user } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'A — Bank 1' }))

    expect(screen.getByRole('button', { name: 'A01 Alpha Piano' }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(pressed('A02 Alpha Organ')).toBe(true)
  })

  it('opens with focus on the chosen slot', async () => {
    renderDialog()

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'B01 Beta Bass' })),
    )
  })

  it('moves the choice and focus through the grid with the arrow keys', async () => {
    const { user } = renderDialog()

    // Opening moves focus on the next frame, so wait for it before pressing a key.
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'B01 Beta Bass' })),
    )
    await user.keyboard('{ArrowRight}')

    expect(pressed('B02 Beta Brass')).toBe(true)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'B02 Beta Brass' }))
  })

  it('starts on the next slot when the sound’s own bank is the only one with sounds', () => {
    renderDialog({ loadedBanks: ['A'] })

    expect(screen.getByRole('button', { name: 'Replace A02' })).toBeTruthy()
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
