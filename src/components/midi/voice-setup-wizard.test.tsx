// @vitest-environment jsdom

import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { VoiceSetupWizard } from '@/components/midi/voice-setup-wizard'
import { ToastProvider } from '@/components/ui/toast'
import { setLocale } from '@/i18n'
import { resetVoiceSetupForTests, setVoiceChannel } from '@/lib/voice-setup'
import { makeLibrarianMidi } from '@/test/librarian-fakes'
import { translatePageText } from '@/test/page-translator'

beforeAll(() => {
  // jsdom has no modal dialogs.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

beforeEach(() => {
  localStorage.clear()
  resetVoiceSetupForTests()
})

afterEach(async () => {
  cleanup()
  vi.useRealTimers()
  await setLocale('en-GB')
})

type Midi = ReturnType<typeof makeLibrarianMidi>

function online(overrides: Partial<Midi> = {}) {
  return makeLibrarianMidi({
    effectChannel: 5,
    hasMidiOutput: true,
    midiAccess: true,
    outputs: [{ id: 'fm1', manufacturer: '', name: 'FM-1', port: {} as never, state: 'connected' }],
    selectedOutputId: 'fm1',
    ...overrides,
  })
}

function renderWizard(midi: Midi = online(), onClose = vi.fn()) {
  const view = render(
    <ToastProvider>
      <VoiceSetupWizard midi={midi} onClose={onClose} />
    </ToastProvider>,
  )
  return { ...view, midi, onClose }
}

async function next(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^Next/ }))
}

async function reachSoundTest(user: ReturnType<typeof userEvent.setup>) {
  await next(user)
  await next(user)
  await next(user)
}

