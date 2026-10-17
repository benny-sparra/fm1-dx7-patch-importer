// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import type { Patch } from '@/data/patches'
import { packDx7Voice } from '@/lib/dx7'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import { FM1_VOICE_PARAMETER_COUNT } from '@/lib/fm1-parameters'
import { eightBitKeyMarked, eightBitRow } from '@/lib/fm1-va-eight-bit-editor'
import { MidiLogStore } from '@/lib/midi-log-store'
import { eightBitFamily } from '@/lib/patch-library'
import { EightBitEditorPage } from '@/routes/eight-bit-editor-page'
import { capturedEightBitReply } from '@/test/fm1-va-captures'
import { capturedEightBitRecord, capturedEightBitVoice } from '@/test/fm1-va-eight-bit'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { makeFm1VaPresetReply } from '@/test/fm1-va-replies'

type Midi = ComponentProps<typeof EightBitEditorPage>['midi']

beforeAll(() => {
  window.scrollTo = vi.fn()
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
  }
})

afterEach(async () => {
  cleanup()
  await setLocale('en-GB')
})

const patch: Patch = {
  bank: 'D',
  family: eightBitFamily,
  id: 'D-1',
  name: 'NES ROCK',
  number: 1,
  program: 96,
}

/** NES ROCK, preset 097, as the FM1 read it back, with its record changed by `changeRecord`. */
function preset(changeRecord: (record: Uint8Array) => void = () => {}) {
  const record = capturedEightBitRecord()
  changeRecord(record)
  return { record, voice: capturedEightBitVoice() }
}

