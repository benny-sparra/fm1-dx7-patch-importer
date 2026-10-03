// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  MidiConnectionError,
  MidiFirmwareBadge,
  MidiSettingsMenu,
} from '@/components/midi/midi-controls'
import { setLocale } from '@/i18n'
import type { Fm1Firmware } from '@/lib/fm1-firmware'

afterEach(async () => {
  cleanup()
  await setLocale('en-GB')
})

function renderSettings(firmware: Fm1Firmware, selectedInputId = 'fm1-in') {
  const midi: ComponentProps<typeof MidiSettingsMenu>['midi'] = {
    channel: 1,
    effectChannel: 2,
    firmware,
    inputs: [],
    outputs: [],
    selectedInputId,
    selectedOutputId: '',
    setChannel: vi.fn(),
    setEffectChannel: vi.fn(),
    setSelectedInputId: vi.fn(),
    setSelectedOutputId: vi.fn(),
  }
  return render(<MidiSettingsMenu midi={midi} />)
}

describe('MidiConnectionError', () => {
  it('explains a blocked MIDI permission in the interface language', () => {
    render(<MidiConnectionError midi={{ error: 'permission_denied' }} />)

    expect(
      screen.getByText(
        'MIDI access was blocked. Allow MIDI and SysEx access for this site, then connect again. In Firefox, accept the site permission add-on when it is offered.',
      ),
    ).toBeTruthy()
  })

  it('renders nothing while MIDI has no connection error', () => {
    const { container } = render(<MidiConnectionError midi={{ error: null }} />)

    expect(container.textContent).toBe('')
  })
})

describe('MidiSettingsMenu firmware', () => {
  it('names M-VAVE firmware and says patches go to the edit buffer', () => {
    renderSettings({ identity: 'FM-1_015', kind: 'mvave' })

    expect(screen.getByText('M-VAVE FM-1_015')).toBeTruthy()
    expect(screen.getByText('Patches you play go to the FM1’s edit buffer.')).toBeTruthy()
  })

  it('names FM-1+VA firmware and why patches are sent as parameter changes, in German', async () => {
    await setLocale('de')

    renderSettings({ identity: 'FM-1_089', kind: 'fm1-va' })

    expect(screen.getByText('FM-1+VA FM-1_089')).toBeTruthy()
    expect(
      screen.getByText(
        'Sounds, die du anspielst, werden als Parameteränderungen gesendet, damit der FM1 sie nie über das gewählte Preset speichert.',
      ),
    ).toBeTruthy()
  })

  it('asks for the FM1 as the input when no input can hear its answer', () => {
    renderSettings({ kind: 'unidentified' }, '')

    expect(screen.getByText('Not identified')).toBeTruthy()
    expect(
      screen.getByText(
        'Choose the FM1 as the input monitor so the editor can ask which firmware it runs.',
      ),
    ).toBeTruthy()
  })

  it('shows the firmware is being checked while the FM1 has not answered', () => {
    renderSettings({ kind: 'checking' })

    expect(screen.getByText('Checking…')).toBeTruthy()
    expect(screen.queryByText(/Choose the FM1 as the input monitor/)).toBeNull()
  })
})

describe('MidiFirmwareBadge', () => {
  it('names Baud Girl and FM-1+VA with its version', () => {
    const { container } = render(
      <MidiFirmwareBadge midi={{ firmware: { identity: 'FM-1_089', kind: 'fm1-va' } }} />,
    )

    expect(screen.getByText('FM-1+VA firmware by Baud Girl, FM-1_089')).toBeTruthy()
    expect(container.textContent).toContain('BAUD GIRL')
    expect(container.textContent).toContain('FM-1_089')
    expect(container.querySelector('img')).toBeNull()
  })

  it('names FM-1+VA with its version in German', async () => {
    await setLocale('de')

    render(<MidiFirmwareBadge midi={{ firmware: { identity: 'FM-1_089', kind: 'fm1-va' } }} />)

    expect(screen.getByText('Firmware FM-1+VA von Baud Girl, FM-1_089')).toBeTruthy()
  })

  it('names M-VAVE with its version as M-VAVE numbers it', () => {
    const { container } = render(
      <MidiFirmwareBadge midi={{ firmware: { identity: 'FM-1_015', kind: 'mvave' } }} />,
    )

    expect(screen.getByText('M-VAVE firmware, V15')).toBeTruthy()
    expect(container.textContent).toContain('M-VAVEV15')
    expect(container.textContent).not.toContain('FM-1+VA')
    expect(screen.getByTitle(/^The FM1 runs M-VAVE’s own firmware, V15\./)).toBeTruthy()
  })

  it('names M-VAVE with its version in French', async () => {
    await setLocale('fr')

    render(<MidiFirmwareBadge midi={{ firmware: { identity: 'FM-1_015', kind: 'mvave' } }} />)

    expect(screen.getByText('Firmware de M-VAVE, V15')).toBeTruthy()
  })

  it('shows nothing while the firmware is unknown', () => {
    const { container, rerender } = render(
      <MidiFirmwareBadge midi={{ firmware: { kind: 'checking' } }} />,
    )
    expect(container.textContent).toBe('')

    rerender(
      <MidiFirmwareBadge midi={{ firmware: { identity: 'FM-1_904', kind: 'unidentified' } }} />,
    )
    expect(container.textContent).toBe('')
  })
})
