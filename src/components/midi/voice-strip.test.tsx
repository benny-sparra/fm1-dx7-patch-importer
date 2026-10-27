// @vitest-environment jsdom

import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { VoiceStrip } from '@/components/midi/voice-strip'
import { HelpPopover } from '@/components/ui/help-popover'
import { PortalMenu } from '@/components/ui/portal-menu'
import { ToastProvider } from '@/components/ui/toast'
import { midiActivity, midiActivityLitMs } from '@/lib/midi-activity'
import {
  assignVoicePreset,
  getVoiceSetup,
  resetVoiceSetupForTests,
  setVoiceChannel,
  setVoiceOn,
} from '@/lib/voice-setup'
import { makeLibrarianMidi } from '@/test/librarian-fakes'
import {
  getVoiceSetupGuided,
  markVoiceSetupGuided,
  resetVoiceSetupGuidedForTests,
} from '@/lib/voice-setup-guided'
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

async function chooseFromMenu(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  menu = 'Voice actions',
) {
  await user.click(screen.getByRole('button', { name: menu }))
  await user.click(screen.getByRole('menuitem', { name }))
}

function presetLabel(preset: number) {
  return presetLabels.get(preset) ?? `#${preset}`
}

function Strip({
  hasMidiOutput = true,
  initialChannel = 1,
  onAim = vi.fn(),
  onSendSetup = vi.fn(() => 0),
  sendEffectSettings = vi.fn(() => Promise.resolve(true)),
}: {
  hasMidiOutput?: boolean
  initialChannel?: number
  onAim?: (preset: number | null) => void
  onSendSetup?: () => number
  sendEffectSettings?: (settings: Uint8Array) => Promise<boolean>
}) {
  const [channel, setChannel] = useState(initialChannel)
  const [effectsOpen, setEffectsOpen] = useState(false)
  return (
    <ToastProvider>
      <p>Note channel {channel}</p>
      <VoiceStrip
        effectsOpen={effectsOpen}
        midi={makeLibrarianMidi({ channel, hasMidiOutput, sendEffectSettings, setChannel })}
        onAim={onAim}
        onEffectsOpenChange={setEffectsOpen}
        onSendSetup={onSendSetup}
        presetLabel={presetLabel}
        renderHelp={(label, text) => <HelpPopover label={label} text={text} />}
        renderMenu={({ items, menuLabel }) => (
          <PortalMenu items={items} menuLabel={menuLabel} triggerLabel={menuLabel} />
        )}
      />
    </ToastProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  resetVoiceSetupForTests()
  resetVoiceSetupGuidedForTests()
  // The first-time line has its own tests; the others run as if it were done with.
  markVoiceSetupGuided()
})

afterEach(async () => {
  cleanup()
  await setLocale('en-GB')
})

