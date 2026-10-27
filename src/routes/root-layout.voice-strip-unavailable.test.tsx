// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { makeLogEntry } from '@/lib/midi'
import { MidiLogStore } from '@/lib/midi-log-store'
import { resetVoiceSetupForTests, setVoiceSetupEnabled } from '@/lib/voice-setup'

import { RootLayout } from './root-layout'

// Stand in for a chunk that fails, as a stale deployment's missing file would.
vi.mock('@/components/midi/voice-strip', () => ({
  VoiceStrip: () => {
    throw new Error('Failed to fetch dynamically imported module')
  },
}))

const logStore = new MidiLogStore([])
logStore.append(makeLogEntry('system', 'Ready. Connect MIDI to begin.'))

const midi: ComponentProps<typeof RootLayout>['midi'] = {
  channel: 1,
  connectMidi: vi.fn(),
  disconnectMidi: vi.fn(),
  effectChannel: 2,
  error: null,
  firmware: { identity: 'FM-1_016', kind: 'mvave' },
  hasMidiOutput: false,
  inputs: [],
  isConnecting: false,
  logAuditionPhrase: vi.fn(),
  logStore,
  midiAccess: false,
  midiPanicCount: 0,
  outputs: [],
  selectedInputId: '',
  selectedOutputId: '',
  sendEffectDiagnosticControl: vi.fn(),
  sendMidiPanic: vi.fn(),
  setChannel: vi.fn(),
  setEffectChannel: vi.fn(),
  setSelectedInputId: vi.fn(),
  setSelectedOutputId: vi.fn(),
  startNote: vi.fn(),
  stopNote: vi.fn(),
  sysexAvailable: false,
  trackDelivery: null,
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  resetVoiceSetupForTests()
  vi.restoreAllMocks()
})

describe('RootLayout Voice strip that fails to load', () => {
  it('explains the failure, offers a reload', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    localStorage.setItem('fm1-librarian-help-seen', 'true')
    setVoiceSetupEnabled(true)
    render(
      <ToastProvider>
        <RootLayout midi={midi} voices={{ onSendSetup: () => 0, presetLabel: () => '' }}>
          <div>Library</div>
        </RootLayout>
      </ToastProvider>,
    )

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Voices 1–8 could not be loaded.')).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Reload app' })).toBeTruthy()
    expect(screen.getAllByRole('combobox', { name: 'Note channel' })).toHaveLength(1)
  })
})
