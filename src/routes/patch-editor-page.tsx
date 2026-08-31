import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { OperatorStrip } from '@/components/editor/editor-workspace'
import { FocusedOperatorPanel } from '@/components/editor/focused-operator-panel'
import { GlobalConfigurationPanel } from '@/components/editor/global-configuration-panel'
import { PatchEditorHeader } from '@/components/editor/patch-editor-header'
import { UnsavedEditorDialog } from '@/components/editor/unsaved-editor-dialog'
import { MidiSysexWarning } from '@/components/midi/midi-sysex-warning'
import { type Patch } from '@/data/patches'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { type MidiController } from '@/hooks/use-midi'
import { makeDx7VoiceNameEdits, packDx7Voice, unpackDx7Voice, type Dx7Voice } from '@/lib/dx7'
import {
  getFm1EffectParameters,
  getFm1VoiceParameters,
  makeFm1EditorParameters,
} from '@/lib/fm1-effects'
import {
  FM1_VOICE_NAME_LENGTH,
  FM1_VOICE_NAME_START,
  fm1EffectParameters,
  getGlobalParameterDefinition,
  resolveEffectEditorIndex,
} from '@/lib/fm1-parameters'
import {
  editParameters,
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
import { auditionedParameterValue, makeOperatorAuditionEdits } from '@/lib/operator-audition'
import { applySoundPreset, type SoundPresetId } from '@/lib/sound-presets'
import { randomizeSound } from '@/lib/sound-randomizer'
import { trackAnalyticsEvent } from '@/lib/analytics'

type PatchEditorPageProps = {
  effects: Uint8Array
  midi: MidiController
  onBack: () => void
  onSave: (voice: Dx7Voice, effects: Uint8Array) => void
  patch: Patch
  voice: Dx7Voice
}

const algorithmParameter = getGlobalParameterDefinition('global.algorithm')

function parametersMatch(left: Uint8Array, right: Uint8Array) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export function PatchEditorPage({
  effects,
  midi,
  onBack,
  onSave,
  patch,
  voice,
}: PatchEditorPageProps) {
  const initialParameters = makeFm1EditorParameters(unpackDx7Voice(voice), effects)
  const [history, setHistory] = useState(() => makeEditorHistory(initialParameters))
  const [savedParameters, setSavedParameters] = useState(() => initialParameters.slice())
  const [selectedOperator, setSelectedOperator] = useState(1)
  const [mutedOperators, setMutedOperators] = useState<ReadonlySet<number>>(() => new Set())
  const [soloOperator, setSoloOperator] = useState<number | null>(null)
  const [leftPanelTab, setLeftPanelTab] = useState<'effects' | 'global'>('global')
  const [operatorPanelTab, setOperatorPanelTab] = useState<'oscillator' | 'scaling'>('oscillator')
  const [isPitchEnvelopeOpen, setIsPitchEnvelopeOpen] = useState(true)
  const [isLfoGlobalOpen, setIsLfoGlobalOpen] = useState(true)
  const [syncState, setSyncState] = useState<PatchSyncState>('sending')
  const [isNavigationPending, setIsNavigationPending] = useState(false)
  const [isResolvingNavigation, setIsResolvingNavigation] = useState(false)
  const historyRef = useRef(history)
  const historyRevisionRef = useRef(0)
  const syncStateRef = useRef<PatchSyncState>('sending')
  const midiRef = useRef(midi)
  const editorActiveRef = useRef(true)
  const editStartedTrackedRef = useRef(false)
  const mutedOperatorsRef = useRef<ReadonlySet<number>>(mutedOperators)
  const soloOperatorRef = useRef<number | null>(soloOperator)
  const unsavedDialogRef = useRef<HTMLDialogElement>(null)
  const presetsMenuRef = useDismissableDetails()
  const saveMenuRef = useDismissableDetails()
  const gestureStart = useRef<EditorHistory | null>(null)
  const sentName = useRef(
    history.present.slice(FM1_VOICE_NAME_START, FM1_VOICE_NAME_START + FM1_VOICE_NAME_LENGTH),
  )
  const patchSyncRef = useRef<PatchSyncCoordinator | null>(null)
  const parameters = history.present
  const isDirty = !parametersMatch(parameters, savedParameters)
  const canSync = midi.hasMidiOutput && midi.sysexAvailable
  const initializedPatchRef = useRef('')

  midiRef.current = midi

  if (!patchSyncRef.current) {
    patchSyncRef.current = createPatchSyncCoordinator({
      getLatestSnapshot: () => ({
        parameters: historyRef.current.present,
        revision: historyRevisionRef.current,
      }),
      isCurrent: () => editorActiveRef.current,
      onStateChange: (state) => {
        syncStateRef.current = state
        setSyncState(state)
      },
      onSynchronized: (sentParameters) => {
        sentName.current = sentParameters.slice(
          FM1_VOICE_NAME_START,
          FM1_VOICE_NAME_START + FM1_VOICE_NAME_LENGTH,
        )
        if (mutedOperatorsRef.current.size > 0 || soloOperatorRef.current !== null) {
          makeOperatorAuditionEdits(
            sentParameters,
            mutedOperatorsRef.current,
            soloOperatorRef.current,
          ).forEach(([parameter, value]) => midiRef.current.sendParameter(parameter, value))
        }
      },
      sendEffects: (sentParameters) =>
        midiRef.current.sendEffectSettings(getFm1EffectParameters(sentParameters)),
      sendVoice: (sentParameters) =>
        midiRef.current.sendVoice(packDx7Voice(getFm1VoiceParameters(sentParameters))),
    })
  }

  useEffect(() => {
    editorActiveRef.current = true
    return () => {
      editorActiveRef.current = false
    }
  }, [])

  useEffect(() => {
    const noMutedOperators = new Set<number>()
    mutedOperatorsRef.current = noMutedOperators
    soloOperatorRef.current = null
    setMutedOperators(noMutedOperators)
    setSoloOperator(null)
  }, [patch.id])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [patch.id])

  useEffect(() => {
    if (!isDirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isDirty])

  const liveName = useMemo(
    () =>
      String.fromCharCode(
        ...parameters.slice(FM1_VOICE_NAME_START, FM1_VOICE_NAME_START + FM1_VOICE_NAME_LENGTH),
      )
        .replace(/[^\x20-\x7e]/g, ' ')
        .trimEnd(),
    [parameters],
  )

  const sendOperatorAuditionParameters = useCallback(
    (
      nextParameters: Uint8Array,
      nextMutedOperators = mutedOperatorsRef.current,
      nextSoloOperator = soloOperatorRef.current,
    ) => {
      if (!canSync) return
      makeOperatorAuditionEdits(nextParameters, nextMutedOperators, nextSoloOperator).forEach(
        ([parameter, value]) => midi.sendParameter(parameter, value),
      )
    },
    [canSync, midi],
  )

  const commitHistory = useCallback((next: EditorHistory) => {
    const current = historyRef.current
    if (next === current) return false

    historyRef.current = next
    if (!parametersMatch(current.present, next.present)) {
      historyRevisionRef.current += 1
      if (!editStartedTrackedRef.current) {
        editStartedTrackedRef.current = true
        trackAnalyticsEvent({ name: 'patch_edit_started' })
      }
    }
    setHistory(next)
    return true
  }, [])

  const applyEdits = useCallback(
    (edits: ParameterEdit[], send = true) => {
      const activeGesture = gestureStart.current
      const current = historyRef.current
      const edited = editParameters(current, edits)
      if (edited === current) return
      commitHistory(activeGesture ? { ...edited, past: activeGesture.past } : edited)

      if (send && canSync && syncStateRef.current === 'live') {
        edits.forEach(([index, value, min = 0, max = 127]) => {
          const normalized = Math.max(min, Math.min(max, Math.round(value)))
          midi.sendParameter(
            index,
            auditionedParameterValue(
              index,
              normalized,
              mutedOperatorsRef.current,
              soloOperatorRef.current,
            ),
          )
        })
      }
    },
    [canSync, commitHistory, midi],
  )

  const setParameter = useCallback(
    (index: number, value: number, max = 127, min = 0, send = true) => {
      applyEdits([[index, value, min, max]], send)
    },
    [applyEdits],
  )

  const beginGesture = useCallback(() => {
    if (!gestureStart.current) gestureStart.current = historyRef.current
  }, [])

  const endGesture = useCallback(() => {
    const start = gestureStart.current
    gestureStart.current = null
    if (!start) return

    const current = historyRef.current
    if (parametersMatch(start.present, current.present)) return
    commitHistory({
      ...current,
      past: [...start.past, start.present].slice(-100),
    })
  }, [commitHistory])

  const sendToFm1 = useCallback(
    () => (canSync ? patchSyncRef.current!.requestSync() : Promise.resolve(false)),
    [canSync],
  )

  useEffect(() => {
    if (initializedPatchRef.current === patch.id) {
      if (!canSync && syncStateRef.current !== 'local') {
        syncStateRef.current = 'local'
        setSyncState('local')
      }
      return
    }

    initializedPatchRef.current = patch.id
    if (canSync) {
      void patchSyncRef.current!.requestInitialSync(patch.id)
    } else {
      syncStateRef.current = 'local'
      setSyncState('local')
    }
  }, [canSync, patch.id])

  const updateName = (name: string) => {
    const edits = makeDx7VoiceNameEdits(historyRef.current.present, name).map(
      ([parameter, value]) => [parameter, value] as ParameterEdit,
    )
    applyEdits(edits, false)
  }

  const sendNameToFm1 = () => {
    if (!canSync || syncStateRef.current !== 'live') return
    const lastSentParameters = parameters.slice()
    lastSentParameters.set(sentName.current, FM1_VOICE_NAME_START)
    const edits = makeDx7VoiceNameEdits(lastSentParameters, liveName)
    edits.forEach(([parameter, value]) => {
      if (midi.sendParameter(parameter, value)) {
        sentName.current[parameter - FM1_VOICE_NAME_START] = value
      }
    })
  }

  const restoreHistory = (direction: 'undo' | 'redo') => {
    const current = historyRef.current
    const next = direction === 'undo' ? undoParameters(current) : redoParameters(current)
    if (!commitHistory(next)) return
    if (canSync && syncStateRef.current === 'live') void sendToFm1()
  }

  const setEffectParameter = useCallback(
    (controller: number, value: number) => {
      const definition = fm1EffectParameters[controller]
      if (!definition) return
      applyEdits(
        [[resolveEffectEditorIndex(controller), value, definition.min, definition.max]],
        false,
      )
      if (canSync && syncStateRef.current === 'live') midi.sendEffectParameter(controller, value)
    },
    [applyEdits, canSync, midi],
  )

  const updateOperatorAudition = (
    nextMutedOperators: ReadonlySet<number>,
    nextSoloOperator: number | null,
    send = canSync && syncStateRef.current === 'live',
  ) => {
    mutedOperatorsRef.current = nextMutedOperators
    soloOperatorRef.current = nextSoloOperator
    setMutedOperators(nextMutedOperators)
    setSoloOperator(nextSoloOperator)
    if (send) {
      sendOperatorAuditionParameters(
        historyRef.current.present,
        nextMutedOperators,
        nextSoloOperator,
      )
    }
  }

  const toggleOperatorMute = (operator: number) => {
    const nextMutedOperators = new Set(mutedOperatorsRef.current)
    if (nextMutedOperators.has(operator)) nextMutedOperators.delete(operator)
    else nextMutedOperators.add(operator)
    updateOperatorAudition(nextMutedOperators, soloOperatorRef.current)
  }

  const toggleOperatorSolo = (operator: number) => {
    const nextSoloOperator = soloOperatorRef.current === operator ? null : operator
    updateOperatorAudition(mutedOperatorsRef.current, nextSoloOperator)
  }

  const clearOperatorAudition = (send = canSync && syncStateRef.current === 'live') => {
    if (mutedOperatorsRef.current.size === 0 && soloOperatorRef.current === null) return
    updateOperatorAudition(new Set(), null, send)
  }

  const saveToLibrary = () => {
    const current = historyRef.current.present
    onSave(packDx7Voice(getFm1VoiceParameters(current)), getFm1EffectParameters(current))
    setSavedParameters(current.slice())
    trackAnalyticsEvent({ name: 'patch_saved' })
  }

  const requestNavigation = () => {
    if (!isDirty) {
      clearOperatorAudition()
      onBack()
      return
    }
    setIsNavigationPending(true)
    unsavedDialogRef.current?.showModal()
  }

  const finishPendingNavigation = async (choice: 'discard' | 'save') => {
    if (!isNavigationPending) return
    setIsResolvingNavigation(true)
    if (choice === 'save') {
      clearOperatorAudition()
      saveToLibrary()
    } else {
      clearOperatorAudition(false)
      const restored = makeEditorHistory(savedParameters)
      commitHistory(restored)
      await sendToFm1()
      if (!editorActiveRef.current) return
    }
    setIsResolvingNavigation(false)
    unsavedDialogRef.current?.close()
    setIsNavigationPending(false)
    onBack()
  }

  const revertToSaved = async () => {
    saveMenuRef.current?.removeAttribute('open')
    const restored = makeEditorHistory(savedParameters)
    commitHistory(restored)
    await sendToFm1()
  }

  const resendToFm1 = () => {
    saveMenuRef.current?.removeAttribute('open')
    void sendToFm1()
  }

  const selectPreset = (presetId: SoundPresetId) => {
    const current = historyRef.current
    const presetParameters = applySoundPreset(current.present, presetId)
    const edits = Array.from(presetParameters.entries())
      .filter(([index, value]) => current.present[index] !== value)
      .map(([index, value]) => [index, value] as ParameterEdit)
    const next = editParameters(current, edits)

    presetsMenuRef.current?.removeAttribute('open')
    if (next === current) return

    gestureStart.current = null
    commitHistory(next)
    void sendToFm1()
  }

  const randomise = () => {
    const current = historyRef.current
    const randomParameters = randomizeSound(current.present)
    const edits = Array.from(randomParameters.entries())
      .filter(([index, value]) => current.present[index] !== value)
      .map(([index, value]) => [index, value] as ParameterEdit)
    const next = editParameters(current, edits)

    if (next === current) return

    gestureStart.current = null
    commitHistory(next)
    void sendToFm1()
  }

  const selectedOperatorIsMuted = mutedOperators.has(selectedOperator)
  const selectedOperatorIsSoloed = soloOperator === selectedOperator

  return (
    <section className="patch-editor-page mx-auto grid max-w-[90rem] min-w-0 gap-4 px-3 py-4 sm:px-5 lg:px-8">
      <PatchEditorHeader
        canSync={canSync}
        canRedo={history.future.length > 0}
        canUndo={history.past.length > 0}
        isDirty={isDirty}
        liveName={liveName}
        onBack={requestNavigation}
        onNameBlur={sendNameToFm1}
        onNameChange={updateName}
        onPreset={selectPreset}
        onRandomise={randomise}
        onRedo={() => restoreHistory('redo')}
        onResend={resendToFm1}
        onRevert={() => void revertToSaved()}
        onSave={saveToLibrary}
        onUndo={() => restoreHistory('undo')}
        patch={patch}
        presetsMenuRef={presetsMenuRef}
        saveMenuRef={saveMenuRef}
        syncState={syncState}
      />

      {midi.midiAccess && !midi.sysexAvailable ? <MidiSysexWarning /> : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(14rem,1fr)_minmax(0,3fr)] lg:items-start">
        <GlobalConfigurationPanel
          beginGesture={beginGesture}
          endGesture={endGesture}
          isLfoGlobalOpen={isLfoGlobalOpen}
          isPitchEnvelopeOpen={isPitchEnvelopeOpen}
          leftPanelTab={leftPanelTab}
          onTabChange={setLeftPanelTab}
          onToggleLfoGlobal={() => setIsLfoGlobalOpen((open) => !open)}
          onTogglePitchEnvelope={() => setIsPitchEnvelopeOpen((open) => !open)}
          parameters={parameters}
          setEffectParameter={setEffectParameter}
          setParameter={setParameter}
        />

        <div className="grid min-w-0 gap-0">
          <OperatorStrip
            algorithm={parameters[algorithmParameter.voiceIndex]}
            mutedOperators={mutedOperators}
            onSelect={setSelectedOperator}
            parameters={parameters}
            selectedOperator={selectedOperator}
            soloOperator={soloOperator}
          />

          <FocusedOperatorPanel
            applyEdits={applyEdits}
            beginGesture={beginGesture}
            endGesture={endGesture}
            onTabChange={setOperatorPanelTab}
            onToggleMute={() => toggleOperatorMute(selectedOperator)}
            onToggleSolo={() => toggleOperatorSolo(selectedOperator)}
            operatorPanelTab={operatorPanelTab}
            parameters={parameters}
            selectedOperator={selectedOperator}
            selectedOperatorIsMuted={selectedOperatorIsMuted}
            selectedOperatorIsSoloed={selectedOperatorIsSoloed}
            setParameter={setParameter}
            syncState={syncState}
          />
        </div>
      </div>

      <UnsavedEditorDialog
        dialogRef={unsavedDialogRef}
        isResolving={isResolvingNavigation}
        onClose={() => setIsNavigationPending(false)}
        onDiscard={() => void finishPendingNavigation('discard')}
        onSave={() => void finishPendingNavigation('save')}
      />
    </section>
  )
}
