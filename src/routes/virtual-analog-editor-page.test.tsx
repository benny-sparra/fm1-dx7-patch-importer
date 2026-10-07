// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import type { Patch } from '@/data/patches'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import { virtualAnalogRow } from '@/lib/fm1-va-virtual-analog-editor'
import { MidiLogStore } from '@/lib/midi-log-store'
import { VirtualAnalogEditorPage } from '@/routes/virtual-analog-editor-page'
import { capturedVirtualAnalogFilterOnReply } from '@/test/fm1-va-captures'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { makeFm1VaPresetReply } from '@/test/fm1-va-replies'
import {
  capturedVirtualAnalogRecord,
  capturedVirtualAnalogVoice,
} from '@/test/fm1-va-virtual-analog'

type Midi = ComponentProps<typeof VirtualAnalogEditorPage>['midi']

beforeAll(() => {
  window.scrollTo = vi.fn()
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
  }
})

afterEach(cleanup)

const patch: Patch = {
  bank: 'D',
  family: 'VA',
  id: 'D-1',
  name: 'VOICE 97',
  number: 1,
  program: 96,
}

/** Renders the editor on preset 097, which a fake FM1 on FM-1_096 answers with `presetReply`. */
function setup({
  firmware = 'FM-1_096',
  presetReply = () => capturedVirtualAnalogFilterOnReply,
  shownPatch = patch,
}: {
  firmware?: string
  presetReply?: (slot: number) => Uint8Array
  shownPatch?: Patch
} = {}) {
  const ports = makeFakeFm1Ports({ presetReply })
  const midi: Midi = {
    channel: 1,
    firmware: { identity: firmware, kind: 'fm1-va' },
    logStore: new MidiLogStore([]),
    sendEffectParameter: vi.fn(() => true),
    sysexAvailable: true,
    ...makeFakeFm1Devices(ports),
  }
  const onBack = vi.fn()
  const onSave = vi.fn<(voice: Uint8Array, effects: Uint8Array, record: Uint8Array) => void>()
  const record = capturedVirtualAnalogRecord()
  const voice = capturedVirtualAnalogVoice()
  render(
    <VirtualAnalogEditorPage
      effects={makeDefaultFm1Effects()}
      midi={midi}
      onBack={onBack}
      onSave={onSave}
      patch={shownPatch}
      record={record}
      voice={voice}
    />,
  )
  const controlChanges = () =>
    ports.output.send.mock.calls
      .map(([data]) => Array.from(data))
      .filter((data) => data[0] === 0xb0)
      .map(([, controller, value]) => [controller, value])
  return { controlChanges, midi, onBack, onSave, ports, record, user: userEvent.setup(), voice }
}

