// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MidiConnectionError } from '@/components/midi/midi-connection-error'
import {
  MidiConnectActions,
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

describe('MidiConnectActions', () => {
  function renderSwitch(midi: { isConnecting: boolean; midiAccess: boolean }) {
    return render(
      <MidiConnectActions midi={{ ...midi, connectMidi: vi.fn(), disconnectMidi: vi.fn() }} />,
    )
  }

  it.each([
    ['offline', { isConnecting: false, midiAccess: false }, 'MIDI offline'],
    ['connecting', { isConnecting: true, midiAccess: false }, 'Connecting…'],
    ['online', { isConnecting: false, midiAccess: true }, 'MIDI online'],
  ])('is named only for its state while %s', (_state, midi, name) => {
    renderSwitch(midi)

    expect(screen.getByRole('switch', { name })).toBeTruthy()
  })

  it('keeps the width of its longest state by hiding the others', () => {
    const { container } = renderSwitch({ isConnecting: false, midiAccess: false })

    const hidden = [...container.querySelectorAll('[aria-hidden="true"]')]
      .map((element) => element.textContent)
      .filter(Boolean)
    expect(hidden.sort()).toEqual(['Connecting…', 'MIDI online'])
  })

  it('names its state in the interface language and hides the other languages’ words', async () => {
    await setLocale('de')
    renderSwitch({ isConnecting: true, midiAccess: false })

    expect(screen.getByRole('switch', { name: 'Verbindung wird hergestellt…' })).toBeTruthy()
  })
})

describe('MidiSettingsMenu firmware', () => {
  it('names the firmware without a paragraph about what it does with patches', () => {
    renderSettings({ identity: 'FM-1_016', kind: 'mvave' })

    expect(screen.getByText('M-VAVE FM-1_016')).toBeTruthy()
    expect(screen.queryByText(/edit buffer/)).toBeNull()
    expect(screen.queryByText(/Every Voice shares/)).toBeNull()
    expect(screen.queryByText(/Select on the FM1/)).toBeNull()
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
  it('names Baud Girl with its version, as FM1 owners know the firmware', () => {
    const { container } = render(
      <MidiFirmwareBadge
        midi={{
          firmware: { identity: 'FM-1_089', kind: 'fm1-va' },
          isConnecting: false,
          midiAccess: true,
        }}
      />,
    )

    expect(screen.getByText('Baud Girl firmware, FM-1_089')).toBeTruthy()
    expect(container.textContent).toBe('BAUD GIRLFM-1_089Baud Girl firmware, FM-1_089')
    expect(container.querySelector('img')).toBeNull()
  })

  it('names FM-1+VA with its version in German', async () => {
    await setLocale('de')

    render(
      <MidiFirmwareBadge
        midi={{
          firmware: { identity: 'FM-1_089', kind: 'fm1-va' },
          isConnecting: false,
          midiAccess: true,
        }}
      />,
    )

    expect(screen.getByText('Firmware von Baud Girl, FM-1_089')).toBeTruthy()
  })

  it('says V16 has eight Voices sharing one FX group, and V15 says nothing of Voices', () => {
    const badge = (identity: string) => (
      <MidiFirmwareBadge
        midi={{ firmware: { identity, kind: 'mvave' }, isConnecting: false, midiAccess: true }}
      />
    )
    const { rerender } = render(badge('FM-1_016'))
    expect(
      screen.getByTitle(
        'The FM1 runs M-VAVE’s own firmware, V16: eight Voices, each on its own channel, sharing one FX group. Patches you play go to its edit buffer.',
      ),
    ).toBeTruthy()

    rerender(badge('FM-1_015'))
    expect(screen.queryByTitle(/Voices/)).toBeNull()
  })

  it('says V16 has eight Voices sharing one FX group in German', async () => {
    await setLocale('de')

    render(
      <MidiFirmwareBadge
        midi={{
          firmware: { identity: 'FM-1_016', kind: 'mvave' },
          isConnecting: false,
          midiAccess: true,
        }}
      />,
    )

    expect(screen.getByTitle(/V16: acht Voices, jede auf einem eigenen Kanal/)).toBeTruthy()
  })

  it('names M-VAVE with its version as M-VAVE numbers it', () => {
    const { container } = render(
      <MidiFirmwareBadge
        midi={{
          firmware: { identity: 'FM-1_015', kind: 'mvave' },
          isConnecting: false,
          midiAccess: true,
        }}
      />,
    )

    expect(screen.getByText('M-VAVE firmware, V15')).toBeTruthy()
    expect(container.textContent).toContain('M-VAVEV15')
    expect(container.textContent).not.toContain('FM-1+VA')
    expect(screen.getByTitle(/^The FM1 runs M-VAVE’s own firmware, V15\./)).toBeTruthy()
  })

  it('names M-VAVE with its version in French', async () => {
    await setLocale('fr')

    render(
      <MidiFirmwareBadge
        midi={{
          firmware: { identity: 'FM-1_015', kind: 'mvave' },
          isConnecting: false,
          midiAccess: true,
        }}
      />,
    )

    expect(screen.getByText('Firmware de M-VAVE, V15')).toBeTruthy()
  })

  it('names Hügelton Instruments and Felucca with its release', () => {
    const { container } = render(
      <MidiFirmwareBadge
        midi={{
          firmware: { identity: 'FM-1_908', kind: 'felucca' },
          isConnecting: false,
          midiAccess: true,
        }}
      />,
    )

    expect(screen.getByText('Felucca firmware by Hügelton Instruments, 0.8')).toBeTruthy()
    expect(container.textContent).toContain('HÜGELTONFELUCCA0.8')
    expect(screen.getByTitle(/ignores DX7 patches, banks, and the effect controls\.$/)).toBeTruthy()
  })

  it('names Felucca with its release in Brazilian Portuguese', async () => {
    await setLocale('pt-BR')

    render(
      <MidiFirmwareBadge
        midi={{
          firmware: { identity: 'FM-1_908', kind: 'felucca' },
          isConnecting: false,
          midiAccess: true,
        }}
      />,
    )

    expect(screen.getByText('Firmware Felucca da Hügelton Instruments, 0.8')).toBeTruthy()
  })

  it('names M-VAVE’s Official Open with its release', () => {
    const { container } = render(
      <MidiFirmwareBadge
        midi={{
          firmware: { identity: 'FM-1_8000012', kind: 'official-open' },
          isConnecting: false,
          midiAccess: true,
        }}
      />,
    )

    expect(screen.getByText('M-VAVE Open firmware, V12')).toBeTruthy()
    expect(container.textContent).toContain('M-VAVEOPENV12')
    expect(
      screen.getByTitle(/^The FM1 runs M-VAVE’s Open firmware, V12, an eight-track/),
    ).toBeTruthy()
  })

  it('names Official Open with its release in Ukrainian', async () => {
    await setLocale('uk')

    render(
      <MidiFirmwareBadge
        midi={{
          firmware: { identity: 'FM-1_8000012', kind: 'official-open' },
          isConnecting: false,
          midiAccess: true,
        }}
      />,
    )

    expect(screen.getByText('Прошивка Open від M-VAVE, V12')).toBeTruthy()
  })

  it('names Felucca and SLOOP, with no maker, for FM-1_900', () => {
    const { container } = render(
      <MidiFirmwareBadge
        midi={{
          firmware: { identity: 'FM-1_900', kind: 'felucca' },
          isConnecting: false,
          midiAccess: true,
        }}
      />,
    )

    expect(screen.getByText('Felucca or SLOOP firmware, FM-1_900')).toBeTruthy()
    expect(container.textContent).toContain('FELUCCA/SLOOPFM-1_900')
    expect(container.textContent).not.toContain('HÜGELTON')
    expect(screen.getByTitle(/^The FM1 runs Hügelton Instruments’ Felucca or SLOOP/)).toBeTruthy()
  })

  it('names Felucca and SLOOP for FM-1_900 in Simplified Chinese', async () => {
    await setLocale('zh-Hans')

    render(
      <MidiFirmwareBadge
        midi={{
          firmware: { identity: 'FM-1_900', kind: 'felucca' },
          isConnecting: false,
          midiAccess: true,
        }}
      />,
    )

    expect(screen.getByText('Felucca 或 SLOOP 固件，FM-1_900')).toBeTruthy()
  })

  it('says to switch MIDI on while it is offline', () => {
    const { container } = render(
      <MidiFirmwareBadge
        midi={{ firmware: { kind: 'checking' }, isConnecting: false, midiAccess: false }}
      />,
    )
    expect(container.textContent).toBe('Switch on to reach the FM1')
  })

  it('says to switch MIDI on in Ukrainian while it is offline', async () => {
    await setLocale('uk')
    try {
      const { container } = render(
        <MidiFirmwareBadge
          midi={{ firmware: { kind: 'checking' }, isConnecting: false, midiAccess: false }}
        />,
      )
      expect(container.textContent).toBe('Увімкніть, щоб зв’язатися з FM1')
    } finally {
      await setLocale('en-GB')
    }
  })

  it('shows nothing once MIDI is online and the firmware is not identified', () => {
    const { container } = render(
      <MidiFirmwareBadge
        midi={{
          firmware: { identity: 'XR-9_015', kind: 'unidentified' },
          isConnecting: false,
          midiAccess: true,
        }}
      />,
    )
    expect(container.textContent).toBe('')
  })

  it.each([
    ['MIDI is connecting', { isConnecting: true, midiAccess: false }],
    ['MIDI is online and the FM1 is being asked', { isConnecting: false, midiAccess: true }],
  ])('holds its place, empty, while %s', (_state, connection) => {
    const { container } = render(
      <MidiFirmwareBadge
        className="reserved-row"
        midi={{ ...connection, firmware: { kind: 'checking' } }}
      />,
    )

    const place = container.firstElementChild
    expect(place?.className).toBe('reserved-row')
    expect(place?.textContent).toBe('')
  })

  it('gives its place up when MIDI is online but no FM1 answers', () => {
    const { container } = render(
      <MidiFirmwareBadge
        midi={{ firmware: { kind: 'unidentified' }, isConnecting: false, midiAccess: true }}
      />,
    )

    expect(container.firstElementChild).toBeNull()
  })

  it('fills the place it held with the firmware once the FM1 answers', () => {
    const connection = { isConnecting: false, midiAccess: true }
    const { container, rerender } = render(
      <MidiFirmwareBadge
        className="reserved-row"
        midi={{ ...connection, firmware: { kind: 'checking' } }}
      />,
    )
    const place = container.firstElementChild

    rerender(
      <MidiFirmwareBadge
        className="reserved-row"
        midi={{ ...connection, firmware: { identity: 'FM-1_015', kind: 'mvave' } }}
      />,
    )

    expect(container.firstElementChild).toBe(place)
    expect(screen.getByText('M-VAVE firmware, V15')).toBeTruthy()
  })
})
