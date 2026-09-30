export type MidiTransferTask = () => void | Promise<void>

type QueuedTask = {
  key?: string
  minimumIntervalMs?: number
  run: MidiTransferTask
  resolve: () => void
  reject: (reason: unknown) => void
}

export type MidiTransferQueueOptions = {
  minimumIntervalMs?: number
}

export type MidiTransferOptions = {
  /** The gap before this transfer, in place of the queue's own minimum interval. */
  minimumIntervalMs?: number
}

/** A transfer that was dropped before it ran, as opposed to one the MIDI port rejected. */
export class MidiTransferCancelledError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MidiTransferCancelledError'
  }
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
  private lastRunAt = 0

  constructor({ minimumIntervalMs = 0 }: MidiTransferQueueOptions = {}) {
    this.minimumIntervalMs = Math.max(0, minimumIntervalMs)
  }

  enqueue(run: MidiTransferTask, key?: string, { minimumIntervalMs }: MidiTransferOptions = {}) {
    return new Promise<void>((resolve, reject) => {
      const task = { key, minimumIntervalMs, run, resolve, reject }
      if (key) {
        const pendingIndex = this.queue.findIndex((pending) => pending.key === key)

        if (pendingIndex >= 0) {
          const replaced = this.queue[pendingIndex]
          replaced.resolve()
          this.queue[pendingIndex] = task
          return
        }
      }

      this.queue.push(task)
      void this.drain()
    })
  }

  clear(reason = 'MIDI transfer queue was cleared.') {
    const error = new MidiTransferCancelledError(reason)
    this.queue.splice(0).forEach((task) => task.reject(error))
  }

  private async drain() {
    if (this.running) {
      return
    }

    this.running = true

    while (this.queue.length > 0) {
      const elapsed = performance.now() - this.lastRunAt
      const interval = Math.max(0, this.queue[0].minimumIntervalMs ?? this.minimumIntervalMs)
      const delay = interval - elapsed

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
