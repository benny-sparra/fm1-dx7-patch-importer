import { AudioWaveform, Sparkles } from 'lucide-react'
import { type RefObject, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import {
  OperatorRack,
  RackPanelCollapseToggle,
  RackPanelCollapsibleBody,
  RackPanelTitle,
} from '@/components/editor/editor-workspace'
import { CompareOverlay } from '@/components/editor/compare-overlay'
import { FocusedOperatorPanel } from '@/components/editor/focused-operator-panel'
import { EffectsUnit } from '@/components/editor/effects-unit'
import { GlobalConfigurationPanel } from '@/components/editor/global-configuration-panel'
import { PatchEditorHeader } from '@/components/editor/patch-editor-header'
import { UnsavedEditorDialog } from '@/components/editor/unsaved-editor-dialog'
import { MidiSysexWarning } from '@/components/midi/midi-sysex-warning'
import type { Patch } from '@/data/patches'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import type { MidiController } from '@/hooks/use-midi'
import { unpackDx7Voice, type Dx7Voice } from '@/lib/dx7'
import { getFm1EffectParameters, makeFm1EditorParameters } from '@/lib/fm1-effects'
import {
  FM1_VOICE_NAME_LENGTH,
  FM1_VOICE_NAME_START,
  getGlobalParameterDefinition,
  getOperatorParameterDefinition,
  resolveOperatorParameterIndex,
} from '@/lib/fm1-parameters'
import {
  displayedParameters,
  hasUnsavedEdits,
  PatchEditorSession,
} from '@/lib/patch-editor-session'
import { initializeVoice } from '@/lib/init-voice'
import { editorShortcuts } from '@/lib/keyboard-shortcuts'
import { copyOperator, type CopiedOperator } from '@/lib/operator-clipboard'
import { applySoundPreset, type SoundPresetId } from '@/lib/sound-presets'
import { randomizeSound } from '@/lib/sound-randomizer'
import { cn } from '@/lib/utils'

type PatchEditorPageProps = {
  /** Set to the editor's back action while it is open, for the browser's Back button to use. */
  browserBackRef?: RefObject<(() => void) | null>
  /** The operator last copied in any editor this session, kept by the app while it runs. */
  copiedOperator: CopiedOperator | null
  effects: Uint8Array
  midi: Pick<
    MidiController,
    | 'hasMidiOutput'
    | 'midiAccess'
    | 'sendEffectParameter'
    | 'sendEffectSettings'
    | 'sendParameter'
    | 'sendVoice'
    | 'sysexAvailable'
  >
  onBack: () => void
  onCopyOperator: (copied: CopiedOperator) => void
  onSave: (voice: Dx7Voice, effects: Uint8Array) => void
  patch: Patch
  voice: Dx7Voice
}

const algorithmParameter = getGlobalParameterDefinition('global.algorithm')
const outputParameter = getOperatorParameterDefinition('operator.outputLevel')

export function PatchEditorPage({
  browserBackRef,
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
  const midiRef = useRef(midi)
  // Only reads the voice while mounting: App remounts this editor for each patch, keyed by patch id.
  const [editor] = useState(() => {
    const parameters = makeFm1EditorParameters(unpackDx7Voice(voice), effects)
    return new PatchEditorSession(parameters, () => midiRef.current)
  })
  const state = useSyncExternalStore(editor.subscribe, editor.getState)
  const { history, isComparing, mutedOperators, soloOperator, syncState } = state
  const [selectedOperator, setSelectedOperator] = useState(1)
  const [isNavigationPending, setIsNavigationPending] = useState(false)
  // Holds exactly what the user has typed into the name field, including the
  // trailing spaces the stored name trims away, so the space bar works while
  // typing a two-word name.
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [isResolvingNavigation, setIsResolvingNavigation] = useState(false)
  const [isOperatorRackCollapsed, setIsOperatorRackCollapsed] = useState(false)
  const [isEffectsCollapsed, setIsEffectsCollapsed] = useState(false)
  const unsavedDialogRef = useRef<HTMLDialogElement>(null)
  const presetsMenuRef = useDismissableDetails()
  const saveMenuRef = useDismissableDetails()
  const parameters = displayedParameters(state)
  const isDirty = hasUnsavedEdits(state)
  const canSync = midi.hasMidiOutput && midi.sysexAvailable

  midiRef.current = midi

  useEffect(() => editor.activate(), [editor])

  useEffect(() => {
    editor.clearOperatorAudition(false)
  }, [editor, patch.id])

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

  useEffect(() => {
    editor.synchronize(patch.id)
  }, [canSync, editor, patch.id])

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

  const updateName = (name: string) => {
    if (editor.getState().isComparing) return
    setNameDraft(name)
    editor.editName(name)
  }

  const commitName = () => {
    setNameDraft(null)
    editor.sendName(liveName)
  }

  const saveToLibrary = () => editor.save(onSave)

  const requestNavigation = () => {
    if (editor.getState().isComparing || isNavigationPending) return
    if (!isDirty) {
      editor.clearOperatorAudition()
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
      editor.clearOperatorAudition()
      saveToLibrary()
    } else {
      editor.clearOperatorAudition(false)
      await editor.revertToSaved()
      if (!editor.isActive()) return
    }
    setIsResolvingNavigation(false)
    unsavedDialogRef.current?.close()
    setIsNavigationPending(false)
    onBack()
  }

  useEffect(() => {
    if (!browserBackRef) return
    browserBackRef.current = requestNavigation
    return () => {
      browserBackRef.current = null
    }
  })

  const revertToSaved = () => {
    saveMenuRef.current?.removeAttribute('open')
    if (editor.getState().isComparing) return
    void editor.revertToSaved()
  }

  const toggleCompare = () => {
    if (!editor.toggleCompare()) return
    presetsMenuRef.current?.removeAttribute('open')
    saveMenuRef.current?.removeAttribute('open')
  }

  const stopComparing = () => {
    if (editor.getState().isComparing) toggleCompare()
  }

  const resendToFm1 = () => {
    saveMenuRef.current?.removeAttribute('open')
    void editor.requestSync()
  }

  const selectPreset = (presetId: SoundPresetId) => {
    if (editor.getState().isComparing) return
    presetsMenuRef.current?.removeAttribute('open')
    editor.replaceVoice((present) => applySoundPreset(present, presetId))
  }

  const pasteOperator = (operator: number) => {
    if (copiedOperator) editor.pasteOperator(operator, copiedOperator)
  }

  useKeyboardShortcuts([
    { ...editorShortcuts.redo, onTrigger: editor.redo },
    { ...editorShortcuts.undo, onTrigger: editor.undo },
    // Bound whether or not the patch is dirty, so a browser "save page" dialog
    // never appears in an editor that looks like it owns the shortcut.
    {
      ...editorShortcuts.save,
      onTrigger: () => {
        if (isDirty) saveToLibrary()
      },
    },
    { ...editorShortcuts.stopComparing, enabled: isComparing, onTrigger: stopComparing },
    {
      ...editorShortcuts.back,
      enabled: syncState !== 'sending' && !isComparing,
      onTrigger: requestNavigation,
    },
  ])

  return (
    <section className="patch-editor-page mx-auto grid max-w-[90rem] min-w-0 gap-2.5 px-3 pt-2.5 pb-4 sm:px-5 lg:px-8">
      <PatchEditorHeader
        canSync={canSync}
        canRedo={history.future.length > 0}
        canUndo={history.past.length > 0}
        isComparing={isComparing}
        isDirty={isDirty}
        liveName={liveName}
        onBack={requestNavigation}
        onCompare={toggleCompare}
        onStopCompare={stopComparing}
        onNameBlur={commitName}
        onNameChange={updateName}
        onPreset={selectPreset}
        onInitVoice={() => {
          presetsMenuRef.current?.removeAttribute('open')
          editor.replaceVoice(initializeVoice)
        }}
        onRandomise={() => {
          presetsMenuRef.current?.removeAttribute('open')
          editor.replaceVoice(randomizeSound)
        }}
        onRedo={editor.redo}
        onResend={resendToFm1}
        onRevert={revertToSaved}
        onSave={saveToLibrary}
        onUndo={editor.undo}
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
      <div className="relative min-w-0">
        <div
          className={cn('grid min-w-0 gap-2.5', isComparing && 'opacity-60')}
          inert={isComparing}
        >
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
                  onCopyOperator(copyOperator(editor.getState().history.present, operator, patch))
                }
                onGestureEnd={editor.endGesture}
                onGestureStart={editor.beginGesture}
                onOutputChange={(operator, value) =>
                  editor.setParameter(
                    resolveOperatorParameterIndex(operator, 'operator.outputLevel'),
                    value,
                    outputParameter.max,
                  )
                }
                onPasteOperator={pasteOperator}
                onSelect={setSelectedOperator}
                onToggleMute={editor.toggleOperatorMute}
                onToggleSolo={editor.toggleOperatorSolo}
                parameters={parameters}
                pasteSource={
                  copiedOperator && {
                    operator: copiedOperator.operator,
                    patchName:
                      copiedOperator.patchId === patch.id ? null : copiedOperator.patchName,
                  }
                }
                renderOperatorDetail={(operator) => (
                  <FocusedOperatorPanel
                    applyEdits={editor.applyEdits}
                    beginGesture={editor.beginGesture}
                    endGesture={editor.endGesture}
                    parameters={parameters}
                    selectedOperator={operator}
                    setParameter={editor.setParameter}
                  />
                )}
                selectedOperator={selectedOperator}
                syncState={syncState}
                soloOperator={soloOperator}
              />
            </RackPanelCollapsibleBody>
          </section>

          <GlobalConfigurationPanel
            beginGesture={editor.beginGesture}
            endGesture={editor.endGesture}
            parameters={parameters}
            setParameter={editor.setParameter}
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
                onApplyPreset={editor.selectEffectPreset}
                onChange={editor.setEffectParameter}
                onGestureEnd={editor.endGesture}
                onGestureStart={editor.beginGesture}
                values={getFm1EffectParameters(parameters)}
              />
            </RackPanelCollapsibleBody>
          </section>
        </div>
        <CompareOverlay isComparing={isComparing} />
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
