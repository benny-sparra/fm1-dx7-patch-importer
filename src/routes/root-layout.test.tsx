// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { makeLogEntry } from '@/lib/midi'
import { resetVoiceSetupForTests, setVoiceSetupEnabled } from '@/lib/voice-setup'
import { MidiLogStore } from '@/lib/midi-log-store'
import { expectNoAxeViolations } from '@/test/accessibility'

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
  trackDelivery: null,
}

beforeEach(() => localStorage.setItem('fm1-librarian-help-seen', 'true'))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('RootLayout note channel', () => {
  it('leaves the note channel to the Settings menu, not the header', () => {
    render(
      <ToastProvider>
        <RootLayout midi={midi}>
          <div>Library</div>
        </RootLayout>
      </ToastProvider>,
    )

    expect(screen.getAllByRole('combobox', { name: 'Note channel' })).toHaveLength(1)
    expect(screen.queryByRole('option', { name: 'Ch 4' })).toBeNull()
  })
})

describe('RootLayout Voice strip', () => {
  const voices = { onSendSetup: vi.fn(() => 0), presetLabel: () => '' }

  afterEach(() => {
    localStorage.clear()
    resetVoiceSetupForTests()
  })

  function renderHeader(firmware: ComponentProps<typeof RootLayout>['midi']['firmware']) {
    return render(
      <ToastProvider>
        <RootLayout midi={{ ...midi, firmware }} voices={voices}>
          <div>Library</div>
        </RootLayout>
      </ToastProvider>,
    )
  }

  it('turns the note channel picker into the eight Voices once switched on, on V16', async () => {
    setVoiceSetupEnabled(true)
    renderHeader({ identity: 'FM-1_016', kind: 'mvave' })
    const header = screen.getByRole('banner')

    const strip = await within(header).findByRole('group', { name: 'Voices 1–8' })

    expect(within(strip).getAllByRole('button')).toHaveLength(8)
    // Only the Settings menu's Note channel is left, as without the strip.
    expect(within(header).getAllByRole('combobox', { name: 'Note channel' })).toHaveLength(1)
  })

  it('offers the Voices switch in the header on V16, and the switch turns the strip on', async () => {
    renderHeader({ identity: 'FM-1_016', kind: 'mvave' })
    const header = screen.getByRole('banner')

    await userEvent.setup().click(within(header).getByRole('switch', { name: 'Multitimbral mode' }))

    expect(await within(header).findByRole('group', { name: 'Voices 1–8' })).toBeTruthy()
  })

  it('shows no strip while the switch is off', () => {
    renderHeader({ identity: 'FM-1_016', kind: 'mvave' })

    expect(screen.queryByRole('group', { name: 'Voices 1–8' })).toBeNull()
    expect(screen.getAllByRole('combobox', { name: 'Note channel' })).toHaveLength(1)
  })

  it('offers no Voices switch while the firmware is unidentified or plays one Voice', () => {
    for (const firmware of [
      { identity: 'FM-1_015', kind: 'mvave' },
      { identity: 'FM-1_097', kind: 'fm1-va' },
      { kind: 'checking' },
    ] as const) {
      renderHeader(firmware)
      expect(screen.queryByRole('switch', { name: 'Multitimbral mode' })).toBeNull()
      cleanup()
    }
  })

  it('shows no strip on firmware that plays one Voice, whatever was stored', () => {
    setVoiceSetupEnabled(true)
    renderHeader({ identity: 'FM-1_015', kind: 'mvave' })

    expect(screen.queryByRole('group', { name: 'Voices 1–8' })).toBeNull()
    expect(screen.getAllByRole('combobox', { name: 'Note channel' })).toHaveLength(1)
  })
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

describe('RootLayout landmarks', () => {
  afterEach(() => setLocale('en-GB'))

  function renderLayout() {
    return render(
      <RootLayout midi={midi}>
        <div>Library</div>
      </RootLayout>,
      { wrapper: ToastProvider },
    )
  }

  it('has one banner, one main holding only the view, and one contentinfo', async () => {
    const { container } = renderLayout()

    const banner = screen.getByRole('banner')
    const main = screen.getByRole('main')
    const footer = screen.getByRole('contentinfo')
    expect(banner.querySelector('h1')).toBeTruthy()
    expect(main.textContent).toBe('Library')
    expect(banner.contains(main) || main.contains(footer) || main.contains(banner)).toBe(false)
    await expectNoAxeViolations(container)
  })

  it('offers a skip link first, which moves focus into main without changing the address', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.tab()
    const skip = screen.getByRole('link', { name: 'Skip to main content' })
    expect(document.activeElement).toBe(skip)
    await user.keyboard('[Enter]')

    expect(document.activeElement).toBe(screen.getByRole('main'))
    expect(window.location.hash).toBe('')
  })

  it('words the skip link in the interface language', async () => {
    await setLocale('de')

    renderLayout()

    expect(screen.getByRole('link', { name: 'Zum Hauptinhalt springen' })).toBeTruthy()
  })
})

describe('RootLayout degauss', () => {
  function renderLayout() {
    const { container } = render(
      <RootLayout midi={midi}>
        <div>Library</div>
      </RootLayout>,
      { wrapper: ToastProvider },
    )
    // The page itself, which holds the banner, the main view, and the footer.
    return container.querySelector<HTMLElement>('.synthwave-shell')!
  }

  it('leaves the page still as it opens in the stored finish', () => {
    expect(renderLayout().hasAttribute('data-degauss')).toBe(false)
  })

  it('degausses the page when another finish is chosen', async () => {
    const page = renderLayout()
    const otherFinish = screen
      .getAllByRole<HTMLInputElement>('radio')
      .find((finish) => !finish.checked)

    await userEvent.click(otherFinish!)

    expect(page.hasAttribute('data-degauss')).toBe(true)
  })
})

describe('RootLayout footer', () => {
  it('links to the firmware page in the same tab', () => {
    render(
      <RootLayout midi={midi}>
        <div>Library</div>
      </RootLayout>,
      { wrapper: ToastProvider },
    )

    const link = screen.getByRole('link', { name: 'FM1 firmware' })
    expect(link.getAttribute('href')).toBe('/firmware/')
    expect(link.hasAttribute('target')).toBe(false)
  })
})

describe('RootLayout storage note', () => {
  it('says the patches stay in this browser, with no backup date beside it', () => {
    localStorage.setItem('fm1-last-backup', '2026-10-12T09:00:00.000Z')
    try {
      render(
        <RootLayout midi={midi}>
          <div>Library</div>
        </RootLayout>,
        { wrapper: ToastProvider },
      )

      const note = screen.getByText('Your patches stay in this browser')
      expect(note.textContent).toBe('Your patches stay in this browser')
      expect(screen.queryByText(/^Last backed up:/)).toBeNull()
    } finally {
      localStorage.removeItem('fm1-last-backup')
    }
  })
})
