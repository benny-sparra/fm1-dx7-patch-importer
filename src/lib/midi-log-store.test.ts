import { describe, expect, it, vi } from 'vitest'

import { MidiLogStore } from '@/lib/midi-log-store'
import { type MidiLogEntry } from '@/lib/midi'

const entry = (id: string): MidiLogEntry => ({
  createdAt: '12:00:00',
  direction: 'out',
  id,
  message: `Message ${id}`,
})

describe('MidiLogStore', () => {
  it('retains only the eight newest entries', () => {
    const store = new MidiLogStore([entry('initial')])

    store.append(entry('1'))
    store.append(entry('2'))
    store.append(entry('3'))
    store.append(entry('4'))
    store.append(entry('5'))
    store.append(entry('6'))
    store.append(entry('7'))
    store.append(entry('8'))
    store.append(entry('9'))

    expect(store.getSnapshot().map(({ id }) => id)).toEqual([
      '9', '8', '7', '6', '5', '4', '3', '2',
    ])
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
