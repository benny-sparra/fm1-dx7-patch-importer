// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { type MidiController } from '@/hooks/use-midi'

import { RootLayout } from './root-layout'

const midiLogSnapshot = [
  {
    direction: 'system',
    message: 'Ready. Connect a Chromium browser to begin.',
    timestamp: 0,
  },
]

const midi = {
  channel: 1,
  connectMidi: vi.fn(),
  disconnectMidi: vi.fn(),
  effectChannel: 2,
  error: '',
  inputs: [],
  isConnecting: false,
  logStore: {
    getSnapshot: vi.fn(() => midiLogSnapshot),
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
afterEach(cleanup)

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