describe('VoiceSetupWizard', () => {
  it('lists the channels the editor expects and the steps to set them on the FM1', () => {
    setVoiceChannel(2, 9)
    renderWizard()

    expect(screen.getByRole('dialog', { name: 'Set up Voices' })).toBeTruthy()
    expect(screen.getByText(/open PRESETS and select a Voice/)).toBeTruthy()
    expect(screen.getByText(/Voice 1 on All: change it to Ch 1/)).toBeTruthy()
    expect(screen.getByText('Voice 1: Ch 1')).toBeTruthy()
    expect(screen.getByText('Voice 3: Ch 9')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })

  it('names the editor’s effect channel on the FX step, then asks for SAVE and Globe', async () => {
    const user = userEvent.setup()
    renderWizard()

    await next(user)
    expect(screen.getByText('On the FM1, set Effect Ch to 5.')).toBeTruthy()

    await next(user)
    expect(screen.getByText('On the FM1, press SAVE and choose Globe.')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('On the FM1, set Effect Ch to 5.')).toBeTruthy()
  })

  it('plays one short Note On then Note Off on the Voice’s own channel', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    setVoiceChannel(0, 3)
    const { midi } = renderWizard()
    await reachSoundTest(user)

    await user.click(screen.getByRole('button', { name: 'Play note' }))

    expect(midi.startNote).toHaveBeenCalledTimes(1)
    expect(midi.startNote).toHaveBeenCalledWith(60, 'C4', { channel: 3, velocity: 80 })
    expect(midi.stopNote).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(midi.stopNote).toHaveBeenCalledTimes(1)
    expect(midi.stopNote).toHaveBeenCalledWith(60, 3)
    expect(screen.getByRole('button', { name: 'Play again' })).toBeTruthy()
  })

  it('answers Heard it, moves to the next Voice, and tests it on its channel', async () => {
    const user = userEvent.setup()
    const { midi } = renderWizard()
    await reachSoundTest(user)

    await user.click(screen.getByRole('button', { name: 'Heard it' }))

    expect(screen.getByRole('heading', { name: 'Voice 2, Ch 2' })).toBeTruthy()
    expect(within(screen.getByRole('list', { name: 'Results' })).getByText('heard')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Play note' }))
    expect(midi.startNote).toHaveBeenLastCalledWith(60, 'C4', { channel: 2, velocity: 80 })
  })

  it('offers “Heard two sounds” only after Voice 1, and explains Not heard in one line', async () => {
    const user = userEvent.setup()
    renderWizard()
    await reachSoundTest(user)
    expect(screen.queryByRole('button', { name: 'Heard two sounds' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Didn’t hear it' }))
    expect(screen.getByRole('status').textContent).toBe(
      'Voice 1: not heard. Check it is On and on Ch 1 on the FM1.',
    )

    await user.click(screen.getByRole('button', { name: 'Heard two sounds' }))
    expect(screen.getByRole('status').textContent).toMatch(/Voice 1 is not on All/)
  })

  it('offers to connect when MIDI is offline and plays nothing until it is', async () => {
    const user = userEvent.setup()
    const connectMidi = vi.fn()
    const { midi } = renderWizard(
      makeLibrarianMidi({ connectMidi, hasMidiOutput: false, midiAccess: false }),
    )
    await reachSoundTest(user)

    expect(screen.getByRole('button', { name: 'Play note' }).getAttribute('aria-disabled')).toBe(
      'true',
    )
    await user.click(screen.getByRole('button', { name: 'Play note' }))
    await user.click(screen.getByRole('button', { name: 'Heard it' }))
    expect(midi.startNote).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Voice 1, Ch 1' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Switch MIDI online to play the note.' }))
    expect(connectMidi).toHaveBeenCalledTimes(1)
  })

  it('releases a sounding note on its channel when the dialog closes', async () => {
    const user = userEvent.setup()
    setVoiceChannel(0, 4)
    const { midi, unmount } = renderWizard()
    await reachSoundTest(user)
    await user.click(screen.getByRole('button', { name: 'Play note' }))

    unmount()

    expect(midi.stopNote).toHaveBeenCalledWith(60, 4)
  })

  it('releases a sounding note through the output it struck it on when the output changes', async () => {
    const user = userEvent.setup()
    const firstStop = vi.fn()
    const secondStop = vi.fn()
    const midi = online({ stopNote: firstStop })
    const { rerender } = render(
      <ToastProvider>
        <VoiceSetupWizard midi={midi} onClose={vi.fn()} />
      </ToastProvider>,
    )
    await reachSoundTest(user)
    await user.click(screen.getByRole('button', { name: 'Play note' }))

    rerender(
      <ToastProvider>
        <VoiceSetupWizard
          midi={{ ...midi, selectedOutputId: 'other', stopNote: secondStop }}
          onClose={vi.fn()}
        />
      </ToastProvider>,
    )

    expect(firstStop).toHaveBeenCalledWith(60, 1)
    expect(secondStop).not.toHaveBeenCalled()
  })

  it('stops the note timer when a MIDI panic or MIDI going offline releases it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const midi = online()
    const { rerender } = render(
      <ToastProvider>
        <VoiceSetupWizard midi={midi} onClose={vi.fn()} />
      </ToastProvider>,
    )
    await reachSoundTest(user)
    await user.click(screen.getByRole('button', { name: 'Play note' }))
    expect(midi.stopNote).not.toHaveBeenCalled()

    rerender(
      <ToastProvider>
        <VoiceSetupWizard midi={{ ...midi, midiPanicCount: 1 }} onClose={vi.fn()} />
      </ToastProvider>,
    )
    expect(midi.stopNote).toHaveBeenCalledTimes(1)

    // The timer is gone, so the note is not released a second time.
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(midi.stopNote).toHaveBeenCalledTimes(1)
  })

  it('summarises the Voices to fix, closes with a toast', async () => {
    const user = userEvent.setup()
    const { onClose } = renderWizard()
    await reachSoundTest(user)

    await user.click(screen.getByRole('button', { name: 'Heard it' }))
    await user.click(screen.getByRole('button', { name: 'Didn’t hear it' }))
    await next(user)

    expect(screen.getByText(/Some Voices need another look/)).toBeTruthy()
    expect(screen.getByText(/Voice 2: not heard/)).toBeTruthy()
    expect(screen.getByText('Voice 3: not tested.')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(screen.getByText('Voices set up: 1 of 8 heard.')).toBeTruthy()
    expect(onClose).toHaveBeenCalled()
  })

  it('says every Voice played when all eight were heard', async () => {
    const user = userEvent.setup()
    renderWizard()
    await reachSoundTest(user)
    for (let voice = 0; voice < 8; voice += 1) {
      await user.click(screen.getByRole('button', { name: 'Heard it' }))
    }
    await next(user)

    expect(screen.getByText('Every Voice played on its own channel.')).toBeTruthy()
  })

  it('writes its screens in Ukrainian and keeps Voice in English', async () => {
    await setLocale('uk')
    const user = userEvent.setup()
    renderWizard()

    expect(screen.getByRole('dialog', { name: 'Налаштування Voice' })).toBeTruthy()
    expect(screen.getByText('Voice 1: Кан. 1')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Далі' }))
    expect(screen.getByText('На FM1 встановіть Effect Ch на 5.')).toBeTruthy()
  })

  it('survives a page translator replacing the answer buttons’ text', async () => {
    const user = userEvent.setup()
    renderWizard()
    await reachSoundTest(user)

    translatePageText(document.body)
    await user.click(screen.getByRole('button', { name: 'Play note' }))
    await user.click(screen.getByRole('button', { name: 'Heard it' }))

    expect(screen.getByRole('heading', { name: 'Voice 2, Ch 2' })).toBeTruthy()
  })
})
