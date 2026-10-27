// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { MidiLogStore } from '@/lib/midi-log-store'
import {
  fxOrderOffset,
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
  return { midi, writes }
}

async function openProbe(midi: Midi) {
  const user = userEvent.setup()
  render(<V16SettingsProbe midi={midi} />)
  await user.click(screen.getByRole('button', { name: 'V16 settings probe (dev)' }))
  return user
}

describe('V16SettingsProbe', () => {
  it('reads the block and shows the order bytes it found', async () => {
    const { midi, writes } = makeProbeMidi()
    const user = await openProbe(midi)
    await user.click(screen.getByRole('button', { name: 'Read block' }))
    expect(await screen.findByRole('region', { name: 'Settings block read' })).toBeTruthy()
    expect(screen.getByLabelText(/FX order bytes/)).toHaveProperty(
      'value',
      blockBytes
        .slice(fxOrderOffset, fxOrderOffset + 27)
        .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
        .join(' '),
    )
    expect(writes).toEqual([])
  })

  it('sends exactly one write, carrying the block unchanged, when writing back unchanged', async () => {
    const { midi, writes } = makeProbeMidi()
    const user = await openProbe(midi)
    await user.click(screen.getByRole('button', { name: 'Write back unchanged' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/byte for byte/))
    expect(writes).toHaveLength(1)
    expect(writes[0][0]).toBe(0xf0)
  })

  it('reports an answer it cannot use instead of writing', async () => {
    const { midi, writes } = makeProbeMidi([0x0d, ...blockBytes.slice(1)])
    const user = await openProbe(midi)
    await user.click(screen.getByRole('button', { name: 'Write back unchanged' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/version 0x0E/)
    expect(writes).toEqual([])
  })

  it('offers nothing to send on firmware that is not M-VAVE’s', async () => {
    const { midi } = makeProbeMidi()
    const user = await openProbe({ ...midi, firmware: { identity: 'FM-1_097', kind: 'fm1-va' } })
    expect(screen.getByRole('button', { name: 'Read block' }).hasAttribute('disabled')).toBe(true)
    expect(user).toBeTruthy()
  })
})
