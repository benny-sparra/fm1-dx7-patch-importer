import { trackAnalyticsEvent } from '@/lib/analytics'
import { makeDx7VoiceNameEdits } from '@/lib/dx7'
import {
  applyEffectPreset,
  bitcrushPresetValues,
  type BitcrushPresetId,
  type EffectPresetId,
} from '@/lib/effect-presets'
import { getFm1EffectParameters } from '@/lib/fm1-effects'
import {
  FM1_EFFECT_PARAMETER_COUNT,
  FM1_VA_BITCRUSH_START,
  FM1_VA_DISTORTION_TYPE_INDEX,
  FM1_VA_EFFECT_ORDER_START,
  FM1_VA_KNOB_CHOICES_START,
  fm1EffectParameters,
  resolveEffectEditorIndex,
} from '@/lib/fm1-parameters'
import {
  virtualAnalogControlValue,
  virtualAnalogEnvelopeRows,
  virtualAnalogRow,
  virtualAnalogRows,
  type VirtualAnalogRowId,
} from '@/lib/fm1-va-virtual-analog-editor'
import {
  editParameters,
  finishParameterGesture,
  makeEditorHistory,
  redoParameters,
  undoParameters,
  type EditorHistory,
  type ParameterEdit,
} from '@/lib/patch-editor'
import type { PatchSyncState } from '@/lib/patch-sync-coordinator'

/** The MIDI connection the editor sends through, read afresh for every send. */
export type VirtualAnalogEditorMidi = {
  sendEffectParameter: (controller: number, value: number) => boolean
  sendSoundControl: (controller: number, value: number) => boolean
}

export type VirtualAnalogEditorState = {
  history: EditorHistory
  /** While comparing, the editor shows and plays the saved version, and editing is paused. */
  isComparing: boolean
  savedParameters: Uint8Array
  /**
   * `live` while the FM1 plays the preset being edited and takes its sound-setting controllers,
   * `sending` while the editor finds out, and `local` otherwise.
   */
  syncState: PatchSyncState
}

function parametersMatch(left: Uint8Array, right: Uint8Array) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

const envelopeIndex = virtualAnalogRow('envelope').index
const envelopeRowIndexes = new Set(
  virtualAnalogEnvelopeRows.map((id) => virtualAnalogRow(id).index),
)
const liveRows = virtualAnalogRows.filter((row) => row.controller !== undefined)

/** The version the editor shows and plays: the saved one while comparing, else the working copy. */
export function displayedVirtualAnalogParameters(state: VirtualAnalogEditorState) {
  return state.isComparing ? state.savedParameters : state.history.present
}

export function hasUnsavedVirtualAnalogEdits(state: VirtualAnalogEditorState) {
  return !parametersMatch(state.history.present, state.savedParameters)
}

/**
 * Owns the open Virtual Analog editor's working copy, undo history, and compare mode, and while
 * live keeps the FM1's preset in step with them through FM-1+VA's sound-setting controllers and the
 * effect controllers. Each change sends only the settings that differ from what the FM1 last got,
 * so an edit, undo, compare, or revert all reach it the same way. Rows without a controller, and
 * the Envelope's switch, are heard only once the patch is written to the FM1.
 */
export class VirtualAnalogEditorSession {
  private readonly getMidi: () => VirtualAnalogEditorMidi
  private readonly listeners = new Set<() => void>()
  private active = true
  private editStarted = false
  private gestureStart: EditorHistory | null = null
  private state: VirtualAnalogEditorState

  constructor(parameters: Uint8Array, getMidi: () => VirtualAnalogEditorMidi) {
    this.getMidi = getMidi
    this.state = {
      history: makeEditorHistory(parameters),
      isComparing: false,
      savedParameters: parameters.slice(),
      syncState: 'local',
    }
  }

  getState = () => this.state

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Marks the editor mounted; the returned cleanup stops later sends. */
  activate = () => {
    this.active = true
    return () => {
      this.active = false
    }
  }

  isActive = () => this.active

