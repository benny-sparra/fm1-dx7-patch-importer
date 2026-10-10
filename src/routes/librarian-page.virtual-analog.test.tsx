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
  return { library, midi, user: userEvent.setup() }
}

const virtualAnalogSlot = () => screen.getByRole('button', { name: 'Send VOICE 97 to FM1' })

describe('LibrarianPage with a Virtual Analog preset, on M-VAVE’s firmware', () => {
  it('marks the slot as a Virtual Analog preset', () => {
    renderPage()

    const card = virtualAnalogSlot().parentElement as HTMLElement
    expect(within(card).getByText('Virtual Analogue preset')).toBeTruthy()
  })

  it('offers editing and copying the slot, but not downloading it as a DX7 patch', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'Actions for VOICE 97' }))

    expect(screen.getByRole('menuitem', { name: 'Copy to…' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: /Download/ })).toBeNull()
  })

  it('says before sending that the bank’s Virtual Analog preset becomes INIT VOICE', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    const dialog = screen.getByRole('dialog', { name: 'Choose the destination bank on your FM1' })
    expect(
      within(dialog).getByText(
        'A DX7 bank has no place for a Virtual Analogue or 8-Bit preset, so this bank’s one is sent as INIT VOICE.',
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
      await screen.findByText(
        /was sent, with INIT VOICE in place of its Virtual Analogue or 8-Bit preset/,
      ),
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
        'Downloading “Bank 1”, with INIT VOICE in place of its Virtual Analogue or 8-Bit preset.',
      ),
    ).toBeTruthy()
  })

  it('names the INIT VOICE in the interface language before sending', async () => {
    await setLocale('de')
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'An FM1 senden' }))

    expect(
      screen.getByText(
        'Eine DX7-Bank hat keinen Platz für ein Virtual-Analog- oder 8-Bit-Preset, darum wird das dieser Bank als INIT VOICE gesendet.',
      ),
    ).toBeTruthy()
  })
})

const baudGirl: Fm1Firmware = { identity: 'FM-1_093', kind: 'fm1-va' }
/** The card of the slot whose play button is named for `name`. */
const cardOf = (name: string) =>
  screen.getByRole('button', { name: `Send ${name} to FM1` }).parentElement as HTMLElement

/** The letters of the engine tag between a card's slot code and name, if it shows one. */
const engineTagOf = (name: string) =>
  cardOf(name).querySelector(':scope > [aria-hidden="true"][translate="no"]')?.textContent

describe('LibrarianPage engine marks', () => {
  it('marks each patch with its engine while the FM1 runs Baud Girl’s firmware', () => {
    renderPage(baudGirl)

    expect(within(cardOf('VOICE 97')).getByText('Virtual Analogue preset')).toBeTruthy()
    expect(engineTagOf('VOICE 97')).toBe('VA')
    expect(within(cardOf('E.PIANO1')).getByText('FM patch')).toBeTruthy()
    expect(engineTagOf('E.PIANO1')).toBe('FM')
  })

  it('names each patch’s engine above what clicking it does, in its tooltip', () => {
    renderPage(baudGirl)

    expect(screen.getByRole('button', { name: 'Send E.PIANO1 to FM1' }).title).toBe(
      'FM patch\nClick to play E.PIANO1 on the FM1; double-click to edit',
    )
    expect(virtualAnalogSlot().title).toBe(
      'Virtual Analogue preset\nClick to select VOICE 97 on the FM1, which plays the Virtual Analogue preset stored there',
    )
  })

  it('names the engine in the tooltip in the interface language', async () => {
    await setLocale('de')
    renderPage(baudGirl)

    expect(screen.getByRole('button', { name: 'E.PIANO1 an FM1 senden' }).title).toMatch(
      /^FM-Sound\n/,
    )
  })

  it('leaves the engine out of an FM patch’s tooltip on other firmware', () => {
    renderPage()

    expect(screen.getByRole('button', { name: 'Send E.PIANO1 to FM1' }).title).toBe(
      'Click to play E.PIANO1 on the FM1; double-click to edit',
    )
  })

  it('marks only the Virtual Analog patch on other firmware', () => {
    renderPage()

    expect(engineTagOf('VOICE 97')).toBe('VA')
    expect(within(cardOf('E.PIANO1')).queryByText('FM patch')).toBeNull()
    expect(engineTagOf('E.PIANO1')).toBeUndefined()
  })
})

describe('LibrarianPage changing a Virtual Analog patch to FM', () => {
  it('offers the change on a Virtual Analog patch only', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'Actions for E.PIANO1' }))
    expect(screen.queryByRole('menuitem', { name: 'Change to FM…' })).toBeNull()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Actions for VOICE 97' }))

    expect(screen.getByRole('menuitem', { name: 'Change to FM…' })).toBeTruthy()
  })

  it('replaces it with INIT VOICE under the name typed, keeping its effects, with Undo', async () => {
    const { library, user } = renderPage()
    vi.mocked(library.replaceVoice).mockReturnValue(workspace())
    await user.click(screen.getByRole('button', { name: 'Actions for VOICE 97' }))
    await user.click(screen.getByRole('menuitem', { name: 'Change to FM…' }))

    const dialog = await screen.findByRole('dialog', { name: 'Change A03 “VOICE 97” to FM?' })
    const name = within(dialog).getByRole('textbox', { name: 'Name' })
    await user.clear(name)
    await user.type(name, 'NEW FM')
    await user.click(within(dialog).getByRole('button', { name: 'Change to FM' }))

    const [bank, slot, voice, effects] = vi.mocked(library.replaceVoice).mock.calls[0]
    expect([bank, slot, voice.name]).toEqual(['A', 3, 'NEW FM'])
    expect(effects).toBe(library.effects['bank-A-3'])
    expect(await screen.findByText('Changed A03 to FM as “NEW FM”.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
  })

  it('names the slot it changes in the interface language', async () => {
    await setLocale('de')
    const { user } = renderPage()
    await user.click(screen.getByRole('button', { name: 'Aktionen für VOICE 97' }))

    await user.click(screen.getByRole('menuitem', { name: 'In FM umwandeln…' }))

    expect(
      await screen.findByRole('dialog', { name: 'A03 „VOICE 97“ in FM umwandeln?' }),
    ).toBeTruthy()
  })
})
