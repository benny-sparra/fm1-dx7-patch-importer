// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const liveLine = /^Your changes play on the FM1’s preset 097 as you make them\./

describe('VirtualAnalogEditorPage', () => {
  it('shows each row as the preset stores it', () => {
    const { record, voice } = setup()
    const superValue = virtualAnalogRow('super').read(voice, record)
    expect((screen.getByRole('slider', { name: 'Super' }) as HTMLInputElement).value).toBe(
      String(superValue),
    )
    expect(screen.getByRole('radio', { name: 'Saw' })).toHaveProperty(
      'checked',
      virtualAnalogRow('waveform').read(voice, record) === 1,
    )
    expect(screen.getByRole('textbox', { name: 'Patch name' })).toHaveProperty('value', 'VOICE 97')
  })

  it('reads the FM1’s preset in the slot, then plays changes on it as they are made', async () => {
    const { controlChanges, ports } = setup()

    expect(await screen.findByText(liveLine)).toBeTruthy()
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
    const { onSave, record, user, voice } = setup()
    await screen.findByText(liveLine)

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
    const { user } = setup()
    await screen.findByText(liveLine)
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

  it('shows the Envelope’s settings while it is on, and sends them as it is switched on', async () => {
    const { controlChanges, ports, user } = setup()
    await screen.findByText(liveLine)
    expect(screen.queryByRole('slider', { name: 'Attack' })).toBeNull()

    ports.output.send.mockClear()
    await user.click(screen.getByRole('switch', { name: 'Envelope' }))

    expect(screen.getByRole('slider', { name: 'Attack' })).toBeTruthy()
    expect(
      controlChanges()
        .map(([controller]) => controller)
        .sort((a, b) => a - b),
    ).toEqual([70, 72, 73, 75])
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

    it('names the preset it plays on in the interface language', async () => {
      await setLocale('de')
      setup()

      await waitFor(() =>
        expect(
          screen.getByText(/^Deine Änderungen erklingen sofort auf Preset 097 des FM1\./),
        ).toBeTruthy(),
      )
    })
  })
})
