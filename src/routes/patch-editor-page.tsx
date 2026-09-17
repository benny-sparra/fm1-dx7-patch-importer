import { AudioWaveform, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  OperatorRack,
  RackPanelCollapseToggle,
  RackPanelCollapsibleBody,
  RackPanelTitle,
} from '@/components/editor/editor-workspace'
import { FocusedOperatorPanel } from '@/components/editor/focused-operator-panel'
import { EffectsUnit } from '@/components/editor/effects-unit'
import { GlobalConfigurationPanel } from '@/components/editor/global-configuration-panel'
import { PatchEditorHeader } from '@/components/editor/patch-editor-header'
import { UnsavedEditorDialog } from '@/components/editor/unsaved-editor-dialog'
import { MidiSysexWarning } from '@/components/midi/midi-sysex-warning'
import { type Patch } from '@/data/patches'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { type MidiController } from '@/hooks/use-midi'
import { makeDx7VoiceNameEdits, packDx7Voice, unpackDx7Voice, type Dx7Voice } from '@/lib/dx7'
import { applyEffectPreset, type EffectPresetId } from '@/lib/effect-presets'
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
  getOperatorParameterDefinition,
  resolveEffectEditorIndex,
  resolveOperatorParameterIndex,
} from '@/lib/fm1-parameters'
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
import { initializeVoice } from '@/lib/init-voice'
import { editorShortcuts } from '@/lib/keyboard-shortcuts'
import { auditionedParameterValue, makeOperatorAuditionEdits } from '@/lib/operator-audition'
import { copyOperator, makeOperatorPasteEdits, type CopiedOperator } from '@/lib/operator-clipboard'
import { applySoundPreset, type SoundPresetId } from '@/lib/sound-presets'
import { randomizeSound } from '@/lib/sound-randomizer'
import { trackAnalyticsEvent } from '@/lib/analytics'

type PatchEditorPageProps = {
  /** The operator last copied in any editor this session, kept by the app while it runs. */
  copiedOperator: CopiedOperator | null
  effects: Uint8Array
  midi: MidiController
  onBack: () => void
  onCopyOperator: (copied: CopiedOperator) => void
  onSave: (voice: Dx7Voice, effects: Uint8Array) => void
  patch: Patch
  voice: Dx7Voice
}

const algorithmParameter = getGlobalParameterDefinition('global.algorithm')
const outputParameter = getOperatorParameterDefinition('operator.outputLevel')

function voiceNameParameters(parameters: Uint8Array) {
  return parameters.slice(FM1_VOICE_NAME_START, FM1_VOICE_NAME_START + FM1_VOICE_NAME_LENGTH)
}

