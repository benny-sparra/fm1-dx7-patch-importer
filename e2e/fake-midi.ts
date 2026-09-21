import type { Page } from '@playwright/test'

type FakeMidiOptions = {
  /** Whether the browser grants SysEx access, as a user can decline it at the permission prompt. */
  sysex?: boolean
}

/**
 * Replaces the browser's Web MIDI API with one FM-1 that records what it is sent, so a journey can
 * connect MIDI and check the bytes without hardware or a permission prompt. Call before `goto`.
 */
export async function installFakeMidi(page: Page, { sysex = true }: FakeMidiOptions = {}) {
  await page.addInitScript(
    ({ sysexGranted }) => {
      const sent: number[][] = []
      const makePort = (type: 'input' | 'output') => ({
        connection: 'closed',
        id: `fm1-${type}`,
        manufacturer: 'M-VAVE',
        name: 'FM-1 MIDI 1',
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
          sent.push(Array.from(data))
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
    { sysexGranted: sysex },
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
