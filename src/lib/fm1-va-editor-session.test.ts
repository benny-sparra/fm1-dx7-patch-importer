import { describe, expect, it, vi } from 'vitest'

import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import {
  FM1_VA_BITCRUSH_START,
  FM1_VA_EFFECT_ORDER_START,
  FM1_VA_KNOB_CHOICES_START,
  FM1_VOICE_NAME_START,
} from '@/lib/fm1-parameters'
import {
  makeVirtualAnalogEditorParameters,
  virtualAnalogRow,
  virtualAnalogRows,
  type VirtualAnalogRowId,
} from '@/lib/fm1-va-virtual-analog-editor'
import {
  displayedFm1VaParameters,
  Fm1VaEditorSession,
  hasUnsavedFm1VaEdits,
} from '@/lib/fm1-va-editor-session'
import {
  eightBitRow,
  eightBitRows,
  makeEightBitEditorParameters,
  type EightBitRowId,
} from '@/lib/fm1-va-eight-bit-editor'
import { applyVirtualAnalogPreset } from '@/lib/virtual-analog-presets'
import { capturedEightBitRecord, capturedEightBitVoice } from '@/test/fm1-va-eight-bit'
import {
  capturedVirtualAnalogRecord,
  capturedVirtualAnalogVoice,
} from '@/test/fm1-va-virtual-analog'

function makeSession({ envelope = false } = {}) {
  const record = capturedVirtualAnalogRecord()
  if (envelope) record[53] |= 0x40
  const parameters = makeVirtualAnalogEditorParameters(
    capturedVirtualAnalogVoice(),
    record,
    makeDefaultFm1Effects(),
  )
  const midi = {
    sendEffectParameter: vi.fn<(controller: number, value: number) => boolean>(() => true),
    sendSoundControl: vi.fn<(controller: number, value: number) => boolean>(() => true),
  }
  const session = new Fm1VaEditorSession(parameters, () => midi, virtualAnalogRows)
  return { midi, session }
}

const value = (session: Fm1VaEditorSession<VirtualAnalogRowId>, id: VirtualAnalogRowId) =>
  displayedFm1VaParameters(session.getState())[virtualAnalogRow(id).index]

