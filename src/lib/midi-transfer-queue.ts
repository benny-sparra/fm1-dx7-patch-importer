export type MidiTransferTask = () => void | Promise<void>

type QueuedTask = {
  key?: string
  run: MidiTransferTask
  resolve: () => void
  reject: (reason: unknown) => void
}

export type MidiTransferQueueOptions = {
  minimumIntervalMs?: number
}

/**
 * Serialises MIDI writes and optionally coalesces pending parameter edits.
 * Bulk-transfer tasks should be enqueued without a key so every chunk is sent.
 * Live edits should share a key per parameter so only the latest pending value wins.
 */
export class MidiTransferQueue {
  private readonly minimumIntervalMs: number
  private queue: QueuedTask[] = []
  private running = false
  private cancelled = false
  private lastRunAt = 0

  constructor({ minimumIntervalMs = 0 }: MidiTransferQueueOptions = {}) {
    this.minimumIntervalMs = Math.max(0, minimumIntervalMs)
  }

  enqueue(run: MidiTransferTask, key?: string) {
    if (this.cancelled) {
      return Promise.reject(new Error('MIDI transfer queue has been cancelled.'))
    }

    return new Promise<void>((resolve, reject) => {
      if (key) {
        const pendingIndex = this.queue.findIndex((task) => task.key === key)

        if (pendingIndex >= 0) {
          const replaced = this.queue[pendingIndex]
          replaced.resolve()
          this.queue[pendingIndex] = { key, run, resolve, reject }
          return
        }
      }

      this.queue.push({ key, run, resolve, reject })
      void this.drain()
    })
  }

  clear(reason = 'MIDI transfer queue was cleared.') {
    const error = new Error(reason)
    this.queue.splice(0).forEach((task) => task.reject(error))
  }

  cancel() {
    this.cancelled = true
    this.clear('MIDI transfer queue was cancelled.')
  }

  private async drain() {
    if (this.running || this.cancelled) {
      return
    }

    this.running = true

    while (this.queue.length > 0 && !this.cancelled) {
      const elapsed = performance.now() - this.lastRunAt
      const delay = this.minimumIntervalMs - elapsed

      if (delay > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, delay))
      }

      const task = this.queue.shift()

      if (!task) {
        break
      }

      try {
        await task.run()
        this.lastRunAt = performance.now()
        task.resolve()
      } catch (error) {
        task.reject(error)
      }
    }

    this.running = false
  }
}
