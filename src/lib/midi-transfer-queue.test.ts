import { describe, expect, it } from 'vitest'

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