describe('Fm1VaEditorSession on a Virtual Analog preset', () => {
  it('sends nothing while local', () => {
    const { midi, session } = makeSession()
    session.setRow('cutoff', 40)
    session.setEffectParameter(2, 30)
    expect(value(session, 'cutoff')).toBe(40)
    expect(midi.sendSoundControl).not.toHaveBeenCalled()
    expect(midi.sendEffectParameter).not.toHaveBeenCalled()
  })

  it('sends every setting with a controller, and the effects, as it goes live', () => {
    const { midi, session } = makeSession()
    session.goLive()
    const controllers = midi.sendSoundControl.mock.calls.map(([controller]) => controller)
    // The Envelope is off, so its four controllers, which would switch it on, are left out.
    expect(controllers.sort((a, b) => a - b)).toEqual([
      24, 25, 26, 27, 28, 29, 30, 31, 52, 53, 54, 55, 56, 57, 71, 74, 76, 77, 78,
    ])
    expect(midi.sendEffectParameter).toHaveBeenCalledTimes(24)
  })

  it('sends one live edit as its controller, scaled as the FM1 reads it', () => {
    const { midi, session } = makeSession()
    session.goLive()
    midi.sendSoundControl.mockClear()
    midi.sendEffectParameter.mockClear()
    session.setRow('super', 60)
    expect(midi.sendSoundControl.mock.calls).toEqual([[25, 76]])
    expect(midi.sendEffectParameter).not.toHaveBeenCalled()
  })

  it('sends nothing for a row no controller sets', () => {
    const { midi, session } = makeSession()
    session.goLive()
    midi.sendSoundControl.mockClear()
    session.setRow('level', 50)
    session.chooseRow('mono', 1)
    expect(value(session, 'level')).toBe(50)
    expect(midi.sendSoundControl).not.toHaveBeenCalled()
  })

  it('sends an effect edit on its effect controller', () => {
    const { midi, session } = makeSession()
    session.goLive()
    midi.sendEffectParameter.mockClear()
    session.setEffectParameter(2, 30)
    expect(midi.sendEffectParameter.mock.calls).toEqual([[2, 30]])
  })

  it('sends the Envelope’s four settings as it is switched on, and none while it is off', () => {
    const { midi, session } = makeSession()
    session.goLive()
    midi.sendSoundControl.mockClear()
    session.setRow('attack', 20)
    expect(midi.sendSoundControl).not.toHaveBeenCalled()
    session.chooseRow('envelope', 1)
    expect(
      midi.sendSoundControl.mock.calls.map(([controller]) => controller).sort((a, b) => a - b),
    ).toEqual([70, 72, 73, 75])
  })

  it('keeps a drag as one undo step, and undoing sends the value back', () => {
    const { midi, session } = makeSession()
    session.goLive()
    const before = value(session, 'drift')
    session.beginGesture()
    session.setRow('drift', 10)
    session.setRow('drift', 20)
    session.setRow('drift', 30)
    session.endGesture()
    expect(session.getState().history.past).toHaveLength(1)
    midi.sendSoundControl.mockClear()
    session.undo()
    expect(value(session, 'drift')).toBe(before)
    expect(midi.sendSoundControl.mock.calls).toEqual([[27, 0]])
  })

  it('applies a sound preset as one undo step, sending only the settings it changed', () => {
    const { midi, session } = makeSession()
    session.goLive()
    midi.sendSoundControl.mockClear()
    midi.sendEffectParameter.mockClear()
    const before = displayedFm1VaParameters(session.getState())
    session.replaceParameters((parameters) => applyVirtualAnalogPreset(parameters, 'mono-bass'))
    const after = displayedFm1VaParameters(session.getState())
    expect(session.getState().history.past).toHaveLength(1)
    const changed = virtualAnalogRows.filter(
      (row) => row.controller !== undefined && before[row.index] !== after[row.index],
    )
    // Switching the Envelope on sends all four of its settings, as switching it by hand does.
    expect(
      midi.sendSoundControl.mock.calls.map(([controller]) => controller).sort((a, b) => a - b),
    ).toEqual(
      [...new Set([...changed.map((row) => row.controller!), 70, 72, 73, 75])].sort(
        (a, b) => a - b,
      ),
    )
    session.undo()
    expect(displayedFm1VaParameters(session.getState())).toEqual(before)
  })

  it('moves an effect as one undo step without sending anything', () => {
    const { midi, session } = makeSession()
    session.goLive()
    midi.sendSoundControl.mockClear()
    midi.sendEffectParameter.mockClear()
    session.moveEffect(0, 1)
    const present = session.getState().history.present
    expect(present[FM1_VA_EFFECT_ORDER_START]).toBe(1)
    expect(present[FM1_VA_EFFECT_ORDER_START + 1]).toBe(0)
    expect(session.getState().history.past).toHaveLength(1)
    expect(midi.sendSoundControl).not.toHaveBeenCalled()
    expect(midi.sendEffectParameter).not.toHaveBeenCalled()
  })

  it('sets a knob choice as one undo step without sending anything', () => {
    const { midi, session } = makeSession()
    session.goLive()
    midi.sendSoundControl.mockClear()
    midi.sendEffectParameter.mockClear()
    session.setKnobChoice(1, 4)
    expect(session.getState().history.present[FM1_VA_KNOB_CHOICES_START + 1]).toBe(4)
    expect(session.getState().history.past).toHaveLength(1)
    expect(midi.sendSoundControl).not.toHaveBeenCalled()
    expect(midi.sendEffectParameter).not.toHaveBeenCalled()
  })

  it('applies a Bitcrush preset as one undo step without sending anything', () => {
    const { midi, session } = makeSession()
    session.goLive()
    midi.sendSoundControl.mockClear()
    midi.sendEffectParameter.mockClear()
    session.selectBitcrushPreset('crushed')
    const bitcrush = () =>
      Array.from(
        session
          .getState()
          .history.present.subarray(FM1_VA_BITCRUSH_START, FM1_VA_EFFECT_ORDER_START),
      )
    expect(bitcrush()).toEqual([1, 4, 40, 100])
    expect(session.getState().history.past).toHaveLength(1)
    expect(midi.sendSoundControl).not.toHaveBeenCalled()
    expect(midi.sendEffectParameter).not.toHaveBeenCalled()
  })

  it('plays the saved version while comparing, and the working copy after', () => {
    const { midi, session } = makeSession()
    session.goLive()
    session.setRow('cutoff', 40)
    midi.sendSoundControl.mockClear()
    expect(session.toggleCompare()).toBe(true)
    expect(value(session, 'cutoff')).toBe(100)
    expect(midi.sendSoundControl.mock.calls).toEqual([[74, 127]])
    session.setRow('cutoff', 10)
    expect(session.getState().history.present[virtualAnalogRow('cutoff').index]).toBe(40)
    session.toggleCompare()
    expect(midi.sendSoundControl.mock.calls.at(-1)).toEqual([74, 51])
  })

  it('saves the working copy and has no unsaved edits after', () => {
    const { session } = makeSession()
    session.editName('BASS 1')
    const store = vi.fn()
    session.save(store)
    const [saved] = store.mock.calls[0] as [Uint8Array]
    expect(
      String.fromCharCode(...saved.slice(FM1_VOICE_NAME_START, FM1_VOICE_NAME_START + 6)),
    ).toBe('BASS 1')
    expect(hasUnsavedFm1VaEdits(session.getState())).toBe(false)
  })

  it('reverts to the saved version and sends what changed back', () => {
    const { midi, session } = makeSession()
    session.goLive()
    session.setRow('noise', 60)
    midi.sendSoundControl.mockClear()
    session.revertToSaved()
    expect(value(session, 'noise')).toBe(0)
    expect(midi.sendSoundControl.mock.calls).toEqual([[29, 0]])
    expect(hasUnsavedFm1VaEdits(session.getState())).toBe(false)
  })

  it('stops sending once the editor has gone', () => {
    const { midi, session } = makeSession()
    const deactivate = session.activate()
    session.goLive()
    deactivate()
    midi.sendSoundControl.mockClear()
    session.setRow('cutoff', 40)
    expect(midi.sendSoundControl).not.toHaveBeenCalled()
  })
})

