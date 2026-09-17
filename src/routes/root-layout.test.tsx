// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { type MidiController } from '@/hooks/use-midi'

import { RootLayout } from './root-layout'

const midiLogSnapshot = [
  {
    direction: 'system',
    message: 'Ready. Connect MIDI to begin.',
    timestamp: 0,
  },
]

const midi = {
  channel: 1,
  connectMidi: vi.fn(),
  disconnectMidi: vi.fn(),
  effectChannel: 2,
  error: null,
  inputs: [],
  isConnecting: false,
  logStore: {
    getSnapshot: vi.fn(() => midiLogSnapshot),
    hasActivity: vi.fn(() => true),
    subscribe: vi.fn(() => vi.fn()),
  },
  midiAccess: false,
  outputs: [],
  selectedInputId: '',
  selectedOutputId: '',
  setChannel: vi.fn(),
  setEffectChannel: vi.fn(),
  setSelectedInputId: vi.fn(),
  setSelectedOutputId: vi.fn(),
} as unknown as MidiController

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
    )

    const title = screen.getByRole('heading', { level: 1 })
    expect(title.getAttribute('data-layout')).toBe('compact')
    expect(title.querySelector('.synthwave-brand-row')).toBeTruthy()
  })
})

describe('RootLayout unsupported banner', () => {
  function renderWithUserAgent(userAgent: string) {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(userAgent)

    render(
      <RootLayout midi={midi}>
        <div>Library</div>
      </RootLayout>,
    )

    return screen.getByRole('alert')
  }

  it('titles the banner for mobile devices on an Android phone', () => {
    const banner = renderWithUserAgent(
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
    )

    expect(banner.textContent).toContain('Mobile devices are not supported.')
    expect(banner.textContent).not.toContain('Unsupported browser.')
  })

  it('titles the banner as an unsupported browser on a secure page without Web MIDI', () => {
    vi.stubGlobal('isSecureContext', true)
    const banner = renderWithUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    )

    expect(banner.textContent).toContain('Unsupported browser.')
    expect(banner.textContent).not.toContain('Mobile devices are not supported.')
  })
})

describe('RootLayout sequencer trigger', () => {
  it('opens the sequencer when the trigger is pressed', async () => {
    const user = userEvent.setup()
    const onOpenSequencer = vi.fn()
    render(
      <RootLayout midi={midi} onOpenSequencer={onOpenSequencer}>
        <p>Library</p>
      </RootLayout>,
    )

    await user.click(screen.getByRole('button', { name: 'Sequencer' }))

    expect(onOpenSequencer).toHaveBeenCalledTimes(1)
  })

  it('leaves the trigger out while another view owns the page', () => {
    render(
      <RootLayout midi={midi}>
        <p>Editor</p>
      </RootLayout>,
    )

    expect(screen.queryByRole('button', { name: 'Sequencer' })).toBeNull()
  })
})
