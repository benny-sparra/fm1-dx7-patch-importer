// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { PianoKeyboard } from '@/components/midi/piano-keyboard'
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

const keyboardDialog = () => document.querySelector('dialog')

async function clickKeyboard(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Keyboard' }))
  await waitFor(() => expect(keyboardDialog()?.open).toBe(true))
}

function setup() {
  const midi = {
    hasMidiOutput: true,
    startNote: vi.fn(),
    stopNote: vi.fn(),
  } as unknown as MidiController
  const view = render(<PianoKeyboard midi={midi} />)
  return { midi, ...view }
}

describe('PianoKeyboard trigger', () => {
  function trigger(midi: Partial<MidiController>) {
    render(<PianoKeyboard midi={midi as MidiController} />)
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

describe('PianoKeyboard note lifecycle', () => {
  it('balances computer-key note on and note off', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await clickKeyboard(user)
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    fireEvent.keyUp(window, { code: 'KeyA', key: 'a' })
    expect(midi.startNote).toHaveBeenCalledWith(48, 'C3')
    expect(midi.stopNote).toHaveBeenCalledWith(48)
  })

  it('releases active notes on window blur and unmount', async () => {
    const user = userEvent.setup()
    const { midi, unmount } = setup()
    await clickKeyboard(user)
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    fireEvent.keyDown(window, { code: 'KeyS', key: 's' })
    fireEvent.blur(window)
    expect(midi.stopNote).toHaveBeenCalledWith(48)
    expect(midi.stopNote).toHaveBeenCalledWith(50)

    fireEvent.keyDown(window, { code: 'KeyD', key: 'd' })
    unmount()
    expect(midi.stopNote).toHaveBeenCalledWith(52)
  })
})

describe('PianoKeyboard keyboard ownership', () => {
  async function openKeyboard() {
    const user = userEvent.setup()
    const view = setup()
    await clickKeyboard(user)
    return view
  }

  it('closes on Escape, releases held notes, and returns focus to its trigger', async () => {
    const { midi } = await openKeyboard()
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(keyboardDialog()?.open).toBe(false)
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

    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    expect(midi.startNote).toHaveBeenCalledWith(48, 'C3')
  })

  it('releases a held note when a modifier is pressed, so a missed key-up cannot leave it on', async () => {
    const { midi } = await openKeyboard()
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })

    fireEvent.keyDown(window, { key: 'Meta', metaKey: true })

    expect(midi.stopNote).toHaveBeenCalledWith(48)
  })

  it('stops playing notes while another dialog is open above the keyboard', async () => {
    const { midi } = await openKeyboard()
    const otherDialog = document.createElement('dialog')
    otherDialog.setAttribute('open', '')
    document.body.append(otherDialog)

    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })

    expect(midi.startNote).not.toHaveBeenCalled()
    otherDialog.remove()
  })
})

describe('PianoKeyboard loading', () => {
  it('keeps the chosen octave when the keyboard is closed and opened again', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await clickKeyboard(user)
    await user.click(screen.getByRole('button', { name: 'Shift octave up' }))
    fireEvent.keyDown(window, { key: 'Escape' })

    await clickKeyboard(user)
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })

    expect(midi.startNote).toHaveBeenCalledWith(60, 'C4')
  })

  it('opens a single keyboard when the trigger is activated repeatedly', async () => {
    const user = userEvent.setup()
    setup()
    const trigger = screen.getByRole('button', { name: 'Keyboard' })

    await user.click(trigger)
    await user.click(trigger)
    await waitFor(() => expect(keyboardDialog()?.open).toBe(true))

    expect(document.querySelectorAll('dialog')).toHaveLength(1)
  })

  it('explains in translated text when the keyboard cannot be loaded', async () => {
    vi.resetModules()
    vi.doMock('@/components/midi/piano-keyboard-dialog', () => {
      throw new Error('chunk failed')
    })
    const { PianoKeyboard: KeyboardWithFailingChunk } =
      await import('@/components/midi/piano-keyboard')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    render(
      <KeyboardWithFailingChunk
        midi={{ hasMidiOutput: true, startNote: vi.fn(), stopNote: vi.fn() } as never}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Keyboard' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'The keyboard could not be opened. Reload the page and try again.',
    )
    expect(keyboardDialog()).toBeNull()
    consoleError.mockRestore()
    vi.doUnmock('@/components/midi/piano-keyboard-dialog')
  })
})

describe('PianoKeyboard keyboard layouts', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'keyboard')
  })

  async function openKeyboard() {
    const user = userEvent.setup()
    const view = setup()
    await clickKeyboard(user)
    return view
  }

  it('plays by key position, so an AZERTY keyboard keeps the two-row piano', async () => {
    const { midi } = await openKeyboard()

    // On AZERTY the key where QWERTY has W types z, and the key where QWERTY has Z types w.
    fireEvent.keyDown(window, { code: 'KeyW', key: 'z' })
    expect(midi.startNote).toHaveBeenCalledWith(49, 'C#3')
    fireEvent.keyUp(window, { code: 'KeyW', key: 'z' })

    fireEvent.keyDown(window, { code: 'KeyZ', key: 'w' })
    fireEvent.keyDown(window, { code: 'KeyA', key: 'q' })
    expect(midi.startNote).toHaveBeenLastCalledWith(36, 'C2')
  })

  it('labels the keys with the letters of the user’s keyboard layout', async () => {
    Object.defineProperty(navigator, 'keyboard', {
      configurable: true,
      value: {
        getLayoutMap: vi.fn(
          async () =>
            new Map([
              ['KeyA', 'q'],
              ['KeyW', 'z'],
              ['KeyZ', 'w'],
            ]),
        ),
      },
    })
    await openKeyboard()

    const octaveDown = screen.getByRole('button', { name: 'Shift octave down' })
    expect(await within(octaveDown).findByText('W')).toBeTruthy()
    expect(within(screen.getByRole('button', { name: 'Play C#3' })).getByText('Z')).toBeTruthy()
    expect(within(screen.getByRole('button', { name: 'Play C3' })).getByText('Q')).toBeTruthy()
  })

  it('labels the keys with QWERTY letters when the layout is unknown', async () => {
    await openKeyboard()

    expect(
      within(screen.getByRole('button', { name: 'Shift octave down' })).getByText('Z'),
    ).toBeTruthy()
    expect(within(screen.getByRole('button', { name: 'Play C#3' })).getByText('W')).toBeTruthy()
  })
})
