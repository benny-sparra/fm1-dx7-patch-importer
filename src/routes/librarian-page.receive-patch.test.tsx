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
import { makeLibrarianLibrary, makeLibrarianMidi, slotMenuName } from '@/test/librarian-fakes'

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

async function openReceiveDialog() {
  const ports = makeFakeFm1Ports()
  const library = makeLibrarianLibrary({
    bankDescriptions: {},
    bankNames: { A: 'Studio Favourites' },
    getBankVoices: vi.fn(() => []),
    loadedBanks: ['A'],
    namedBanks: [],
    patches: [{ bank: 'A', family: 'DX7', id: 'bank-A-1', name: 'ALPHA', number: 1, program: 0 }],
    replaceVoice: vi.fn(() => changed),
    undoChange: vi.fn(),
    voices: { 'bank-A-1': slotVoice },
    workspaceBanks: ['A'],
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
  await user.click(screen.getByRole('button', { name: slotMenuName('ALPHA') }))
  await user.click(screen.getByRole('menuitem', { name: 'Receive patch…' }))
  const dialog = await screen.findByRole('dialog', { name: 'Receive a patch into A01 “ALPHA”' })
  return { dialog, input: ports.input, library, ports, user }
}

describe('LibrarianPage receiving a patch over MIDI', () => {
  it('sends nothing to the FM1 while it listens', async () => {
    const { ports } = await openReceiveDialog()

    expect(ports.output.send).not.toHaveBeenCalled()
  })

  it('puts the received patch in the slot once confirmed', async () => {
    const { dialog, input, library, user } = await openReceiveDialog()
    act(() => input.receive(makeDx7VoiceFile(sentVoice)))
    expect(library.replaceVoice).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Replace patch' }))

    expect(library.replaceVoice).toHaveBeenCalledExactlyOnceWith(
      'A',
      1,
      expect.objectContaining({ name: 'FROM DEXED' }),
    )
    expect(await screen.findByText('Replaced A01 with “FROM DEXED”.')).toBeTruthy()
  })

  it('reverses the replacement with one Undo', async () => {
    const { dialog, input, library, user } = await openReceiveDialog()
    act(() => input.receive(makeDx7VoiceFile(sentVoice)))
    await user.click(within(dialog).getByRole('button', { name: 'Replace patch' }))

    await user.click(await screen.findByRole('button', { name: 'Undo' }))

    expect(library.undoChange).toHaveBeenCalledExactlyOnceWith(changed)
  })

  it('stops listening once the dialog is closed', async () => {
    const { dialog, input, user } = await openReceiveDialog()
    // The page itself does not listen, so the dialog's is the one listener.
    const listener = input.addListener.mock.calls[0][1]

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(input.removeListener).toHaveBeenCalledWith('midimessage', listener)
  })
})
