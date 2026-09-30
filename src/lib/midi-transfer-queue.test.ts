// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { MidiTransferCancelledError, MidiTransferQueue } from '@/lib/midi-transfer-queue'

describe('MidiTransferQueue', () => {
  it('drops waiting transfers with a cancellation error when cleared', async () => {
    const queue = new MidiTransferQueue()
    const sent: string[] = []

    const first = queue.enqueue(() => {
      sent.push('first')
    })
    const waiting = queue.enqueue(() => {
      sent.push('waiting')
    })
    queue.clear('The MIDI output changed.')

    await expect(first).resolves.toBeUndefined()
    await expect(waiting).rejects.toThrow(MidiTransferCancelledError)
    expect(sent).toEqual(['first'])
  })
})

describe('MidiTransferQueue coalescing', () => {
  it('sends only the latest waiting value for a key, in its original place in the queue', async () => {
    const queue = new MidiTransferQueue()
    const sent: string[] = []
    const send = (value: string, key?: string) =>
      queue.enqueue(() => {
        sent.push(value)
      }, key)

    const running = send('p5=1', 'parameter-5')
    const replaced = send('p5=2', 'parameter-5')
    const other = send('p6=1', 'parameter-6')
    const latest = send('p5=3', 'parameter-5')

    await Promise.all([running, replaced, other, latest])
    expect(sent).toEqual(['p5=1', 'p5=3', 'p6=1'])
  })

  it('sends every transfer that has no key', async () => {
    const queue = new MidiTransferQueue()
    const sent: string[] = []

    await Promise.all(
      ['chunk 1', 'chunk 2', 'chunk 3'].map((chunk) =>
        queue.enqueue(() => {
          sent.push(chunk)
        }),
      ),
    )

    expect(sent).toEqual(['chunk 1', 'chunk 2', 'chunk 3'])
  })

  it('rejects a transfer the port refused and goes on with the next one', async () => {
    const queue = new MidiTransferQueue()
    const sent: string[] = []

    const refused = queue.enqueue(() => {
      throw new Error('port closed')
    })
    const next = queue.enqueue(() => {
      sent.push('next')
    })

    await expect(refused).rejects.toThrow('port closed')
    await expect(next).resolves.toBeUndefined()
    expect(sent).toEqual(['next'])
  })
})

describe('MidiTransferQueue spacing', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits the queue interval between transfers', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'performance'] })
    const queue = new MidiTransferQueue({ minimumIntervalMs: 1000 })
    const sent: string[] = []

    void queue.enqueue(() => {
      sent.push('first')
    })
    void queue.enqueue(() => {
      sent.push('second')
    })
    await vi.advanceTimersByTimeAsync(1500)

    expect(sent).toEqual(['first'])
  })

  it('sends a transfer with its own interval without waiting the queue interval', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'performance'] })
    const queue = new MidiTransferQueue({ minimumIntervalMs: 1000 })
    const sent: string[] = []

    const transfers = ['first', 'second', 'third'].map((value) =>
      queue.enqueue(
        () => {
          sent.push(value)
        },
        undefined,
        { minimumIntervalMs: 0 },
      ),
    )
    await vi.advanceTimersByTimeAsync(0)

    await Promise.all(transfers)
    expect(sent).toEqual(['first', 'second', 'third'])
  })
})
