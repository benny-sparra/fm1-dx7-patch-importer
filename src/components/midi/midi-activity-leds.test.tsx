// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { sendEveryNoteOff, sendNoteOn } from '@/lib/midi'
import { midiActivity, midiActivityLitMs } from '@/lib/midi-activity'

import { MidiActivityLeds } from './midi-activity-leds'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const activityTitle =
  'MIDI activity: IN lights as a message arrives from the MIDI input, OUT as the editor sends one.'

function led(label: 'IN' | 'OUT') {
  return screen.getByText(label).previousElementSibling
}

function makeOutput() {
  return { sendNoteOff: vi.fn(), sendNoteOn: vi.fn() }
}

/** Lets the frame that shows the LED pass, then the time it stays lit. */
function letLedGoDark() {
  act(() => {
    vi.advanceTimersToNextFrame()
    vi.advanceTimersByTime(midiActivityLitMs)
  })
}

describe('MidiActivityLeds', () => {
  it('stays out of the accessibility tree, leaving the MIDI log as the record', () => {
    render(<MidiActivityLeds />)

    expect(screen.getByTitle(activityTitle).getAttribute('aria-hidden')).toBe('true')
  })

  it('starts dark', () => {
    render(<MidiActivityLeds />)

    expect(led('IN')?.hasAttribute('data-lit')).toBe(false)
    expect(led('OUT')?.hasAttribute('data-lit')).toBe(false)
  })

  it('lights OUT as the editor sends a message', () => {
    render(<MidiActivityLeds />)

    act(() => sendNoteOn(makeOutput() as never, 1, 60))

    expect(led('OUT')?.hasAttribute('data-lit')).toBe(true)
    expect(led('IN')?.hasAttribute('data-lit')).toBe(false)
    letLedGoDark()
  })

  it('lights IN as a message arrives', () => {
    render(<MidiActivityLeds />)

    act(() => midiActivity.signal('in'))

    expect(led('IN')?.hasAttribute('data-lit')).toBe(true)
    letLedGoDark()
  })

  it('goes dark once the messages stop', () => {
    render(<MidiActivityLeds />)

    act(() => sendEveryNoteOff(makeOutput() as never, 1))
    letLedGoDark()

    expect(led('OUT')?.hasAttribute('data-lit')).toBe(false)
  })
})
