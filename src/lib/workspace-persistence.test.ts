import { afterEach, describe, expect, it, vi } from 'vitest'

import { importVoices, makeDemoVoices, makeFactoryPatchLibrary } from '@/lib/patch-library'
import {
  shouldWarnBeforeUnload,
  WorkspacePersistenceController,
} from '@/lib/workspace-persistence'

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(() => {
  vi.useRealTimers()
})

describe('WorkspacePersistenceController', () => {
  it('hydrates an existing workspace without rewriting it', async () => {
    vi.useFakeTimers()
    const stored = importVoices(makeFactoryPatchLibrary(), 'A', makeDemoVoices())
    const save = vi.fn(async () => {})
    const controller = new WorkspacePersistenceController({
      createFactory: makeFactoryPatchLibrary,
      load: async () => stored,
      save,
    })

    controller.start()
    await flushPromises()
    await vi.runAllTimersAsync()

    expect(controller.getState()).toMatchObject({
      hasUnsavedChanges: false,
      status: 'ready',
      workspace: stored,
    })
    expect(save).not.toHaveBeenCalled()
  })

  it('creates and persists a factory workspace after a successful empty read', async () => {
    vi.useFakeTimers()
    const saveCompleted = deferred()
    const save = vi.fn(() => saveCompleted.promise)
    const controller = new WorkspacePersistenceController({
      createFactory: makeFactoryPatchLibrary,
      load: async () => null,
      save,
    })

    controller.start()
    await flushPromises()
    expect(controller.getState()).toMatchObject({ hasUnsavedChanges: true, status: 'saving' })
    await vi.advanceTimersByTimeAsync(350)

    expect(save).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledWith(controller.getState().workspace)
    expect(controller.getState()).toMatchObject({ hasUnsavedChanges: true, status: 'saving' })

    saveCompleted.resolve()
    await flushPromises()
    expect(controller.getState()).toMatchObject({ hasUnsavedChanges: false, status: 'ready' })
  })

  it('does not write factory data when the initial read rejects', async () => {
    vi.useFakeTimers()
    const save = vi.fn(async () => {})
    const controller = new WorkspacePersistenceController({
      createFactory: makeFactoryPatchLibrary,
      load: async () => { throw new Error('Temporary read failure') },
      save,
    })

    controller.start()
    await flushPromises()
    await vi.runAllTimersAsync()

    expect(save).not.toHaveBeenCalled()
    expect(controller.getState().workspace).toBeNull()
  })

  it('exposes a load error instead of a replacement workspace', async () => {
    const controller = new WorkspacePersistenceController({
      createFactory: makeFactoryPatchLibrary,
      load: async () => { throw new Error('Temporary read failure') },
      save: async () => {},
    })

    controller.start()
    await flushPromises()

    expect(controller.getState()).toMatchObject({
      error: { code: 'read-failed', detail: 'Temporary read failure' },
      hasUnsavedChanges: false,
      status: 'load-error',
      workspace: null,
    })
  })

  it('can retry a failed read and hydrate the recovered workspace', async () => {
    const stored = importVoices(makeFactoryPatchLibrary(), 'B', makeDemoVoices())
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('Temporary read failure'))
      .mockResolvedValueOnce(stored)
    const controller = new WorkspacePersistenceController({
      createFactory: makeFactoryPatchLibrary,
      load,
      save: async () => {},
    })

    controller.start()
    await flushPromises()
    controller.retryLoading()
    expect(controller.getState().status).toBe('loading')
    await flushPromises()

    expect(load).toHaveBeenCalledTimes(2)
    expect(controller.getState()).toMatchObject({ status: 'ready', workspace: stored })
  })

  it('continues with a session-only factory workspace without writing it', async () => {
    vi.useFakeTimers()
    const save = vi.fn(async () => {})
    const controller = new WorkspacePersistenceController({
      createFactory: makeFactoryPatchLibrary,
      load: async () => { throw new Error('Storage unavailable') },
      save,
    })

    controller.start()
    await flushPromises()
    controller.continueWithoutSaving()
    await vi.runAllTimersAsync()

    expect(controller.getState()).toMatchObject({
      hasUnsavedChanges: true,
      status: 'session-only',
    })
    expect(controller.getState().workspace).not.toBeNull()
    expect(save).not.toHaveBeenCalled()
  })

  it('does not retry loading over a modified session-only workspace', async () => {
    const load = vi.fn().mockRejectedValue(new Error('Storage unavailable'))
    const controller = new WorkspacePersistenceController({
      createFactory: makeFactoryPatchLibrary,
      load,
      save: async () => {},
    })

    controller.start()
    await flushPromises()
    controller.continueWithoutSaving()
    const edited = importVoices(controller.getState().workspace!, 'A', makeDemoVoices())
    controller.updateWorkspace(edited)
    controller.retryLoading()
    await flushPromises()

    expect(load).toHaveBeenCalledOnce()
    expect(controller.getState()).toMatchObject({ status: 'session-only', workspace: edited })
  })

  it('preserves the latest in-memory workspace when autosave fails', async () => {
    vi.useFakeTimers()
    const initial = makeFactoryPatchLibrary()
    const edited = importVoices(initial, 'A', makeDemoVoices())
    const controller = new WorkspacePersistenceController({
      createFactory: makeFactoryPatchLibrary,
      load: async () => initial,
      save: async () => { throw new Error('Quota exceeded') },
    })

    controller.start()
    await flushPromises()
    controller.updateWorkspace(edited)
    await vi.advanceTimersByTimeAsync(350)
    await flushPromises()

    expect(controller.getState()).toMatchObject({
      error: { code: 'write-failed', detail: 'Quota exceeded' },
      hasUnsavedChanges: true,
      status: 'save-error',
      workspace: edited,
    })
  })

  it('updates the pending snapshot without automatic writes after a save failure', async () => {
    vi.useFakeTimers()
    const initial = makeFactoryPatchLibrary()
    const firstEdit = importVoices(initial, 'A', makeDemoVoices())
    const latestEdit = importVoices(firstEdit, 'B', makeDemoVoices())
    const save = vi.fn().mockRejectedValue(new Error('Quota exceeded'))
    const controller = new WorkspacePersistenceController({
      createFactory: makeFactoryPatchLibrary,
      load: async () => initial,
      save,
    })

    controller.start()
    await flushPromises()
    controller.updateWorkspace(firstEdit)
    await vi.advanceTimersByTimeAsync(350)
    await flushPromises()
    controller.updateWorkspace(latestEdit)
    await vi.runAllTimersAsync()

    expect(controller.getState()).toMatchObject({ status: 'save-error', workspace: latestEdit })
    expect(save).toHaveBeenCalledOnce()
  })

  it('retries the latest snapshot and clears the error only after commit', async () => {
    vi.useFakeTimers()
    const initial = makeFactoryPatchLibrary()
    const firstEdit = importVoices(initial, 'A', makeDemoVoices())
    const latestEdit = importVoices(firstEdit, 'B', makeDemoVoices())
    const retryCompleted = deferred()
    const save = vi.fn()
      .mockRejectedValueOnce(new Error('Quota exceeded'))
      .mockImplementationOnce(() => retryCompleted.promise)
    const controller = new WorkspacePersistenceController({
      createFactory: makeFactoryPatchLibrary,
      load: async () => initial,
      save,
    })

    controller.start()
    await flushPromises()
    controller.updateWorkspace(firstEdit)
    await vi.advanceTimersByTimeAsync(350)
    await flushPromises()
    controller.updateWorkspace(latestEdit)
    controller.retrySaving()

    expect(save).toHaveBeenLastCalledWith(latestEdit)
    expect(controller.getState()).toMatchObject({ hasUnsavedChanges: true, status: 'saving' })
    expect(shouldWarnBeforeUnload(controller.getState())).toBe(true)

    retryCompleted.resolve()
    await flushPromises()
    expect(controller.getState()).toMatchObject({ error: null, hasUnsavedChanges: false, status: 'ready' })
    expect(shouldWarnBeforeUnload(controller.getState())).toBe(false)
  })

  it('serializes rapid edits so an older snapshot cannot become final storage', async () => {
    vi.useFakeTimers()
    const initial = makeFactoryPatchLibrary()
    const firstEdit = importVoices(initial, 'A', makeDemoVoices())
    const latestEdit = importVoices(firstEdit, 'B', makeDemoVoices())
    const firstWrite = deferred()
    const secondWrite = deferred()
    let stored = initial
    const save = vi.fn()
      .mockImplementationOnce(async (snapshot) => {
        await firstWrite.promise
        stored = snapshot
      })
      .mockImplementationOnce(async (snapshot) => {
        await secondWrite.promise
        stored = snapshot
      })
    const controller = new WorkspacePersistenceController({
      createFactory: makeFactoryPatchLibrary,
      load: async () => initial,
      save,
    })

    controller.start()
    await flushPromises()
    controller.updateWorkspace(firstEdit)
    await vi.advanceTimersByTimeAsync(350)
    controller.updateWorkspace(latestEdit)
    await vi.advanceTimersByTimeAsync(350)

    expect(save).toHaveBeenCalledOnce()
    firstWrite.resolve()
    await flushPromises()
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith(latestEdit)

    secondWrite.resolve()
    await flushPromises()
    expect(stored).toBe(latestEdit)
    expect(controller.getState()).toMatchObject({ hasUnsavedChanges: false, status: 'ready' })
  })

  it('does not produce unbounded retries while storage remains unavailable', async () => {
    vi.useFakeTimers()
    const initial = makeFactoryPatchLibrary()
    const save = vi.fn().mockRejectedValue(new Error('Storage unavailable'))
    const controller = new WorkspacePersistenceController({
      createFactory: makeFactoryPatchLibrary,
      load: async () => initial,
      save,
    })

    controller.start()
    await flushPromises()
    controller.updateWorkspace(importVoices(initial, 'A', makeDemoVoices()))
    await vi.advanceTimersByTimeAsync(10_000)
    await flushPromises()
    controller.updateWorkspace(importVoices(initial, 'B', makeDemoVoices()))
    await vi.advanceTimersByTimeAsync(10_000)

    expect(save).toHaveBeenCalledOnce()
  })

  it('ignores pending load and save completions after disposal', async () => {
    vi.useFakeTimers()
    const pendingLoad = deferred<ReturnType<typeof makeFactoryPatchLibrary> | null>()
    const onWorkspaceLoaded = vi.fn()
    const loadController = new WorkspacePersistenceController({
      createFactory: makeFactoryPatchLibrary,
      load: () => pendingLoad.promise,
      onWorkspaceLoaded,
      save: async () => {},
    })
    const loadListener = vi.fn()
    loadController.subscribe(loadListener)
    loadController.start()
    const loadCallsBeforeDisposal = loadListener.mock.calls.length
    loadController.dispose()
    pendingLoad.resolve(makeFactoryPatchLibrary())
    await flushPromises()

    expect(onWorkspaceLoaded).not.toHaveBeenCalled()
    expect(loadListener).toHaveBeenCalledTimes(loadCallsBeforeDisposal)

    const initial = makeFactoryPatchLibrary()
    const pendingSave = deferred()
    const saveController = new WorkspacePersistenceController({
      createFactory: makeFactoryPatchLibrary,
      load: async () => initial,
      save: () => pendingSave.promise,
    })
    const saveListener = vi.fn()
    saveController.subscribe(saveListener)
    saveController.start()
    await flushPromises()
    saveController.updateWorkspace(importVoices(initial, 'A', makeDemoVoices()))
    await vi.advanceTimersByTimeAsync(350)
    const callsBeforeDisposal = saveListener.mock.calls.length
    saveController.dispose()
    pendingSave.resolve()
    await flushPromises()

    expect(saveListener).toHaveBeenCalledTimes(callsBeforeDisposal)
  })
})

describe('shouldWarnBeforeUnload', () => {
  it('warns only while a save failure still leaves changes unpersisted', () => {
    expect(shouldWarnBeforeUnload({ hasSaveFailure: true, hasUnsavedChanges: true })).toBe(true)
    expect(shouldWarnBeforeUnload({ hasSaveFailure: true, hasUnsavedChanges: false })).toBe(false)
    expect(shouldWarnBeforeUnload({ hasSaveFailure: false, hasUnsavedChanges: true })).toBe(false)
  })
})
