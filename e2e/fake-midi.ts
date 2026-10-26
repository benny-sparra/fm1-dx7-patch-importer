import type { Page } from '@playwright/test'

// The FM1's answers to the identity query, captured from M-VAVE's V15 firmware, from FM-1+VA's
// FM-1_089, and from Official Open V12 (see src/test/fake-fm1-midi.ts), FM-1_089's with the name
// changed to FM-1_097, and V15's with the name changed to FM-1_016.
// prettier-ignore
const identityReplies = {
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
  // Built for FM-1_016, the name M-VAVE's V16 reports, as `mvaveV16IdentityReply` is.
  'mvave-v16': [
    0xf0, 0x00, 0x32, 0x45, 0x58, 0x01, 0x00, 0x00, 0x23, 0x4d, 0x5a, 0x44, 0x79, 0x05, 0x26, 0x0c,
    0x1b, ...Array<number>(21).fill(0), 0x20, 0x06, 0xf7,
  ],
  'official-open': [
    0xf0, 0x00, 0x32, 0x45, 0x58, 0x01, 0x00, 0x00, 0x23, 0x4d, 0x5a, 0x44, 0x79, 0x05, 0x07, 0x0c,
    0x18, 0x30, 0x60, 0x44, 0x11, 0x03, ...Array<number>(17).fill(0), 0x15, 0xf7,
  ],
}

type FakeMidiOptions = {
  /** Which firmware the FM1 names when asked; M-VAVE's unless a journey chooses FM-1+VA. */
  firmware?: keyof typeof identityReplies
  /** The name the FM1's ports report: Linux lists `FM-1 MIDI 1`, macOS `USB Composite Device`. */
  portName?: string
  /** Whether the browser grants SysEx access, as a user can decline it at the permission prompt. */
  sysex?: boolean
  /**
   * The engine each Official Open track runs, by number (0 DX7, 1 303, 2 808, 3 PSG), which the
   * FM1 answers command 0 with, as `officialOpenInfoReply` in src/test/fake-fm1-midi.ts builds it.
   */
  trackEngines?: number[]
}

/**
 * Replaces the browser's Web MIDI API with one FM-1 that records what it is sent, so a journey can
 * connect MIDI and check the bytes without hardware or a permission prompt. Call before `goto`.
 */
export async function installFakeMidi(
  page: Page,
  {
    firmware = 'mvave',
    portName = 'FM-1 MIDI 1',
    sysex = true,
    trackEngines,
  }: FakeMidiOptions = {},
) {
  await page.addInitScript(
    ({ engines, identityReply, name, sysexGranted }) => {
      const sent: number[][] = []
      // Official Open's answer to command 0 (F0 7D 46 4D 02 00 …), echoing the request's token.
      const infoReply = (tokenLow: number, tokenHigh: number) => {
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
          if (engines && message[1] === 0x7d && message[5] === 0x00) {
            setTimeout(() =>
              input.onmidimessage?.({
                data: Uint8Array.from(infoReply(message[6], message[7])),
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
    {
      engines: trackEngines,
      identityReply: identityReplies[firmware],
      name: portName,
      sysexGranted: sysex,
    },
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
