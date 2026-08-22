// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { PianoKeyboardDialog } from '@/components/midi/piano-keyboard-dialog'
import { type MidiController } from '@/hooks/use-midi'

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
