// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import '@/i18n'
import { MidiConnectionError } from '@/components/midi/midi-controls'

afterEach(cleanup)

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
