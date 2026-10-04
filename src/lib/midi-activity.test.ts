// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MidiActivityStore, midiActivityLitMs } from './midi-activity'

/** A store with an LED showing, as the header's LEDs subscribe to it. */
function shownStore() {
  const store = new MidiActivityStore()
  store.subscribe(() => {})
  return store
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MidiActivityStore', () => {
  it('lights the LED for the direction a message went', () => {
    const store = shownStore()

    store.signal('out')

    expect(store.getSnapshot()).toEqual({ in: false, out: true })
  })

  it('goes dark once the lit time has passed after the frame that shows it', () => {
    const store = shownStore()

    store.signal('in')
    vi.advanceTimersToNextFrame()
    vi.advanceTimersByTime(midiActivityLitMs - 1)
    expect(store.getSnapshot().in).toBe(true)
    vi.advanceTimersByTime(1)

    expect(store.getSnapshot().in).toBe(false)
  })

  it('counts the lit time from the frame, not from a send that held the main thread', () => {
    const store = shownStore()

    store.signal('out')
    vi.advanceTimersByTime(midiActivityLitMs)

    expect(store.getSnapshot().out).toBe(true)
  })

  it('stays lit through a stream of messages and tells listeners only when it turns on and off', () => {
    const store = new MidiActivityStore()
    const listener = vi.fn()
    store.subscribe(listener)

    for (let message = 0; message < 10; message += 1) {
      store.signal('out')
      vi.advanceTimersToNextFrame()
      vi.advanceTimersByTime(midiActivityLitMs / 2)
    }
    expect(store.getSnapshot().out).toBe(true)
    vi.advanceTimersByTime(midiActivityLitMs)

    expect(store.getSnapshot().out).toBe(false)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('lights each direction on its own', () => {
    const store = shownStore()

    store.signal('out')
    vi.advanceTimersToNextFrame()
    vi.advanceTimersByTime(midiActivityLitMs / 2)
    store.signal('in')
    vi.advanceTimersToNextFrame()
    vi.advanceTimersByTime(midiActivityLitMs / 2)

    expect(store.getSnapshot()).toEqual({ in: true, out: false })
  })

  it('lights nothing while no LED shows it', () => {
    const store = new MidiActivityStore()

    store.signal('out')

    expect(store.getSnapshot().out).toBe(false)
  })

  it('stops telling a listener that unsubscribed', () => {
    const store = new MidiActivityStore()
    const listener = vi.fn()
    store.subscribe(listener)()

    store.signal('in')

    expect(listener).not.toHaveBeenCalled()
  })
})
