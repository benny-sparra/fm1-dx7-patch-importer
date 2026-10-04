// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
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

describe('RootLayout intro', () => {
  beforeEach(() => {
    // jsdom has no modal dialogs.
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true
    }
  })
  afterEach(() => setLocale('en-GB'))

  it('opens the DX7 bank sources from the words about importing banks', async () => {
    const user = userEvent.setup()
    render(
      <RootLayout midi={midi}>
        <div>Library</div>
      </RootLayout>,
      { wrapper: ToastProvider },
    )

    await user.click(screen.getByRole('button', { name: 'import DX7 SysEx banks' }))

    expect(screen.getByRole('dialog', { name: 'Find DX7 patch banks' })).toBeTruthy()
  })

  it('reads the intro as one sentence with the link in its place', () => {
    const view = render(
      <RootLayout midi={midi}>
        <div>Library</div>
      </RootLayout>,
      { wrapper: ToastProvider },
    )

    // The sources dialog sits beside its trigger, so leave its text out of the sentence.
    const intro = view.container.querySelector('.hero-supporting-text')?.cloneNode(true)
    if (!(intro instanceof HTMLElement)) throw new Error('No intro')
    intro.querySelector('dialog')?.remove()

    expect(intro.textContent).toBe(
      'Edit, organise and transfer FM1 patches, or import DX7 SysEx banks.',
    )
  })

  it('links the words the interface language uses for importing banks', async () => {
    await setLocale('de')
    render(
      <RootLayout midi={midi}>
        <div>Library</div>
      </RootLayout>,
      { wrapper: ToastProvider },
    )

    expect(screen.getByRole('button', { name: 'DX7-SysEx-Bänke importieren' })).toBeTruthy()
  })
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

describe('RootLayout hardware photo screen', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      addEventListener: vi.fn(),
      matches: query === '(min-width: 1024px)' || query.includes('prefers-reduced-motion'),
      media: query,
      removeEventListener: vi.fn(),
    }))
  })

  function renderOnline(midiAccess: boolean) {
    const layout = (online: boolean) => (
      <RootLayout midi={{ ...midi, midiAccess: online }}>
        <div>Library</div>
      </RootLayout>
    )
    const { container, rerender } = render(layout(midiAccess), { wrapper: ToastProvider })
    return {
      screenOverlay: () => container.querySelector('.fm1-photo-screen'),
      setOnline: (online: boolean) => rerender(layout(online)),
    }
  }

  it('keeps the screen lit on a page that opens with MIDI offline', () => {
    const { screenOverlay } = renderOnline(false)

    expect(screenOverlay()).toBeNull()
  })

  it('switches the screen off, hidden from assistive technology, when MIDI goes offline', () => {
    const { screenOverlay, setOnline } = renderOnline(true)

    setOnline(false)

    expect(screenOverlay()?.getAttribute('aria-hidden')).toBe('true')
    expect(screenOverlay()?.querySelector('.crt-switch-off-picture')).not.toBeNull()
  })

  it('keeps the screen dark without the switch-off once it has finished', () => {
    const { screenOverlay, setOnline } = renderOnline(true)
    setOnline(false)

    // jsdom has no AnimationEvent, so React listens under a vendor-prefixed name, and the event
    // carries no animation name; it is given the one CSS would, under both names.
    for (const type of ['animationend', 'webkitAnimationEnd']) {
      const animationEnd = Object.assign(new Event(type, { bubbles: true }), {
        animationName: 'crt-switch-off',
      })
      fireEvent(screenOverlay()?.firstElementChild ?? document.body, animationEnd)
    }

    expect(screenOverlay()).not.toBeNull()
    expect(screenOverlay()?.querySelector('.crt-switch-off-picture')).toBeNull()
  })

  it('lights the screen again when MIDI is back online', () => {
    const { screenOverlay, setOnline } = renderOnline(true)
    setOnline(false)

    setOnline(true)

    expect(screenOverlay()).toBeNull()
  })
})
