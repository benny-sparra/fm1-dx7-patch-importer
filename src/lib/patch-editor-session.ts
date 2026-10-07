import { trackAnalyticsEvent } from '@/lib/analytics'
import { makeDx7VoiceNameEdits, packDx7Voice, type Dx7Voice } from '@/lib/dx7'
import {
  applyEffectPreset,
  bitcrushPresetValues,
  type BitcrushPresetId,
  type EffectPresetId,
} from '@/lib/effect-presets'
import { getFm1EffectParameters, getFm1VoiceParameters } from '@/lib/fm1-effects'
import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_VA_BITCRUSH_START,
  FM1_VA_DISTORTION_TYPE_INDEX,
  FM1_VA_EFFECT_ORDER_START,
  FM1_VOICE_NAME_LENGTH,
  FM1_VOICE_NAME_START,
  fm1EffectParameters,
  resolveEffectEditorIndex,
} from '@/lib/fm1-parameters'
import { auditionedParameterValue, makeOperatorAuditionEdits } from '@/lib/operator-audition'
import { makeOperatorPasteEdits, type CopiedOperator } from '@/lib/operator-clipboard'
import {
  editParameters,
  finishParameterGesture,
  makeEditorHistory,
  redoParameters,
  undoParameters,
  type EditorHistory,
  type ParameterEdit,
} from '@/lib/patch-editor'
import {
  createPatchSyncCoordinator,
  type PatchSyncCoordinator,
  type PatchSyncState,
} from '@/lib/patch-sync-coordinator'

/** The MIDI connection the editor sends through, read afresh for every send. */
export type PatchEditorMidi = {
  hasMidiOutput: boolean
  sendEffectParameter: (controller: number, value: number) => boolean
  sendEffectSettings: (settings: Uint8Array) => Promise<boolean>
  sendParameter: (parameter: number, value: number) => boolean
  sendVoice: (voice: Dx7Voice) => Promise<boolean>
  sysexAvailable: boolean
}

/** The settings only FM-1+VA's settings record keeps, which the editor edits. */
export type Fm1VaRecordSettings = {
  /** Switch, Bits, Sample Rate, and Mix. */
  bitcrush: number[]
  distortionType: number
  /** Seven effect numbers, first to last. */
  effectOrder: number[]
}

export type PatchEditorState = {
  history: EditorHistory
  /**
   * While comparing, the editor shows and plays the saved version, and editing is paused so the
   * working copy and its undo history stay exactly as they were.
   */
  isComparing: boolean
  mutedOperators: ReadonlySet<number>
  savedParameters: Uint8Array
  soloOperator: number | null
  syncState: PatchSyncState
}

function voiceNameParameters(parameters: Uint8Array) {
  return parameters.slice(FM1_VOICE_NAME_START, FM1_VOICE_NAME_START + FM1_VOICE_NAME_LENGTH)
}

function parametersMatch(left: Uint8Array, right: Uint8Array) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function editsToReach(present: Uint8Array, replacement: Uint8Array): ParameterEdit[] {
  return Array.from(replacement.entries())
    .filter(([index, value]) => present[index] !== value)
    .map(([index, value]) => [index, value])
}

/** The version the editor shows and plays: the saved one while comparing, else the working copy. */
export function displayedParameters(state: PatchEditorState) {
  return state.isComparing ? state.savedParameters : state.history.present
}

export function hasUnsavedEdits(state: PatchEditorState) {
  return !parametersMatch(state.history.present, state.savedParameters)
}

/**
 * Owns one open editor's working copy, undo history, compare mode, and operator audition, and keeps
 * the FM1 in step with them. Every action reads and replaces the state here synchronously, so an
 * async send and a second click in the same frame both see the latest edit, and a failing edit
 * throws to its caller rather than inside a React state updater.
 */
export class PatchEditorSession {
  private readonly getMidi: () => PatchEditorMidi
  private readonly listeners = new Set<() => void>()
  private readonly sync: PatchSyncCoordinator
  private active = true
  private editStarted = false
  private gestureStart: EditorHistory | null = null
  private revision = 0
  private sentName: Uint8Array
  private state: PatchEditorState
  private synchronizedPatch = ''