describe('VoiceStrip', () => {
  it('lights a Voice’s indicator while its channel carries MIDI, and darkens it after', () => {
    vi.useFakeTimers()
    try {
      setVoiceChannel(2, 5)
      render(<Strip />)
      const lamp = (number: number) =>
        screen.getByRole('switch', { name: `Voice ${number} on` }).firstElementChild
      expect(lamp(3)?.hasAttribute('data-lit')).toBe(false)

      act(() => midiActivity.signal('out', 5))
      expect(lamp(3)?.hasAttribute('data-lit')).toBe(true)
      expect(lamp(4)?.hasAttribute('data-lit')).toBe(false)

      act(() => {
        vi.advanceTimersToNextFrame()
        vi.advanceTimersByTime(midiActivityLitMs)
      })
      expect(lamp(3)?.hasAttribute('data-lit')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows each Voice with its channel and the patch it plays', () => {
    assignVoicePreset(0, 0)
    assignVoicePreset(2, 66)
    render(<Strip />)

    const voices = within(screen.getByRole('group', { name: 'Voices 1–8' }))
      .getAllByRole('button')
      .filter((button) => button.hasAttribute('aria-label'))
    expect(voices.map((voice) => voice.getAttribute('aria-label'))).toEqual([
      'Voice 1, Ch 1: A01 BRASS 1, on',
      'Voice 2, Ch 2: No patch, on',
      'Voice 3, Ch 3: C03 E.PIANO 1, on',
      'Voice 4, Ch 4: No patch, on',
      'Voice 5, Ch 5: No patch, on',
      'Voice 6, Ch 6: No patch, on',
      'Voice 7, Ch 7: No patch, on',
      'Voice 8, Ch 8: No patch, on',
    ])
    // Its tooltip says the same, since the cell shows only the Voice's number.
    expect(voices[2]?.title).toBe('Voice 3, Ch 3: C03 E.PIANO 1, on')
  })

  it('switches a Voice on and off without aiming at it', async () => {
    const user = userEvent.setup()
    render(<Strip initialChannel={4} />)

    const toggle = screen.getByRole('switch', { name: 'Voice 2 on' })
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    await user.click(toggle)

    expect(screen.getByRole('switch', { name: 'Voice 2 on' }).getAttribute('aria-checked')).toBe(
      'false',
    )
    expect(getVoiceSetup().voices[1]?.on).toBe(false)
    expect(screen.getByText('Note channel 4')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Voice 4,/, pressed: true })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Voice 2, Ch 2: No patch, off' })).toBeTruthy()
  })

  it('lets a Voice that is off be aimed at, so its patch and channel can be set first', async () => {
    const user = userEvent.setup()
    setVoiceOn(2, false)
    render(<Strip />)

    await user.click(screen.getByRole('button', { name: /^Voice 3,/ }))

    expect(screen.getByText('Note channel 3')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Voice 3,.*off$/, pressed: true })).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'Voice 3 on' }).getAttribute('aria-checked')).toBe(
      'false',
    )
  })

  it('has one switch for each Voice, and no tab list that would hold them', () => {
    render(<Strip />)

    expect(screen.getAllByRole('switch')).toHaveLength(8)
    expect(screen.queryByRole('tablist')).toBeNull()
  })

  it('names a Voice’s preset as the app labels it', () => {
    assignVoicePreset(1, 127)
    render(<Strip />)

    expect(screen.getByRole('button', { name: 'Voice 2, Ch 2: D32, on' })).toBeTruthy()
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

  it('recalls the Voices from the menu and names the Voices it went to', async () => {
    assignVoicePreset(0, 0)
    assignVoicePreset(2, 66)
    const onSendSetup = vi.fn(() => 2)
    render(<Strip onSendSetup={onSendSetup} />)

    await chooseFromMenu(userEvent.setup(), 'Recall voices')

    expect(onSendSetup).toHaveBeenCalledOnce()
    expect(await screen.findByText('Recalled Voice 1 and Voice 3')).toBeTruthy()
  })

  it('says so in an alert, and not in a notification, when a patch did not go', async () => {
    assignVoicePreset(0, 0)
    assignVoicePreset(2, 66)
    render(<Strip onSendSetup={() => 1} />)

    await chooseFromMenu(userEvent.setup(), 'Recall voices')

    expect(screen.getByRole('alert').textContent).toContain('Some patches did not reach the FM1')
    expect(screen.queryByText(/^Recalled/)).toBeNull()
  })

  it('has an Effects tab after the eight Voices, which lights in place of the Voice aimed at', async () => {
    const user = userEvent.setup()
    render(<Strip />)
    const group = screen.getByRole('group', { name: 'Voices 1–8' })
    const buttons = within(group).getAllByRole('button')
    const effects = within(group).getByRole('button', { name: 'Effects' })
    expect(buttons.at(-1)).toBe(effects)
    expect(effects.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: /^Voice 1,/ }).getAttribute('aria-pressed')).toBe(
      'true',
    )

    await user.click(effects)

    expect(effects.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /^Voice 1,/ }).getAttribute('aria-pressed')).toBe(
      'false',
    )
    await user.click(screen.getByRole('button', { name: /^Voice 3,/ }))
    expect(effects.getAttribute('aria-pressed')).toBe('false')
  })

  it('sends all 24 effects after the Voices when recalling them, and sends none when opening the tab', async () => {
    assignVoicePreset(0, 0)
    const sendEffectSettings = vi.fn((_settings: Uint8Array) => Promise.resolve(true))
    const user = userEvent.setup()
    render(<Strip onSendSetup={() => 1} sendEffectSettings={sendEffectSettings} />)
    await user.click(screen.getByRole('button', { name: 'Effects' }))
    expect(sendEffectSettings).not.toHaveBeenCalled()

    await chooseFromMenu(user, 'Recall voices')

    expect(sendEffectSettings).toHaveBeenCalledOnce()
    expect(sendEffectSettings.mock.calls[0][0]).toHaveLength(24)
  })

  it('says so when the effects did not reach the FM1 on recall', async () => {
    assignVoicePreset(0, 0)
    render(<Strip onSendSetup={() => 1} sendEffectSettings={() => Promise.resolve(false)} />)

    await chooseFromMenu(userEvent.setup(), 'Recall voices')

    expect((await screen.findByRole('alert')).textContent).toContain('did not reach the FM1')
  })

  it('holds Recall voices in a menu, with no Send setup button beside it', async () => {
    assignVoicePreset(0, 0)
    const user = userEvent.setup()
    render(<Strip />)
    expect(screen.queryByRole('button', { name: /Send setup|Recall voices/ })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Voice actions' }))

    const item = screen.getByRole('menuitem', { name: 'Recall voices' })
    expect(item.textContent).toContain(
      'Selects each Voice’s preset again and sends the effects. Stores nothing.',
    )
    expect(screen.getByRole('menuitem', { name: 'Voice channels…' })).toBeTruthy()
  })

  it('says why Recall voices is unavailable, in the menu, with no patch on any Voice', async () => {
    const onSendSetup = vi.fn(() => 0)
    const user = userEvent.setup()
    render(<Strip onSendSetup={onSendSetup} />)

    await user.click(screen.getByRole('button', { name: 'Voice actions' }))
    const item = screen.getByRole('menuitem', { name: 'Recall voices' })

    expect((item as HTMLButtonElement).disabled).toBe(true)
    expect(item.textContent).toMatch(/None of Voices 1–8 has a patch yet/)
    await user.click(item)
    expect(onSendSetup).not.toHaveBeenCalled()
  })

  it('says in one line that the FM1 needs setting up first, with the steps behind help', async () => {
    const user = userEvent.setup()
    render(<Strip />)
    const notice = screen.getByRole('status')
    expect(notice.textContent).toBe('Set up your FM1’s Voices first.')

    await user.hover(within(notice).getByRole('button', { name: /^Help: setting up/ }))

    expect(screen.getByRole('note').textContent).toMatch(/switch each one On, leave none on All/)
    expect(screen.getByRole('note').textContent).toMatch(/leave none on All/)
  })

  it('drops the setup line once a Voice has a patch', () => {
    act(() => assignVoicePreset(0, 0))
    render(<Strip />)

    expect(screen.queryByText(/Set up your FM1’s Voices first/)).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('writes the setup line and its steps in the interface language', async () => {
    await setLocale('de')
    const user = userEvent.setup()
    render(<Strip />)

    expect(screen.getByText('Richte zuerst die Voices am FM1 ein.')).toBeTruthy()
    await user.hover(screen.getByRole('button', { name: /^Hilfe: / }))
    expect(screen.getByRole('note').textContent).toMatch(/braucht einmalig eine Einrichtung/)
  })

  it('keeps Recall voices unavailable, saying why, without a MIDI output', async () => {
    assignVoicePreset(0, 0)
    const user = userEvent.setup()
    render(<Strip hasMidiOutput={false} />)

    await user.click(screen.getByRole('button', { name: 'Voice actions' }))

    const item = screen.getByRole('menuitem', { name: 'Recall voices' })
    expect((item as HTMLButtonElement).disabled).toBe(true)
    expect(item.textContent).toContain('Switch MIDI online to recall the Voices.')
  })

  it('writes the menu in the interface language', async () => {
    await setLocale('de')
    const user = userEvent.setup()
    render(<Strip />)

    await user.click(screen.getByRole('button', { name: 'Voice-Aktionen' }))

    expect(screen.getByRole('menuitem', { name: 'Voices abrufen' })).toBeTruthy()
  })

  it('keeps the channels in a dialog, with the note on setting the Voices up on the FM1', async () => {
    const user = userEvent.setup()
    render(<Strip />)
    expect(screen.queryByRole('combobox')).toBeNull()

    await chooseFromMenu(user, 'Voice channels…')

    const dialog = screen.getByRole('dialog', { name: 'Voice channels (as set on your FM1)' })
    expect(within(dialog).getByText(/doesn’t change the FM1/)).toBeTruthy()
    expect(within(dialog).queryByText(/leave none on All/)).toBeNull()
    expect(within(dialog).getAllByRole('combobox')).toHaveLength(8)

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('stores a Voice’s channel, and moves the note channel with the Voice aimed at', async () => {
    const user = userEvent.setup()
    render(<Strip initialChannel={2} />)
    await chooseFromMenu(user, 'Voice channels…')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Voice 2 channel' }), 'Ch 9')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Voice 5 channel' }), 'Ch 12')

    expect(getVoiceSetup().voices.map((voice) => voice.channel)).toEqual([1, 9, 3, 4, 12, 6, 7, 8])
    expect(screen.getByText('Note channel 9')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Voice 2, Ch 9/, pressed: true })).toBeTruthy()
  })

  it('writes the Voices and the recall notification in the interface language', async () => {
    await setLocale('de')
    assignVoicePreset(0, 0)
    assignVoicePreset(3, 66)
    render(<Strip onSendSetup={() => 2} />)

    expect(screen.getByRole('button', { name: 'Voice 1, Kan. 1: A01 BRASS 1, ein' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Voice 2, Kan. 2: Kein Sound, ein' })).toBeTruthy()

    await chooseFromMenu(userEvent.setup(), 'Voices abrufen', 'Voice-Aktionen')

    expect(await screen.findByText('Abgerufen: Voice 1 und Voice 4')).toBeTruthy()
  })

  it('keeps working once a page translator has replaced its text', async () => {
    const { container } = render(<Strip />)
    translatePageText(container)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /^Voice 3,/ }))
    act(() => assignVoicePreset(2, 0))
    await chooseFromMenu(user, 'Voice channels…')

    expect(screen.getByRole('button', { name: 'Voice 3, Ch 3: A01 BRASS 1, on' })).toBeTruthy()
    expect(screen.getByRole('dialog').textContent).toContain('doesn’t change the FM1')
  })

  it('tells the page which preset the clicked Voice plays, or none', async () => {
    const user = userEvent.setup()
    assignVoicePreset(2, 66)
    const onAim = vi.fn()
    render(<Strip onAim={onAim} />)

    await user.click(screen.getByRole('button', { name: /^Voice 3,/ }))
    await user.click(screen.getByRole('button', { name: /^Voice 4,/ }))
    await user.click(screen.getByRole('switch', { name: 'Voice 3 on' }))

    expect(onAim.mock.calls).toEqual([[66], [null]])
  })

  describe('the first-time Set up Voices line', () => {
    beforeEach(() => {
      localStorage.clear()
      resetVoiceSetupGuidedForTests()
    })

    it('shows one line that opens the wizard, in place of the older setup line', async () => {
      const user = userEvent.setup()
      render(<Strip />)

      expect(screen.getByRole('status').textContent).toBe('Set up your FM1’s Voices')
      expect(screen.queryByText(/Voices first/)).toBeNull()

      await user.click(screen.getByRole('button', { name: 'Set up your FM1’s Voices' }))

      expect(await screen.findByRole('dialog', { name: 'Set up Voices' })).toBeTruthy()
    })

    it('stays gone for good once closed, here and on the next visit', async () => {
      const user = userEvent.setup()
      const { unmount } = render(<Strip />)

      await user.click(screen.getByRole('button', { name: 'Dismiss the Voice setup line' }))
      expect(screen.queryByRole('button', { name: 'Set up your FM1’s Voices' })).toBeNull()
      expect(getVoiceSetupGuided()).toBe(true)

      unmount()
      resetVoiceSetupGuidedForTests()
      render(<Strip />)
      expect(screen.queryByRole('button', { name: 'Set up your FM1’s Voices' })).toBeNull()
    })

    it('goes once the wizard finishes', async () => {
      const user = userEvent.setup()
      render(<Strip />)
      await user.click(screen.getByRole('button', { name: 'Set up your FM1’s Voices' }))
      const dialog = await screen.findByRole('dialog', { name: 'Set up Voices' })
      for (let step = 0; step < 4; step += 1) {
        await user.click(within(dialog).getByRole('button', { name: /^Next/ }))
      }
      await user.click(within(dialog).getByRole('button', { name: 'Finish' }))

      expect(screen.queryByRole('button', { name: 'Set up your FM1’s Voices' })).toBeNull()
    })

    it('writes the line in the interface language', async () => {
      await setLocale('de')
      render(<Strip />)

      expect(screen.getByRole('button', { name: 'Richte die Voices deines FM1 ein' })).toBeTruthy()
    })
  })

  it('opens the wizard from Set up Voices… in the menu, beside Voice channels…', async () => {
    const user = userEvent.setup()
    render(<Strip />)

    await user.click(screen.getByRole('button', { name: 'Voice actions' }))
    const items = screen.getAllByRole('menuitem').map((item) => item.textContent)
    expect(items.some((text) => text?.startsWith('Set up Voices…'))).toBe(true)
    expect(items.some((text) => text?.startsWith('Voice channels…'))).toBe(true)
    await user.click(screen.getByRole('menuitem', { name: /^Set up Voices…/ }))

    expect(await screen.findByRole('dialog', { name: 'Set up Voices' })).toBeTruthy()
  })
})
