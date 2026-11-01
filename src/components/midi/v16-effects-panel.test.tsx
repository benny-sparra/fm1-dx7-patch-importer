// @vitest-environment jsdom
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { V16EffectsPanel } from '@/components/midi/v16-effects-panel'
import type { FxLibrary } from '@/hooks/use-fx-library'
import { setLocale } from '@/i18n'
import { installFakeIndexedDb } from '@/test/fake-indexed-db'
import { renderWithToasts } from '@/test/render-with-toasts'
import { resetV16EffectsForTests } from '@/lib/v16-effects'
import { MidiLogStore } from '@/lib/midi-log-store'
import {
  fxTableOffset,
  makeEffectOrderWrite,
  makeSettingsBlockReadRequest,
  parseSettingsBlockReply,
} from '@/lib/v16-settings-block'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { makeSettingsBlockReply } from '@/test/v16-settings-replies'

beforeAll(async () => {
  await setLocale('en-GB')
})

beforeEach(() => {
  localStorage.clear()
  resetV16EffectsForTests()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function makeLibrary(): FxLibrary {
  return {
    damagedCount: 0,
    delete: vi.fn(),
    duplicate: vi.fn(),
    importPresets: vi.fn(),
    loadError: null,
    pending: false,
    presets: [],
    reload: vi.fn(() => Promise.resolve([])),
    rename: vi.fn(),
    restorePresets: vi.fn(),
    save: vi.fn(),
    status: 'ready',
    update: vi.fn(),
  }
}

type Midi = ComponentProps<typeof V16EffectsPanel>['midi']

const offlineMidi: Midi = {
  effectChannel: 1,
  firmware: { identity: 'FM-1_016', kind: 'mvave' },
  hasMidiOutput: false,
  inputs: [],
  logStore: new MidiLogStore([]),
  outputs: [],
  selectedInputId: '',
  selectedOutputId: '',
  sendSharedEffectParameter: vi.fn(),
  sendSharedEffectSettings: vi.fn(),
  sysexAvailable: false,
}

describe('V16 effects panel', () => {
  it('opens no second library when the page hands it one', () => {
    installFakeIndexedDb()
    const open = vi.spyOn(indexedDB, 'open')
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={offlineMidi} />)

    expect(open).not.toHaveBeenCalled()
  })

  it('says the effects stay in this tab when the stored record is a newer release’s, and keeps it', async () => {
    const user = userEvent.setup()
    const stored = '{"version":2,"effects":[1]}'
    localStorage.setItem('fm1-v16-effects', stored)
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={offlineMidi} />)

    expect(
      screen.getByText(
        'Browser storage can’t keep these effects, so they last only while this tab stays open.',
      ),
    ).toBeTruthy()
    await user.click(screen.getByRole('switch', { name: 'Filter' }))
    expect(localStorage.getItem('fm1-v16-effects')).toBe(stored)
  })

  it('shows no storage notice while the effects are kept', () => {
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={offlineMidi} />)

    expect(screen.queryByText(/last only while this tab stays open/)).toBeNull()
  })

  it('explains in its help that presets leave out the order and front-panel changes', async () => {
    const user = userEvent.setup()
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={offlineMidi} />)
    await user.hover(screen.getByRole('button', { name: 'Help: Effects' }))

    const help = screen.getByRole('note').textContent
    expect(help).toContain('not the effect order.')
    expect(help).toContain('Front-panel changes are not read back by the editor.')
  })
})

function makeBlock(order = [2, 0, 1, 3, 5, 4]) {
  const bytes = Array.from({ length: 176 }, () => 0)
  bytes[0] = 0x0e
  ;[...order, 6, 7, 8].forEach((effect, entry) => {
    bytes[fxTableOffset + entry * 3] = effect
    bytes[fxTableOffset + entry * 3 + 1] = 1
  })
  return bytes
}

const isRead = (data: Uint8Array) => {
  const request = makeSettingsBlockReadRequest()
  return data.length === request.length && data.every((byte, index) => byte === request[index])
}

