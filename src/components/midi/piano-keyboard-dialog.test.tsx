// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { PianoKeyboardDialog } from '@/components/midi/piano-keyboard-dialog'
import { type MidiController } from '@/hooks/use-midi'
import { editorShortcuts, shouldRunShortcut } from '@/lib/keyboard-shortcuts'

beforeAll(() => {
  HTMLDialogElement.prototype.show = function show() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(cleanup)

function setup() {
  const midi = {
    hasMidiOutput: true,
    startNote: vi.fn(),
    stopNote: vi.fn(),
  } as unknown as MidiController
  const view = render(<PianoKeyboardDialog midi={midi} />)
  return { midi, ...view }
}

describe('PianoKeyboardDialog trigger', () => {
  function trigger(midi: Partial<MidiController>) {
    render(<PianoKeyboardDialog midi={midi as MidiController} />)
    return screen.getByRole('button', { name: 'Keyboard' }) as HTMLButtonElement
  }

  it('asks for MIDI to be switched on while offline', () => {
    const button = trigger({ hasMidiOutput: false, midiAccess: false })
    expect(button.disabled).toBe(true)
    expect(button.title).toBe('Switch MIDI on first')
  })

  it('asks for an output while online without one', () => {
    const button = trigger({ hasMidiOutput: false, midiAccess: true })
    expect(button.disabled).toBe(true)
    expect(button.title).toBe('Choose a MIDI output')
  })

  it('opens once an output is selected', () => {
    const button = trigger({ hasMidiOutput: true, midiAccess: true })
    expect(button.disabled).toBe(false)
    expect(button.title).toBe('')
  })
})

describe('PianoKeyboardDialog note lifecycle', () => {
  it('balances computer-key note on and note off', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await user.click(screen.getByRole('button', { name: 'Keyboard' }))
    fireEvent.keyDown(window, { key: 'a' })
    fireEvent.keyUp(window, { key: 'a' })
    expect(midi.startNote).toHaveBeenCalledWith(48, 'C3')
    expect(midi.stopNote).toHaveBeenCalledWith(48)
  })

  it('releases active notes on window blur and unmount', async () => {
    const user = userEvent.setup()
    const { midi, unmount } = setup()
    await user.click(screen.getByRole('button', { name: 'Keyboard' }))
    fireEvent.keyDown(window, { key: 'a' })
    fireEvent.keyDown(window, { key: 's' })
    fireEvent.blur(window)
    expect(midi.stopNote).toHaveBeenCalledWith(48)
    expect(midi.stopNote).toHaveBeenCalledWith(50)

    fireEvent.keyDown(window, { key: 'd' })
    unmount()
    expect(midi.stopNote).toHaveBeenCalledWith(52)
  })
})

describe('PianoKeyboardDialog keyboard ownership', () => {
  async function openKeyboard() {
    const user = userEvent.setup()
    const view = setup()
    await user.click(screen.getByRole('button', { name: 'Keyboard' }))
    return view
  }

  it('closes on Escape, releases held notes, and returns focus to its trigger', async () => {
    const { midi } = await openKeyboard()
    fireEvent.keyDown(window, { key: 'a' })

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(document.querySelector('dialog')?.open).toBe(false)
    expect(midi.stopNote).toHaveBeenCalledWith(48)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keyboard' }))
  })

  it('leaves Command and Control shortcuts to the browser and the editor', async () => {
    const { midi } = await openKeyboard()

    const saveAllowed = fireEvent.keyDown(window, { key: 's', metaKey: true })
    const undoAllowed = fireEvent.keyDown(window, { key: 'z', ctrlKey: true })

    expect(saveAllowed).toBe(true)
    expect(undoAllowed).toBe(true)
    expect(midi.startNote).not.toHaveBeenCalled()
    expect(
      shouldRunShortcut(new KeyboardEvent('keydown', { key: 's', metaKey: true }), {
        ...editorShortcuts.save,
      }),
    ).toBe(true)

    fireEvent.keyDown(window, { key: 'a' })
    expect(midi.startNote).toHaveBeenCalledWith(48, 'C3')
  })

  it('releases a held note when a modifier is pressed, so a missed key-up cannot leave it on', async () => {
    const { midi } = await openKeyboard()
    fireEvent.keyDown(window, { key: 'a' })

    fireEvent.keyDown(window, { key: 'Meta', metaKey: true })

    expect(midi.stopNote).toHaveBeenCalledWith(48)
  })

  it('stops playing notes while another dialog is open above the keyboard', async () => {
    const { midi } = await openKeyboard()
    const otherDialog = document.createElement('dialog')
    otherDialog.setAttribute('open', '')
    document.body.append(otherDialog)

    fireEvent.keyDown(window, { key: 'a' })

    expect(midi.startNote).not.toHaveBeenCalled()
    otherDialog.remove()
  })
})