describe('Fm1VaEditorSession on an 8-Bit preset', () => {
  function makeEightBitSession() {
    const parameters = makeEightBitEditorParameters(
      capturedEightBitVoice(),
      capturedEightBitRecord(),
      makeDefaultFm1Effects(),
    )
    const midi = {
      sendEffectParameter: vi.fn<(controller: number, value: number) => boolean>(() => true),
      sendSoundControl: vi.fn<(controller: number, value: number) => boolean>(() => true),
    }
    const session = new Fm1VaEditorSession(parameters, () => midi, eightBitRows)
    return { midi, session }
  }
  const eightBitValue = (session: Fm1VaEditorSession<EightBitRowId>, id: EightBitRowId) =>
    displayedFm1VaParameters(session.getState())[eightBitRow(id).index]

  it('sets several rows as one undo step', () => {
    const { session } = makeEightBitSession()
    const before = [eightBitValue(session, 'bassChord'), eightBitValue(session, 'bassPattern')]

    session.chooseRows([
      ['bassChord', 3],
      ['bassPattern', 9],
    ])
    expect([eightBitValue(session, 'bassChord'), eightBitValue(session, 'bassPattern')]).toEqual([
      3, 9,
    ])
    session.undo()

    expect([eightBitValue(session, 'bassChord'), eightBitValue(session, 'bassPattern')]).toEqual(
      before,
    )
  })

  it('sends only the Envelope’s and LFO’s controllers live, the Envelope’s once it is on', () => {
    const { midi, session } = makeEightBitSession()
    session.goLive()
    expect(
      midi.sendSoundControl.mock.calls.map(([controller]) => controller).sort((a, b) => a - b),
    ).toEqual([76, 77, 78])

    midi.sendSoundControl.mockClear()
    session.setRow('bassLevel', 50)
    session.setRow('drumDecay', 70)
    expect(midi.sendSoundControl).not.toHaveBeenCalled()

    session.chooseRow('envelope', 1)
    expect(
      midi.sendSoundControl.mock.calls.map(([controller]) => controller).sort((a, b) => a - b),
    ).toEqual([70, 72, 73, 75])
  })
})