/** An FM1 that answers a read with `block` (or with nothing), recording the writes it is sent. */
function setupFm1({
  answers = true,
  block = makeBlock(),
  answerRead = () => true,
  identity = 'FM-1_016',
}: {
  answerRead?: (count: number) => boolean
  answers?: boolean
  block?: number[]
  identity?: string
} = {}) {
  const ports = makeFakeFm1Ports()
  const sent: Uint8Array[] = []
  ports.output.send.mockImplementation((data) => {
    sent.push(data)
    if (answers && isRead(data) && answerRead(sent.filter(isRead).length)) {
      ports.input.receive(makeSettingsBlockReply(block))
    }
  })
  const live: Midi = {
    ...offlineMidi,
    firmware: { identity, kind: 'mvave' },
    hasMidiOutput: true,
    logStore: new MidiLogStore([]),
    sysexAvailable: true,
    ...makeFakeFm1Devices(ports),
  }
  return {
    midi: live,
    reads: () => sent.filter(isRead),
    writes: () => sent.filter((data) => !isRead(data)),
  }
}

const grips = () => screen.queryAllByRole('button', { name: /^Reorder / })
const sixEffects = ['Filter', 'Reverb', 'Delay', 'Distortion', 'Chorus', 'Phaser']
const effectNames = () =>
  screen
    .getAllByRole('region')
    .map((region) => region.getAttribute('aria-label') ?? '')
    .filter((name) => sixEffects.includes(name))

describe('V16 effects panel effect order', () => {
  it('offers no grips and sends nothing to firmware before V16', () => {
    const { midi, reads } = setupFm1({ identity: 'FM-1_015' })
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
    expect(grips()).toEqual([])
    expect(reads()).toEqual([])
  })

  it('reads the order once as it opens, and lays the effects out in it', async () => {
    const { midi, reads } = setupFm1()
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
    await waitFor(() => expect(grips()).toHaveLength(6))
    expect(reads()).toHaveLength(1)
    expect(effectNames()).toEqual(['Delay', 'Filter', 'Reverb', 'Distortion', 'Phaser', 'Chorus'])
  })

  it('keeps the default order and says why while the read waits', () => {
    const { midi } = setupFm1({ answers: false })
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
    expect(screen.getByText('Reading the effect order from the FM1…')).toBeTruthy()
    expect(grips()).toEqual([])
    expect(effectNames()[0]).toBe('Filter')
  })

  it('shows one line and no grips when the FM1 answers with something unusable', async () => {
    const { midi, writes } = setupFm1({ block: makeBlock([0, 1, 2, 3, 4, 6]) })
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
    expect(
      await screen.findByText(
        'The FM1 did not give its effect order, so it cannot be changed here.',
      ),
    ).toBeTruthy()
    expect(grips()).toEqual([])
    expect(writes()).toEqual([])
  })

  it('sends one write for a move from a box’s menu, after reading the table again', async () => {
    const user = userEvent.setup()
    const { midi, reads, writes } = setupFm1()
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
    await waitFor(() => expect(grips()).toHaveLength(6))
    await user.click(screen.getByRole('button', { name: 'Actions for Filter' }))
    await user.click(screen.getByRole('menuitem', { name: 'Move earlier' }))
    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(reads()).toHaveLength(2)
    const answer = parseSettingsBlockReply(makeSettingsBlockReply(makeBlock()))
    if (answer?.type !== 'block') throw new Error('fixture')
    expect(writes()[0]).toEqual(makeEffectOrderWrite(answer.block, [0, 2, 1, 3, 5, 4]))
    expect(effectNames().slice(0, 2)).toEqual(['Filter', 'Delay'])
  })

  it('puts the order back and says so when the FM1 does not answer the read before a write', async () => {
    const user = userEvent.setup()
    const { midi } = setupFm1({ answerRead: (count) => count === 1 })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
    await waitFor(() => expect(grips()).toHaveLength(6))
    await user.click(screen.getByRole('button', { name: 'Actions for Filter' }))
    await user.click(screen.getByRole('menuitem', { name: 'Move earlier' }))
    await vi.advanceTimersByTimeAsync(4000)
    expect(await screen.findByText('The FM1 did not take the new order. Try again.')).toBeTruthy()
    expect(effectNames()[0]).toBe('Delay')
    vi.useRealTimers()
  })
})
