export type MidiActivityDirection = 'in' | 'out'

/** Which of the MIDI activity LEDs are lit. A new object only when one turns on or off. */
type MidiActivity = Readonly<Record<MidiActivityDirection, boolean>>

/**
 * How long an LED stays lit after the last message through it: long enough to see a single
 * message, short enough that messages a few tenths of a second apart flicker as they would on a
 * synth's panel.
 */
export const midiActivityLitMs = 80

const dark: MidiActivity = { in: false, out: false }

/**
 * Lights an LED for each MIDI message the editor sends or hears, like the MIDI activity light on a
 * synth's panel. Listeners hear only when an LED turns on or off, so a stream of messages costs no
 * renders while it lasts.
 */
export class MidiActivityStore {
  private listeners = new Set<() => void>()
  private snapshot = dark
  private frames: Partial<Record<MidiActivityDirection, number>> = {}
  private timers: Partial<Record<MidiActivityDirection, number>> = {}

  /** The channels lit, as a bit mask: channel n is bit n − 1. */
  private channelMask = 0
  private channelFrames = new Map<number, number>()
  private channelTimers = new Map<number, number>()

  readonly getSnapshot = () => this.snapshot

  readonly getChannelSnapshot = () => this.channelMask

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Lights `channel`'s indicator, as the Voices' lights show traffic on a Voice's channel. Heard
   * from `signal`, so a message on a channel lights it beside the IN or OUT LED.
   */
  private signalChannel(channel: number) {
    if (!Number.isInteger(channel) || channel < 1 || channel > 16) return
    window.cancelAnimationFrame(this.channelFrames.get(channel) ?? 0)
    window.clearTimeout(this.channelTimers.get(channel))
    this.setChannel(channel, true)
    this.channelFrames.set(
      channel,
      window.requestAnimationFrame(() => {
        this.channelTimers.set(
          channel,
          window.setTimeout(() => this.setChannel(channel, false), midiActivityLitMs),
        )
      }),
    )
  }

  private setChannel(channel: number, lit: boolean) {
    const bit = 1 << (channel - 1)
    const next = lit ? this.channelMask | bit : this.channelMask & ~bit
    if (next === this.channelMask) return
    this.channelMask = next
    this.listeners.forEach((listener) => listener())
  }

  signal(direction: MidiActivityDirection, channel?: number) {
    // Nothing shows the LEDs, so there is nothing to light.
    if (this.listeners.size === 0) return
    if (channel !== undefined) this.signalChannel(channel)
    window.cancelAnimationFrame(this.frames[direction] ?? 0)
    window.clearTimeout(this.timers[direction])
    this.set(direction, true)
    // Counted from the frame that shows the LED: sending a patch can hold the main thread long
    // enough that a timer started now would end before the LED was ever drawn.
    this.frames[direction] = window.requestAnimationFrame(() => {
      this.timers[direction] = window.setTimeout(
        () => this.set(direction, false),
        midiActivityLitMs,
      )
    })
  }

  private set(direction: MidiActivityDirection, lit: boolean) {
    if (this.snapshot[direction] === lit) return
    this.snapshot = { ...this.snapshot, [direction]: lit }
    this.listeners.forEach((listener) => listener())
  }
}

/** The one store every MIDI send and the selected input report to. */
export const midiActivity = new MidiActivityStore()
