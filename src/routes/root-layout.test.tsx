// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
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
  firmware: { kind: 'unidentified' },
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

describe('RootLayout hardware photo', () => {
  beforeEach(() => {
    localStorage.setItem('fm1-colourway', 'purple')
    // A desktop-width window, still asking for reduced motion as the editor's tests do.
    vi.stubGlobal('matchMedia', (query: string) => ({
      addEventListener: vi.fn(),
      matches: query === '(min-width: 1024px)' || query.includes('prefers-reduced-motion'),
      media: query,
      removeEventListener: vi.fn(),
    }))
  })
  afterEach(() => localStorage.removeItem('fm1-colourway'))

  function renderWithFirmware(firmware: ComponentProps<typeof RootLayout>['midi']['firmware']) {
    render(
      <RootLayout midi={{ ...midi, firmware }}>
        <div>Library</div>
      </RootLayout>,
      { wrapper: ToastProvider },
    )
    return screen.getByRole('img', { name: 'M-VAVE FM1 synthesiser front panel' })
  }

  it('shows the chosen finish with the stock screen on M-VAVE firmware', () => {
    const photo = renderWithFirmware({ identity: 'FM-1_019', kind: 'mvave' })

    expect(photo.getAttribute('src')).toContain('fm1-purple')
  })

  it('shows the chosen finish with the FM-1+VA screen on Baud Girl firmware', async () => {
    const photo = renderWithFirmware({ identity: 'FM-1_089', kind: 'fm1-va' })

    await waitFor(() => expect(photo.getAttribute('src')).toContain('fm1-va-purple'))
    expect(photo.getAttribute('srcset')).toContain('fm1-va-purple-460')
  })

  it('goes back to the stock screen when the FM1 no longer runs FM-1+VA', async () => {
    const { rerender } = render(
      <RootLayout midi={{ ...midi, firmware: { identity: 'FM-1_089', kind: 'fm1-va' } }}>
        <div>Library</div>
      </RootLayout>,
      { wrapper: ToastProvider },
    )
    const photo = screen.getByRole('img', { name: 'M-VAVE FM1 synthesiser front panel' })
    await waitFor(() => expect(photo.getAttribute('src')).toContain('fm1-va-purple'))

    rerender(
      <RootLayout midi={{ ...midi, firmware: { identity: 'FM-1_019', kind: 'mvave' } }}>
        <div>Library</div>
      </RootLayout>,
    )

    expect(photo.getAttribute('src')).not.toContain('fm1-va-')
  })

  it('keeps the stock screen on Felucca firmware', () => {
    const photo = renderWithFirmware({ identity: 'FM-1_904', kind: 'felucca' })

    expect(photo.getAttribute('src')).not.toContain('fm1-va-')
  })

  it('keeps the stock screen while the firmware is unidentified', () => {
    const photo = renderWithFirmware({ identity: 'XR-9_015', kind: 'unidentified' })

    expect(photo.getAttribute('src')).not.toContain('fm1-va-')
  })
})
