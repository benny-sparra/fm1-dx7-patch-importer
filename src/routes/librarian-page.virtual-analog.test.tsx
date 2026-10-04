// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { parseDx7Bank, type Dx7Voice } from '@/lib/dx7'
import type { Fm1Firmware } from '@/lib/fm1-firmware'
import {
  emptyPatchLibrary,
  getBankVoices,
  importFetchedBanks,
  importVoices,
  makeDemoVoices,
  makePatches,
} from '@/lib/patch-library'
import {
  capturedVirtualAnalogRecord,
  virtualAnalogVoiceBeyondDx7Ranges,
} from '@/test/fm1-va-virtual-analog'
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

let createObjectURL: ReturnType<typeof vi.fn<(blob: Blob) => string>>

beforeEach(() => {
  createObjectURL = vi.fn((_blob: Blob) => 'blob:bank')
  Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(async () => {
  cleanup()
  sessionStorage.clear()
  vi.restoreAllMocks()
  await setLocale('en-GB')
})

const mvave: Fm1Firmware = { identity: 'FM-1_015', kind: 'mvave' }

/** Bank A holds the demo voices, with the Virtual Analog preset 097 read from the FM1 in A3. */
function workspace() {
  const sounds = Array.from({ length: 32 }, (_, index) =>
    index === 2
      ? {
          record: capturedVirtualAnalogRecord(),
          virtualAnalog: virtualAnalogVoiceBeyondDx7Ranges(),
        }
      : null,
  )
  return importFetchedBanks(importVoices(emptyPatchLibrary(['A']), 'A', makeDemoVoices()), [
    { bank: 'A', sounds },
  ])
}

/** The librarian on an FM1 running `firmware`, with the Virtual Analog preset in A3. */
function renderPage(firmware: Fm1Firmware = mvave) {
  const snapshot = workspace()
  const library = makeLibrarianLibrary({
    ...snapshot,
    getBankVoices: (bank: string, initVoice?: Dx7Voice) => getBankVoices(snapshot, bank, initVoice),
    patches: makePatches(snapshot),
  })
  const midi = makeLibrarianMidi({
    firmware,
    hasMidiOutput: true,
    sendBank: vi.fn(async () => ({ ok: true }) as const),
    sysexAvailable: true,
  })
  render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={midi}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={vi.fn()}
      />
    </ToastProvider>,
  )
  return { midi, user: userEvent.setup() }
}

const virtualAnalogSlot = () => screen.getByRole('button', { name: 'Send VOICE 97 to FM1' })

describe('LibrarianPage with a Virtual Analog preset, on M-VAVE’s firmware', () => {
  it('marks the slot as a Virtual Analog preset', () => {
    renderPage()

    const card = virtualAnalogSlot().parentElement as HTMLElement
    expect(within(card).getByText('Virtual Analog preset')).toBeTruthy()
    expect(within(card).getByText('VA')).toBeTruthy()
  })

  it('offers copying the slot, but not editing it or downloading it as a DX7 patch', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'Actions for VOICE 97' }))

    expect(screen.getByRole('menuitem', { name: 'Copy to…' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: /Download/ })).toBeNull()
  })

  it('says before sending that the bank’s Virtual Analog preset becomes INIT VOICE', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    const dialog = screen.getByRole('dialog', { name: 'Choose the destination bank on your FM1' })
    expect(
      within(dialog).getByText(
        'A DX7 bank has no place for a Virtual Analog preset, so this bank’s one is sent as INIT VOICE.',
      ),
    ).toBeTruthy()
  })

  it('sends a DX7 bank with INIT VOICE in the Virtual Analog slot, and says so', async () => {
    const { midi, user } = renderPage()
    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Send to FM1' }),
    )

    await waitFor(() => expect(midi.sendBank).toHaveBeenCalledOnce())
    const [, voices] = vi.mocked(midi.sendBank).mock.calls[0]
    expect(voices).toHaveLength(32)
    expect(voices[2].name).toBe('INIT VOICE')
    expect(voices[3]).toEqual(workspace().voices['bank-A-4'])
    expect(
      await screen.findByText(/was sent, with INIT VOICE in place of its Virtual Analog preset/),
    ).toBeTruthy()
  })

  it('downloads the bank as a DX7 file with INIT VOICE in the Virtual Analog slot', async () => {
    const { user } = renderPage()
    await user.click(screen.getAllByTitle('Actions for Bank 1')[0])

    await user.click(screen.getAllByRole('button', { name: 'Download this bank' })[0])

    await waitFor(() => expect(createObjectURL).toHaveBeenCalledOnce())
    const file = await createObjectURL.mock.calls[0][0].arrayBuffer()
    expect(parseDx7Bank(file)[2].name).toBe('INIT VOICE')
    expect(
      await screen.findByText(
        'Downloading “Bank 1”, with INIT VOICE in place of its Virtual Analog preset.',
      ),
    ).toBeTruthy()
  })

  it('names the INIT VOICE in the interface language before sending', async () => {
    await setLocale('de')
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'An FM1 senden' }))

    expect(
      screen.getByText(
        'Eine DX7-Bank hat keinen Platz für ein Virtual-Analog-Preset, darum wird das dieser Bank als INIT VOICE gesendet.',
      ),
    ).toBeTruthy()
  })
})