describe('VirtualAnalogEditorPage', () => {
  it('marks the patch VA beside its slot code, as its card does', () => {
    setup()

    expect(screen.getByText('Virtual Analogue preset')).toBeTruthy()
  })

  it('picks the waveform from a dropdown of drawings, as the voice editor picks its algorithm', async () => {
    const { record, user, voice } = setup()
    const before = virtualAnalogRow('waveform').read(voice, record)
    const names = ['Sine', 'Saw', 'Triangle', 'Square']

    await user.click(screen.getByLabelText(`Waveform: ${names[before]}`))
    const waveforms = within(screen.getByRole('radiogroup', { name: 'Waveform' }))
    for (const name of names) {
      expect(waveforms.getByRole('radio', { name }).querySelector('svg')).toBeTruthy()
    }
    const next = names[(before + 1) % names.length]
    await user.click(waveforms.getByRole('radio', { name: next }))

    expect(screen.getByLabelText(`Waveform: ${next}`)).toBeTruthy()
    expect(screen.getByLabelText(`Waveform: ${next}`).closest('details')?.open).toBe(false)
  })

  it('picks the filter type from tiles of drawn responses', async () => {
    const { record, user, voice } = setup()
    const before = virtualAnalogRow('filterType').read(voice, record)
    const names = ['Low pass 12 dB', 'Low pass 24 dB', 'Band pass', 'High pass']

    const types = within(screen.getByRole('radiogroup', { name: 'Filter type' }))
    for (const name of names) {
      expect(types.getByRole('radio', { name }).closest('label')?.querySelector('svg')).toBeTruthy()
    }
    expect(types.getByRole('radio', { name: names[before] })).toHaveProperty('checked', true)
    const next = names[(before + 1) % names.length]
    await user.click(types.getByRole('radio', { name: next }))

    expect(types.getByRole('radio', { name: next })).toHaveProperty('checked', true)
  })

  it('turns Key tracking as a dial of four steps, read out as 0, 33, 67, and 100', async () => {
    const { controlChanges } = setup()
    await waitFor(() => expect(controlChanges().length).toBeGreaterThan(0))
    const dial = screen.getByRole('slider', { name: 'Key tracking' })

    fireEvent.keyDown(dial, { key: 'Home' })
    expect(dial.getAttribute('aria-valuetext')).toBe('0')
    fireEvent.keyDown(dial, { key: 'ArrowUp' })
    expect(dial.getAttribute('aria-valuetext')).toBe('33')
    fireEvent.keyDown(dial, { key: 'End' })

    expect(dial.getAttribute('aria-valuetext')).toBe('100')
    expect(controlChanges().map(([controller]) => controller)).toContain(56)
  })

  it('reads Key tracking out in the interface language', async () => {
    await setLocale('de')
    try {
      setup()
      const dial = screen.getByRole('slider', { name: 'Tastaturverfolgung' })
      fireEvent.keyDown(dial, { key: 'End' })
      expect(dial.getAttribute('aria-valuetext')).toBe('100')
    } finally {
      await setLocale('en-GB')
    }
  })

  it('explains each setting in a help popover, as the voice editor does', async () => {
    const { user } = setup()

    await user.hover(screen.getByRole('button', { name: 'Help: Super' }))

    expect(screen.getByText(/^Adds six more copies of the wave/)).toBeTruthy()
  })

  it('shows each row as the preset stores it', () => {
    const { record, voice } = setup()
    const superValue = virtualAnalogRow('super').read(voice, record)
    expect((screen.getByRole('slider', { name: 'Super' }) as HTMLInputElement).value).toBe(
      String(superValue),
    )
    expect(
      screen.getByLabelText(
        `Waveform: ${['Sine', 'Saw', 'Triangle', 'Square'][virtualAnalogRow('waveform').read(voice, record)]}`,
      ),
    ).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Patch name' })).toHaveProperty('value', 'VOICE 97')
  })

  it('reads the FM1’s preset in the slot, then plays changes on it as they are made', async () => {
    const { controlChanges, ports } = setup()

    await waitFor(() => expect(controlChanges().length).toBeGreaterThan(0))
    // While changes play on the FM1, no line explains anything.
    expect(screen.queryByText(/preset 097/)).toBeNull()
    const read = ports.output.send.mock.calls.find(([data]) => data[4] === 0x10)
    expect(read?.[0][5]).toBe(96)
    // Going live sends every setting with a controller, so the FM1 plays the version shown.
    expect(controlChanges().map(([controller]) => controller)).toContain(74)

    ports.output.send.mockClear()
    fireEvent.change(screen.getByRole('slider', { name: 'Noise' }), { target: { value: '60' } })
    expect(controlChanges()).toEqual([[29, 76]])
  })

  it('sends nothing to a slot holding a preset of another engine, and says so', async () => {
    const { controlChanges, ports } = setup({ presetReply: (slot) => makeFm1VaPresetReply(slot) })

    expect(await screen.findByText(/^The FM1’s preset 097 plays another engine/)).toBeTruthy()
    ports.output.send.mockClear()
    fireEvent.change(screen.getByRole('slider', { name: 'Noise' }), { target: { value: '60' } })
    expect(controlChanges()).toEqual([])
  })

  it('says a patch outside banks A–D has no preset to play it, and reads nothing', () => {
    const { ports } = setup({ shownPatch: { ...patch, bank: 'E', program: undefined } })

    expect(screen.getByText(/^This patch isn’t in banks A–D/)).toBeTruthy()
    expect(ports.output.send).not.toHaveBeenCalled()
  })

  it('says changes play live only from FM-1_086', () => {
    const { ports } = setup({ firmware: 'FM-1_085' })

    expect(screen.getByText(/^With Baud Girl’s firmware FM-1_086 or later/)).toBeTruthy()
    expect(ports.output.send).not.toHaveBeenCalled()
  })

  it('saves only the bytes of the rows changed', async () => {
    const { controlChanges, onSave, record, user, voice } = setup()
    await waitFor(() => expect(controlChanges().length).toBeGreaterThan(0))

    fireEvent.change(screen.getByRole('slider', { name: 'Sub' }), { target: { value: '40' } })
    fireEvent.change(screen.getByRole('slider', { name: 'Level' }), { target: { value: '70' } })
    await user.click(screen.getByRole('button', { name: /^Save/ }))

    const [savedVoice, , savedRecord] = onSave.mock.calls[0]
    expect([...savedRecord.keys()].filter((index) => savedRecord[index] !== record[index])).toEqual(
      [45],
    )
    expect(savedRecord[45]).toBe(0x80 | 40)
    expect([...savedVoice.keys()].filter((index) => savedVoice[index] !== voice[index])).toEqual([
      14,
    ])
    expect(savedVoice[14]).toBe(70)
  })

  it('undoes a held arrow key in one step', async () => {
    const { controlChanges, user } = setup()
    await waitFor(() => expect(controlChanges().length).toBeGreaterThan(0))
    const drift = screen.getByRole('slider', { name: 'Drift' }) as HTMLInputElement
    const before = drift.value

    fireEvent.keyDown(drift, { key: 'ArrowRight' })
    fireEvent.change(drift, { target: { value: String(Number(before) + 1) } })
    fireEvent.keyDown(drift, { key: 'ArrowRight', repeat: true })
    fireEvent.change(drift, { target: { value: String(Number(before) + 2) } })
    fireEvent.change(drift, { target: { value: String(Number(before) + 3) } })
    fireEvent.keyUp(drift, { key: 'ArrowRight' })
    expect(Number(drift.value)).toBe(Number(before) + 3)
    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(drift.value).toBe(before)
  })

  it('disables the Envelope’s fields while it is off, and sends them as it is switched on', async () => {
    const { controlChanges, ports, user } = setup()
    await waitFor(() => expect(controlChanges().length).toBeGreaterThan(0))
    expect(screen.getByRole('spinbutton', { name: 'Attack' })).toHaveProperty('disabled', true)

    ports.output.send.mockClear()
    await user.click(screen.getByRole('switch', { name: 'Envelope' }))

    expect(screen.getByRole('spinbutton', { name: 'Attack' })).toHaveProperty('disabled', false)
    expect(
      controlChanges()
        .map(([controller]) => controller)
        .sort((a, b) => a - b),
    ).toEqual([70, 72, 73, 75])
  })

  it('undoes a drag of an envelope point in one step', async () => {
    vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue({
      height: 180,
      left: 0,
      top: 0,
      width: 600,
    } as DOMRect)
    const { user } = setup()
    await user.click(screen.getByRole('switch', { name: 'Envelope' }))
    const release = screen.getByRole('spinbutton', { name: 'Release' }) as HTMLInputElement
    const point = screen.getByTestId('adsr-point-4')

    fireEvent.pointerDown(point, { clientX: 500, clientY: 150, pointerId: 1 })
    fireEvent.pointerMove(point, { clientX: 560, clientY: 150, pointerId: 1 })
    fireEvent.pointerUp(point, { pointerId: 1 })
    expect(Number(release.value)).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(release.value).toBe('0')
    vi.restoreAllMocks()
  })

  it('takes a typed Envelope value as one undo step', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('switch', { name: 'Envelope' }))
    const decay = screen.getByRole('spinbutton', { name: 'Decay' }) as HTMLInputElement

    await user.click(decay)
    await user.keyboard('75')
    await user.tab()
    expect(decay.value).toBe('75')
    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(decay.value).toBe('0')
  })

  it('minimises and restores the effects unit from the panel title', async () => {
    const { user } = setup()

    expect(screen.getByRole('slider', { name: 'Reverb Decay' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Minimise Effects' }))
    expect(screen.queryByRole('slider', { name: 'Reverb Decay' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Expand Effects' }))
    expect(screen.getByRole('slider', { name: 'Reverb Decay' })).toBeTruthy()
  })

  it('lists Init patch, then Randomise, then the Virtual Analog sound presets', async () => {
    const { user } = setup()

    await user.click(screen.getByLabelText('Sound presets'))
    const items = within(
      screen.getByLabelText('Sound presets').closest('details') as HTMLElement,
    ).getAllByRole('button')

    expect(items.slice(0, 3).map((button) => button.querySelector('span')?.textContent)).toEqual([
      'Init patch',
      'Randomise',
      'Super saw',
    ])
  })

  it('applies a sound preset as one undo step and closes the menu', async () => {
    const { controlChanges, user } = setup()
    await waitFor(() => expect(controlChanges().length).toBeGreaterThan(0))
    const sub = screen.getByRole('slider', { name: 'Sub' }) as HTMLInputElement
    const before = sub.value

    await user.click(screen.getByLabelText('Sound presets'))
    await user.click(screen.getByRole('button', { name: /^Mono bass/ }))

    expect(screen.getByLabelText('Sound presets').closest('details')?.open).toBe(false)
    expect(sub.value).toBe('60')
    expect(screen.getByRole('switch', { name: 'Monophonic' })).toHaveProperty('checked', true)
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(sub.value).toBe(before)
  })

  it('asks before leaving with unsaved changes', async () => {
    const { onBack, user } = setup()
    fireEvent.change(screen.getByRole('slider', { name: 'Sub' }), { target: { value: '40' } })

    await user.click(screen.getByRole('button', { name: 'Back to patch banks' }))

    expect(onBack).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  describe('in German', () => {
    afterEach(async () => {
      await setLocale('en-GB')
    })

    it('names the preset it cannot play on in the interface language', async () => {
      await setLocale('de')
      setup({ presetReply: (slot) => makeFm1VaPresetReply(slot) })

      expect(
        await screen.findByText(/^Preset 097 des FM1 ist kein Virtual-Analog-Preset/),
      ).toBeTruthy()
    })
  })
})
