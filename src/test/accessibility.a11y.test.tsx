// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { MidiSettingsMenu } from '@/components/midi/midi-controls'
import {
  WorkspaceBankSelector,
  type WorkspaceBankSelectorBank,
} from '@/components/patches/workspace-bank-selector'
import { ToastProvider } from '@/components/ui/toast'
import { type MidiController } from '@/hooks/use-midi'
import { type PatchLibrary } from '@/hooks/use-patch-library'
import { LibrarianPage } from '@/routes/librarian-page'
import { expectNoAxeViolations } from '@/test/accessibility'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
  }
})

afterEach(cleanup)

const banks: WorkspaceBankSelectorBank[] = [
  { description: 'Warm performance sounds', id: 'A', name: 'Studio Favourites' },
  { description: 'Classic electric pianos', id: 'B', name: 'Electric Keys' },
]

const library = {
  addBank: vi.fn(),
  bankDescriptions: {},
  bankNames: { A: 'Studio Favourites', B: 'Electric Keys' },
  deleteBank: vi.fn(),
  getBankVoices: vi.fn(() => []),
  importBank: vi.fn(),
  loadDemoBank: vi.fn(),
  loadedBanks: ['A', 'B'],
  moveVoice: vi.fn(),
  namedBanks: [],
  patches: [
    {
      bank: 'A',
      family: 'Keys',
      id: 'bank-A-1',
      name: 'Alpha Piano',
      number: 1,
      program: 0,
    },
  ],
  resetFactoryBanks: vi.fn(),
  updateBankInformation: vi.fn(),
  workspaceBanks: ['A', 'B'],
} as unknown as PatchLibrary

const disconnectedMidi = {
  hasMidiOutput: false,
  sendBank: vi.fn(),
} as unknown as MidiController

const settingsMidi = {
  channel: 1,
  connectMidi: vi.fn(),
  disconnectMidi: vi.fn(),
  effectChannel: 2,
  error: '',
  inputs: [],
  isConnecting: false,
  midiAccess: false,
  outputs: [],
  selectedInputId: '',
  selectedOutputId: '',
  setChannel: vi.fn(),
  setEffectChannel: vi.fn(),
  setSelectedInputId: vi.fn(),
  setSelectedOutputId: vi.fn(),
} as unknown as MidiController

function renderLibrarian() {
  return render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={disconnectedMidi}
        onEditPatch={vi.fn()}
      />
    </ToastProvider>,
  )
}

describe('rendered accessibility', () => {
  it('gives the workspace bank selector valid relationships, names, and state', async () => {
    const { container } = render(
      <WorkspaceBankSelector
        banks={banks}
        label="Destination browser bank"
        onSelect={vi.fn()}
        renderActions={(bank) => <button type="button">Delete {bank.name}</button>}
        selectedBank="A"
      />,
    )

    expect(screen.getByRole('list', { name: 'Destination browser bank' })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'A — Studio Favourites', pressed: true }),
    ).toBeTruthy()
    await expectNoAxeViolations(container)
  })

  it('keeps the main librarian controls free of rendered accessibility violations', async () => {
    const { container } = renderLibrarian()

    expect(screen.getByRole('button', { name: 'Send to FM1' })).toBeTruthy()
    expect(screen.getByRole('searchbox', { name: 'Search by name' })).toBeTruthy()
    await expectNoAxeViolations(container)
  })

  it('exposes an accessible modal name and controls when MIDI is required', async () => {
    const user = userEvent.setup()
    const { container } = renderLibrarian()

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    expect(screen.getByRole('dialog', { name: 'Connect MIDI to send this bank' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Close MIDI connection message' })).toBeTruthy()
    await expectNoAxeViolations(container)
  })

  it('keeps the expanded MIDI settings panel labelled and axe-clean', async () => {
    const user = userEvent.setup()
    const { container } = render(<MidiSettingsMenu midi={settingsMidi} />)

    await user.click(screen.getByLabelText('Settings'))

    expect(screen.getByRole('combobox', { name: 'Language' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Output' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Note channel' })).toBeTruthy()
    await expectNoAxeViolations(container)
  })
})
