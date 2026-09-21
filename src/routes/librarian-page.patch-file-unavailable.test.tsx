// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import type { MidiController } from '@/hooks/use-midi'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { makeDemoVoices } from '@/lib/patch-library'

import { LibrarianPage } from './librarian-page'

// Stand in for chunks that fail, as a stale deployment's missing files would.
vi.mock('@/components/patches/replace-patch-dialog', () => ({
  ReplacePatchDialog: () => {
    throw new Error('Failed to fetch dynamically imported module')
  },
}))
vi.mock('@/lib/dx7-voice-file', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const library = {
  bankDescriptions: {},
  bankNames: { A: 'Studio Favourites' },
  getBankVoices: vi.fn(() => []),
  loadedBanks: ['A'],
  namedBanks: [],
  patches: [{ bank: 'A', family: 'DX7', id: 'bank-A-1', name: 'ALPHA', number: 1, program: 0 }],
  voices: { 'bank-A-1': makeDemoVoices()[0] },
  workspaceBanks: ['A'],
} as unknown as PatchLibrary

async function chooseFromSlotMenu(item: string) {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
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
  await user.click(screen.getByRole('menuitem', { name: item }))
}

const unavailable = 'Patch files could not be opened. Reload the page and try again.'

describe('LibrarianPage patch files that fail to load', () => {
  it('explains a replace dialog that cannot open and keeps the librarian working', async () => {
    await chooseFromSlotMenu('Import patch…')

    expect(await screen.findByText(unavailable)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send ALPHA to FM1' })).toBeTruthy()
  })

  it('explains a download that cannot start', async () => {
    await chooseFromSlotMenu('Download patch')

    expect(await screen.findByText(unavailable)).toBeTruthy()
  })
})
