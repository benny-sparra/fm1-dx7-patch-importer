export type PatchSyncState = 'live' | 'local' | 'sending'

type PatchSyncSnapshot = {
  parameters: Uint8Array
  revision: number
}

type PatchSyncCoordinatorOptions = {
  getLatestSnapshot: () => PatchSyncSnapshot
  isCurrent: () => boolean
  onStateChange: (state: PatchSyncState) => void
  onSynchronized: (parameters: Uint8Array) => void
  sendEffects: (parameters: Uint8Array) => Promise<boolean>
  sendVoice: (parameters: Uint8Array) => Promise<boolean>
}

export type PatchSyncCoordinator = {
  requestInitialSync: (key: string) => Promise<boolean>
  requestSync: () => Promise<boolean>
}

export function createPatchSyncCoordinator(
  options: PatchSyncCoordinatorOptions,
): PatchSyncCoordinator {
  let inFlight: Promise<boolean> | null = null
  const initialRequests = new Map<string, Promise<boolean>>()

  const run = async () => {
    if (!options.isCurrent()) return false
    options.onStateChange('sending')

    try {
      while (options.isCurrent()) {
        const latest = options.getLatestSnapshot()
        const snapshot = {
          parameters: latest.parameters.slice(),
          revision: latest.revision,
        }

        if (!(await options.sendVoice(snapshot.parameters))) {
          if (options.isCurrent()) options.onStateChange('local')
          return false
        }
        if (!options.isCurrent()) return false

        if (!(await options.sendEffects(snapshot.parameters))) {
          if (options.isCurrent()) options.onStateChange('local')
          return false
        }
        if (!options.isCurrent()) return false

        if (options.getLatestSnapshot().revision !== snapshot.revision) continue

        options.onSynchronized(snapshot.parameters)
        if (!options.isCurrent()) return false
        options.onStateChange('live')
        return true
      }
    } catch {
      if (options.isCurrent()) options.onStateChange('local')
    }

    return false
  }

  const requestSync = () => {
    if (inFlight) return inFlight

    const requested = run()
    inFlight = requested
    void requested.finally(() => {
      if (inFlight === requested) inFlight = null
    })
    return requested
  }

  const requestInitialSync = (key: string) => {
    const existing = initialRequests.get(key)
    if (existing) return existing

    const requested = requestSync()
    initialRequests.set(key, requested)
    return requested
  }

  return { requestInitialSync, requestSync }
}
