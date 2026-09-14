// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import '@/i18n'
import { MidiLogDialog } from '@/components/midi/midi-log-dialog'
import { makeLogEntry } from '@/lib/midi'
import { MidiLogStore } from '@/lib/midi-log-store'

afterEach(cleanup)

describe('MidiLogDialog', () => {
  it('enables the log once MIDI activity is recorded, whatever the start-up message says', () => {
    const store = new MidiLogStore([makeLogEntry('system', 'Prêt.')])
    render(<MidiLogDialog logStore={store} />)
    const button = screen.getByRole('button', { name: 'MIDI log' }) as HTMLButtonElement

    expect(button.disabled).toBe(true)

    act(() => store.append(makeLogEntry('system', 'MIDI connected.')))

    expect(button.disabled).toBe(false)
  })
})