/** Renders the editor on preset 097, which a fake FM1 on `firmware` answers with `presetReply`. */
function setup({
  firmware = 'FM-1_098',
  presetReply = () => capturedEightBitReply,
  shownPatch = patch,
  stored = preset(),
}: {
  firmware?: string
  presetReply?: (slot: number) => Uint8Array
  shownPatch?: Patch
  stored?: { record: Uint8Array; voice: Uint8Array }
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
  render(
    <EightBitEditorPage
      effects={makeDefaultFm1Effects()}
      midi={midi}
      onBack={onBack}
      onSave={onSave}
      patch={shownPatch}
      record={stored.record}
      voice={stored.voice}
    />,
  )
  const controlChanges = () =>
    ports.output.send.mock.calls
      .map(([data]) => Array.from(data))
      .filter((data) => data[0] === 0xb0)
      .map(([, controller, value]) => [controller, value])
  return { controlChanges, midi, onBack, onSave, ports, ...stored, user: userEvent.setup() }
}

const sliderValue = (name: string) =>
  Number(screen.getByRole('slider', { name }).getAttribute('aria-valuenow'))

/** Turns a knob or fader by `steps` clicks of a held arrow key, as one gesture. */
function nudge(name: string, steps: number) {
  const slider = screen.getByRole('slider', { name })
  for (let step = 0; step < steps; step += 1) {
    fireEvent.keyDown(slider, { key: 'ArrowUp', repeat: step > 0 })
  }
  fireEvent.keyUp(slider, { key: 'ArrowUp' })
}

/** The packed voice byte that holds edit-buffer byte `e`, found by packing it. */
function packedByteOf(e: number) {
  const buffer = new Uint8Array(FM1_VOICE_PARAMETER_COUNT)
  buffer[e] = 0x7f
  return packDx7Voice(buffer).data.findIndex((byte) => byte !== 0)
}

const changedBytes = (after: Uint8Array, before: Uint8Array) =>
  [...after.keys()].filter((index) => after[index] !== before[index])

describe('EightBitEditorPage', () => {
  it('marks the patch 8B beside its slot code, as its card does', () => {
    setup()

    expect(screen.getByText('8-Bit preset')).toBeTruthy()
  })

  it('shows each row as the preset stores it', () => {
    const { record, voice } = setup()

    expect(screen.getByRole('textbox', { name: 'Patch name' })).toHaveProperty('value', 'NES ROCK')
    expect(screen.getByRole('combobox', { name: 'Key' })).toHaveProperty('value', '5')
    expect(screen.getByRole('combobox', { name: 'Bass Wave' })).toHaveProperty(
      'value',
      String(eightBitRow('bassWave').read(voice, record)),
    )
    expect(sliderValue('Bass Level')).toBe(95)
    expect(sliderValue('Drum F0 Pitch')).toBe(40)
  })

  it('names every slider once, so the bass, lead, drum, and Envelope settings can be told apart', () => {
    setup()

    const names = screen.getAllByRole('slider').map((slider) => slider.getAttribute('aria-label'))
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([])
    expect(screen.getByRole('slider', { name: 'Lead Decay' })).toBeTruthy()
    expect(screen.getByRole('slider', { name: 'Envelope Decay' })).toBeTruthy()
  })

  it('shows the FM1’s own names for its lists, as its screen prints them', () => {
    setup()

    const waves = within(screen.getByRole('combobox', { name: 'Lead Wave' }))
      .getAllByRole('option')
      .map((option) => option.textContent)
    expect(waves.slice(0, 2)).toEqual(['Pulse 12.5', 'Pulse 25'])
    expect(waves.at(-1)).toBe('GB Buzz')
  })

  it('opens a drum’s settings from its pad, which shows its wave', async () => {
    const { user } = setup()
    const pads = within(screen.getByRole('radiogroup', { name: 'Drum' }))
    expect(pads.getAllByRole('radio')).toHaveLength(12)

    await user.click(pads.getByRole('radio', { name: /^F#0/ }))

    expect(screen.getByRole('heading', { name: 'Drum F#0' })).toBeTruthy()
    expect(screen.getByRole('slider', { name: 'Drum F#0 Snap' })).toBeTruthy()
    expect(screen.queryByRole('slider', { name: 'Drum F0 Snap' })).toBeNull()
  })

  it('reads the FM1’s preset in the slot, then plays the Envelope, LFO, and effects on it', async () => {
    const { controlChanges, ports } = setup()

    await waitFor(() => expect(controlChanges().length).toBeGreaterThan(0))
    expect(screen.getByText(/^The Envelope, LFO, and effects play on the FM1/)).toBeTruthy()
    const read = ports.output.send.mock.calls.find(([data]) => data[4] === 0x10)
    expect(read?.[0][5]).toBe(96)
    // Going live sends the LFO's controllers; the Envelope is off, so its four wait.
    expect(controlChanges().map(([controller]) => controller)).toEqual(
      expect.arrayContaining([76, 77, 78]),
    )
    expect(controlChanges().map(([controller]) => controller)).not.toContain(73)

    ports.output.send.mockClear()
    fireEvent.keyDown(screen.getByRole('slider', { name: 'LFO speed' }), { key: 'End' })
    expect(controlChanges()).toEqual([[76, 127]])
  })

  it('sends nothing for a setting no controller reaches on an 8-Bit preset', async () => {
    const { controlChanges, ports } = setup()
    await waitFor(() => expect(controlChanges().length).toBeGreaterThan(0))

    ports.output.send.mockClear()
    nudge('Bass Vibrato', 3)
    nudge('Drum F0 Pitch', 3)

    expect(ports.output.send).not.toHaveBeenCalled()
  })

  it('sends nothing to a slot holding a preset of another engine, and says so', async () => {
    const { controlChanges, ports } = setup({ presetReply: (slot) => makeFm1VaPresetReply(slot) })

    expect(await screen.findByText(/^The FM1’s preset 097 plays another engine/)).toBeTruthy()
    ports.output.send.mockClear()
    fireEvent.keyDown(screen.getByRole('slider', { name: 'LFO speed' }), { key: 'End' })
    expect(controlChanges()).toEqual([])
  })

  it('says a patch outside banks A–D has no preset to play it, and reads nothing', () => {
    const { ports } = setup({ shownPatch: { ...patch, bank: 'E', program: undefined } })

    expect(screen.getByText(/^This patch isn’t in banks A–D/)).toBeTruthy()
    expect(ports.output.send).not.toHaveBeenCalled()
  })

  it('says the Envelope, LFO, and effects play live only on FM-1+VA', () => {
    const { ports } = setup({ firmware: 'FM-1_085' })

    expect(screen.getByText(/^With Baud Girl’s firmware FM-1_096 or later/)).toBeTruthy()
    expect(ports.output.send).not.toHaveBeenCalled()
  })

  it('saves only the bits of the rows changed', async () => {
    const { onSave, record, user, voice } = setup({ firmware: 'FM-1_085' })

    nudge('Bass Level', 2)
    await user.click(screen.getByRole('button', { name: /^Save/ }))

    const [savedVoice, , savedRecord] = onSave.mock.calls[0]
    expect(changedBytes(savedRecord, record)).toEqual([])
    expect(changedBytes(savedVoice, voice)).toEqual([packedByteOf(61)])
    expect(eightBitRow('bassLevel').read(savedVoice, savedRecord)).toBe(97)
  })

  it('undoes a held arrow key in one step', async () => {
    const { user } = setup()
    const before = sliderValue('Lead Glide')

    nudge('Lead Glide', 3)
    expect(sliderValue('Lead Glide')).toBe(before + 3)
    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(sliderValue('Lead Glide')).toBe(before)
  })

  it('gives a preset its first Key as the FM1 does, carrying each Arpeggio over, in one undo step', async () => {
    const stored = preset((record) => {
      // A preset that never had a Key, its bass on Fifth and its lead on User.
      record[26] = 0x03
      eightBitRow('bassArpeggio').write(new Uint8Array(128), record, 7)
      eightBitRow('leadArpeggio').write(new Uint8Array(128), record, 32)
    })
    const { user } = setup({ stored })
    expect(screen.getByRole('combobox', { name: 'Bass Arpeggio' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Scale' })).toHaveProperty('disabled', true)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Key' }), 'C')

    expect(screen.queryByRole('combobox', { name: 'Bass Arpeggio' })).toBeNull()
    expect(screen.getByRole('combobox', { name: 'Bass Chord' })).toHaveProperty('value', '6')
    expect(screen.getByRole('combobox', { name: 'Bass Pattern' })).toHaveProperty('value', '1')
    expect(screen.getByRole('combobox', { name: 'Lead Pattern' })).toHaveProperty('value', '17')
    // Pattern User plays the drawn steps, so the lead's Chord is not played.
    expect(screen.getByRole('combobox', { name: 'Lead Chord' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('combobox', { name: 'Scale' })).toHaveProperty('disabled', false)

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByRole('combobox', { name: 'Key' })).toHaveProperty('value', '0')
    expect(screen.getByRole('combobox', { name: 'Bass Arpeggio' })).toHaveProperty('value', '7')
  })

  it('saves a later Key choice with the mark the FM1 keeps', async () => {
    const { onSave, user } = setup({ firmware: 'FM-1_085' })

    await user.selectOptions(screen.getByRole('combobox', { name: 'Key' }), 'Off')
    await user.click(screen.getByRole('button', { name: /^Save/ }))

    const [savedVoice, , savedRecord] = onSave.mock.calls[0]
    expect(savedRecord[26]).toBe(0x40)
    expect(eightBitRow('key').read(savedVoice, savedRecord)).toBe(eightBitKeyMarked)
  })

  it('dims Arp speed on Auto-Chord, as the FM1 does', async () => {
    const { user } = setup()
    expect(screen.getByRole('combobox', { name: 'Bass Arp speed' })).toHaveProperty(
      'disabled',
      false,
    )

    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Bass Note engine' })).getByRole('radio', {
        name: 'Auto-Chord',
      }),
    )

    expect(screen.getByRole('combobox', { name: 'Bass Arp speed' })).toHaveProperty(
      'disabled',
      true,
    )
    expect(screen.getByRole('combobox', { name: 'Bass Pattern' })).toHaveProperty('disabled', true)
  })

  it('reads a User arpeggio step past +18 as End', () => {
    const stored = preset((record) => {
      eightBitRow('bassUserArpeggio2').write(new Uint8Array(128), record, 15)
    })
    setup({ stored })

    expect(screen.getByRole('slider', { name: 'Bass Step 1' }).getAttribute('aria-valuetext')).toBe(
      'End',
    )
    expect(screen.getByRole('slider', { name: 'Bass Step 2' }).getAttribute('aria-valuetext')).toBe(
      '+3',
    )
  })

  it('takes a typed value as the FM1 shows it, for a field it shows with a sign', async () => {
    const { onSave, user } = setup({ firmware: 'FM-1_085' })
    const octave = screen.getByRole('spinbutton', { name: 'Lead Octave' })
    expect(octave).toHaveProperty('value', '0')

    await user.clear(octave)
    await user.type(octave, '2{Enter}')
    await user.clear(screen.getByRole('spinbutton', { name: 'Bass Step 1' }))
    await user.type(screen.getByRole('spinbutton', { name: 'Bass Step 1' }), '-5{Enter}')
    await user.click(screen.getByRole('button', { name: /^Save/ }))

    const [savedVoice, , savedRecord] = onSave.mock.calls[0]
    // Octave is stored + 3, and a User Arpeggio step + 12.
    expect(eightBitRow('leadOctave').read(savedVoice, savedRecord)).toBe(5)
    expect(eightBitRow('bassUserArpeggio1').read(savedVoice, savedRecord)).toBe(7)
  })

  it('captions the User arpeggio’s knobs by number, naming each step in full', () => {
    setup()

    const knob = screen.getByRole('slider', { name: 'Bass Step 3' })
    expect(knob.closest('.grid')?.textContent).toContain('3')
    expect(screen.queryByText('Step 3')).toBeNull()
  })

  it('offers Init patch alone, and applies it as one undo step', async () => {
    const { user } = setup()
    const before = sliderValue('Bass Level')

    await user.click(screen.getByLabelText('Sound presets'))
    const items = within(
      screen.getByLabelText('Sound presets').closest('details') as HTMLElement,
    ).getAllByRole('button')
    expect(items.map((button) => button.querySelector('span')?.textContent)).toEqual(['Init patch'])
    await user.click(items[0])

    expect(screen.getByRole('textbox', { name: 'Patch name' })).toHaveProperty('value', 'NES ROCK')
    expect(screen.getByRole('combobox', { name: 'Key' })).toHaveProperty('value', '0')
    expect(
      screen.getByRole('radiogroup', { name: 'Tone' }).querySelector('input:checked'),
    ).toHaveProperty('value', '1')
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(sliderValue('Bass Level')).toBe(before)
    expect(screen.getByRole('combobox', { name: 'Key' })).toHaveProperty('value', '5')
  })

  it('asks before leaving with unsaved changes', async () => {
    const { onBack, user } = setup()
    nudge('Bass Level', 1)

    await user.click(screen.getByRole('button', { name: /^Back/ }))

    expect(onBack).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { hidden: true })).toHaveProperty('open', true)
  })

  it('names a part’s settings in the interface language', async () => {
    await setLocale('de')
    setup()

    expect(screen.getByRole('slider', { name: 'Drum F0 Tonhöhe' })).toBeTruthy()
    expect(screen.getByRole('slider', { name: 'Bass Pegel' })).toBeTruthy()
  })
})
