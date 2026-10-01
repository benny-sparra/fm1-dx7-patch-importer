import type { Page } from '@playwright/test'

// The FM1's answers to the identity query, captured from M-VAVE's V15 firmware and from FM-1+VA's
// FM-1_089 (see src/test/fake-fm1-midi.ts).
// prettier-ignore
const identityReplies = {
  'fm1-va': [
    0xf0, 0x00, 0x32, 0x45, 0x58, 0x01, 0x00, 0x00, 0x23, 0x4d, 0x5a, 0x44, 0x79, 0x05, 0x06, 0x4e,
    0x1c, ...Array<number>(21).fill(0), 0x20, 0x06, 0xf7,
  ],
  mvave: [
    0xf0, 0x00, 0x32, 0x45, 0x58, 0x01, 0x00, 0x00, 0x23, 0x4d, 0x5a, 0x44, 0x79, 0x05, 0x26, 0x4c,
    0x1a, ...Array<number>(21).fill(0), 0x20, 0x06, 0xf7,
  ],
}

type FakeMidiOptions = {
  /** Which firmware the FM1 names when asked; M-VAVE's unless a journey chooses FM-1+VA. */
  firmware?: keyof typeof identityReplies
  /** The name the FM1's ports report: Linux lists `FM-1 MIDI 1`, macOS `USB Composite Device`. */
  portName?: string
  /** Whether the browser grants SysEx access, as a user can decline it at the permission prompt. */
  sysex?: boolean
}

/**
 * Replaces the browser's Web MIDI API with one FM-1 that records what it is sent, so a journey can
 * connect MIDI and check the bytes without hardware or a permission prompt. Call before `goto`.
 */
export async function installFakeMidi(
  page: Page,
  { firmware = 'mvave', portName = 'FM-1 MIDI 1', sysex = true }: FakeMidiOptions = {},
) {
  await page.addInitScript(
    ({ identityReply, name, sysexGranted }) => {
      const sent: number[][] = []
      const makePort = (type: 'input' | 'output') => ({
        connection: 'closed',
        id: `fm1-${type}`,
        manufacturer: 'M-VAVE',
        name,
        onmidimessage: null as ((event: { data: Uint8Array; timeStamp: number }) => void) | null,
        onstatechange: null,
        state: 'connected',
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
          const message = Array.from(data)
          sent.push(message)
          // The FM1 answers the updater's identity query (F0 00 32 45 …) with its firmware name.
          if (message[1] === 0x00 && message[2] === 0x32) {
            setTimeout(() =>
              input.onmidimessage?.({
                data: Uint8Array.from(identityReply),
                timeStamp: performance.now(),
              }),
            )
          }
        },
      })
      const input = makePort('input')
      const output = makePort('output')

      Object.defineProperty(window, 'fm1FakeMidi', {
        value: {
          receive: (bytes: number[]) =>
            input.onmidimessage?.({ data: Uint8Array.from(bytes), timeStamp: performance.now() }),
          sent,
        },
      })
      Object.defineProperty(navigator, 'requestMIDIAccess', {
        configurable: true,
        value: async (options?: { sysex?: boolean }) => ({
          inputs: new Map([[input.id, input]]),
          onstatechange: null,
          outputs: new Map([[output.id, output]]),
          sysexEnabled: Boolean(options?.sysex) && sysexGranted,
        }),
      })
    },
    { identityReply: identityReplies[firmware], name: portName, sysexGranted: sysex },
  )
}

declare global {
  interface Window {
    fm1FakeMidi: { receive: (bytes: number[]) => void; sent: number[][] }
  }
}

/** Every message the fake FM-1 has received, oldest first. */
export function sentMidi(page: Page) {
  return page.evaluate(() => window.fm1FakeMidi.sent.map((message) => [...message]))
}

/** Messages the fake FM-1 has received that are Yamaha SysEx. */
export async function sentSysex(page: Page) {
  return (await sentMidi(page)).filter(([status, manufacturer]) => {
    return status === 0xf0 && manufacturer === 0x43
  })
}

export function receiveMidi(page: Page, bytes: number[]) {
  return page.evaluate((message) => window.fm1FakeMidi.receive(message), bytes)
}