function parametersMatch(left: Uint8Array, right: Uint8Array) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export function PatchEditorPage({
  copiedOperator,
  effects,
  midi,
  onBack,
  onCopyOperator,
  onSave,
  patch,
  voice,
}: PatchEditorPageProps) {
  const { t } = useTranslation()
  // Only read while mounting: App remounts this editor for each patch, keyed by patch id.
  const makeInitialParameters = () => makeFm1EditorParameters(unpackDx7Voice(voice), effects)
  const [history, setHistory] = useState(() => makeEditorHistory(makeInitialParameters()))
  const [savedParameters, setSavedParameters] = useState(makeInitialParameters)
  const [selectedOperator, setSelectedOperator] = useState(1)
  const [mutedOperators, setMutedOperators] = useState<ReadonlySet<number>>(() => new Set())
  const [soloOperator, setSoloOperator] = useState<number | null>(null)
  const [syncState, setSyncState] = useState<PatchSyncState>('sending')
  const [isNavigationPending, setIsNavigationPending] = useState(false)
  // Holds exactly what the user has typed into the name field, including the
  // trailing spaces the stored name trims away, so the space bar works while
  // typing a two-word name.
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [isResolvingNavigation, setIsResolvingNavigation] = useState(false)
  const [isOperatorRackCollapsed, setIsOperatorRackCollapsed] = useState(false)
  const [isEffectsCollapsed, setIsEffectsCollapsed] = useState(false)
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
  const sentName = useRef<Uint8Array | null>(null)
  const patchSyncRef = useRef<PatchSyncCoordinator | null>(null)
  const parameters = history.present
  const isDirty = !parametersMatch(parameters, savedParameters)
  const canSync = midi.hasMidiOutput && midi.sysexAvailable
  const initializedPatchRef = useRef('')

  midiRef.current = midi
  sentName.current ??= voiceNameParameters(history.present)

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
        sentName.current = voiceNameParameters(sentParameters)
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

  const storedName = useMemo(
    () =>
      String.fromCharCode(
        ...parameters.slice(FM1_VOICE_NAME_START, FM1_VOICE_NAME_START + FM1_VOICE_NAME_LENGTH),
      )
        .replace(/[^\x20-\x7e]/g, ' ')
        .trimEnd(),
    [parameters],
  )
  const liveName = nameDraft ?? storedName

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
    commitHistory(finishParameterGesture(start, current))
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
    setNameDraft(name)
    const edits = makeDx7VoiceNameEdits(historyRef.current.present, name).map(
      ([parameter, value]) => [parameter, value] as ParameterEdit,
    )
    applyEdits(edits, false)
  }

  const sendNameToFm1 = () => {
    if (!canSync || syncStateRef.current !== 'live') return
    const lastSentName = sentName.current!
    const lastSentParameters = parameters.slice()
    lastSentParameters.set(lastSentName, FM1_VOICE_NAME_START)
    const edits = makeDx7VoiceNameEdits(lastSentParameters, liveName)
    edits.forEach(([parameter, value]) => {
      if (midi.sendParameter(parameter, value)) {
        lastSentName[parameter - FM1_VOICE_NAME_START] = value
      }
    })
  }

  const commitName = () => {
    setNameDraft(null)
    sendNameToFm1()
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

  /** Replaces the whole voice as a single undo step and sends it to the FM1. */
  const replaceVoice = (replace: (parameters: Uint8Array) => Uint8Array) => {
    const current = historyRef.current
    const replacement = replace(current.present)
    const edits = Array.from(replacement.entries())
      .filter(([index, value]) => current.present[index] !== value)
      .map(([index, value]) => [index, value] as ParameterEdit)
    const next = editParameters(current, edits)

    if (next === current) return

    gestureStart.current = null
    commitHistory(next)
    void sendToFm1()
  }

  /** Sets one effect's controls as a single undo step and sends that effect to the FM1. */
  const selectEffectPreset = (presetId: EffectPresetId) => {
    const current = historyRef.current
    const { controllers, settings } = applyEffectPreset(
      getFm1EffectParameters(current.present),
      presetId,
    )
    const edits = controllers.map(
      (controller) => [resolveEffectEditorIndex(controller), settings[controller]] as ParameterEdit,
    )
    const next = editParameters(current, edits)

    if (next === current) return

    gestureStart.current = null
    commitHistory(next)
    if (canSync && syncStateRef.current === 'live') {
      controllers.forEach((controller) =>
        midi.sendEffectParameter(controller, settings[controller]),
      )
    }
  }

  /** Gives one operator the copied operator's settings as a single undo step, sent live. */
  const pasteOperator = (operator: number) => {
    if (!copiedOperator) return
    const edits = makeOperatorPasteEdits(historyRef.current.present, operator, copiedOperator)
    if (edits.length === 0) return
    gestureStart.current = null
    applyEdits(edits)
  }

  useKeyboardShortcuts([
    { ...editorShortcuts.redo, onTrigger: () => restoreHistory('redo') },
    { ...editorShortcuts.undo, onTrigger: () => restoreHistory('undo') },
    // Bound whether or not the patch is dirty, so a browser "save page" dialog
    // never appears in an editor that looks like it owns the shortcut.
    {
      ...editorShortcuts.save,
      onTrigger: () => {
        if (isDirty) saveToLibrary()
      },
    },
    {
      ...editorShortcuts.back,
      enabled: syncState !== 'sending',
      onTrigger: requestNavigation,
    },
  ])

  return (
    <section className="patch-editor-page mx-auto grid max-w-[90rem] min-w-0 gap-2.5 px-3 py-4 sm:px-5 lg:px-8">
      <PatchEditorHeader
        canSync={canSync}
        canRedo={history.future.length > 0}
        canUndo={history.past.length > 0}
        isDirty={isDirty}
        liveName={liveName}
        onBack={requestNavigation}
        onNameBlur={commitName}
        onNameChange={updateName}
        onPreset={selectPreset}
        onInitVoice={() => {
          presetsMenuRef.current?.removeAttribute('open')
          replaceVoice(initializeVoice)
        }}
        onRandomise={() => replaceVoice(randomizeSound)}
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

      {/*
        The artboard's rack, top to bottom: the six operator columns, then a
        row of algorithm, pitch envelope and LFO, then the effects chain.
      */}
      <div className="grid min-w-0 gap-2.5">
        <section aria-labelledby="operators-heading" className="synthwave-panel min-w-0">
          <RackPanelTitle
            action={
              <RackPanelCollapseToggle
                collapsed={isOperatorRackCollapsed}
                controls="operator-rack"
                onToggle={() => setIsOperatorRackCollapsed((collapsed) => !collapsed)}
                panel={t('editor.operators')}
              />
            }
            help={{ label: t('editor.fmOperators'), text: t('controlHelp.operator') }}
            icon={AudioWaveform}
            id="operators-heading"
            title={t('editor.operators')}
          />
          <RackPanelCollapsibleBody collapsed={isOperatorRackCollapsed} id="operator-rack">
            <OperatorRack
              algorithm={parameters[algorithmParameter.voiceIndex]}
              mutedOperators={mutedOperators}
              onCopyOperator={(operator) =>
                onCopyOperator(copyOperator(historyRef.current.present, operator, patch))
              }
              onGestureEnd={endGesture}
              onGestureStart={beginGesture}
              onOutputChange={(operator, value) =>
                setParameter(
                  resolveOperatorParameterIndex(operator, 'operator.outputLevel'),
                  value,
                  outputParameter.max,
                )
              }
              onPasteOperator={pasteOperator}
              onSelect={setSelectedOperator}
              onToggleMute={toggleOperatorMute}
              onToggleSolo={toggleOperatorSolo}
              parameters={parameters}
              pasteSource={
                copiedOperator && {
                  operator: copiedOperator.operator,
                  patchName: copiedOperator.patchId === patch.id ? null : copiedOperator.patchName,
                }
              }
              renderOperatorDetail={(operator) => (
                <FocusedOperatorPanel
                  applyEdits={applyEdits}
                  beginGesture={beginGesture}
                  endGesture={endGesture}
                  parameters={parameters}
                  selectedOperator={operator}
                  setParameter={setParameter}
                />
              )}
              selectedOperator={selectedOperator}
              syncState={syncState}
              soloOperator={soloOperator}
            />
          </RackPanelCollapsibleBody>
        </section>

        <GlobalConfigurationPanel
          beginGesture={beginGesture}
          endGesture={endGesture}
          parameters={parameters}
          setParameter={setParameter}
        />

        <section aria-labelledby="effects-heading" className="synthwave-panel min-w-0">
          <RackPanelTitle
            action={
              <RackPanelCollapseToggle
                collapsed={isEffectsCollapsed}
                controls="effects-unit"
                onToggle={() => setIsEffectsCollapsed((collapsed) => !collapsed)}
                panel={t('editor.effects')}
              />
            }
            icon={Sparkles}
            id="effects-heading"
            title={t('editor.effects')}
          />
          <RackPanelCollapsibleBody collapsed={isEffectsCollapsed} id="effects-unit">
            <EffectsUnit
              onApplyPreset={selectEffectPreset}
              onChange={setEffectParameter}
              onGestureEnd={endGesture}
              onGestureStart={beginGesture}
              values={getFm1EffectParameters(parameters)}
            />
          </RackPanelCollapsibleBody>
        </section>
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
