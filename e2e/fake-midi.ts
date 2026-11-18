import type { Page } from '@playwright/test'
import { smk37IdentityReply } from '../src/test/smk37-identity.ts'

// Fixed, approved requests from the protocol fixtures. Match every byte, including framing.
export const fakeMidiRequests = {
  identity: [0xf0, 0x00, 0x32, 0x45, 0x00, 0x00, 0x00, 0x40, 0x7f, 0xf7],
  effectOrder: [
    0xf0, 0x00, 0x32, 0x0d, 0x41, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00,
    0x00, 0x4b, 0x00, 0xf7,
  ],
  liveEffects: [
    0xf0, 0x00, 0x32, 0x0d, 0x41, 0x00, 0x00, 0x40, 0x02, 0x1c, 0x01, 0x00, 0x00, 0x60, 0x06, 0x00,
    0x00, 0x28, 0x00, 0xf7,
  ],
}

// The FM1's answers to the identity query, captured from M-VAVE's V15 firmware, from FM-1+VA's
// FM-1_089, and from Official Open V12 (see src/test/fake-fm1-midi.ts), and FM-1_089's with the
// name changed to FM-1_097.
// prettier-ignore
const identityReplies = {
  smk37: Array.from(smk37IdentityReply),
  unanswered: undefined,
  'fm1-va': [
    0xf0, 0x00, 0x32, 0x45, 0x58, 0x01, 0x00, 0x00, 0x23, 0x4d, 0x5a, 0x44, 0x79, 0x05, 0x06, 0x4e,
    0x1c, ...Array<number>(21).fill(0), 0x20, 0x06, 0xf7,
  ],
  'fm1-va-097': [
    0xf0, 0x00, 0x32, 0x45, 0x58, 0x01, 0x00, 0x00, 0x23, 0x4d, 0x5a, 0x44, 0x79, 0x05, 0x26, 0x4e,
    0x1b, ...Array<number>(21).fill(0), 0x20, 0x06, 0xf7,
  ],
  mvave: [
    0xf0, 0x00, 0x32, 0x45, 0x58, 0x01, 0x00, 0x00, 0x23, 0x4d, 0x5a, 0x44, 0x79, 0x05, 0x26, 0x4c,
    0x1a, ...Array<number>(21).fill(0), 0x20, 0x06, 0xf7,
  ],
  // M-VAVE's V16, FM-1_016, as src/test/fake-fm1-midi.ts captured it.
  'mvave-v16': [
    0xf0, 0x00, 0x32, 0x45, 0x58, 0x01, 0x00, 0x00, 0x23, 0x4d, 0x5a, 0x44, 0x79, 0x05, 0x26, 0x0c,
    0x1b, ...Array<number>(21).fill(0), 0x20, 0x06, 0xf7,
  ],
  'official-open': [
    0xf0, 0x00, 0x32, 0x45, 0x58, 0x01, 0x00, 0x00, 0x23, 0x4d, 0x5a, 0x44, 0x79, 0x05, 0x07, 0x0c,
    0x18, 0x30, 0x60, 0x44, 0x11, 0x03, ...Array<number>(17).fill(0), 0x15, 0xf7,
  ],
}

export type FakeMidiDeviceOptions = {
  /** Stable device key; native port IDs append -input or -output. */
  id: string
  connected?: boolean
  /** Which firmware the FM1 names when asked; M-VAVE's unless a journey chooses FM-1+VA. */
  firmware?: keyof typeof identityReplies
  /** The name the FM1's ports report: Linux lists `FM-1 MIDI 1`, macOS `USB Composite Device`. */
  portName?: string
  /** Synthetic settings-block response; omit to leave the exact order read unanswered. */
  settingsReply?: number[]
  /** Captured or synthetic live-FX response; omit to deliver it explicitly with receiveMidi. */
  liveEffectsReply?: number[]
  /**
   * The engine each Official Open track runs, by number (0 DX7, 1 303, 2 808, 3 PSG), which the
   * FM1 answers command 0 with, as `officialOpenInfoReply` in src/test/fake-fm1-midi.ts builds it.
   */
  trackEngines?: number[]
}

type FakeMidiOptions = Omit<FakeMidiDeviceOptions, 'id'> & {
  /** Browser permission, shared by all devices. */
  sysex?: boolean
  devices?: FakeMidiDeviceOptions[]
}

