import { type MidiLogEntry } from '@/lib/midi'

const logLimit = 8

export class MidiLogStore {
  private listeners = new Set<() => void>()
  private snapshot: MidiLogEntry[]

  constructor(initialEntries: MidiLogEntry[]) {
    this.snapshot = initialEntries.slice(0, logLimit)
  }

  readonly getSnapshot = () => this.snapshot

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  append(entry: MidiLogEntry) {
    this.snapshot = [entry, ...this.snapshot].slice(0, logLimit)
    this.listeners.forEach((listener) => listener())
  }
}