  /** Marks the editor as finding out whether the FM1 plays the preset. */
  checking = () => this.setSyncState('sending')

  /** Marks the editor local: edits change the library alone until the patch is written. */
  goLocal = () => this.setSyncState('local')

  /**
   * Makes the editor live, sending every setting with a controller, so the FM1's preset plays the
   * version shown as far as controllers reach.
   */
  goLive = () => {
    if (!this.active) return
    this.setSyncState('live')
    this.sendChanges(null, displayedVirtualAnalogParameters(this.state))
  }

  applyEdits = (edits: ParameterEdit[]) => {
    if (this.state.isComparing) return
    const current = this.state.history
    const edited = editParameters(current, edits)
    if (edited === current) return
    const activeGesture = this.gestureStart
    this.commitHistory(activeGesture ? { ...edited, past: activeGesture.past } : edited)
  }

  setRow = (id: VirtualAnalogRowId, value: number) => {
    const row = virtualAnalogRow(id)
    this.applyEdits([[row.index, value, 0, row.max]])
  }

  /** Sets a switch or list as one undo step, ending any gesture still open. */
  chooseRow = (id: VirtualAnalogRowId, value: number) => {
    this.gestureStart = null
    this.setRow(id, value)
  }

  beginGesture = () => {
    this.gestureStart ??= this.state.history
  }

  endGesture = () => {
    const start = this.gestureStart
    this.gestureStart = null
    if (!start) return
    const current = this.state.history
    if (parametersMatch(start.present, current.present)) return
    this.update({ history: finishParameterGesture(start, current) })
  }

  /**
   * Replaces the working copy with what `replace` makes of it, such as a sound preset, as one undo
   * step. While live, the settings it changed are sent as any edit's are.
   */
  replaceParameters = (replace: (parameters: Uint8Array) => Uint8Array) => {
    if (this.state.isComparing) return
    const present = this.state.history.present
    const next = replace(present)
    this.gestureStart = null
    this.applyEdits(
      Array.from(next.entries())
        .filter(([index, value]) => present[index] !== value)
        .map(([index, value]): ParameterEdit => [index, value, 0, 255]),
    )
  }

  /** Writes a name into the working copy. No controller carries a name, so nothing is sent. */
  editName = (name: string) => {
    this.applyEdits(
      makeDx7VoiceNameEdits(this.state.history.present, name).map(
        ([parameter, value]): ParameterEdit => [parameter, value],
      ),
    )
  }

  undo = () => this.restoreHistory(undoParameters)

  redo = () => this.restoreHistory(redoParameters)

  setEffectParameter = (controller: number, value: number) => {
    const definition = fm1EffectParameters[controller]
    if (!definition) return
    this.applyEdits([[resolveEffectEditorIndex(controller), value, definition.min, definition.max]])
  }

  selectEffectPreset = (presetId: EffectPresetId) => {
    const current = this.state.history.present
    const { controllers, settings } = applyEffectPreset(getFm1EffectParameters(current), presetId)
    this.gestureStart = null
    this.applyEdits(
      controllers.map((controller) => [resolveEffectEditorIndex(controller), settings[controller]]),
    )
  }

  /** Sets the Distortion type, which only the preset write carries, as one undo step. */
  setDistortionType = (type: number) => {
    this.gestureStart = null
    this.applyEdits([[FM1_VA_DISTORTION_TYPE_INDEX, type, 0, 255]])
  }

  setBitcrushSetting = (setting: number, value: number, min: number, max: number) => {
    this.applyEdits([[FM1_VA_BITCRUSH_START + setting, value, min, max]])
  }

  /** Sets every Bitcrush setting from preset `id` as one undo step. No MIDI message carries it, so nothing is sent. */
  selectBitcrushPreset = (id: BitcrushPresetId) => {
    this.gestureStart = null
    this.applyEdits(
      bitcrushPresetValues(id).map((value, setting): ParameterEdit => [
        FM1_VA_BITCRUSH_START + setting,
        value,
      ]),
    )
  }

