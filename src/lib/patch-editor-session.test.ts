import { describe, expect, it, vi } from 'vitest'

import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_VA_BITCRUSH_START,
  FM1_VA_EFFECT_ORDER_START,
  FM1_VA_KNOB_CHOICES_START,
  FM1_VA_DISTORTION_TYPE_INDEX,
  FM1_VOICE_NAME_START,
} from '@/lib/fm1-parameters'
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

  it('sets the Distortion type as one undo step, sends nothing, and saves it', async () => {
    const { midi, session } = await openLiveSession()
    const store = vi.fn()

    session.setDistortionType(1)

    expect(hasUnsavedEdits(session.getState())).toBe(true)
    expect(midi.sendParameter).not.toHaveBeenCalled()
    expect(midi.sendEffectParameter).not.toHaveBeenCalled()
    session.save(store)
    expect(store).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ distortionType: 1 }),
    )
    session.undo()
    expect(displayedParameters(session.getState())[FM1_VA_DISTORTION_TYPE_INDEX]).toBe(0)
  })

  it('sets a Bitcrush setting dragged in one gesture as one undo step, sends nothing, and saves it', async () => {
    const { midi, session } = await openLiveSession()
    const store = vi.fn()

    session.beginGesture()
    session.setBitcrushSetting(1, 6, 1, 16)
    session.setBitcrushSetting(1, 4, 1, 16)
    session.endGesture()
    session.setBitcrushSetting(0, 1, 0, 1)

    expect(midi.sendParameter).not.toHaveBeenCalled()
    expect(midi.sendEffectParameter).not.toHaveBeenCalled()
    session.save(store)
    expect(store).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ bitcrush: [1, 4, 0, 0] }),
    )
    session.undo()
    session.undo()
    expect(
      Array.from(
        displayedParameters(session.getState()).subarray(
          FM1_VA_BITCRUSH_START,
          FM1_VA_BITCRUSH_START + 4,
        ),
      ),
    ).toEqual([0, 0, 0, 0])
  })

  it('moves an effect in FM-1+VA’s order as one undo step, sending nothing, and saves the order', async () => {
    const { midi, session } = await openLiveSession()
    const order = () =>
      Array.from(
        displayedParameters(session.getState()).subarray(
          FM1_VA_EFFECT_ORDER_START,
          FM1_VA_KNOB_CHOICES_START,
        ),
      )
    const store = vi.fn()
    session.applyEdits(
      [0, 1, 2, 3, 6, 4, 5].map((effect, place) => [FM1_VA_EFFECT_ORDER_START + place, effect]),
      false,
    )

    session.moveEffect(1, 0)

    expect(order()).toEqual([1, 0, 2, 3, 6, 4, 5])
    expect(midi.sendParameter).not.toHaveBeenCalled()
    session.save(store)
    expect(store).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ effectOrder: [1, 0, 2, 3, 6, 4, 5] }),
    )
    session.undo()
    expect(order()).toEqual([0, 1, 2, 3, 6, 4, 5])
  })

  it('sets a knob choice as one undo step, sending nothing, and saves it', async () => {
    const { midi, session } = await openLiveSession()
    const knobs = () =>
      Array.from(
        displayedParameters(session.getState()).subarray(
          FM1_VA_KNOB_CHOICES_START,
          FM1_EDITOR_PARAMETER_COUNT,
        ),
      )
    const store = vi.fn()
    const before = knobs()

    session.setKnobChoice(0, 3)

    expect(knobs()).toEqual([3, ...before.slice(1)])
    expect(midi.sendParameter).not.toHaveBeenCalled()
    expect(midi.sendEffectParameter).not.toHaveBeenCalled()
    session.save(store)
    expect(store).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ knobChoices: [3, ...before.slice(1)] }),
    )
    session.undo()
    expect(knobs()).toEqual(before)
  })

  it('keeps a knob choice within the eight an engine offers', async () => {
    const { session } = await openLiveSession()

    session.setKnobChoice(2, 12)

    expect(displayedParameters(session.getState())[FM1_VA_KNOB_CHOICES_START + 2]).toBe(7)
  })

  it('moves no effect past either end of the order', async () => {
    const { session } = await openLiveSession()
    const before = displayedParameters(session.getState()).slice()

    session.moveEffect(0, -1)

    expect(displayedParameters(session.getState())).toEqual(before)
  })

  it('keeps a Bitcrush setting within its range', async () => {
    const { session } = await openLiveSession()

    session.setBitcrushSetting(1, 40, 1, 16)

    expect(displayedParameters(session.getState())[FM1_VA_BITCRUSH_START + 1]).toBe(16)
  })
})

