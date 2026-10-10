// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { CopyPatchDialog } from '@/components/patches/copy-patch-dialog'
import type { Patch } from '@/data/patches'
import type { PatchLibrary } from '@/hooks/use-patch-library'
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

afterEach(async () => {
  cleanup()
  await setLocale('en-GB')
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
  initialBank,
  loadedBanks = ['A', 'B'],
  swapVoices,
}: {
  copyVoice?: PatchLibrary['copyVoice']
  initialBank?: string
  loadedBanks?: string[]
  swapVoices?: PatchLibrary['swapVoices']
} = {}) {
  const onClose = vi.fn()
  const onCopied = vi.fn<Parameters<typeof CopyPatchDialog>[0]['onCopied']>()
  const onSwapped = vi.fn<NonNullable<Parameters<typeof CopyPatchDialog>[0]['onSwapped']>>()
  const library = {
    bankNames: { B: 'Keys' },
    loadedBanks,
    patches,
    workspaceBanks: ['A', 'B', 'C'],
  }
  render(
    <CopyPatchDialog
      initialBank={initialBank}
      library={library}
      onClose={onClose}
      onCopy={(bank, number) => copyVoice(alpha.id, bank, number)}
      onCopied={onCopied}
      onSwap={swapVoices && ((bank, number) => swapVoices(alpha.id, bank, number))}
      onSwapped={onSwapped}
      source={alpha}
    />,
  )
  return {
    copyVoice,
    dialog: screen.getByRole('dialog'),
    onClose,
    onCopied,
    onSwapped,
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

  it('opens on the bank it is given, such as a tab the sound was dropped on', () => {
    renderDialog({ initialBank: 'A' })

    expect(pressed('A — Bank 1')).toBe(true)
    // The sound's own slot cannot take the copy, so the choice steps past it.
    expect(screen.getByRole('button', { name: 'Replace A02' })).toBeTruthy()
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
      'That bank is no longer available. Close this dialog and try again.',
    )
    expect((dialog as HTMLDialogElement).open).toBe(true)
    expect(onCopied).not.toHaveBeenCalled()
  })
})

describe('CopyPatchDialog swapping two patches', () => {
  it('offers no swap unless it is given one', () => {
    renderDialog()

    expect(screen.queryByRole('button', { name: /^Swap/ })).toBeNull()
  })

  it('offers to swap with the chosen slot, saying where its sound goes', () => {
    renderDialog({ swapVoices: vi.fn<PatchLibrary['swapVoices']>(() => null) })

    expect(screen.getByRole('button', { name: 'Swap with B01' })).toBeTruthy()
    expect(
      screen.getByRole('dialog', {
        description:
          'This replaces “Beta Bass” in B01. You can undo this action. To keep “Beta Bass”, swap instead: it moves to A01.',
      }),
    ).toBeTruthy()
  })

  it('swaps with the slot chosen in the grid, closes, and reports the change', async () => {
    const changed = { workspaceBanks: ['A', 'B', 'C'] } as unknown as PatchLibrarySnapshot
    const swapVoices = vi.fn<PatchLibrary['swapVoices']>(() => changed)
    const { copyVoice, dialog, onClose, onSwapped, user } = renderDialog({ swapVoices })

    await user.click(screen.getByRole('button', { name: 'B02 Beta Brass' }))
    await user.click(screen.getByRole('button', { name: 'Swap with B02' }))

    expect(swapVoices).toHaveBeenCalledExactlyOnceWith('bank-A-1', 'B', 2)
    expect(copyVoice).not.toHaveBeenCalled()
    expect(onSwapped).toHaveBeenCalledExactlyOnceWith(patches[4], changed)
    expect((dialog as HTMLDialogElement).open).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('explains a failed swap in translated text and stays open', async () => {
    const swapVoices = vi.fn<PatchLibrary['swapVoices']>(() => {
      throw new Error('storage exploded')
    })
    const { dialog, onSwapped, user } = renderDialog({ swapVoices })

    await user.click(within(dialog).getByRole('button', { name: 'Swap with B01' }))

    expect(within(dialog).getByRole('alert').textContent).toBe('The patches could not be swapped.')
    expect((dialog as HTMLDialogElement).open).toBe(true)
    expect(onSwapped).not.toHaveBeenCalled()
  })

  it('names both slots in German', async () => {
    await setLocale('de')
    renderDialog({ swapVoices: vi.fn<PatchLibrary['swapVoices']>(() => null) })

    expect(screen.getByRole('button', { name: 'Mit B01 tauschen' })).toBeTruthy()
    expect(
      screen.getByText('Um „Beta Bass“ zu behalten, tausche stattdessen: Er kommt nach A01.'),
    ).toBeTruthy()
  })
})

describe('CopyPatchDialog with a sound from outside the workspace', () => {
  const external = { name: 'BRASS 1', number: 1, origin: '01 BRASS 1 · ROM1A Master' }

  function renderExternal({ opensEditor = false } = {}) {
    const onCopy = vi.fn(() => null)
    render(
      <CopyPatchDialog
        library={{
          bankNames: { B: 'Keys' },
          loadedBanks: ['A', 'B'],
          patches,
          workspaceBanks: ['A', 'B', 'C'],
        }}
        onClose={vi.fn()}
        onCopy={onCopy}
        onCopied={vi.fn()}
        onSwap={vi.fn(() => null)}
        opensEditor={opensEditor}
        source={external}
      />,
    )
    return { onCopy, user: userEvent.setup() }
  }

  it('starts on its own slot number in the first bank that holds sounds', () => {
    renderExternal()

    expect(pressed('A — Bank 1')).toBe(true)
    expect(screen.getByRole('button', { name: 'Replace A01' })).toBeTruthy()
  })

  it('shows where the sound comes from on the readout', () => {
    renderExternal()

    expect(
      screen.getByText('A01 Alpha Piano', { selector: '.copy-readout' }).parentElement?.textContent,
    ).toContain('◂ 01 BRASS 1 · ROM1A Master')
  })

  it('explains that editing needs a copy when it will open the editor', () => {
    renderExternal({ opensEditor: true })

    expect(
      screen.getByRole('dialog', {
        description:
          'To edit this patch, copy it into one of your banks. This replaces “Alpha Piano” in A01. You can undo this action.',
      }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Replace A01 and edit' })).toBeTruthy()
  })

  it('offers no swap, since the sound has no slot to take the other one', () => {
    renderExternal()

    expect(screen.queryByRole('button', { name: /^Swap/ })).toBeNull()
  })

  it('copies over the chosen slot through the action it was given', async () => {
    const { onCopy, user } = renderExternal()

    await user.click(screen.getByRole('button', { name: 'Replace A01' }))

    expect(onCopy).toHaveBeenCalledExactlyOnceWith('A', 1)
  })
})