/**
 * Replaces the browser's Web MIDI API with independently recorded devices (one FM1 by default).
 * Connection events reuse native port objects; no hardware or permission prompt. Call before goto.
 */
export async function installFakeMidi(
  page: Page,
  { devices, sysex = true, ...single }: FakeMidiOptions = {},
) {
  const configured = devices ?? [{ ...single, id: 'fm1' }]
  if (
    !configured.length ||
    configured.some(({ id }) => !id) ||
    new Set(configured.map(({ id }) => id)).size !== configured.length
  ) {
    throw new Error('The MIDI fake needs at least one device with unique IDs.')
  }
  await page.addInitScript(
    ({ configurations, requests, sysexGranted }) => {
      type Port = {
        connection: 'closed' | 'open' | 'pending'
        id: string
        manufacturer: string
        name: string
        onmidimessage: ((event: { data: Uint8Array; timeStamp: number }) => void) | null
        onstatechange: ((event: { port: Port; timeStamp: number }) => void) | null
        state: 'connected' | 'disconnected'
        type: 'input' | 'output'
        version: string
        close: () => Promise<Port>
        open: () => Promise<Port>
        clear: () => void
        send: (data: Iterable<number>) => void
      }
      type Access = {
        inputs: Map<string, Port>
        outputs: Map<string, Port>
        onstatechange: ((event: { port: Port; timeStamp: number }) => void) | null
        sysexEnabled: boolean
      }
      const sent: number[][] = []
      const sentByDevice: Record<string, number[][]> = Object.fromEntries(
        configurations.map(({ id }) => [id, []]),
      )
      // Official Open's answer to command 0 (F0 7D 46 4D 02 00 …), echoing the request's token.
      const infoReply = (tokenLow: number, tokenHigh: number, engines: number[]) => {
        const fields = [0, 4, 16, 0, 0xe0, 0x0f, 0, ...(engines ?? [])]
        const packed: number[] = []
        let accumulator = 0
        let bitCount = 0
        for (const byte of fields) {
          accumulator |= byte << bitCount
          bitCount += 8
          while (bitCount >= 7) {
            packed.push(accumulator & 0x7f)
            accumulator >>= 7
            bitCount -= 7
          }
        }
        if (bitCount > 0) packed.push(accumulator & 0x7f)
        const body = [0x7d, 0x46, 0x4d, 0x02, 0x40, tokenLow, tokenHigh, ...packed]
        const checksum = -body.reduce((sum, byte) => sum + byte, 0) & 0x7f
        return [0xf0, ...body, checksum, 0xf7]
      }
      const pairs = configurations.map((device) => {
        const makePort = (type: 'input' | 'output'): Port => ({
          connection: 'closed',
          id: `${device.id}-${type}`,
          manufacturer: 'M-VAVE',
          name: device.name,
          onmidimessage: null,
          onstatechange: null,
          state: device.connected ? 'connected' : 'disconnected',
          type,
          version: '1.0',
          async close() {
            this.connection = 'closed'
            return this
          },
          async open() {
            this.connection = 'open'
            return this
          },
          clear() {},
          send(data: Iterable<number>) {
            if (this.state !== 'connected') {
              throw new DOMException('The fake MIDI device is disconnected.', 'InvalidStateError')
            }
            const message = Array.from(data)
            sent.push(message)
            sentByDevice[device.id].push(message)
            const generation = pair.generation
            const deliver = (bytes: number[]) => {
              if (input.state !== 'connected' || pair.generation !== generation) return
              input.onmidimessage?.({ data: Uint8Array.from(bytes), timeStamp: performance.now() })
            }
            const matches = (request: number[]) =>
              message.length === request.length &&
              message.every((byte, index) => byte === request[index])
            const reply = matches(requests.identity)
              ? device.identityReply
              : matches(requests.effectOrder)
                ? device.settings
                : matches(requests.liveEffects)
                  ? device.liveReply
                  : undefined
            if (reply) {
              setTimeout(() => deliver(reply))
            }
            if (device.engines && message[1] === 0x7d && message[5] === 0x00) {
              const engines = device.engines
              setTimeout(() => deliver(infoReply(message[6], message[7], engines)))
            }
          },
        })
        const input = makePort('input')
        const output = makePort('output')
        const pair = { id: device.id, input, output, generation: 0 }
        return pair
      })
      const access: Access = {
        inputs: new Map(
          pairs
            .filter(({ input }) => input.state === 'connected')
            .map(({ input }) => [input.id, input]),
        ),
        outputs: new Map(
          pairs
            .filter(({ output }) => output.state === 'connected')
            .map(({ output }) => [output.id, output]),
        ),
        onstatechange: null,
        sysexEnabled: false,
      }
      const pairFor = (id = configurations[0].id) => {
        const pair = pairs.find((candidate) => candidate.id === id)
        if (!pair) throw new Error(`Unknown fake MIDI device: ${id}`)
        return pair
      }

      Object.defineProperty(window, 'fm1FakeMidi', {
        value: {
          receive: (bytes: number[], id?: string) => {
            const { input } = pairFor(id)
            if (input.state === 'connected') {
              input.onmidimessage?.({ data: Uint8Array.from(bytes), timeStamp: performance.now() })
            }
          },
          setConnected: (id: string, connected: boolean) => {
            const pair = pairFor(id)
            const { input, output } = pair
            if ((input.state === 'connected') === connected) return
            pair.generation += 1
            for (const port of [input, output]) {
              port.state = connected ? 'connected' : 'disconnected'
              port.connection = connected ? 'open' : 'pending'
            }
            if (connected) {
              access.inputs.set(input.id, input)
              access.outputs.set(output.id, output)
            } else {
              access.inputs.delete(input.id)
              access.outputs.delete(output.id)
            }
            for (const port of [input, output]) {
              const event = { port, timeStamp: performance.now() }
              port.onstatechange?.(event)
              access.onstatechange?.(event)
            }
          },
          sent,
          sentByDevice,
        },
      })
      Object.defineProperty(navigator, 'requestMIDIAccess', {
        configurable: true,
        value: async (options?: { sysex?: boolean }) => {
          access.sysexEnabled = Boolean(options?.sysex) && sysexGranted
          return access
        },
      })
    },
    {
      configurations: configured.map((device) => ({
        id: device.id,
        connected: device.connected ?? true,
        engines: device.trackEngines,
        identityReply: identityReplies[device.firmware ?? 'mvave'],
        liveReply: device.liveEffectsReply,
        name: device.portName ?? 'FM-1 MIDI 1',
        settings: device.settingsReply,
      })),
      requests: fakeMidiRequests,
      sysexGranted: sysex,
    },
  )
}