  constructor(parameters: Uint8Array, getMidi: () => PatchEditorMidi) {
    this.getMidi = getMidi
    this.state = {
      history: makeEditorHistory(parameters),
      isComparing: false,
      mutedOperators: new Set(),
      savedParameters: parameters.slice(),
      soloOperator: null,
      syncState: 'sending',
    }
    this.sentName = voiceNameParameters(parameters)
    this.sync = createPatchSyncCoordinator({
      getLatestSnapshot: () => ({
        parameters: displayedParameters(this.state),
        revision: this.revision,
      }),
      isCurrent: () => this.active,
      onStateChange: (syncState) => this.setSyncState(syncState),
      onSynchronized: (sentParameters) => {
        this.sentName = voiceNameParameters(sentParameters)
        const { mutedOperators, soloOperator } = this.state
        if (mutedOperators.size > 0 || soloOperator !== null) {
          const midi = this.getMidi()
          makeOperatorAuditionEdits(sentParameters, mutedOperators, soloOperator).forEach(
            ([parameter, value]) => midi.sendParameter(parameter, value),
          )
        }
      },
      sendEffects: (sentParameters) =>
        this.getMidi().sendEffectSettings(getFm1EffectParameters(sentParameters)),
      sendVoice: (sentParameters) =>
        this.getMidi().sendVoice(packDx7Voice(getFm1VoiceParameters(sentParameters))),
    })
  }

  getState = () => this.state

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Marks the editor mounted; the returned cleanup stops later sends from reporting back. */
  activate = () => {
    this.active = true
    return () => {
      this.active = false
    }
  }

  isActive = () => this.active

  /**
   * Sends the patch to the FM1 the first time it can sync, and marks the editor local whenever it
   * cannot.
   */
  synchronize = (patchId: string) => {
    if (this.synchronizedPatch === patchId) {
      if (!this.canSync()) this.setSyncState('local')
      return
    }

    this.synchronizedPatch = patchId
    if (this.canSync()) void this.sync.requestInitialSync(patchId)
    else this.setSyncState('local')
  }

  /** Sends the version now shown to the FM1, resolving whether it arrived. */
  requestSync = () => (this.canSync() ? this.sync.requestSync() : Promise.resolve(false))

  applyEdits = (edits: ParameterEdit[], send = true) => {
    if (this.state.isComparing) return
    const current = this.state.history
    const edited = editParameters(current, edits)
    if (edited === current) return
    const activeGesture = this.gestureStart
    this.commitHistory(activeGesture ? { ...edited, past: activeGesture.past } : edited)

    if (send && this.isLive()) {
      const midi = this.getMidi()
      const { mutedOperators, soloOperator } = this.state
      edits.forEach(([index, value, min = 0, max = 127]) => {
        const normalized = Math.max(min, Math.min(max, Math.round(value)))
        midi.sendParameter(
          index,
          auditionedParameterValue(index, normalized, mutedOperators, soloOperator),
        )
      })
    }
  }

  setParameter = (index: number, value: number, max = 127, min = 0, send = true) => {
    this.applyEdits([[index, value, min, max]], send)
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
    this.commitHistory(finishParameterGesture(start, current))
  }

  /** Writes a name into the working copy without sending it, so typing stays off the MIDI port. */
  editName = (name: string) => {
    if (this.state.isComparing) return
    this.applyEdits(
      makeDx7VoiceNameEdits(this.state.history.present, name).map(
        ([parameter, value]): ParameterEdit => [parameter, value],
      ),
      false,
    )
  }

  /** Sends the characters of the name that differ from those the FM1 last received. */
  sendName = (name: string) => {
    if (!this.isLive()) return
    const lastSentName = this.sentName
    const lastSentParameters = displayedParameters(this.state).slice()
    lastSentParameters.set(lastSentName, FM1_VOICE_NAME_START)
    const midi = this.getMidi()
    makeDx7VoiceNameEdits(lastSentParameters, name).forEach(([parameter, value]) => {
      if (midi.sendParameter(parameter, value)) {
        lastSentName[parameter - FM1_VOICE_NAME_START] = value
      }
    })
  }

