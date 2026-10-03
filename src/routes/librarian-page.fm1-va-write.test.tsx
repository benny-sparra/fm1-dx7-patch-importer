// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import type { Fm1Firmware } from '@/lib/fm1-firmware'
import { emptyPatchLibrary, importVoices, makeDemoVoices } from '@/lib/patch-library'
import { makeLibrarianLibrary, makeLibrarianMidi } from '@/test/librarian-fakes'

import { LibrarianPage } from './librarian-page'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(cleanup)

function renderPage(firmware: Fm1Firmware, midi: Partial<LibrarianMidi> = {}) {
  const workspace = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
  const library = makeLibrarianLibrary({
    ...workspace,
    getBankVoices: vi.fn(() => makeDemoVoices()),
    hasDamagedNamedBanks: false,
    namedBanks: [],
    namedBanksLoadFailed: false,
    namedBanksLoading: false,
    patches: [],
  })
  render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={makeLibrarianMidi({ firmware, ...midi })}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={vi.fn()}
      />
    </ToastProvider>,
  )
  return { user: userEvent.setup() }
}

type LibrarianMidi = ReturnType<typeof makeLibrarianMidi>

const writeItem = () => screen.queryByRole('button', { name: 'Write patches to the FM1…' })

describe('LibrarianPage reading and writing an FM1 on Baud Girl’s firmware', () => {
  it('offers reading and writing the FM1 under Baud Girl’s name from FM-1_079', async () => {
    const { user } = renderPage({ identity: 'FM-1_079', kind: 'fm1-va' })

    await user.click(screen.getByTitle('Library actions'))

    const group = screen.getByRole('group', { name: 'Baud Girl (FM-1+VA)' })
    expect(
      within(group)
        .getAllByRole('button')
        .map(({ textContent }) => textContent),
    ).toEqual(['Read presets from the FM1…', 'Write patches to the FM1…'])
  })

  it('opens the read from the FM1, which starts by itself', async () => {
    const { user } = renderPage({ identity: 'FM-1_093', kind: 'fm1-va' })
    await user.click(screen.getByTitle('Library actions'))

    await user.click(screen.getByRole('button', { name: 'Read presets from the FM1…' }))

    expect(await screen.findByRole('dialog', { name: 'Read presets from the FM1' })).toBeTruthy()
  })

  it('offers no read or write on an earlier release, on M-VAVE’s firmware, or before the FM1 answers', async () => {
    const firmwares: Fm1Firmware[] = [
      { identity: 'FM-1_078', kind: 'fm1-va' },
      { identity: 'FM-1_015', kind: 'mvave' },
      { kind: 'checking' },
    ]
    for (const firmware of firmwares) {
      const { user } = renderPage(firmware)
      await user.click(screen.getByTitle('Library actions'))

      expect(writeItem()).toBeNull()
      expect(screen.queryByRole('group', { name: 'Baud Girl (FM-1+VA)' })).toBeNull()
      cleanup()
    }
  })

  it('opens the write, which says how to let it read the FM1 when it cannot', async () => {
    const { user } = renderPage({ identity: 'FM-1_093', kind: 'fm1-va' })
    await user.click(screen.getByTitle('Library actions'))

    await user.click(writeItem() as HTMLElement)

    expect(await screen.findByRole('dialog', { name: 'Write patches to the FM1' })).toBeTruthy()
    expect(
      await screen.findByText(/^To read the presets from the FM1, choose it as the MIDI output/),
    ).toBeTruthy()
  })

  it('sends the selected bank by writing its presets from FM-1_079', async () => {
    const sendBank = vi.fn<LibrarianMidi['sendBank']>()
    const { user } = renderPage(
      { identity: 'FM-1_079', kind: 'fm1-va' },
      { hasMidiOutput: true, sendBank, sysexAvailable: true },
    )

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    expect(await screen.findByRole('dialog', { name: 'Send Bank 1 to the FM1' })).toBeTruthy()
    expect(
      screen.queryByRole('dialog', { name: 'Choose the destination bank on your FM1' }),
    ).toBeNull()
    expect(sendBank).not.toHaveBeenCalled()
  })

  it('sends the bank as a DX7 bank, with the FM1’s own instructions, before FM-1_079', async () => {
    const { user } = renderPage(
      { identity: 'FM-1_078', kind: 'fm1-va' },
      { hasMidiOutput: true, sysexAvailable: true },
    )

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    expect(
      screen.getByRole('dialog', { name: 'Choose the destination bank on your FM1' }),
    ).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Send Bank 1 to the FM1' })).toBeNull()
  })
})
