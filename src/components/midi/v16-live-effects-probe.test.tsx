// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Input, Output } from 'webmidi'

import { makeV16LiveEffectsReadRequest } from '@/lib/v16-live-effects'
import { MidiLogStore } from '@/lib/midi-log-store'
import { liveEffectsReply } from '@/test/v16-live-effects-replies'

import { V16LiveEffectsProbe } from './v16-live-effects-probe'

type Midi = ComponentProps<typeof V16LiveEffectsProbe>['midi']

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
})
afterEach(cleanup)

// Fake ports: no MIDI permission or hardware, and the input's listener is called by the test.
function makePorts() {
  const listeners = new Set<(event: { data: Uint8Array }) => void>()
  const send = vi.fn()
  const input = {
    addListener: (_type: string, listener: (event: { data: Uint8Array }) => void) =>
      listeners.add(listener),
    removeListener: (_type: string, listener: (event: { data: Uint8Array }) => void) =>
      listeners.delete(listener),
  } as unknown as Input
  const output = { send } as unknown as Output
  const hear = (data: Uint8Array) => listeners.forEach((listener) => listener({ data }))
  return { hear, input, listeners, output, send }
}

function makeMidi(ports: ReturnType<typeof makePorts>, identity = 'FM-1_016') {
  const midi: Midi = {
    firmware: { identity, kind: 'mvave' },
    hasMidiOutput: true,
    inputs: [
      { id: 'in', manufacturer: 'M-VAVE', name: 'in', port: ports.input, state: 'connected' },
    ],
    logStore: new MidiLogStore([]),
    outputs: [
      { id: 'out', manufacturer: 'M-VAVE', name: 'out', port: ports.output, state: 'connected' },
    ],
    selectedInputId: 'in',
    selectedOutputId: 'out',
    sysexAvailable: true,
  }
  return midi
}

async function openProbe(midi: Midi) {
  const user = userEvent.setup()
  const view = render(<V16LiveEffectsProbe midi={midi} />)
  await user.click(screen.getByRole('button', { name: 'V16 live FX read (dev)' }))
  return { user, view }
}

describe('V16LiveEffectsProbe', () => {
  it('sends nothing until Read live FX is pressed, then sends the one fixed read', async () => {
    const ports = makePorts()
    const { user } = await openProbe(makeMidi(ports))
    expect(ports.send).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Read live FX' }))

    expect(ports.send).toHaveBeenCalledOnce()
    expect(ports.send).toHaveBeenCalledWith(makeV16LiveEffectsReadRequest())
  })

  it('shows the raw bytes and the candidate decoding of a reply', async () => {
    const ports = makePorts()
    const { user } = await openProbe(makeMidi(ports))
    await user.click(screen.getByRole('button', { name: 'Read live FX' }))

    act(() => ports.hear(liveEffectsReply))

    expect(await screen.findByRole('region', { name: 'Live FX read' })).toBeTruthy()
    expect(screen.getByText('CC 2 effect.filter.cutoff = 50')).toBeTruthy()
    expect(ports.listeners.size).toBe(0)
  })

  it('does not send on a firmware that is not stock V16, or twice while reading', async () => {
    const other = makePorts()
    const { user } = await openProbe(makeMidi(other, 'FM-1_015'))
    await user.click(screen.getByRole('button', { name: 'Read live FX' }))
    expect(other.send).not.toHaveBeenCalled()
    cleanup()

    const ports = makePorts()
    const second = await openProbe(makeMidi(ports))
    await second.user.click(screen.getByRole('button', { name: 'Read live FX' }))
    await second.user.click(screen.getByRole('button', { name: 'Reading…' }))
    expect(ports.send).toHaveBeenCalledOnce()
  })

  it('cancels a waiting read when the ports change and ignores its late reply', async () => {
    const ports = makePorts()
    const midi = makeMidi(ports)
    const { user, view } = await openProbe(midi)
    await user.click(screen.getByRole('button', { name: 'Read live FX' }))

    const next = makePorts()
    view.rerender(<V16LiveEffectsProbe midi={makeMidi(next)} />)
    act(() => ports.hear(liveEffectsReply))

    expect(screen.queryByRole('region', { name: 'Live FX read' })).toBeNull()
    expect(ports.listeners.size).toBe(0)
    expect(next.send).not.toHaveBeenCalled()
  })
})
