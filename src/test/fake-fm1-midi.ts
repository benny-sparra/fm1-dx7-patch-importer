import { vi } from 'vitest'
import type { Input, Output } from 'webmidi'

import type { MidiDevice, MidiPort } from '@/lib/midi'

// Captured from an FM1 on M-VAVE's V15 firmware, 2026-09-06 (ip2k/mvave-fm1-open-firmware,
// docs/03-update-protocol.md §2).
// prettier-ignore
export const mvaveIdentityReply = Uint8Array.from([
  0xf0, 0x00, 0x32, 0x45, 0x58, 0x01, 0x00, 0x00, 0x23, 0x4d, 0x5a, 0x44, 0x79, 0x05, 0x26, 0x4c,
  0x1a, ...Array<number>(21).fill(0), 0x20, 0x06, 0xf7,
])

// Captured from an FM1 on FM-1+VA's FM-1_089, 2026-09-29. It names FM-1_089 but keeps the checksum
// of M-VAVE's V15 reply above.
// prettier-ignore
export const fm1VaIdentityReply = Uint8Array.from([
  0xf0, 0x00, 0x32, 0x45, 0x58, 0x01, 0x00, 0x00, 0x23, 0x4d, 0x5a, 0x44, 0x79, 0x05, 0x06, 0x4e,
  0x1c, ...Array<number>(21).fill(0), 0x20, 0x06, 0xf7,
])

// Not captured: built for the name Felucca 0.4-beta's installer expects back, FM-1_904
// (docs/fm1-research.md, "Felucca replacement firmware"), with V15's checksum as above.
// prettier-ignore
export const feluccaIdentityReply = Uint8Array.from([
  0xf0, 0x00, 0x32, 0x45, 0x58, 0x01, 0x00, 0x00, 0x23, 0x4d, 0x5a, 0x44, 0x79, 0x15, 0x07, 0x0c,
  0x1a, ...Array<number>(21).fill(0), 0x20, 0x06, 0xf7,
])

// Not captured: built for FM-1_900, the name a Felucca development build and every SLOOP release
// report (docs/switching-firmware.md), with V15's checksum as above.
// prettier-ignore
export const feluccaOrSloopIdentityReply = Uint8Array.from([
  0xf0, 0x00, 0x32, 0x45, 0x58, 0x01, 0x00, 0x00, 0x23, 0x4d, 0x5a, 0x44, 0x79, 0x15, 0x07, 0x0c,
  0x18, ...Array<number>(21).fill(0), 0x20, 0x06, 0xf7,
])

// WebMidi's `midimessage` event carries the bytes as a plain array, not a Uint8Array.
type MidiListener = (event: { data: number[] }) => void

type FakeFm1Options = {
  /** Answers FM-1+VA's preset read for a slot; without it the read goes unanswered. */
  presetReply?: (slot: number) => Uint8Array
  /** Receives each FM-1+VA preset write, so a test can store what it carries. */
  presetWrite?: (message: Uint8Array) => void
  reply?: Uint8Array
}

const isFm1VaCommand = (data: Uint8Array, command: number) =>
  data[1] === 0x43 && data[2] === 0x00 && data[3] === 0x7d && data[4] === command

/**
 * The input and output ports of a fake FM1 for `useMidi` tests. It answers the identity query with
 * `reply`, or stays silent without one, as an FM1 on unknown firmware or another device would.
 */
export function makeFakeFm1Ports({ presetReply, presetWrite, reply }: FakeFm1Options = {}) {
  const listeners = new Set<MidiListener>()
  const input = {
    addListener: vi.fn<(event: string, listener: MidiListener) => void>((event, listener) => {
      if (event === 'midimessage') listeners.add(listener)
    }),
    id: 'fm1-in',
    manufacturer: 'M-VAVE',
    name: 'FM-1 MIDI 1',
    receive: (bytes: Uint8Array | number[]) => {
      const data = Array.from(bytes)
      listeners.forEach((listener) => listener({ data }))
    },
    removeListener: vi.fn<(event: string, listener: MidiListener) => void>((_event, listener) => {
      listeners.delete(listener)
    }),
    state: 'connected',
  }
  const output = {
    id: 'fm1-out',
    manufacturer: 'M-VAVE',
    name: 'FM-1 MIDI 1',
    send: vi.fn<(data: Uint8Array) => void>((data) => {
      if (reply && data[1] === 0x00 && data[2] === 0x32) input.receive(reply)
      if (presetWrite && isFm1VaCommand(data, 0x04)) presetWrite(data)
      if (presetReply && isFm1VaCommand(data, 0x10)) input.receive(presetReply(data[5]))
    }),
    sendControlChange: vi.fn<(controller: number, value: number, options?: object) => void>(),
    sendProgramChange: vi.fn<(program: number, options?: object) => void>(),
    sendSysex: vi.fn<(manufacturer: number, data: Uint8Array) => void>(),
    state: 'connected',
  }
  return { input, output }
}

/**
 * The fake ports as the device lists `useMidi` returns, selected by their ids. WebMidi's `Input`
 * and `Output` cannot be built outside a browser, so the fakes stand in for them here alone.
 */
export function makeFakeFm1Devices(ports: ReturnType<typeof makeFakeFm1Ports>) {
  const device = <TPort extends MidiPort>(port: { id: string; name: string }) =>
    ({
      id: port.id,
      manufacturer: 'M-VAVE',
      name: port.name,
      port,
      state: 'connected',
    }) as unknown as MidiDevice<TPort>
  return {
    inputs: [device<Input>(ports.input)],
    outputs: [device<Output>(ports.output)],
    selectedInputId: ports.input.id,
    selectedOutputId: ports.output.id,
  }
}
