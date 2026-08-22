import { describe, expect, it, vi } from 'vitest'

import { createPatchSyncCoordinator } from '@/lib/patch-sync-coordinator'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

function makeHarness(initial = Uint8Array.from([10, 20, 30])) {
  let active = true
  let revision = 0
  let parameters: Uint8Array = initial
  const states: string[] = []
  const synchronized: number[][] = []
  const voiceCalls: number[][] = []
  const effectCalls: number[][] = []
  const voiceResults: Deferred<boolean>[] = []
  const effectResults: Deferred<boolean>[] = []
  let activeSends = 0
  let maximumActiveSends = 0

  const coordinator = createPatchSyncCoordinator({
    getLatestSnapshot: () => ({ parameters, revision }),
    isCurrent: () => active,
    onStateChange: (state) => states.push(state),
    onSynchronized: (sentParameters) => synchronized.push(Array.from(sentParameters)),
    sendEffects: (sentParameters) => {
      effectCalls.push(Array.from(sentParameters))
      const result = deferred<boolean>()
      effectResults.push(result)
      return result.promise.finally(() => {
        activeSends -= 1
      })
    },
    sendVoice: (sentParameters) => {
      voiceCalls.push(Array.from(sentParameters))
      activeSends += 1
      maximumActiveSends = Math.max(maximumActiveSends, activeSends)
      const result = deferred<boolean>()
      voiceResults.push(result)
      return result.promise
    },
  })

  return {
    coordinator,
    effectCalls,
    effectResults,
    get maximumActiveSends() { return maximumActiveSends },
    get parameters() { return parameters },
    replace(nextParameters: Uint8Array) {
      parameters = nextParameters
      revision += 1
    },
    setActive(nextActive: boolean) {
      active = nextActive
    },
    states,
    synchronized,
    voiceCalls,
    voiceResults,
  }
}

