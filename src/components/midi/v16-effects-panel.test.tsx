// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import {
  fxTableOffset,
  makeEffectOrderWrite,
  makeSettingsBlockReadRequest,
  parseSettingsBlockReply,
} from '@/lib/v16-settings-block'
import { resetV16EffectsForTests } from '@/lib/v16-effects'
import { MidiLogStore } from '@/lib/midi-log-store'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { makeSettingsBlockReply } from '@/test/v16-settings-replies'

import { V16EffectsPanel } from './v16-effects-panel'

type Midi = ComponentProps<typeof V16EffectsPanel>['midi']

// The capability is off for every firmware until the hardware run, so a test turns it on here.
const offered = vi.hoisted(() => ({ on: true }))
vi.mock('@/lib/firmware-profile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/firmware-profile')>()
  return {
    ...actual,
    resolveFirmwareProfile: (firmware: Parameters<typeof actual.resolveFirmwareProfile>[0]) => {
      const profile = actual.resolveFirmwareProfile(firmware)
      return { ...profile, capabilities: { ...profile.capabilities, effectOrder: offered.on } }
    },
  }
})

beforeEach(() => {
  offered.on = true
})
afterEach(() => {
  cleanup()
  resetV16EffectsForTests()
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
function setup({
  answers = true,
  block = makeBlock(),
  answerRead = () => true,
}: { answerRead?: (count: number) => boolean; answers?: boolean; block?: number[] } = {}) {
  const ports = makeFakeFm1Ports()
  const sent: Uint8Array[] = []
  ports.output.send.mockImplementation((data) => {
    sent.push(data)
    if (answers && isRead(data) && answerRead(sent.filter(isRead).length)) {
      ports.input.receive(makeSettingsBlockReply(block))
    }
  })
  const midi: Midi = {
    firmware: { identity: 'FM-1_016', kind: 'mvave' },
    hasMidiOutput: true,
    logStore: new MidiLogStore([]),
    sendEffectParameter: vi.fn(),
    sysexAvailable: true,
    ...makeFakeFm1Devices(ports),
  }
  return {
    midi,
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

describe('V16EffectsPanel effect order', () => {
  it('offers no grips and sends nothing while the profile does not offer the order', () => {
    offered.on = false
    const { midi, reads } = setup()
    render(<V16EffectsPanel midi={midi} />)
    expect(grips()).toEqual([])
    expect(reads()).toEqual([])
  })

  it('reads the order once as it opens, and lays the effects out in it', async () => {
    const { midi, reads } = setup()
    render(<V16EffectsPanel midi={midi} />)
    await waitFor(() => expect(grips()).toHaveLength(6))
    expect(reads()).toHaveLength(1)
    expect(effectNames()).toEqual(['Delay', 'Filter', 'Reverb', 'Distortion', 'Phaser', 'Chorus'])
  })

  it('keeps the default order and says why while the read waits', () => {
    const { midi } = setup({ answers: false })
    render(<V16EffectsPanel midi={midi} />)
    expect(screen.getByText('Reading the effect order from the FM1…')).toBeTruthy()
    expect(grips()).toEqual([])
    expect(effectNames()[0]).toBe('Filter')
  })

  it('shows one line and no grips when the FM1 answers with something unusable', async () => {
    const { midi, writes } = setup({ block: makeBlock([0, 1, 2, 3, 4, 6]) })
    render(<V16EffectsPanel midi={midi} />)
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
    const { midi, reads, writes } = setup()
    render(<V16EffectsPanel midi={midi} />)
    await waitFor(() => expect(grips()).toHaveLength(6))
    await user.click(screen.getByRole('button', { name: 'Actions for Filter' }))
    await user.click(screen.getByRole('menuitem', { name: 'Move earlier' }))
    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(reads()).toHaveLength(2)
    const answer = parseSettingsBlockReply(makeSettingsBlockReply(makeBlock()))
    if (answer?.type !== 'block') throw new Error('fixture')
    expect(writes()[0]).toEqual(makeEffectOrderWrite(answer.block, [0, 2, 1, 3, 5, 4]))
    expect(effectNames().slice(0, 2)).toEqual(['Filter', 'Delay'])
    expect(
      screen.getByText('A new order is not saved on the FM1 until you press SAVE.'),
    ).toBeTruthy()
  })

  it('puts the order back and says so when the FM1 does not answer the read before a write', async () => {
    const user = userEvent.setup()
    const { midi } = setup({ answerRead: (count) => count === 1 })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<V16EffectsPanel midi={midi} />)
    await waitFor(() => expect(grips()).toHaveLength(6))
    await user.click(screen.getByRole('button', { name: 'Actions for Filter' }))
    await user.click(screen.getByRole('menuitem', { name: 'Move earlier' }))
    await vi.advanceTimersByTimeAsync(4000)
    expect(await screen.findByText('The FM1 did not take the new order. Try again.')).toBeTruthy()
    expect(effectNames()[0]).toBe('Delay')
    vi.useRealTimers()
  })
})
