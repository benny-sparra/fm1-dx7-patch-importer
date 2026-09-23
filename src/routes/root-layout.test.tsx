// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { makeLogEntry } from '@/lib/midi'
import { MidiLogStore } from '@/lib/midi-log-store'

import { RootLayout } from './root-layout'

// A log with activity, as the MIDI log dialog shows it once anything has been sent.
const logStore = new MidiLogStore([])
logStore.append(makeLogEntry('system', 'Ready. Connect MIDI to begin.'))

const midi: ComponentProps<typeof RootLayout>['midi'] = {
  channel: 1,
  connectMidi: vi.fn(),
  disconnectMidi: vi.fn(),
  effectChannel: 2,
  error: null,
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
}

beforeEach(() => localStorage.setItem('fm1-librarian-help-seen', 'true'))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('RootLayout title layout', () => {
  it('exposes the full title and brand layout explicitly', () => {
    render(
      <RootLayout midi={midi}>
        <div>Library</div>
      </RootLayout>,
      { wrapper: ToastProvider },
    )

    const title = screen.getByRole('heading', { level: 1 })
    expect(title.getAttribute('data-layout')).toBe('full')
    expect(title.querySelector('.synthwave-brand-row')).toBeTruthy()
  })

  it('exposes the compact title and brand layout explicitly', () => {
    render(
      <RootLayout compact midi={midi}>
        <div>Editor</div>
      </RootLayout>,
      { wrapper: ToastProvider },
    )

    const title = screen.getByRole('heading', { level: 1 })
    expect(title.getAttribute('data-layout')).toBe('compact')
    expect(title.querySelector('.synthwave-brand-row')).toBeTruthy()
  })
})

describe('RootLayout unsupported banner', () => {
  afterEach(() => {
    delete (window.navigator as unknown as { requestMIDIAccess?: unknown }).requestMIDIAccess
  })

  function renderWithBrowser(userAgent: string, { midiAccess = false } = {}) {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(userAgent)
    vi.stubGlobal('isSecureContext', true)

    if (midiAccess) {
      Object.defineProperty(window.navigator, 'requestMIDIAccess', {
        configurable: true,
        value: () => Promise.resolve(),
      })
    }

    render(
      <RootLayout midi={midi}>
        <div>Library</div>
      </RootLayout>,
      { wrapper: ToastProvider },
    )
  }

  function unsupportedBanner() {
    return screen
      .queryAllByRole('alert')
      .find((alert) => alert.textContent?.includes('Unsupported browser.'))
  }

  it('does not warn on an Android phone whose browser exposes Web MIDI', () => {
    renderWithBrowser(
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
      { midiAccess: true },
    )

    expect(unsupportedBanner()).toBeUndefined()
  })

  it('warns on an Android phone whose browser has no Web MIDI', () => {
    renderWithBrowser('Mozilla/5.0 (Android 15; Mobile; rv:156.0) Gecko/156.0 Firefox/156.0')

    expect(unsupportedBanner()).toBeTruthy()
  })

  it('warns on a secure desktop page without Web MIDI', () => {
    renderWithBrowser(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    )

    expect(unsupportedBanner()).toBeTruthy()
  })
})
