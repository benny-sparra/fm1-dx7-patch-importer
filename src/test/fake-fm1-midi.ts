import { vi } from 'vitest'

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

// WebMidi's `midimessage` event carries the bytes as a plain array, not a Uint8Array.
type MidiListener = (event: { data: number[] }) => void

/**
 * The input and output ports of a fake FM1 for `useMidi` tests. It answers the identity query with
 * `reply`, or stays silent without one, as an FM1 on unknown firmware or another device would.
 */
export function makeFakeFm1Ports({ reply }: { reply?: Uint8Array } = {}) {
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
    }),
    sendControlChange: vi.fn<(controller: number, value: number, options?: object) => void>(),
    sendProgramChange: vi.fn<(program: number, options?: object) => void>(),
    sendSysex: vi.fn<(manufacturer: number, data: Uint8Array) => void>(),
    state: 'connected',
  }
  return { input, output }
}