  undo = () => this.restoreHistory(undoParameters)

  redo = () => this.restoreHistory(redoParameters)

  setEffectParameter = (controller: number, value: number) => {
    const definition = fm1EffectParameters[controller]
    if (!definition || this.state.isComparing) return
    this.applyEdits(
      [[resolveEffectEditorIndex(controller), value, definition.min, definition.max]],
      false,
    )
    if (this.isLive()) this.getMidi().sendEffectParameter(controller, value)
  }

  /**
   * Sets FM-1+VA's Distortion type as one undo step. No MIDI message carries it, so it is heard
   * only once the patch is written to the FM1.
   */
  setDistortionType = (type: number) => {
    this.gestureStart = null
    this.applyEdits([[FM1_VA_DISTORTION_TYPE_INDEX, type, 0, 255]], false)
  }

  /**
   * Sets one of FM-1+VA's Bitcrush settings, `setting` counted from its switch, within `min` and
   * `max`. No MIDI message carries Bitcrush either, so nothing is sent; a slider's drag is one undo
   * step through `beginGesture` and `endGesture`, as an effect's is.
   */
  setBitcrushSetting = (setting: number, value: number, min: number, max: number) => {
    this.applyEdits([[FM1_VA_BITCRUSH_START + setting, value, min, max]], false)
  }

  /** Sets every Bitcrush setting from preset `id` as one undo step. Nothing is sent, as above. */
  selectBitcrushPreset = (id: BitcrushPresetId) => {
    this.gestureStart = null
    this.applyEdits(
      bitcrushPresetValues(id).map((value, setting): ParameterEdit => [
        FM1_VA_BITCRUSH_START + setting,
        value,
      ]),
      false,
    )
  }

  /**
   * Moves the effect at `from` in FM-1+VA's order of seven effects to `to`, as one undo step. No MIDI
   * message carries the order either, so nothing is sent.
   */
  moveEffect = (from: number, to: number) => {
    const order = Array.from(
      this.state.history.present.subarray(FM1_VA_EFFECT_ORDER_START, FM1_EDITOR_PARAMETER_COUNT),
    )
    if (from === to || to < 0 || to >= order.length) return
    const [effect] = order.splice(from, 1)
    order.splice(to, 0, effect)
    this.gestureStart = null
    this.applyEdits(
      order.map((value, place): ParameterEdit => [FM1_VA_EFFECT_ORDER_START + place, value, 0, 6]),
      false,
    )
  }

  toggleOperatorMute = (operator: number) => {
    const mutedOperators = new Set(this.state.mutedOperators)
    if (mutedOperators.has(operator)) mutedOperators.delete(operator)
    else mutedOperators.add(operator)
    this.setOperatorAudition(mutedOperators, this.state.soloOperator)
  }

  toggleOperatorSolo = (operator: number) => {
    const soloOperator = this.state.soloOperator === operator ? null : operator
    this.setOperatorAudition(this.state.mutedOperators, soloOperator)
  }

  /** Unmutes every operator and ends any solo, sending the change unless told not to. */
  clearOperatorAudition = (send = this.isLive()) => {
    if (this.state.mutedOperators.size === 0 && this.state.soloOperator === null) return
    this.setOperatorAudition(new Set(), null, send)
  }

  /**
   * Stores the working copy through `store`, with FM-1+VA's Distortion type and Bitcrush, and makes
   * it the saved version.
   */
  save = (store: (voice: Dx7Voice, effects: Uint8Array, record: Fm1VaRecordSettings) => void) => {
    if (this.state.isComparing) return
    const current = this.state.history.present
    store(packDx7Voice(getFm1VoiceParameters(current)), getFm1EffectParameters(current), {
      bitcrush: Array.from(current.subarray(FM1_VA_BITCRUSH_START, FM1_VA_EFFECT_ORDER_START)),
      distortionType: current[FM1_VA_DISTORTION_TYPE_INDEX],
      effectOrder: Array.from(
        current.subarray(FM1_VA_EFFECT_ORDER_START, FM1_EDITOR_PARAMETER_COUNT),
      ),
    })
    this.update({ savedParameters: current.slice() })
    trackAnalyticsEvent({ name: 'patch_saved' })
  }

