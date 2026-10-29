// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { MidiLogStore } from '@/lib/midi-log-store'
import {
  fxTableOffset,
  makeObject5LiveReadRequest,
  makeSettingsBlockReadRequest,
  settingsBlockLength,
  settingsBlockVersion,
} from '@/lib/v16-settings-block'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { makeSettingsBlockReply } from '@/test/v16-settings-replies'

import { V16SettingsProbe } from './v16-settings-probe'

type Midi = ComponentProps<typeof V16SettingsProbe>['midi']

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
})

afterEach(cleanup)

const blockBytes = Array.from({ length: settingsBlockLength }, (_, index) => (index * 3) % 100)
blockBytes[0] = settingsBlockVersion
// An FX table of nine entries, byte 0 the effect at that chain position.
;[2, 0, 1, 3, 5, 4, 6, 7, 8].forEach((effect, entry) => {
  blockBytes[fxTableOffset + entry * 3] = effect
  blockBytes[fxTableOffset + entry * 3 + 1] = entry % 2
  blockBytes[fxTableOffset + entry * 3 + 2] = entry % 3
})

/** An FM1 that answers a read of object 4 with `block`, and records the writes it is sent. */
function makeProbeMidi(block: number[] = blockBytes) {
  const ports = makeFakeFm1Ports()
  const writes: Uint8Array[] = []
  const readRequest = makeSettingsBlockReadRequest()
  ports.output.send.mockImplementation((data) => {
    if (data.length === readRequest.length && data.every((byte, i) => byte === readRequest[i])) {
      ports.input.receive(makeSettingsBlockReply(block))
    } else writes.push(data)
  })
  const midi: Midi = {
    firmware: { identity: 'FM-1_016', kind: 'mvave' },
    logStore: new MidiLogStore([]),
    sysexAvailable: true,
    ...makeFakeFm1Devices(ports),
  }
  return { midi, ports, writes }
}

async function openProbe(midi: Midi) {
  const user = userEvent.setup()
  render(<V16SettingsProbe midi={midi} />)
  await user.click(screen.getByRole('button', { name: 'V16 settings probe (dev)' }))
  return user
}

describe('V16SettingsProbe', () => {
  it('reads the block and shows the chain order it found', async () => {
    const { midi, writes } = makeProbeMidi()
    const user = await openProbe(midi)
    await user.click(screen.getByRole('button', { name: 'Read block' }))
    expect(await screen.findByRole('region', { name: 'Settings block read' })).toBeTruthy()
    expect(screen.getByLabelText(/Chain order/)).toHaveProperty('value', '2 0 1 3 5 4')
    expect(writes).toEqual([])
  })

  it('sends exactly one write, carrying the table unchanged, when writing back unchanged', async () => {
    const { midi, writes } = makeProbeMidi()
    const user = await openProbe(midi)
    await user.click(screen.getByRole('button', { name: 'Write back unchanged' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/byte for byte/))
    expect(writes).toHaveLength(1)
    expect(writes[0][0]).toBe(0xf0)
    expect(writes[0].length).toBeLessThan(60)
  })

  it('reports an answer it cannot use instead of writing', async () => {
    const { midi, writes } = makeProbeMidi([0x0d, ...blockBytes.slice(1)])
    const user = await openProbe(midi)
    await user.click(screen.getByRole('button', { name: 'Write back unchanged' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/unusably \(version\)/)
    expect(writes).toEqual([])
  })

  it('offers nothing to send on firmware that is not M-VAVE’s', async () => {
    const { midi } = makeProbeMidi()
    const user = await openProbe({ ...midi, firmware: { identity: 'FM-1_097', kind: 'fm1-va' } })
    expect(screen.getByRole('button', { name: 'Read block' }).hasAttribute('disabled')).toBe(true)
    expect(user).toBeTruthy()
  })

  it('sends only the fixed object 5 read and shows its reply as heard, undecoded', async () => {
    const { midi, ports, writes } = makeProbeMidi()
    const live = makeObject5LiveReadRequest()
    const answer = Uint8Array.of(0xf0, 0x00, 0x32, 0x0d, 0x41, 0x01, 0x02, 0xf7)
    ports.output.send.mockImplementation((data) => {
      if (data.length === live.length && data.every((byte, i) => byte === live[i])) {
        ports.input.receive(answer)
      } else writes.push(data)
    })
    const user = await openProbe(midi)
    await user.click(screen.getByRole('button', { name: 'Read object 5 (live)' }))
    const region = await screen.findByRole('region', { name: 'Object 5 reads' }, { timeout: 4000 })
    expect(region.textContent).toContain('Raw: F0 00 32 0D 41 01 02 F7')
    expect(writes).toEqual([])
    expect(ports.output.send).toHaveBeenCalledTimes(1)
  })
})
