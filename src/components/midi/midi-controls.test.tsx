// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import '@/i18n'
import { MidiConnectionError } from '@/components/midi/midi-controls'
import { type MidiController } from '@/hooks/use-midi'

afterEach(cleanup)

describe('MidiConnectionError', () => {
  it('explains a blocked MIDI permission in the interface language', () => {
    render(<MidiConnectionError midi={{ error: 'permission_denied' } as MidiController} />)

    expect(
      screen.getByText(
        'MIDI access was blocked. Allow MIDI and SysEx access for this site, then connect again.',
      ),
    ).toBeTruthy()
  })

  it('renders nothing while MIDI has no connection error', () => {
    const { container } = render(<MidiConnectionError midi={{ error: null } as MidiController} />)

    expect(container.textContent).toBe('')
  })
})
