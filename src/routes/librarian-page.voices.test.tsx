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
  onSendVoiceSetup = vi.fn(() => 0),
}: {
  channel?: number
  firmware?: Fm1Firmware
  onSelectPatch?: (patch: Patch) => void
  onSendVoiceSetup?: () => number
} = {}) {
  const copyVoice = vi.fn((sourceId: string, bank: string, number: number) => {
    void sourceId
    return { bank, number }
  })
  function Page() {
    const [patches, setPatches] = useState(startingPatches)
    const [noteChannel, setNoteChannel] = useState(channel)
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
        midi={makeLibrarianMidi({ channel: noteChannel, firmware, setChannel: setNoteChannel })}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={onSelectPatch}
        onSendVoiceSetup={onSendVoiceSetup}
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
  it('shows the Voice tabs on V16 with the Multitimbral mode switch off, and keeps them when it is switched on', async () => {
    const { user } = renderPage()
    const mode = screen.getByRole('switch', { name: 'Multitimbral mode' })
    expect(mode.getAttribute('aria-checked')).toBe('false')

    const strip = await screen.findByRole('group', { name: 'Voices 1–8' })
    expect(within(strip).getAllByRole('button')).toHaveLength(8)
    expect(screen.getByRole('button', { name: 'Voice actions' })).toBeTruthy()
    // The FM1 setup line belongs to the mode, so it waits for the switch.
    expect(screen.queryByText('Set up your FM1’s Voices first.')).toBeNull()

    await user.click(mode)

    expect(await screen.findByText('Set up your FM1’s Voices first.')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Voices 1–8' })).toBe(strip)
  })

  it('labels a Voice’s preset as its slot shows it, or by its slot code when no patch is there', () => {
    setVoiceSetupEnabled(true)
    assignVoicePreset(0, 0)
    assignVoicePreset(1, 127)
    renderPage()

    return screen.findByRole('group', { name: 'Voices 1–8' }).then((strip) => {
      const titles = within(strip)
        .getAllByRole('button')
        .map((button) => button.title)
      expect(titles.slice(0, 3)).toEqual([
        'Voice 1, Ch 1: A01 Alpha Piano, on',
        'Voice 2, Ch 2: D32, on',
        'Voice 3, Ch 3: No patch, on',
      ])
    })
  })

  it('offers no Multitimbral mode on firmware that plays one Voice, whatever was stored', () => {
    setVoiceSetupEnabled(true)
    for (const firmware of [
      { identity: 'FM-1_015', kind: 'mvave' },
      { identity: 'FM-1_097', kind: 'fm1-va' },
      { kind: 'checking' },
    ] as const satisfies readonly Fm1Firmware[]) {
      renderPage({ firmware })
      expect(screen.queryByRole('switch', { name: 'Multitimbral mode' })).toBeNull()
      expect(screen.queryByRole('group', { name: 'Voices 1–8' })).toBeNull()
      cleanup()
    }
  })

  it('tags a slot with the Voices playing its preset', () => {
    setVoiceSetupEnabled(true)
    assignVoicePreset(0, 0)
    assignVoicePreset(2, 0)
    renderPage()

    const slot = screen.getByRole('button', { name: sendSlotName('Alpha Piano') })
    // No tag is drawn on the card; the Voices are in its description and tooltip.
    expect(within(slot.parentElement as HTMLElement).queryByText('V1')).toBeNull()
    expect(document.getElementById(slot.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Played by Voice 1 and Voice 3',
    )
    expect(slot.title.split('\n')).toContain('Played by Voice 1 and Voice 3')
    expect(screen.getByRole('button', { name: sendSlotName('Alpha Organ') }).title).not.toContain(
      'Played by',
    )
  })

  it('lights the slot the aimed Voice plays, and none for a Voice with no patch', async () => {
    setVoiceSetupEnabled(true)
    assignVoicePreset(0, 0)
    assignVoicePreset(1, 1)
    const { user } = renderPage()
    const piano = screen.getByRole('button', { name: sendSlotName('Alpha Piano') })
    const organ = screen.getByRole('button', { name: sendSlotName('Alpha Organ') })
    expect(piano.getAttribute('aria-current')).toBe('true')
    expect(organ.getAttribute('aria-current')).toBeNull()

    await user.click(screen.getByRole('button', { name: /^Voice 2,/ }))
    expect(organ.getAttribute('aria-current')).toBe('true')
    expect(piano.getAttribute('aria-current')).toBeNull()

    await user.click(screen.getByRole('button', { name: /^Voice 3,/ }))
    expect(document.querySelector('[aria-current="true"]')).toBeNull()
  })

  it('lights a shared preset only for the aimed Voice, and the other is still named in its tooltip', async () => {
    setVoiceSetupEnabled(true)
    assignVoicePreset(0, 0)
    assignVoicePreset(1, 0)
    const { user } = renderPage()
    const piano = screen.getByRole('button', { name: sendSlotName('Alpha Piano') })
    expect(piano.title.split('\n')).toContain('Played by Voice 1 and Voice 2')
    await user.click(screen.getByRole('button', { name: /^Voice 3,/ }))
    expect(piano.getAttribute('aria-current')).toBeNull()
    await user.click(screen.getByRole('button', { name: /^Voice 2,/ }))
    expect(piano.getAttribute('aria-current')).toBe('true')
  })

  it('shows the bank holding a Voice’s patch when its tab is selected', async () => {
    setVoiceSetupEnabled(true)
    assignVoicePreset(1, 1)
    const { user } = renderPage()
    await user.click(screen.getByRole('button', { name: /^E — / }))
    expect(screen.queryByRole('button', { name: sendSlotName('Alpha Organ') })).toBeNull()

    await user.click(screen.getByRole('button', { name: /^Voice 2,/ }))

    expect(screen.getByRole('button', { name: sendSlotName('Alpha Organ') })).toBeTruthy()
  })

  it('leaves the bank alone when the Voice has no patch', async () => {
    setVoiceSetupEnabled(true)
    const { user } = renderPage()
    await user.click(screen.getByRole('button', { name: /^E — / }))

    await user.click(screen.getByRole('button', { name: /^Voice 2,/ }))

    expect(screen.getByRole('button', { name: sendSlotName('Echo Pad') })).toBeTruthy()
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
