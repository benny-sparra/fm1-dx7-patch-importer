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
import { capturedEightBitRecord, capturedEightBitVoice } from '@/test/fm1-va-eight-bit'
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
const baudGirl: Fm1Firmware = { identity: 'FM-1_097', kind: 'fm1-va' }

/** Bank A holds the demo voices, with the 8-Bit preset NES ROCK read from the FM1 in A3. */
function workspace() {
  const sounds = Array.from({ length: 32 }, (_, index) =>
    index === 2 ? { eightBit: capturedEightBitVoice(), record: capturedEightBitRecord() } : null,
  )
  return importFetchedBanks(importVoices(emptyPatchLibrary(['A']), 'A', makeDemoVoices()), [
    { bank: 'A', sounds },
  ])
}

/** The librarian on an FM1 running `firmware`, with the 8-Bit preset in A3. */
function renderPage(firmware: Fm1Firmware = mvave) {
  return renderPageWith(workspace(), firmware)
}

function renderPageWith(snapshot: ReturnType<typeof workspace>, firmware: Fm1Firmware = mvave) {
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
  const onEditPatch = vi.fn()
  render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={midi}
        onBankDeleted={vi.fn()}
        onEditPatch={onEditPatch}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={vi.fn()}
      />
    </ToastProvider>,
  )
  return { library, midi, onEditPatch, user: userEvent.setup() }
}

const eightBitSlot = () => screen.getByRole('button', { name: 'Send NES ROCK to FM1' })
const cardOf = (name: string) =>
  screen.getByRole('button', { name: `Send ${name} to FM1` }).parentElement as HTMLElement
const engineTagOf = (name: string) =>
  cardOf(name).querySelector(':scope > [aria-hidden="true"][translate="no"]')?.textContent

describe('LibrarianPage with an 8-Bit preset', () => {
  it('marks the slot as an 8-Bit preset, on any firmware', () => {
    renderPage()

    expect(within(cardOf('NES ROCK')).getByText('8-Bit preset')).toBeTruthy()
    expect(engineTagOf('NES ROCK')).toBe('8B')
  })

  it('names its engine and what clicking it does in its tooltip', () => {
    renderPage(baudGirl)

    expect(eightBitSlot().title).toBe(
      '8-Bit preset\nClick to select NES ROCK on the FM1, which plays the 8-Bit preset stored there',
    )
  })

  it('names its engine in the tooltip in the interface language', async () => {
    await setLocale('de')
    renderPage(baudGirl)

    expect(screen.getByRole('button', { name: 'NES ROCK an FM1 senden' }).title).toBe(
      '8-Bit-Preset\nKlicken, um NES ROCK auf dem FM1 auszuwählen; er spielt das dort gespeicherte 8-Bit-Preset',
    )
  })

  it('offers copying and downloading the slot, but not editing it', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'Actions for NES ROCK' }))

    expect(screen.getByRole('menuitem', { name: 'Copy to…' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Download patch' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Change to FM…' })).toBeNull()
  })

  it('downloads the patch as a Baud Girl presets file naming its own slot', async () => {
    const { user } = renderPage()
    await user.click(screen.getByRole('button', { name: 'Actions for NES ROCK' }))

    await user.click(screen.getByRole('menuitem', { name: 'Download patch' }))

    await waitFor(() => expect(createObjectURL).toHaveBeenCalledOnce())
    const file = new Uint8Array(await createObjectURL.mock.calls[0][0].arrayBuffer())
    expect(file).toHaveLength(231)
    expect(file[5]).toBe(2)
    expect(
      await screen.findByText('Downloading “NES ROCK” as a Baud Girl presets file.'),
    ).toBeTruthy()
  })

  it('explains in the interface language when the patch cannot be saved exactly', async () => {
    await setLocale('de')
    const snapshot = workspace()
    snapshot.eightBit['bank-A-3'][110] |= 0x60
    renderPageWith(snapshot)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Aktionen für NES ROCK' }))

    await user.click(screen.getByRole('menuitem', { name: 'Sound herunterladen' }))

    expect(
      await screen.findByText(
        '„NES ROCK“ lässt sich nicht exakt als Presets-Datei von Baud Girl speichern und wurde darum nicht heruntergeladen.',
      ),
    ).toBeTruthy()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('opens no editor when the slot is double-clicked', async () => {
    const { onEditPatch, user } = renderPage()

    await user.dblClick(eightBitSlot())

    expect(onEditPatch).not.toHaveBeenCalled()
  })

  it('has no heart, since Favourites holds only FM patches', () => {
    renderPage()

    expect(
      within(cardOf('NES ROCK')).queryByRole('button', { name: 'Favourite NES ROCK' }),
    ).toBeNull()
    expect(
      within(cardOf('E.PIANO1')).getByRole('button', { name: 'Favourite E.PIANO1' }),
    ).toBeTruthy()
  })

  it('sends a DX7 bank with INIT VOICE in the 8-Bit slot, and says so before and after', async () => {
    const { midi, user } = renderPage()
    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))
    const dialog = screen.getByRole('dialog', { name: 'Choose the destination bank on your FM1' })
    expect(
      within(dialog).getByText(
        'A DX7 bank has no place for a Virtual Analogue or 8-Bit preset, so this bank’s one is sent as INIT VOICE.',
      ),
    ).toBeTruthy()

    await user.click(within(dialog).getByRole('button', { name: 'Send to FM1' }))

    await waitFor(() => expect(midi.sendBank).toHaveBeenCalledOnce())
    const [, voices] = vi.mocked(midi.sendBank).mock.calls[0]
    expect(voices).toHaveLength(32)
    expect(voices[2].name).toBe('INIT VOICE')
    expect(
      await screen.findByText(
        /was sent, with INIT VOICE in place of its Virtual Analogue or 8-Bit preset/,
      ),
    ).toBeTruthy()
  })

  it('downloads the bank as a DX7 file with INIT VOICE in the 8-Bit slot', async () => {
    const { user } = renderPage()
    await user.click(screen.getAllByTitle('Actions for Bank 1')[0])

    await user.click(screen.getAllByRole('button', { name: 'Download this bank' })[0])

    await waitFor(() => expect(createObjectURL).toHaveBeenCalledOnce())
    const file = await createObjectURL.mock.calls[0][0].arrayBuffer()
    expect(parseDx7Bank(file)[2].name).toBe('INIT VOICE')
  })
})
