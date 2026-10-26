// @vitest-environment jsdom

import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { VoiceStrip } from '@/components/midi/voice-strip'
import { ToastProvider } from '@/components/ui/toast'
import {
  assignVoicePreset,
  getVoiceSetup,
  resetVoiceSetupForTests,
  setVoiceChannel,
} from '@/lib/voice-setup'
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

// The labels the app gives FM1 presets 0 (A01) and 66 (C03); any other is its slot code alone.
const presetLabels = new Map([
  [0, 'A01 BRASS 1'],
  [66, 'C03 E.PIANO 1'],
  [127, 'D32'],
])

function presetLabel(preset: number) {
  return presetLabels.get(preset) ?? `#${preset}`
}

function Strip({
  hasMidiOutput = true,
  initialChannel = 1,
  onSendSetup = vi.fn(() => 0),
}: {
  hasMidiOutput?: boolean
  initialChannel?: number
  onSendSetup?: () => number
}) {
  const [channel, setChannel] = useState(initialChannel)
  return (
    <ToastProvider>
      <p>Note channel {channel}</p>
      <VoiceStrip
        midi={{ channel, hasMidiOutput, setChannel }}
        onSendSetup={onSendSetup}
        presetLabel={presetLabel}
      />
    </ToastProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  resetVoiceSetupForTests()
})

afterEach(async () => {
  cleanup()
  await setLocale('en-GB')
})

describe('VoiceStrip', () => {
  it('shows each Voice with its channel and the patch it plays', () => {
    assignVoicePreset(0, 0)
    assignVoicePreset(2, 66)
    render(<Strip />)

    const voices = within(screen.getByRole('group', { name: 'Voices 1–8' })).getAllByRole('button')
    expect(voices.map((voice) => voice.getAttribute('aria-label'))).toEqual([
      'Voice 1, Ch 1: A01 BRASS 1',
      'Voice 2, Ch 2: No patch',
      'Voice 3, Ch 3: C03 E.PIANO 1',
      'Voice 4, Ch 4: No patch',
      'Voice 5, Ch 5: No patch',
      'Voice 6, Ch 6: No patch',
      'Voice 7, Ch 7: No patch',
      'Voice 8, Ch 8: No patch',
    ])
    // On a phone each Voice is its number, with what it plays in the tooltip.
    expect(voices[2]?.title).toBe('Voice 3, Ch 3: C03 E.PIANO 1')
  })

  it('names a Voice’s preset as the app labels it', () => {
    assignVoicePreset(1, 127)
    render(<Strip />)

    expect(screen.getByRole('button', { name: 'Voice 2, Ch 2: D32' })).toBeTruthy()
  })

  it('aims at the Voice on the note channel', () => {
    render(<Strip initialChannel={4} />)

    expect(screen.getByRole('button', { name: /^Voice 4,/, pressed: true })).toBeTruthy()
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1)
  })

  it('aims at a clicked Voice by setting the note channel to its channel', async () => {
    setVoiceChannel(5, 11)
    render(<Strip />)

    await userEvent.setup().click(screen.getByRole('button', { name: /^Voice 6,/ }))

    expect(screen.getByText('Note channel 11')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Voice 6,/, pressed: true })).toBeTruthy()
  })

  it('sends the setup and names the Voices it went to', async () => {
    assignVoicePreset(0, 0)
    assignVoicePreset(2, 66)
    const onSendSetup = vi.fn(() => 2)
    render(<Strip onSendSetup={onSendSetup} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Send setup' }))

    expect(onSendSetup).toHaveBeenCalledOnce()
    expect(await screen.findByText('Sent the setup to Voice 1 and Voice 3')).toBeTruthy()
  })

  it('says so in an alert, and not in a notification, when a patch did not go', async () => {
    assignVoicePreset(0, 0)
    assignVoicePreset(2, 66)
    render(<Strip onSendSetup={() => 1} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Send setup' }))

    expect(screen.getByRole('alert').textContent).toContain('Some patches did not reach the FM1')
    expect(screen.queryByText(/^Sent the setup/)).toBeNull()
  })

  it('keeps Send setup reachable but unavailable, saying why, with no patch on any Voice', async () => {
    const onSendSetup = vi.fn(() => 0)
    render(<Strip onSendSetup={onSendSetup} />)
    const send = screen.getByRole('button', { name: 'Send setup' })

    await userEvent.setup().click(send)

    expect(send.getAttribute('aria-disabled')).toBe('true')
    expect(send.getAttribute('aria-describedby')).toBeTruthy()
    expect(
      document.getElementById(send.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toMatch(/^None of Voices 1–8 has a patch yet/)
    expect(onSendSetup).not.toHaveBeenCalled()
  })

  it('keeps Send setup unavailable without a MIDI output', () => {
    assignVoicePreset(0, 0)
    render(<Strip hasMidiOutput={false} />)

    expect(screen.getByRole('button', { name: 'Send setup' }).title).toBe(
      'Switch MIDI online to send the setup.',
    )
  })

  it('keeps the channels in a dialog, with the note on setting the Voices up on the FM1', async () => {
    const user = userEvent.setup()
    render(<Strip />)
    expect(screen.queryByRole('combobox')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Channels…' }))

    const dialog = screen.getByRole('dialog', { name: 'Channels of Voices 1–8' })
    expect(within(dialog).getByText(/switch each one On, leave none on All/)).toBeTruthy()
    expect(within(dialog).getAllByRole('combobox')).toHaveLength(8)

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('stores a Voice’s channel, and moves the note channel with the Voice aimed at', async () => {
    const user = userEvent.setup()
    render(<Strip initialChannel={2} />)
    await user.click(screen.getByRole('button', { name: 'Channels…' }))

    await user.selectOptions(screen.getByRole('combobox', { name: 'Voice 2 channel' }), 'Ch 9')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Voice 5 channel' }), 'Ch 12')

    expect(getVoiceSetup().voices.map((voice) => voice.channel)).toEqual([1, 9, 3, 4, 12, 6, 7, 8])
    expect(screen.getByText('Note channel 9')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Voice 2, Ch 9/, pressed: true })).toBeTruthy()
  })

  it('writes the Voices and the setup notification in the interface language', async () => {
    await setLocale('de')
    assignVoicePreset(0, 0)
    assignVoicePreset(3, 66)
    render(<Strip onSendSetup={() => 2} />)

    expect(screen.getByRole('button', { name: 'Voice 1, Kan. 1: A01 BRASS 1' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Voice 2, Kan. 2: Kein Sound' })).toBeTruthy()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Setup senden' }))

    expect(await screen.findByText('Setup gesendet an Voice 1 und Voice 4')).toBeTruthy()
  })

  it('keeps working once a page translator has replaced its text', async () => {
    const { container } = render(<Strip />)
    translatePageText(container)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /^Voice 3,/ }))
    act(() => assignVoicePreset(2, 0))
    await user.click(screen.getByRole('button', { name: 'Channels…' }))

    expect(screen.getByRole('button', { name: 'Voice 3, Ch 3: A01 BRASS 1' })).toBeTruthy()
  })
})