  /** Moves the effect at `from` in the order of seven effects to `to`, as one undo step. */
  moveEffect = (from: number, to: number) => {
    const order = Array.from(
      this.state.history.present.subarray(FM1_VA_EFFECT_ORDER_START, FM1_VA_KNOB_CHOICES_START),
    )
    if (from === to || to < 0 || to >= order.length) return
    const [effect] = order.splice(from, 1)
    order.splice(to, 0, effect)
    this.gestureStart = null
    this.applyEdits(
      order.map((value, place): ParameterEdit => [FM1_VA_EFFECT_ORDER_START + place, value, 0, 6]),
    )
  }

  /**
   * Sets what knob `knob`, counted from 0, plays as one undo step. No MIDI message carries it, so
   * nothing is sent.
   */
  setKnobChoice = (knob: number, choice: number) => {
    this.gestureStart = null
    this.applyEdits([[FM1_VA_KNOB_CHOICES_START + knob, choice, 0, 7]])
  }

  /** Stores the working copy through `store` and makes it the saved version. */
  save = (store: (parameters: Uint8Array) => void) => {
    if (this.state.isComparing) return
    const current = this.state.history.present
    store(current.slice())
    this.update({ savedParameters: current.slice() })
    trackAnalyticsEvent({ name: 'patch_saved' })
  }

  /** Replaces the working copy with the saved version, as a fresh history. */
  revertToSaved = () => {
    if (this.state.isComparing) return
    this.gestureStart = null
    this.commitHistory(makeEditorHistory(this.state.savedParameters))
  }

  /** Switches between the working copy and the saved version. Returns whether it switched. */
  toggleCompare = () => {
    const comparing = !this.state.isComparing
    if (comparing && !hasUnsavedVirtualAnalogEdits(this.state)) return false
    this.gestureStart = null
    const shown = displayedVirtualAnalogParameters(this.state)
    this.update({ isComparing: comparing })
    this.sendChanges(shown, displayedVirtualAnalogParameters(this.state))
    return true
  }

  private sendChanges(from: Uint8Array | null, to: Uint8Array) {
    if (!this.active || this.state.syncState !== 'live') return
    const midi = this.getMidi()
    // The Envelope's settings play, and are sent, only while it is on. Sending one while the FM1's
    // Envelope is off switches it on, so switching it on here sends all four.
    const envelopeOn = to[envelopeIndex] === 1
    const envelopeSwitchedOn = envelopeOn && from?.[envelopeIndex] !== 1
    for (const row of liveRows) {
      if (envelopeRowIndexes.has(row.index)) {
        if (!envelopeOn) continue
        if (!envelopeSwitchedOn && from?.[row.index] === to[row.index]) continue
      } else if (from?.[row.index] === to[row.index]) {
        continue
      }
      midi.sendSoundControl(row.controller!, virtualAnalogControlValue(row, to[row.index]))
    }
    for (let controller = 0; controller < FM1_EFFECT_PARAMETER_COUNT; controller += 1) {
      const index = resolveEffectEditorIndex(controller)
      if (from?.[index] === to[index]) continue
      midi.sendEffectParameter(controller, to[index])
    }
  }

  private update(changes: Partial<VirtualAnalogEditorState>) {
    this.state = { ...this.state, ...changes }
    this.listeners.forEach((listener) => listener())
  }

  private setSyncState(syncState: PatchSyncState) {
    if (this.state.syncState !== syncState) this.update({ syncState })
  }

  private commitHistory(next: EditorHistory) {
    const current = this.state.history
    if (next === current) return false
    if (!parametersMatch(current.present, next.present) && !this.editStarted) {
      this.editStarted = true
      trackAnalyticsEvent({ name: 'patch_edit_started' })
    }
    this.update({ history: next })
    this.sendChanges(current.present, next.present)
    return true
  }

  private restoreHistory(step: (history: EditorHistory) => EditorHistory) {
    if (this.state.isComparing) return
    this.gestureStart = null
    this.commitHistory(step(this.state.history))
  }
}
