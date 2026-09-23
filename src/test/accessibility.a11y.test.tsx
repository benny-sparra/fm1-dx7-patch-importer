// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { MidiSettingsMenu } from '@/components/midi/midi-controls'
import { MidiSysexWarning } from '@/components/midi/midi-sysex-warning'
import {
  WorkspaceBankSelector,
  type WorkspaceBankSelectorBank,
} from '@/components/patches/workspace-bank-selector'
import { ToastProvider } from '@/components/ui/toast'
import { LibrarianPage } from '@/routes/librarian-page'
import { expectNoAxeViolations } from '@/test/accessibility'
import { makeLibrarianLibrary, makeLibrarianMidi } from '@/test/librarian-fakes'

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
  {
    actionsLabel: 'Actions for Studio Favourites',
    description: 'Warm performance sounds',
    id: 'A',
    name: 'Studio Favourites',
  },
  {
    actionsLabel: 'Actions for Electric Keys',
    description: 'Classic electric pianos',
    id: 'B',
    name: 'Electric Keys',
  },
]

const library = makeLibrarianLibrary({
  addBank: vi.fn(),
  bankDescriptions: {},
  bankNames: { A: 'Studio Favourites', B: 'Electric Keys' },
  deleteBank: vi.fn(),
  effects: {},
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
  voices: {},
  workspaceBanks: ['A', 'B'],
})

const disconnectedMidi = makeLibrarianMidi({
  hasMidiOutput: false,
  sendBank: vi.fn(),
})

const connectedWithoutSysexMidi = makeLibrarianMidi({
  connectMidi: vi.fn(),
  disconnectMidi: vi.fn(),
  hasMidiOutput: true,
  isConnecting: false,
  midiAccess: true,
  sendBank: vi.fn(),
  sysexAvailable: false,
})

const settingsMidi: ComponentProps<typeof MidiSettingsMenu>['midi'] = {
  channel: 1,
  effectChannel: 2,
  inputs: [],
  outputs: [],
  selectedInputId: '',
  selectedOutputId: '',
  setChannel: vi.fn(),
  setEffectChannel: vi.fn(),
  setSelectedInputId: vi.fn(),
  setSelectedOutputId: vi.fn(),
}

function renderLibrarian() {
  return render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={disconnectedMidi}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={vi.fn()}
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
    expect(screen.getByRole('searchbox', { name: 'Search' })).toBeTruthy()
    await expectNoAxeViolations(container)
  })

  it('keeps search results from the workspace and the catalog free of violations', async () => {
    const { container } = renderLibrarian()
    const user = userEvent.setup()

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'piano')

    expect(await screen.findByRole('region', { name: 'Other DX7 patch banks' })).toBeTruthy()
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

  it('keeps the contextual SysEx recovery dialog accessible', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={library}
          midi={connectedWithoutSysexMidi}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onPlaySearchResult={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    expect(screen.getByRole('dialog', { name: 'SysEx access unavailable.' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reconnect MIDI with SysEx' })).toBeTruthy()
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

  it('announces the missing SysEx warning without accessibility violations', async () => {
    const { container } = render(<MidiSysexWarning />)

    expect(screen.getByText('SysEx access unavailable.').closest('[role="alert"]')).toBeTruthy()
    await expectNoAxeViolations(container)
  })
})
