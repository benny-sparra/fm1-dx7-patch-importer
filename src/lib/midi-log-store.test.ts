import { describe, expect, it, vi } from 'vitest'

import { MidiLogStore } from '@/lib/midi-log-store'
import type { MidiLogEntry } from '@/lib/midi'

const entry = (id: string): MidiLogEntry => ({
  createdAt: '12:00:00',
  direction: 'out',
  id,
  message: `Message ${id}`,
})

describe('MidiLogStore', () => {
  it('retains only the fifty newest entries', () => {
    const store = new MidiLogStore([entry('initial')])

    for (let index = 1; index <= 55; index += 1) store.append(entry(String(index)))

    const ids = store.getSnapshot().map(({ id }) => id)
    expect(ids).toHaveLength(50)
    expect(ids[0]).toBe('55')
    expect(ids.at(-1)).toBe('6')
  })

  it('reports activity only once an entry has been appended', () => {
    const store = new MidiLogStore([entry('initial')])

    expect(store.hasActivity()).toBe(false)

    store.append(entry('1'))

    expect(store.hasActivity()).toBe(true)
  })

  it('stops publishing to an unsubscribed listener', () => {
    const store = new MidiLogStore([entry('initial')])
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.append(entry('1'))

    unsubscribe()
    store.append(entry('2'))

    expect(listener).toHaveBeenCalledOnce()
  })
})