  /** Replaces the working copy with the saved version, as a fresh history, and sends it. */
  revertToSaved = () => {
    this.commitHistory(makeEditorHistory(this.state.savedParameters))
    return this.requestSync()
  }

  /**
   * Switches between the working copy and the saved version, sending the one now shown to the FM1.
   * Neither the working copy nor its undo history changes. Returns whether it switched.
   */
  toggleCompare = () => {
    const comparing = !this.state.isComparing
    if (comparing && !hasUnsavedEdits(this.state)) return false
    this.gestureStart = null
    // A new revision makes a send already in flight follow up with the version now shown.
    this.revision += 1
    this.update({ isComparing: comparing })
    void this.requestSync()
    return true
  }

  /** Replaces the whole voice as a single undo step and sends it to the FM1. */
  replaceVoice = (replace: (parameters: Uint8Array) => Uint8Array) => {
    if (this.state.isComparing) return
    const current = this.state.history
    const next = editParameters(current, editsToReach(current.present, replace(current.present)))
    if (next === current) return

    this.gestureStart = null
    this.commitHistory(next)
    void this.requestSync()
  }

  /** Sets one effect's controls as a single undo step and sends that effect to the FM1. */
  selectEffectPreset = (presetId: EffectPresetId) => {
    if (this.state.isComparing) return
    const current = this.state.history
    const { controllers, settings } = applyEffectPreset(
      getFm1EffectParameters(current.present),
      presetId,
    )
    const next = editParameters(
      current,
      controllers.map((controller) => [resolveEffectEditorIndex(controller), settings[controller]]),
    )
    if (next === current) return

    this.gestureStart = null
    this.commitHistory(next)
    if (this.isLive()) {
      const midi = this.getMidi()
      controllers.forEach((controller) =>
        midi.sendEffectParameter(controller, settings[controller]),
      )
    }
  }

  /**
   * Gives one operator the copied operator's settings, or only its envelope, as a single undo
   * step, sent live.
   */
  pasteOperator = (operator: number, copied: CopiedOperator) => {
    const edits = makeOperatorPasteEdits(this.state.history.present, operator, copied)
    if (edits.length === 0) return
    this.gestureStart = null
    this.applyEdits(edits)
  }

  private canSync() {
    const midi = this.getMidi()
    return midi.hasMidiOutput && midi.sysexAvailable
  }

  private isLive() {
    return this.canSync() && this.state.syncState === 'live'
  }

  private update(changes: Partial<PatchEditorState>) {
    this.state = { ...this.state, ...changes }
    this.listeners.forEach((listener) => listener())
  }

  private setSyncState(syncState: PatchSyncState) {
    if (this.state.syncState !== syncState) this.update({ syncState })
  }

  private commitHistory(next: EditorHistory) {
    const current = this.state.history
    if (next === current) return false

    if (!parametersMatch(current.present, next.present)) {
      this.revision += 1
      if (!this.editStarted) {
        this.editStarted = true
        trackAnalyticsEvent({ name: 'patch_edit_started' })
      }
    }
    this.update({ history: next })
    return true
  }

  private restoreHistory(step: (history: EditorHistory) => EditorHistory) {
    if (this.state.isComparing) return
    if (!this.commitHistory(step(this.state.history))) return
    if (this.isLive()) void this.requestSync()
  }

  private setOperatorAudition(
    mutedOperators: ReadonlySet<number>,
    soloOperator: number | null,
    send = this.isLive(),
  ) {
    this.update({ mutedOperators, soloOperator })
    if (send && this.canSync()) {
      const midi = this.getMidi()
      makeOperatorAuditionEdits(this.state.history.present, mutedOperators, soloOperator).forEach(
        ([parameter, value]) => midi.sendParameter(parameter, value),
      )
    }
  }
}
