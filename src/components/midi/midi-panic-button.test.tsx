// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MidiPanicButton } from '@/components/midi/midi-panic-button'
import { ToastProvider } from '@/components/ui/toast'
import { setLocale } from '@/i18n'

afterEach(async () => {
  cleanup()
  await setLocale('en')
})

function renderButton(
  midi: { hasMidiOutput: boolean; midiAccess: boolean },
  name = 'MIDI panic',
  sent = true,
) {
  const sendMidiPanic = vi.fn(() => sent)
  render(<MidiPanicButton midi={{ ...midi, sendMidiPanic }} />, { wrapper: ToastProvider })
  const button = screen.getByRole('button', { name }) as HTMLButtonElement
  return { button, sendMidiPanic }
}

describe('MidiPanicButton', () => {
  it('names itself and asks for MIDI to be switched on while offline', () => {
    const { button } = renderButton({ hasMidiOutput: false, midiAccess: false })

    expect(button.disabled).toBe(true)
    expect(button.title).toBe('MIDI panic: Switch MIDI on first')
  })

  it('names itself and asks for an output while online without one', () => {
    const { button } = renderButton({ hasMidiOutput: false, midiAccess: true })

    expect(button.disabled).toBe(true)
    expect(button.title).toBe('MIDI panic: Choose a MIDI output')
  })

  it('explains what it sends once an output is selected', () => {
    const { button } = renderButton({ hasMidiOutput: true, midiAccess: true })

    expect(button.disabled).toBe(false)
    expect(button.title).toBe(
      'MIDI panic: send a note-off for every note on the note channel, to stop hanging notes',
    )
  })

  it('shows only an icon, leaving its name to the label', () => {
    const { button } = renderButton({ hasMidiOutput: true, midiAccess: true })

    expect(button.textContent).toBe('')
  })

  it('sends a MIDI panic when pressed', async () => {
    const user = userEvent.setup()
    const { button, sendMidiPanic } = renderButton({ hasMidiOutput: true, midiAccess: true })

    await user.click(button)

    expect(sendMidiPanic).toHaveBeenCalledTimes(1)
  })

  it('confirms the panic was sent in a notification', async () => {
    const user = userEvent.setup()
    const { button } = renderButton({ hasMidiOutput: true, midiAccess: true })

    await user.click(button)

    expect(
      await screen.findByText('MIDI panic sent. Every note on the note channel was released.'),
    ).toBeTruthy()
  })

  it('shows no confirmation when the panic could not be sent', async () => {
    const user = userEvent.setup()
    const { button } = renderButton({ hasMidiOutput: true, midiAccess: true }, 'MIDI panic', false)

    await user.click(button)

    expect(screen.queryByText(/MIDI panic sent/)).toBeNull()
  })

  it('names what is missing in the interface language', async () => {
    await setLocale('de')

    const { button } = renderButton({ hasMidiOutput: false, midiAccess: false }, 'MIDI-Panik')

    expect(button.title).toBe('MIDI-Panik: Zuerst MIDI einschalten')
  })
})
