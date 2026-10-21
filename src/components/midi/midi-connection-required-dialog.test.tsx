// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { MidiConnectionRequiredDialog } from '@/components/midi/midi-connection-required-dialog'
import { setLocale } from '@/i18n'
import { translatePageText } from '@/test/page-translator'

type Midi = ComponentProps<typeof MidiConnectionRequiredDialog>['midi']

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
})

afterEach(async () => {
  cleanup()
  await setLocale('en-GB')
})

// A port the dialog only lists by name, as the device select's own test fakes one.
const fm1Output = {
  id: 'out-1',
  manufacturer: '',
  name: 'FM-1 MIDI 1',
  port: {},
  state: 'connected',
} as unknown as Midi['outputs'][number]

function makeMidi(overrides: Partial<Midi> = {}): Midi {
  return {
    connectMidi: vi.fn<Midi['connectMidi']>(),
    error: null,
    firmware: { kind: 'unidentified' },
    hasMidiOutput: false,
    isConnecting: false,
    midiAccess: false,
    outputs: [],
    selectedOutputId: '',
    setSelectedOutputId: vi.fn<Midi['setSelectedOutputId']>(),
    ...overrides,
  }
}

function renderDialog(midi: Midi, onSend = vi.fn(), onClose = vi.fn()) {
  const view = render(
    <MidiConnectionRequiredDialog midi={midi} onClose={onClose} onSend={onSend} />,
  )
  const rerender = (next: Midi) =>
    view.rerender(<MidiConnectionRequiredDialog midi={next} onClose={onClose} onSend={onSend} />)
  return { onClose, onSend, rerender }
}

describe('MidiConnectionRequiredDialog', () => {
  it('switches MIDI online from its own button while MIDI is offline', async () => {
    const user = userEvent.setup()
    const midi = makeMidi()
    renderDialog(midi)

    await user.click(screen.getByRole('button', { name: 'Switch MIDI online' }))

    expect(midi.connectMidi).toHaveBeenCalledTimes(1)
  })

  it('says it is connecting on the same aria-disabled button, which does nothing when pressed', async () => {
    const user = userEvent.setup()
    const midi = makeMidi()
    const { rerender } = renderDialog(midi)
    const button = screen.getByRole('button', { name: 'Switch MIDI online' })

    rerender({ ...midi, isConnecting: true })
    await user.click(button)

    expect(button.textContent).toBe('Connecting…')
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('status').textContent).toContain('Connecting…')
    expect(midi.connectMidi).not.toHaveBeenCalled()
  })

  it('stays open while MIDI connects', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog(makeMidi({ isConnecting: true }))
    const dialog = screen.getByRole('dialog')

    await user.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent(dialog, new Event('cancel', { cancelable: true }))

    expect((dialog as HTMLDialogElement).open).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('offers the output to choose once MIDI is online without one, and waits to send', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    const midi = makeMidi({ midiAccess: true, outputs: [fm1Output] })
    renderDialog(midi, onSend)
    const send = screen.getByRole('button', {
      name: 'Send to FM1',
      description: 'Choose a MIDI output',
    })

    await user.click(send)
    await user.selectOptions(screen.getByRole('combobox', { name: /Output/ }), 'out-1')

    expect(send.getAttribute('aria-disabled')).toBe('true')
    expect(onSend).not.toHaveBeenCalled()
    expect(midi.setSelectedOutputId).toHaveBeenCalledWith('out-1')
  })

  it('waits while the FM1 says which firmware it runs', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    renderDialog(
      makeMidi({
        firmware: { kind: 'checking' },
        hasMidiOutput: true,
        midiAccess: true,
        outputs: [fm1Output],
        selectedOutputId: 'out-1',
      }),
      onSend,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Send to FM1',
        description: 'Waiting for the FM1 to say which firmware it runs',
      }),
    )

    expect(onSend).not.toHaveBeenCalled()
  })

  it('sends from the button that switched MIDI online, keeping focus on it', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    const midi = makeMidi()
    const { rerender } = renderDialog(midi, onSend)
    const button = screen.getByRole('button', { name: 'Switch MIDI online' })
    button.focus()

    rerender({
      ...midi,
      firmware: { identity: 'FM-1_015', kind: 'mvave' },
      hasMidiOutput: true,
      midiAccess: true,
      outputs: [fm1Output],
      selectedOutputId: 'out-1',
    })
    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    expect(document.activeElement).toBe(button)
    expect(button.hasAttribute('aria-disabled')).toBe(false)
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('shows a refused connection as translated text', async () => {
    await setLocale('de')
    renderDialog(makeMidi({ error: 'permission_denied' }))

    expect(screen.getByRole('alert').textContent).not.toBe('')
    expect(screen.getByRole('button', { name: 'MIDI online schalten' })).toBeTruthy()
  })

  it('keeps its step label current under a page translator', () => {
    const midi = makeMidi()
    const { rerender } = renderDialog(midi)
    translatePageText(document.body)

    rerender({ ...midi, isConnecting: true })

    expect(screen.getByRole('button', { name: 'Connecting…' })).toBeTruthy()
  })
})