declare global {
  interface Window {
    fm1FakeMidi: {
      receive: (bytes: number[], deviceId?: string) => void
      setConnected: (deviceId: string, connected: boolean) => void
      sent: number[][]
      sentByDevice: Record<string, number[][]>
    }
  }
}

/** Every message the fake FM-1 has received, oldest first. */
export function sentMidi(page: Page, deviceId?: string) {
  return page.evaluate((id) => {
    const messages =
      id === undefined ? window.fm1FakeMidi.sent : window.fm1FakeMidi.sentByDevice[id]
    if (!messages) throw new Error(`Unknown fake MIDI device: ${id}`)
    return messages.map((message) => [...message])
  }, deviceId)
}

/** Messages the fake FM-1 has received that are Yamaha SysEx. */
export async function sentSysex(page: Page) {
  return (await sentMidi(page)).filter(([status, manufacturer]) => {
    return status === 0xf0 && manufacturer === 0x43
  })
}

export function receiveMidi(page: Page, bytes: number[], deviceId?: string) {
  return page.evaluate(({ message, id }) => window.fm1FakeMidi.receive(message, id), {
    message: bytes,
    id: deviceId,
  })
}

export function setMidiDeviceConnected(page: Page, deviceId: string, connected: boolean) {
  return page.evaluate(({ id, online }) => window.fm1FakeMidi.setConnected(id, online), {
    id: deviceId,
    online: connected,
  })
}

/** Call only after awaiting the initial identity/order exchange, so no baseline traffic is hidden. */
export function clearSentMidi(page: Page) {
  return page.evaluate(() => {
    window.fm1FakeMidi.sent.length = 0
    Object.values(window.fm1FakeMidi.sentByDevice).forEach((messages) => {
      messages.length = 0
    })
  })
}
