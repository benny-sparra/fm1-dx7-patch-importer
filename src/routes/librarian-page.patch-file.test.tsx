// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import type { MidiController } from '@/hooks/use-midi'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { updateDx7VoiceName } from '@/lib/dx7'
import { makeDx7VoiceFile, parseDx7VoiceFile } from '@/lib/dx7-voice-file'
import { downloadFile } from '@/lib/download-file'
import { makeDemoVoices } from '@/lib/patch-library'

import { LibrarianPage } from './librarian-page'

vi.mock('@/lib/download-file', () => ({ downloadFile: vi.fn() }))

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
const fileVoice = updateDx7VoiceName(makeDemoVoices()[1], 'FROM FILE')
const changed = { changed: true }

function makeLibrary() {
  return {
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
  } as unknown as PatchLibrary
}

async function openSlotMenu(library = makeLibrary()) {
  const user = userEvent.setup()
  render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={{ hasMidiOutput: false } as unknown as MidiController}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={vi.fn()}
      />
    </ToastProvider>,
  )
  await user.click(screen.getByRole('button', { name: 'Actions for ALPHA' }))
  return { library, user }
}

describe('LibrarianPage single-voice download', () => {
  it('saves the slot as a DX7 single-voice file named after it', async () => {
    const { user } = await openSlotMenu()

    await user.click(screen.getByRole('menuitem', { name: 'Download patch' }))

    await vi.waitFor(() => expect(downloadFile).toHaveBeenCalledOnce())
    const [blob, filename] = vi.mocked(downloadFile).mock.calls[0]
    expect(filename).toBe('fm1-A01-ALPHA.syx')
    expect(parseDx7VoiceFile(await blob.arrayBuffer()).data).toEqual(slotVoice.data)
  })

  it('says the download has started', async () => {
    const { user } = await openSlotMenu()

    await user.click(screen.getByRole('menuitem', { name: 'Download patch' }))

    expect(await screen.findByText('Downloading “ALPHA”.')).toBeTruthy()
  })
})

describe('LibrarianPage replacing a slot from a file', () => {
  async function replaceFromFile() {
    const { library, user } = await openSlotMenu()
    await user.click(screen.getByRole('menuitem', { name: 'Import patch…' }))
    const dialog = await screen.findByRole('dialog', { name: 'Replace A01 “ALPHA”?' })
    await user.upload(
      within(dialog).getByLabelText('Choose a DX7 SysEx file'),
      new File([makeDx7VoiceFile(fileVoice)], 'voice.syx'),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Replace patch' }))
    return { library, user }
  }

  it('asks before replacing the slot', async () => {
    const { library, user } = await openSlotMenu()

    await user.click(screen.getByRole('menuitem', { name: 'Import patch…' }))

    expect(await screen.findByRole('dialog', { name: 'Replace A01 “ALPHA”?' })).toBeTruthy()
    expect(library.replaceVoice).not.toHaveBeenCalled()
  })

  it('puts the voice from the file in the slot', async () => {
    const { library } = await replaceFromFile()

    expect(library.replaceVoice).toHaveBeenCalledExactlyOnceWith(
      'A',
      1,
      expect.objectContaining({ name: 'FROM FILE' }),
    )
  })

  it('names the replacement in its notification', async () => {
    await replaceFromFile()

    expect(await screen.findByText('Replaced A01 with “FROM FILE”.')).toBeTruthy()
  })

  it('offers to undo the replacement from its notification', async () => {
    const { library, user } = await replaceFromFile()

    await user.click(await screen.findByRole('button', { name: 'Undo' }))

    expect(library.undoChange).toHaveBeenCalledExactlyOnceWith(changed)
  })
})
