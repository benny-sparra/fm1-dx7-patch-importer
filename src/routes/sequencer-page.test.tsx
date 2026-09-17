// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import i18n from 'i18next'

import '@/i18n'
import { loadSequencerNamespace } from '@/i18n/sequencer'
import { type MidiController, type MidiInputListener } from '@/hooks/use-midi'
import { SequencerPage } from '@/routes/sequencer-page'

beforeAll(async () => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
  await loadSequencerNamespace('en')
})

afterEach(cleanup)

function setup(overrides: Partial<MidiController> = {}) {
  const sent: string[] = []
  const listeners = new Set<MidiInputListener>()
  const output = {
    send(bytes: Uint8Array) {
      sent.push(
        Array.from(bytes)
          .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
          .join(' '),
      )
    },
  }
  const midi = {
    channel: 1,
    hasMidiInput: true,
    hasMidiOutput: true,
    midiAccess: true,
    selectedOutput: output,
    subscribeToInput: (listener: MidiInputListener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    ...overrides,
  } as unknown as MidiController
  const onBack = vi.fn()
  const view = render(<SequencerPage midi={midi} onBack={onBack} />)

  const play = (bytes: number[], atMs: number) =>
    listeners.forEach((listener) => listener(Uint8Array.from(bytes), atMs))

  return { midi, onBack, play, sent, ...view }
}

const dialog = () => document.querySelector('dialog')

async function setStepLength(user: ReturnType<typeof userEvent.setup>, steps: string) {
  await user.selectOptions(screen.getByLabelText('Step length'), steps)
}

describe('SequencerPage pattern editing', () => {
  it('starts with a loop of rests, so no step is left undefined', () => {
    setup()

    expect(screen.getAllByRole('button', { name: /Make step \d+ a note/ })).toHaveLength(8)
  })

  it('shortens the loop when the step length is reduced', async () => {
    const user = userEvent.setup()
    setup()

    await setStepLength(user, '2')

    expect(screen.getAllByRole('button', { name: /Make step \d+ a note/ })).toHaveLength(2)
  })

  it('pads a longer loop with rests rather than leaving steps undefined', async () => {
    const user = userEvent.setup()
    setup()

    await setStepLength(user, '12')

    expect(screen.getAllByRole('button', { name: /Make step \d+ a note/ })).toHaveLength(12)
  })

  it('turns a step into a note and shows the note it will play', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Make step 1 a note' }))

    expect(screen.getByText('C4')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Make step 1 a rest' })).toBeTruthy()
  })

  it('names the pitch as the user changes it', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Make step 1 a note' }))
    const pitch = screen.getByLabelText('Pitch')
    await user.clear(pitch)
    await user.type(pitch, '65')

    expect(screen.getByText('F4')).toBeTruthy()
  })

  it('returns the whole loop to rests when it is cleared', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Make step 1 a note' }))
    await user.click(screen.getByRole('button', { name: 'Clear the pattern' }))

    expect(screen.getByRole('button', { name: 'Make step 1 a note' })).toBeTruthy()
  })
})

describe('SequencerPage sending', () => {
  async function sendOneNote(user: ReturnType<typeof userEvent.setup>) {
    await setStepLength(user, '1')
    await user.click(screen.getByRole('button', { name: 'Make step 1 a note' }))
    await user.click(screen.getByRole('button', { name: 'Send to the FM1' }))
    await waitFor(() => expect(dialog()?.open).toBe(true))
  }

  it('asks the user to arm the device, naming the step length it expects', async () => {
    const user = userEvent.setup()
    setup()

    await setStepLength(user, '4')
    await user.click(screen.getByRole('button', { name: 'Send to the FM1' }))

    expect(within(dialog()!).getByText('Set Step length to 4.')).toBeTruthy()
  })

  it('warns that the whole pattern is replaced before anything is sent', async () => {
    const user = userEvent.setup()
    const { sent } = setup()

    await user.click(screen.getByRole('button', { name: 'Send to the FM1' }))

    expect(within(dialog()!).getByText(/replaces everything in that pattern/)).toBeTruthy()
    expect(sent).toEqual([])
  })

  it('sends nothing when the pre-flight is cancelled', async () => {
    const user = userEvent.setup()
    const { sent } = setup()

    await user.click(screen.getByRole('button', { name: 'Send to the FM1' }))
    await user.click(within(dialog()!).getByRole('button', { name: 'Cancel' }))

    expect(sent).toEqual([])
    expect(dialog()?.open).toBe(false)
  })

  it('plays the pattern into the device as ordinary notes once the user confirms', async () => {
    const user = userEvent.setup()
    const { sent } = setup()

    await sendOneNote(user)
    await user.click(
      within(dialog()!).getByRole('button', { name: 'The FM1 is recording; send it' }),
    )

    await waitFor(() => expect(sent).toEqual(['90 3C 5A', '80 3C 00']))
  })

  it('reports a completed pass as sent rather than as recorded, and says it is unsaved', async () => {
    const user = userEvent.setup()
    setup()

    await sendOneNote(user)
    await user.click(
      within(dialog()!).getByRole('button', { name: 'The FM1 is recording; send it' }),
    )

    await waitFor(() => expect(screen.getByText(/Sent 1 of 1 steps/)).toBeTruthy())
    expect(screen.getByText(/Use SAVE on the FM1/)).toBeTruthy()
  })

  it('explains that an output is needed rather than failing silently', async () => {
    const user = userEvent.setup()
    setup({ hasMidiOutput: true, selectedOutput: undefined })

    await sendOneNote(user)
    await user.click(
      within(dialog()!).getByRole('button', { name: 'The FM1 is recording; send it' }),
    )

    await waitFor(() =>
      expect(screen.getByText('Choose a MIDI output before sending a pattern.')).toBeTruthy(),
    )
  })

  it('cannot be sent without a MIDI output selected at all, and says why', () => {
    setup({ hasMidiOutput: false, midiAccess: true })

    const send = screen.getByRole('button', { name: 'Send to the FM1' })
    expect(send.hasAttribute('disabled')).toBe(true)
    expect(send.getAttribute('title')).toBe('Choose a MIDI output')
  })

  it('says to switch MIDI on when it is off altogether', () => {
    setup({ hasMidiOutput: false, midiAccess: false })

    expect(screen.getByRole('button', { name: 'Send to the FM1' }).getAttribute('title')).toBe(
      'Switch MIDI on first',
    )
  })
})

