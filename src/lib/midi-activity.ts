import { prefersReducedMotion } from '@/lib/reduced-motion'

export type MidiActivityDirection = 'in' | 'out'

/** Which of the MIDI activity LEDs are lit. A new object only when one turns on or off. */
type MidiActivity = Readonly<Record<MidiActivityDirection, boolean>>

/**
 * How long an LED stays lit after the last message through it: long enough to see a single
 * message, short enough that messages a few tenths of a second apart flicker as they would on a
 * synth's panel.
 */
export const midiActivityLitMs = 80

/** With reduced motion the LED stays lit a little longer, since it has no fade to be seen by. */
export const midiActivityReducedLitMs = 150

/** A bank dump blips twice, this long after the first, as the second lights once the first is dark. */
export const midiActivityDoubleBlipMs = 180

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

  readonly getSnapshot = () => this.snapshot

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  signal(direction: MidiActivityDirection, twice = false) {
    // Nothing shows the LEDs, so there is nothing to light.
    if (this.listeners.size === 0) return
    if (twice) window.setTimeout(() => this.signal(direction), midiActivityDoubleBlipMs)
    window.cancelAnimationFrame(this.frames[direction] ?? 0)
    window.clearTimeout(this.timers[direction])
    this.set(direction, true)
    // Counted from the frame that shows the LED: sending a patch can hold the main thread long
    // enough that a timer started now would end before the LED was ever drawn.
    this.frames[direction] = window.requestAnimationFrame(() => {
      this.timers[direction] = window.setTimeout(
        () => this.set(direction, false),
        prefersReducedMotion() ? midiActivityReducedLitMs : midiActivityLitMs,
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
