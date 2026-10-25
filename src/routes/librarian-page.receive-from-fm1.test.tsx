// @vitest-environment jsdom

import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { updateDx7VoiceName } from '@/lib/dx7'
import { makeDx7VoiceFile } from '@/lib/dx7-voice-file'
import { emptyPatchLibrary, makeDemoVoices } from '@/lib/patch-library'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import {
  makeLibrarianLibrary,
  makeLibrarianMidi,
  sendSlotName,
  slotMenuName,
} from '@/test/librarian-fakes'
import { stockV16BankExport } from '@/test/stock-v16-bank-export'

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

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const slotVoice = updateDx7VoiceName(makeDemoVoices()[0], 'ALPHA')
const sentVoice = updateDx7VoiceName(makeDemoVoices()[1], 'FROM DEXED')
const changed = emptyPatchLibrary()

function renderPage() {
  const ports = makeFakeFm1Ports()
  const library = makeLibrarianLibrary({
    bankDescriptions: {},
    bankNames: { A: 'Studio Favourites', B: 'Pads' },
    getBankVoices: vi.fn(() => []),
    importBank: vi.fn(() => changed),
    loadedBanks: ['A'],
    namedBanks: [],
    patches: [{ bank: 'A', family: 'DX7', id: 'bank-A-1', name: 'ALPHA', number: 1, program: 0 }],
    replaceVoice: vi.fn(() => changed),
    undoChange: vi.fn(),
    voices: { 'bank-A-1': slotVoice },
    workspaceBanks: ['A', 'B'],
  })
  const { inputs, selectedInputId } = makeFakeFm1Devices(ports)
  const midi = makeLibrarianMidi({
    inputs,
    midiAccess: true,
    selectedInputId,
    sysexAvailable: true,
  })
  const user = userEvent.setup()
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
  return { input: ports.input, library, ports, user }
}

async function openFromSlot() {
  const page = renderPage()
  await page.user.click(screen.getByRole('button', { name: slotMenuName('ALPHA') }))
  await page.user.click(screen.getByRole('menuitem', { name: 'Import patch…' }))
  await page.user.click(
    await screen.findByRole('button', { name: 'Receive over MIDI…' }, { timeout: 5000 }),
  )
  const dialog = await screen.findByRole('dialog', { name: 'Receive patches' })
  return { ...page, dialog }
}

const next = (dialog: HTMLElement) => within(dialog).getByRole('button', { name: 'Next' })

describe('LibrarianPage receiving over MIDI', () => {
  it('opens the wizard from a slot on the single-patch path', async () => {
    const { dialog } = await openFromSlot()

    expect(
      within(dialog).getByRole<HTMLInputElement>('radio', { name: 'One patch from another device' })
        .checked,
    ).toBe(true)
  })

  it('puts a received patch in the slot it was opened on, with Undo, sending nothing', async () => {
    const { dialog, input, library, ports, user } = await openFromSlot()
    await user.click(next(dialog))
    act(() => input.receive(makeDx7VoiceFile(sentVoice)))
    await user.click(next(dialog))
    await user.click(next(dialog))

    await user.click(within(dialog).getByRole('button', { name: 'Replace' }))

    expect(library.replaceVoice).toHaveBeenCalledExactlyOnceWith(
      'A',
      1,
      expect.objectContaining({ name: 'FROM DEXED' }),
    )
    expect(await screen.findByText('Replaced A01 with “FROM DEXED”.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(library.undoChange).toHaveBeenCalledExactlyOnceWith(changed)
    expect(ports.output.send).not.toHaveBeenCalled()
  })

  it('stops listening and returns focus to the slot once closed', async () => {
    const { dialog, input, user } = await openFromSlot()
    await user.click(next(dialog))
    // The page itself does not listen, so the dialog's is the one listener.
    const listener = input.addListener.mock.calls[0][1]

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(input.removeListener).toHaveBeenCalledWith('midimessage', listener)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: sendSlotName('ALPHA') }))
  })

  it('opens from a bank’s menu on Bank Export, to replace that bank', async () => {
    const { input, library, user } = renderPage()
    const menuToggle = screen.getAllByTitle('Actions for Studio Favourites')[0]
    await user.click(menuToggle)
    await user.click(
      within(menuToggle.closest('details')!).getByRole('button', {
        name: 'Receive from the FM1…',
      }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Receive patches' })
    expect(
      within(dialog).getByRole<HTMLInputElement>('radio', { name: 'An FM1 on M-VAVE’s V16' })
        .checked,
    ).toBe(true)
    await user.click(next(dialog))
    act(() => input.receive(stockV16BankExport()))
    await user.click(next(dialog))
    await user.click(next(dialog))

    await user.click(within(dialog).getByRole('button', { name: 'Replace' }))

    expect(library.importBank).toHaveBeenCalledExactlyOnceWith(
      'A',
      expect.arrayContaining([expect.objectContaining({ name: 'j.piano 7+' })]),
    )
    expect(await screen.findByText('Imported patches into “Studio Favourites”.')).toBeTruthy()
    expect(document.activeElement).toBe(menuToggle)
  })

  it('opens from Library actions and returns focus there when closed', async () => {
    const { user } = renderPage()
    const menuToggle = screen.getByTitle('Library actions')
    await user.click(menuToggle)
    await user.click(
      within(menuToggle.closest('details')!).getByRole('button', {
        name: 'Receive from the FM1…',
      }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Receive patches' })

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(document.activeElement).toBe(screen.getByTitle('Library actions'))
  })
})
