import { describe, expect, it, vi } from 'vitest'

import { FM1_EDITOR_PARAMETER_COUNT } from '@/lib/fm1-parameters'
import { operatorOutputParameter } from '@/lib/operator-audition'
import {
  displayedParameters,
  hasUnsavedEdits,
  PatchEditorSession,
  type PatchEditorMidi,
} from '@/lib/patch-editor-session'

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

function makeMidi(overrides: Partial<PatchEditorMidi> = {}): PatchEditorMidi {
  return {
    hasMidiOutput: true,
    sendEffectParameter: vi.fn(() => true),
    sendEffectSettings: vi.fn(async () => true),
    sendParameter: vi.fn(() => true),
    sendVoice: vi.fn(async () => true),
    sysexAvailable: true,
    ...overrides,
  }
}

/** Opens a session on an all-zero patch and waits for its first sync to go live. */
async function openLiveSession(midi = makeMidi()) {
  const session = new PatchEditorSession(new Uint8Array(FM1_EDITOR_PARAMETER_COUNT), () => midi)
  session.synchronize('a-1')
  await vi.waitFor(() => expect(session.getState().syncState).toBe('live'))
  return { midi, session }
}

describe('PatchEditorSession', () => {
  it('throws a rejected edit to its caller and leaves the working copy as it was', async () => {
    const { session } = await openLiveSession()
    const before = session.getState()

    expect(() => session.applyEdits([[FM1_EDITOR_PARAMETER_COUNT, 1]])).toThrow(RangeError)
    expect(session.getState()).toBe(before)
  })

  it('keeps the same state, and tells no subscriber, when an edit changes nothing', async () => {
    const { session } = await openLiveSession()
    const listener = vi.fn()
    session.subscribe(listener)
    const before = session.getState()

    session.setParameter(0, 0)

    expect(session.getState()).toBe(before)
    expect(listener).not.toHaveBeenCalled()
  })

  it('reads an edit made during a gesture at once, and undoes the whole gesture in one step', async () => {
    const { session } = await openLiveSession()

    session.beginGesture()
    session.setParameter(0, 10)
    expect(session.getState().history.present[0]).toBe(10)
    session.setParameter(0, 20)
    session.endGesture()
    session.undo()

    expect(session.getState().history.present[0]).toBe(0)
    expect(session.getState().history.past).toHaveLength(0)
  })

  it('follows a send in flight with the saved version when compare starts', async () => {
    const { midi, session } = await openLiveSession()
    const savedVoice = vi.mocked(midi.sendVoice).mock.calls[0][0].data
    session.setParameter(0, 42)
    const firstVoice = deferred<boolean>()
    vi.mocked(midi.sendVoice).mockClear()
    vi.mocked(midi.sendVoice).mockImplementationOnce(() => firstVoice.promise)

    void session.requestSync()
    expect(session.toggleCompare()).toBe(true)
    firstVoice.resolve(true)

    await vi.waitFor(() => expect(midi.sendVoice).toHaveBeenCalledTimes(2))
    const [[editedVoice], [comparedVoice]] = vi.mocked(midi.sendVoice).mock.calls
    expect(editedVoice.data).not.toEqual(savedVoice)
    expect(comparedVoice.data).toEqual(savedVoice)
    expect(displayedParameters(session.getState())[0]).toBe(0)
    await vi.waitFor(() => expect(session.getState().syncState).toBe('live'))
  })

  it('reapplies a muted operator after a full voice send', async () => {
    const { midi, session } = await openLiveSession()
    session.toggleOperatorMute(1)
    vi.mocked(midi.sendParameter).mockClear()

    await session.requestSync()

    expect(midi.sendParameter).toHaveBeenCalledWith(operatorOutputParameter(1), 0)
  })

  it('leaves the sync state alone when a send finishes after the editor has closed', async () => {
    const voice = deferred<boolean>()
    const midi = makeMidi({ sendVoice: vi.fn(() => voice.promise) })
    const session = new PatchEditorSession(new Uint8Array(FM1_EDITOR_PARAMETER_COUNT), () => midi)
    const deactivate = session.activate()
    session.synchronize('a-1')

    deactivate()
    voice.resolve(true)

    await expect(session.requestSync()).resolves.toBe(false)
    expect(session.getState().syncState).toBe('sending')
  })

  it('makes the stored working copy the saved version', async () => {
    const { session } = await openLiveSession()
    const store = vi.fn()
    session.setParameter(0, 5)

    session.save(store)

    expect(store).toHaveBeenCalledTimes(1)
    expect(hasUnsavedEdits(session.getState())).toBe(false)
  })
})
