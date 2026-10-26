// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import type { Patch } from '@/data/patches'
import type { Fm1Firmware } from '@/lib/fm1-firmware'
import { assignVoicePreset, resetVoiceSetupForTests, setVoiceSetupEnabled } from '@/lib/voice-setup'
import {
  makeLibrarianLibrary,
  makeLibrarianMidi,
  sendSlotName,
  slotMenuName,
} from '@/test/librarian-fakes'

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

beforeEach(() => {
  localStorage.setItem('fm1-librarian-help-seen', 'true')
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  resetVoiceSetupForTests()
  vi.restoreAllMocks()
})

const v16: Fm1Firmware = { identity: 'FM-1_016', kind: 'mvave' }

const startingPatches: Patch[] = [
  { bank: 'A', family: 'DX7', id: 'bank-A-1', name: 'Alpha Piano', number: 1, program: 0 },
  { bank: 'A', family: 'DX7', id: 'bank-A-2', name: 'Alpha Organ', number: 2, program: 1 },
  { bank: 'E', family: 'DX7', id: 'bank-E-1', name: 'Echo Pad', number: 1 },
]

function renderPage({
  channel = 1,
  firmware = v16,
  onSelectPatch = vi.fn<(patch: Patch) => void>(),
}: {
  channel?: number
  firmware?: Fm1Firmware
  onSelectPatch?: (patch: Patch) => void
} = {}) {
  const copyVoice = vi.fn((sourceId: string, bank: string, number: number) => {
    void sourceId
    return { bank, number }
  })
  function Page() {
    const [patches, setPatches] = useState(startingPatches)
    return (
      <LibrarianPage
        activePatchId=""
        library={makeLibrarianLibrary({
          copyVoice: (sourceId, bank, number) => {
            copyVoice(sourceId, bank, number)
            const source = patches.find((patch) => patch.id === sourceId)
            // The slot keeps its id, as a slot's id is its place, and takes a new patch object.
            setPatches(
              patches.map((patch) =>
                patch.bank === bank && patch.number === number && source
                  ? { ...patch, name: source.name }
                  : patch,
              ),
            )
            return null
          },
          loadedBanks: ['A', 'E'],
          patches,
          workspaceBanks: ['A', 'E'],
        })}
        midi={makeLibrarianMidi({ channel, firmware })}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={onSelectPatch}
      />
    )
  }
  render(
    <ToastProvider>
      <Page />
    </ToastProvider>,
  )
  return { copyVoice, onSelectPatch, user: userEvent.setup() }
}

describe('LibrarianPage with V16’s Voices', () => {
  it('tags a slot with the Voices playing its preset', () => {
    setVoiceSetupEnabled(true)
    assignVoicePreset(0, 0)
    assignVoicePreset(2, 0)
    renderPage()

    const slot = screen.getByRole('button', { name: sendSlotName('Alpha Piano') })
    const cell = slot.parentElement as HTMLElement
    expect(within(cell).getByText('V1')).toBeTruthy()
    expect(within(cell).getByText('V3')).toBeTruthy()
    expect(document.getElementById(slot.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Played by Voice 1 and Voice 3',
    )
    expect(slot.title.split('\n')).toContain('Played by Voice 1 and Voice 3')
    expect(screen.getByRole('button', { name: sendSlotName('Alpha Organ') }).title).not.toContain(
      'Played by',
    )
  })

  it('tags no slot while the strip is off', () => {
    assignVoicePreset(0, 0)
    renderPage()

    expect(screen.queryByText('V1')).toBeNull()
  })

  it('copies a patch from beyond bank D into a slot in A–D and plays the copy there', async () => {
    setVoiceSetupEnabled(true)
    const { copyVoice, onSelectPatch, user } = renderPage()
    await user.click(screen.getByRole('button', { name: /^E — / }))

    await user.click(screen.getByRole('button', { name: slotMenuName('Echo Pad') }))
    await user.click(screen.getByRole('menuitem', { name: 'Copy into A–D and assign…' }))
    const dialog = await screen.findByRole('dialog')
    const banks = within(within(dialog).getByRole('group', { name: 'Bank' })).getAllByRole('button')
    expect(banks.map((bank) => bank.getAttribute('aria-label'))).toEqual(['A — Bank 1'])
    await user.click(within(dialog).getByRole('button', { name: 'A02 Alpha Organ' }))
    await user.click(within(dialog).getByRole('button', { name: 'Replace A02' }))

    expect(copyVoice).toHaveBeenCalledExactlyOnceWith('bank-E-1', 'A', 2)
    // The click that gives it to the Voice plays the copy, not the patch the slot held before.
    await waitFor(() =>
      expect(onSelectPatch).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ id: 'bank-A-2', name: 'Echo Pad', program: 1 }),
      ),
    )
  })

  it('offers the copy only beyond bank D, with the strip on and a Voice on the note channel', async () => {
    setVoiceSetupEnabled(true)
    const { user } = renderPage({ channel: 12 })
    await user.click(screen.getByRole('button', { name: slotMenuName('Alpha Piano') }))
    expect(screen.queryByRole('menuitem', { name: 'Copy into A–D and assign…' })).toBeNull()
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: /^E — / }))
    await user.click(screen.getByRole('button', { name: slotMenuName('Echo Pad') }))

    expect(screen.queryByRole('menuitem', { name: 'Copy into A–D and assign…' })).toBeNull()
  })
})
