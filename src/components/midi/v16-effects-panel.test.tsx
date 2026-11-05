// @vitest-environment jsdom
import { MidiTransferQueue } from '@/lib/midi-transfer-queue'

import { act, cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { V16EffectsPanel } from '@/components/midi/v16-effects-panel'
import type { FxLibrary } from '@/hooks/use-fx-library'
import { setLocale } from '@/i18n'
import { installFakeIndexedDb } from '@/test/fake-indexed-db'
import { renderWithToasts } from '@/test/render-with-toasts'
import { createFxLibraryPreset } from '@/lib/fx-library-preset'
import { getV16Effects, resetV16EffectsForTests, setV16Effects } from '@/lib/v16-effects'
import { makeV16LiveEffectsReadRequest } from '@/lib/v16-live-effects'
import { MidiLogStore } from '@/lib/midi-log-store'
import {
  fxTableOffset,
  makeEffectOrderWrite,
  makeSettingsBlockReadRequest,
  parseSettingsBlockReply,
} from '@/lib/v16-settings-block'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { capturedReply, sentRack } from '@/test/v16-live-effects-captures'
import { frame, table } from '@/test/v16-live-effects-replies'
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
  queueEffectOrder: (run) => run(),
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

  it('explains in its help that presets leave out the order, and how to read the FM1’s', async () => {
    const user = userEvent.setup()
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={offlineMidi} />)
    await user.hover(screen.getByRole('button', { name: 'Help: Effects' }))

    const help = screen.getByRole('note').textContent
    expect(help).toContain('not the effect order.')
    expect(help).toContain('“Read from FM1” brings the FM1’s current effects')
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
    ports,
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

it('preserves an FX switch changed while a reorder is waiting for its read reply', async () => {
  const user = userEvent.setup()
  const block = makeBlock()
  const ports = makeFakeFm1Ports()
  let reads = 0
  let pendingReply: Uint8Array | undefined
  const writes: Uint8Array[] = []
  const events: string[] = []
  const queue = new MidiTransferQueue()
  ports.output.send.mockImplementation((message) => {
    if (isRead(message)) {
      reads += 1
      const reply = makeSettingsBlockReply(block)
      if (reads === 1) ports.input.receive(reply)
      else pendingReply = reply
    } else {
      events.push('write')
      writes.push(message)
      block[fxTableOffset + 1] = 1
    }
  })
  const midi: Midi = {
    ...offlineMidi,
    hasMidiOutput: true,
    sysexAvailable: true,
    ...makeFakeFm1Devices(ports),
    queueEffectOrder: (run) => queue.enqueue(run),
    sendSharedEffectParameter: (controller, value) => {
      void queue.enqueue(() => {
        events.push('cc')
        if (controller === 0) block[fxTableOffset + 1] = value
      }, `effect-${controller}`)
      return true
    },
  }
  const browserEffects = new Uint8Array(24)
  browserEffects[0] = 1
  setV16Effects(browserEffects)
  renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
  await waitFor(() => expect(grips()).toHaveLength(6))
  await user.click(screen.getByRole('button', { name: 'Actions for Filter' }))
  await user.click(screen.getByRole('menuitem', { name: 'Move earlier' }))
  await waitFor(() => expect(reads).toBe(2))

  await user.click(screen.getByRole('switch', { name: 'Filter' }))
  expect(block[fxTableOffset + 1]).toBe(1)
  if (!pendingReply) throw new Error('Missing delayed read fixture')
  act(() => ports.input.receive(pendingReply!))
  await waitFor(() => expect(writes).toHaveLength(1))
  await waitFor(() => expect(block[fxTableOffset + 1]).toBe(0))
  expect(events).toEqual(['write', 'cc'])
})

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

  it('does not write when the rack unmounts while a reorder read is pending', async () => {
    const user = userEvent.setup()
    const { midi, ports, reads, writes } = setupFm1({ answerRead: (count) => count === 1 })
    const view = renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
    await waitFor(() => expect(grips()).toHaveLength(6))
    await user.click(screen.getByRole('button', { name: 'Actions for Filter' }))
    await user.click(screen.getByRole('menuitem', { name: 'Move earlier' }))
    await waitFor(() => expect(reads()).toHaveLength(2))
    view.unmount()
    expect(ports.input.removeListener).toHaveBeenCalled()
    expect(writes()).toEqual([])
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

const isLiveRead = (data: Uint8Array) => {
  const request = makeV16LiveEffectsReadRequest()
  return data.length === request.length && data.every((byte, index) => byte === request[index])
}

/** An FM1 that answers the order read as `setupFm1` does, and the live read with `liveReply`. */
function setupLiveFm1({
  identity = 'FM-1_016',
  liveReply = capturedReply('Read run A distinct') as Uint8Array | null,
}: { identity?: string; liveReply?: Uint8Array | null } = {}) {
  const fm1 = setupFm1({ identity })
  const answerOrder = fm1.ports.output.send.getMockImplementation()
  const liveReads: Uint8Array[] = []
  fm1.ports.output.send.mockImplementation((data) => {
    if (!isLiveRead(data)) return answerOrder?.(data)
    liveReads.push(data)
    if (liveReply) fm1.ports.input.receive(liveReply)
  })
  return { ...fm1, liveReads: () => liveReads }
}

async function readFromFm1(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Read from FM1' }))
}

describe('Read from FM1', () => {
  it('puts the FM1’s effects and order in the rack, sending nothing but the one read', async () => {
    const user = userEvent.setup()
    const { liveReads, midi, writes } = setupLiveFm1()
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
    await waitFor(() => expect(grips()).toHaveLength(6))

    await readFromFm1(user)

    expect(await screen.findByText('Read the effects from the FM1.')).toBeTruthy()
    expect(Array.from(getV16Effects())).toEqual(sentRack('Read run A distinct'))
    expect(effectNames()).toEqual(sixEffects)
    expect(screen.getByRole('heading', { name: 'Unsaved effects' })).toBeTruthy()
    expect(liveReads()).toHaveLength(1)
    expect(writes()).toEqual([])
    expect(midi.sendSharedEffectParameter).not.toHaveBeenCalled()
    expect(midi.sendSharedEffectSettings).not.toHaveBeenCalled()
  })

  it('names the preset that holds exactly the effects it read', async () => {
    const user = userEvent.setup()
    const { midi } = setupLiveFm1()
    const library = {
      ...makeLibrary(),
      presets: [
        createFxLibraryPreset({
          effects: Uint8Array.from(sentRack('Read run A distinct')),
          id: 'fx-a',
          name: 'Stage plate',
          now: '2026-11-05T12:00:00.000Z',
        }),
      ],
    }
    renderWithToasts(<V16EffectsPanel fxLibrary={library} midi={midi} />)
    await waitFor(() => expect(grips()).toHaveLength(6))

    await readFromFm1(user)

    expect(await screen.findByRole('heading', { name: 'Stage plate' })).toBeTruthy()
  })

  it('puts the previous rack back on Undo, sending nothing', async () => {
    const user = userEvent.setup()
    const { midi } = setupLiveFm1()
    const before = new Uint8Array(24)
    before[0] = 1
    setV16Effects(before)
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
    await waitFor(() => expect(grips()).toHaveLength(6))
    await readFromFm1(user)

    await user.click(await screen.findByRole('button', { name: 'Undo' }))

    expect(Array.from(getV16Effects())).toEqual(Array.from(before))
    expect(midi.sendSharedEffectParameter).not.toHaveBeenCalled()
    expect(midi.sendSharedEffectSettings).not.toHaveBeenCalled()
  })

  it('says the FM1 did not answer and changes nothing, asking only once', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { liveReads, midi } = setupLiveFm1({ liveReply: null })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const before = getV16Effects().slice()
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
    await waitFor(() => expect(grips()).toHaveLength(6))

    await readFromFm1(user)
    await vi.advanceTimersByTimeAsync(4000)

    expect(
      await screen.findByText(
        'The FM1 did not answer. Check that its MIDI input is selected, then try again.',
      ),
    ).toBeTruthy()
    expect(Array.from(getV16Effects())).toEqual(Array.from(before))
    expect(liveReads()).toHaveLength(1)
    vi.useRealTimers()
  })

  it('takes nothing from a reading with a control out of its range', async () => {
    const user = userEvent.setup()
    const values = Array.from({ length: 27 }, () => 0)
    values[0] = 120
    const echoed = [5, 0x9c, 0, 0, 0, 54, 0, 0]
    const { midi } = setupLiveFm1({ liveReply: frame([...echoed, ...values, ...table]) })
    const before = getV16Effects().slice()
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
    await waitFor(() => expect(grips()).toHaveLength(6))

    await readFromFm1(user)

    expect(
      await screen.findByText(
        'The FM1’s effects could not be read, so nothing here changed. Try again.',
      ),
    ).toBeTruthy()
    expect(Array.from(getV16Effects())).toEqual(Array.from(before))
  })

  it('changes nothing when the view closes before the FM1 answers', async () => {
    const user = userEvent.setup()
    const { midi, ports } = setupLiveFm1({ liveReply: null })
    const before = getV16Effects().slice()
    const view = renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
    await waitFor(() => expect(grips()).toHaveLength(6))
    await readFromFm1(user)

    view.unmount()
    act(() => ports.input.receive(capturedReply('Read run A distinct')))

    expect(Array.from(getV16Effects())).toEqual(Array.from(before))
  })

  it('is not offered before V16', () => {
    const { midi } = setupLiveFm1({ identity: 'FM-1_015' })
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)

    expect(screen.queryByRole('button', { name: 'Read from FM1' })).toBeNull()
  })

  it('names only the state it is in while it reads', async () => {
    const user = userEvent.setup()
    const { midi } = setupLiveFm1({ liveReply: null })
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
    await waitFor(() => expect(grips()).toHaveLength(6))

    await readFromFm1(user)

    expect(screen.getByRole('button', { name: 'Reading…' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Read from FM1/ })).toBeNull()
  })

  it('stays focusable while MIDI is offline, says why, and reads nothing', async () => {
    const user = userEvent.setup()
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={offlineMidi} />)
    const button = screen.getByRole('button', { name: 'Read from FM1' })

    await user.click(button)

    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.getAttribute('aria-describedby')).not.toBeNull()
    expect(document.getElementById(button.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Switch MIDI online and choose the FM1’s input and output to read its effects.',
    )
    expect(screen.queryByText('Read the effects from the FM1.')).toBeNull()
  })
})
