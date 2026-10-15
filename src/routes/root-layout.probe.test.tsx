// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import { MidiLogStore } from '@/lib/midi-log-store'

import { RootLayout } from './root-layout'

const probeRequested = vi.hoisted(() => vi.fn())

// The development-only probe is a lazy chunk, and this one fails to load.
vi.mock('@/components/midi/fm1-va-preset-probe', () => {
  probeRequested()
  throw new Error('The probe chunk did not load.')
})

const midi: ComponentProps<typeof RootLayout>['midi'] = {
  channel: 1,
  connectMidi: vi.fn(),
  disconnectMidi: vi.fn(),
  effectChannel: 2,
  error: null,
  firmware: { kind: 'unidentified' },
  hasMidiOutput: false,
  inputs: [],
  isConnecting: false,
  logAuditionPhrase: vi.fn(),
  logStore: new MidiLogStore([]),
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
}

beforeEach(() => {
  localStorage.setItem('fm1-librarian-help-seen', 'true')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('RootLayout development probe', () => {
  it('keeps the page showing when the preset probe fails', async () => {
    render(
      <RootLayout midi={midi}>
        <div>Library</div>
      </RootLayout>,
      { wrapper: ToastProvider },
    )

    // Lets the failed import reach React, which throws it out of `act` if nothing contains it.
    await act(() => vi.dynamicImportSettled())
    expect(probeRequested).toHaveBeenCalled()

    expect(screen.getByText('Library')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
  })
})