describe('patch sync coordinator', () => {
  it('becomes live after one unchanged voice and effect snapshot succeeds', async () => {
    const harness = makeHarness()
    const result = harness.coordinator.requestSync()

    harness.voiceResults[0].resolve(true)
    await flushPromises()
    harness.effectResults[0].resolve(true)

    await expect(result).resolves.toBe(true)
    expect(harness.voiceCalls).toEqual([[10, 20, 30]])
    expect(harness.effectCalls).toEqual([[10, 20, 30]])
    expect(harness.states).toEqual(['sending', 'live'])
  })

  it('sends the latest snapshot after an edit during the voice send', async () => {
    const harness = makeHarness()
    const result = harness.coordinator.requestSync()

    harness.replace(Uint8Array.from([11, 20, 30]))
    harness.voiceResults[0].resolve(true)
    await flushPromises()
    harness.effectResults[0].resolve(true)
    await flushPromises()

    expect(harness.states).toEqual(['sending'])
    expect(harness.voiceCalls).toEqual([[10, 20, 30], [11, 20, 30]])

    harness.voiceResults[1].resolve(true)
    await flushPromises()
    harness.effectResults[1].resolve(true)

    await expect(result).resolves.toBe(true)
    expect(harness.synchronized).toEqual([[11, 20, 30]])
    expect(harness.states).toEqual(['sending', 'live'])
  })

  it('reconciles an edit made during the effect-settings phase', async () => {
    const harness = makeHarness()
    const result = harness.coordinator.requestSync()

    harness.voiceResults[0].resolve(true)
    await flushPromises()
    harness.replace(Uint8Array.from([10, 21, 30]))
    harness.effectResults[0].resolve(true)
    await flushPromises()

    expect(harness.voiceCalls).toEqual([[10, 20, 30], [10, 21, 30]])
    harness.voiceResults[1].resolve(true)
    await flushPromises()
    harness.effectResults[1].resolve(true)

    await expect(result).resolves.toBe(true)
    expect(harness.synchronized).toEqual([[10, 21, 30]])
  })

  it('coalesces rapid edits into serial full sends of the final state', async () => {
    const harness = makeHarness()
    const firstRequest = harness.coordinator.requestSync()
    const duplicateRequest = harness.coordinator.requestSync()

    harness.replace(Uint8Array.from([11, 20, 30]))
    harness.replace(Uint8Array.from([12, 22, 30]))
    harness.replace(Uint8Array.from([13, 23, 33]))
    harness.voiceResults[0].resolve(true)
    await flushPromises()
    harness.effectResults[0].resolve(true)
    await flushPromises()
    harness.voiceResults[1].resolve(true)
    await flushPromises()
    harness.effectResults[1].resolve(true)

    await expect(firstRequest).resolves.toBe(true)
    await expect(duplicateRequest).resolves.toBe(true)
    expect(harness.voiceCalls).toEqual([[10, 20, 30], [13, 23, 33]])
    expect(harness.maximumActiveSends).toBe(1)
  })

  it('leaves the editor local and preserves latest edits after an initial failure', async () => {
    const harness = makeHarness()
    const result = harness.coordinator.requestSync()

    harness.replace(Uint8Array.from([99, 20, 30]))
    harness.voiceResults[0].resolve(false)

    await expect(result).resolves.toBe(false)
    expect(harness.effectCalls).toEqual([])
    expect(harness.states).toEqual(['sending', 'local'])
    expect(harness.parameters).toEqual(Uint8Array.from([99, 20, 30]))
  })

  it('leaves the editor local when a reconciliation send fails', async () => {
    const harness = makeHarness()
    const result = harness.coordinator.requestSync()

    harness.replace(Uint8Array.from([11, 20, 30]))
    harness.voiceResults[0].resolve(true)
    await flushPromises()
    harness.effectResults[0].resolve(true)
    await flushPromises()
    harness.voiceResults[1].resolve(true)
    await flushPromises()
    harness.effectResults[1].resolve(false)

    await expect(result).resolves.toBe(false)
    expect(harness.states).toEqual(['sending', 'local'])
    expect(harness.synchronized).toEqual([])
  })

  it('updates the sent name and current audition only for the final successful snapshot', async () => {
    let parameters = Uint8Array.from([65, 65, 65])
    let revision = 0
    let audition = 'muted-operator-1'
    let sentName: number[] = []
    let appliedAudition = ''
    const voiceResults = [deferred<boolean>(), deferred<boolean>()]
    const effectResults = [deferred<boolean>(), deferred<boolean>()]
    let voiceIndex = 0
    let effectIndex = 0
    const coordinator = createPatchSyncCoordinator({
      getLatestSnapshot: () => ({ parameters, revision }),
      isCurrent: () => true,
      onStateChange: vi.fn(),
      onSynchronized: (sentParameters) => {
        sentName = Array.from(sentParameters)
        appliedAudition = audition
      },
      sendEffects: () => effectResults[effectIndex++].promise,
      sendVoice: () => voiceResults[voiceIndex++].promise,
    })
    const result = coordinator.requestSync()

    parameters = Uint8Array.from([66, 66, 66])
    revision += 1
    audition = 'solo-operator-2'
    voiceResults[0].resolve(true)
    await flushPromises()
    effectResults[0].resolve(true)
    await flushPromises()

    expect(sentName).toEqual([])
    voiceResults[1].resolve(true)
    await flushPromises()
    effectResults[1].resolve(true)

    await result
    expect(sentName).toEqual([66, 66, 66])
    expect(appliedAudition).toBe('solo-operator-2')
  })

  it('ignores stale completions after the owning editor becomes inactive', async () => {
    const harness = makeHarness()
    const result = harness.coordinator.requestSync()

    harness.setActive(false)
    harness.voiceResults[0].resolve(true)

    await expect(result).resolves.toBe(false)
    expect(harness.effectCalls).toEqual([])
    expect(harness.states).toEqual(['sending'])
    expect(harness.synchronized).toEqual([])
  })

  it('deduplicates repeated initial requests for React Strict Mode', async () => {
    const harness = makeHarness()
    const firstRequest = harness.coordinator.requestInitialSync('patch-1')
    const strictModeRequest = harness.coordinator.requestInitialSync('patch-1')

    expect(harness.voiceCalls).toEqual([[10, 20, 30]])
    harness.voiceResults[0].resolve(true)
    await flushPromises()
    harness.effectResults[0].resolve(true)

    await expect(firstRequest).resolves.toBe(true)
    await expect(strictModeRequest).resolves.toBe(true)
    expect(harness.voiceCalls).toHaveLength(1)
  })

  it('treats thrown MIDI errors as failed sends', async () => {
    const states: string[] = []
    const coordinator = createPatchSyncCoordinator({
      getLatestSnapshot: () => ({ parameters: Uint8Array.from([1]), revision: 0 }),
      isCurrent: () => true,
      onStateChange: (state) => states.push(state),
      onSynchronized: vi.fn(),
      sendEffects: vi.fn(),
      sendVoice: () => Promise.reject(new Error('MIDI disconnected')),
    })

    await expect(coordinator.requestSync()).resolves.toBe(false)
    expect(states).toEqual(['sending', 'local'])
  })
})