/** Opens a live session on a patch named `PIANO`, with the opening voice send already made. */
async function openLiveNamedSession(midi = makeMidi()) {
  const parameters = new Uint8Array(FM1_EDITOR_PARAMETER_COUNT)
  parameters.set(new TextEncoder().encode('PIANO     '), FM1_VOICE_NAME_START)
  const session = new PatchEditorSession(parameters, () => midi)
  session.synchronize('a-1')
  await vi.waitFor(() => expect(session.getState().syncState).toBe('live'))
  vi.mocked(midi.sendParameter).mockClear()
  return { midi, session }
}

/** The name character a parameter send carries, as [position in the name, character]. */
function sentCharacters(midi: PatchEditorMidi) {
  return vi
    .mocked(midi.sendParameter)
    .mock.calls.map(([parameter, value]) => [
      parameter - FM1_VOICE_NAME_START,
      String.fromCharCode(value),
    ])
}

describe('PatchEditorSession voice name', () => {
  it('sends only the characters that differ from the name the FM1 has', async () => {
    const { midi, session } = await openLiveNamedSession()

    session.sendName('PIANA')

    expect(sentCharacters(midi)).toEqual([[4, 'A']])
  })

  it('sends nothing when the same name is committed again', async () => {
    const { midi, session } = await openLiveNamedSession()
    session.sendName('PIANA')
    vi.mocked(midi.sendParameter).mockClear()

    session.sendName('PIANA')

    expect(midi.sendParameter).not.toHaveBeenCalled()
  })

  it('does not send a name while it is being typed', async () => {
    const { midi, session } = await openLiveNamedSession()

    session.editName('PIANA')

    expect(midi.sendParameter).not.toHaveBeenCalled()
    expect(session.getState().history.present[FM1_VOICE_NAME_START + 4]).toBe(0x41)
  })

  it('sends a typed name by comparing it with the name the FM1 has, not the working copy', async () => {
    const { midi, session } = await openLiveNamedSession()
    session.editName('PIANA')

    session.sendName('PIANA')

    expect(sentCharacters(midi)).toEqual([[4, 'A']])
  })

  it('sends a character again when its earlier send failed', async () => {
    const { midi, session } = await openLiveNamedSession()
    vi.mocked(midi.sendParameter).mockReturnValueOnce(false)
    session.sendName('PIANA')
    vi.mocked(midi.sendParameter).mockClear()

    session.sendName('PIANA')

    expect(sentCharacters(midi)).toEqual([[4, 'A']])
  })

  it('takes the name a full voice send carried as the name the FM1 has', async () => {
    const { midi, session } = await openLiveNamedSession()
    session.editName('PIANA')
    await session.requestSync()
    vi.mocked(midi.sendParameter).mockClear()

    session.sendName('PIANA')

    expect(midi.sendParameter).not.toHaveBeenCalled()
  })

  it('sends no name while the editor is not live', async () => {
    const midi = makeMidi({ sysexAvailable: false })
    const session = new PatchEditorSession(new Uint8Array(FM1_EDITOR_PARAMETER_COUNT), () => midi)
    session.synchronize('a-1')

    session.sendName('PIANA')

    expect(session.getState().syncState).toBe('local')
    expect(midi.sendParameter).not.toHaveBeenCalled()
  })
})