describe('SequencerPage listening', () => {
  async function listen(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Listen to the FM1' }))
  }

  const twoPasses = (play: (bytes: number[], atMs: number) => void) => {
    // Two notes a step apart in a nine-step loop, played three times so two passes are complete.
    for (const pass of [0, 1, 2]) {
      play([0x90, 0x3c, 0x5a], pass * 1500)
      play([0x80, 0x3c, 0x64], pass * 1500 + 130)
      play([0x90, 0x41, 0x5a], pass * 1500 + 166)
      play([0x80, 0x41, 0x64], pass * 1500 + 300)
    }
  }

  it('says nothing has been heard yet rather than showing an empty pattern', async () => {
    const user = userEvent.setup()
    setup()

    await listen(user)

    expect(screen.getByText('Listening. Nothing has been heard yet.')).toBeTruthy()
  })

  it('asks for another pass rather than presenting one pass as the pattern', async () => {
    const user = userEvent.setup()
    const { play } = setup()

    await listen(user)
    play([0x90, 0x3c, 0x5a], 0)
    play([0x90, 0x41, 0x5a], 166)

    await waitFor(() => expect(screen.getByText(/No repeat has been heard yet/)).toBeTruthy())
  })

  it('shows the pattern once two complete passes agree', async () => {
    const user = userEvent.setup()
    const { play } = setup()

    await setStepLength(user, '9')
    await listen(user)
    twoPasses(play)

    await waitFor(() => expect(screen.getByText(/Heard a loop of 9 steps/)).toBeTruthy())
    expect(screen.getByText(/may start at a different step/)).toBeTruthy()
  })

  it('puts what was heard into the editor when the user asks for it', async () => {
    const user = userEvent.setup()
    const { play } = setup()

    await setStepLength(user, '9')
    await listen(user)
    twoPasses(play)
    await waitFor(() => expect(screen.getByText(/Heard a loop of 9 steps/)).toBeTruthy())
    await user.click(screen.getByRole('button', { name: 'Put what was heard in the editor' }))

    expect(screen.getAllByText('C4')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Make step 1 a rest' })).toBeTruthy()
  })

  it('cannot listen without a MIDI input, and says why', () => {
    setup({ hasMidiInput: false, midiAccess: true })

    const trigger = screen.getByRole('button', { name: 'Listen to the FM1' })
    expect(trigger.hasAttribute('disabled')).toBe(true)
    expect(trigger.getAttribute('title')).toBe('Choose a MIDI input')
  })

  it('stops reading the port when listening is switched off', async () => {
    const user = userEvent.setup()
    const { play } = setup()

    await listen(user)
    await user.click(screen.getByRole('button', { name: 'Stop listening' }))
    twoPasses(play)

    expect(screen.queryByText(/Heard a loop/)).toBeNull()
  })
})

describe('SequencerPage in another language', () => {
  it('shows the step length the device needs in the interface language', async () => {
    const user = userEvent.setup()
    await loadSequencerNamespace('de')
    await i18n.changeLanguage('de')
    setup()

    try {
      await user.selectOptions(screen.getByLabelText('Schrittzahl'), '4')
      await user.click(screen.getByRole('button', { name: 'An den FM1 senden' }))

      expect(within(dialog()!).getByText('Stelle Step auf 4.')).toBeTruthy()
    } finally {
      await i18n.changeLanguage('en')
    }
  })
})

describe('SequencerPage navigation', () => {
  it('goes back to the library', async () => {
    const user = userEvent.setup()
    const { onBack } = setup()

    await user.click(screen.getByRole('button', { name: 'Back to the library' }))

    expect(onBack).toHaveBeenCalled()
  })
})
