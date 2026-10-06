import { Activity, AudioWaveform, Funnel, SlidersHorizontal, Sparkles, Waves } from 'lucide-react'
import {
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useTranslation } from 'react-i18next'

import '@/i18n/editor-help'
import { CompareOverlay } from '@/components/editor/compare-overlay'
import { EffectsUnit } from '@/components/editor/effects-unit'
import { LfoScope } from '@/components/editor/lfo-scope'
import {
  LfoWaveControl,
  RackSelect,
  RadioParameterControl,
  SliderParameterControl,
  SwitchParameterControl,
} from '@/components/editor/parameter-controls'
import { PatchEditorHeader } from '@/components/editor/patch-editor-header'
import { UnsavedEditorDialog } from '@/components/editor/unsaved-editor-dialog'
import { RackPanelTitle } from '@/components/ui/rack-panel'
import type { Patch } from '@/data/patches'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { useFm1VaPresetReader } from '@/hooks/use-fm1-va-preset-reader'
import { useFm1VaSoundControl } from '@/hooks/use-fm1-va-sound-control'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import type { MidiController } from '@/hooks/use-midi'
import { getFm1EffectParameters } from '@/lib/fm1-effects'
import { hasFm1VaPresetCommands } from '@/lib/fm1-firmware'
import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_VA_BITCRUSH_START,
  FM1_VA_DISTORTION_TYPE_INDEX,
  FM1_VA_EFFECT_ORDER_START,
  FM1_VA_STOCK_EFFECT_ORDER,
  FM1_VOICE_NAME_LENGTH,
  FM1_VOICE_NAME_START,
} from '@/lib/fm1-parameters'
import { fm1VaRecordEngine } from '@/lib/fm1-va-engine'
import { fm1VaPresetNumber } from '@/lib/fm1-va-preset-read'
import {
  fm1VaRecordWithBitcrush,
  fm1VaRecordWithDistortionType,
  fm1VaRecordWithEffectOrder,
  playsFm1VaBitcrush,
} from '@/lib/fm1-va-record-effects'
import {
  makeVirtualAnalogEditorParameters,
  virtualAnalogCutoffHertz,
  virtualAnalogFromEditorParameters,
  virtualAnalogRow,
  type VirtualAnalogRowId,
} from '@/lib/fm1-va-virtual-analog-editor'
import { editorShortcuts } from '@/lib/keyboard-shortcuts'
import { cn } from '@/lib/utils'
import {
  displayedVirtualAnalogParameters,
  hasUnsavedVirtualAnalogEdits,
  VirtualAnalogEditorSession,
} from '@/lib/virtual-analog-editor-session'

type VirtualAnalogEditorPageProps = {
  /** Set to the editor's back action while it is open, for the browser's Back button to use. */
  browserBackRef?: RefObject<(() => void) | null>
  effects: Uint8Array
  midi: Pick<
    MidiController,
    | 'channel'
    | 'firmware'
    | 'inputs'
    | 'logStore'
    | 'outputs'
    | 'selectedInputId'
    | 'selectedOutputId'
    | 'sendEffectParameter'
    | 'sysexAvailable'
  >
  onBack: () => void
  /** Saves the preset's voice bytes, effects, and settings record. */
  onSave: (voice: Uint8Array, effects: Uint8Array, record: Uint8Array) => void
  patch: Patch
  record: Uint8Array
  voice: Uint8Array
}

/** Whether, and why not, the editor's changes play on the FM1 as they are made. */
type LiveStatus = 'checking' | 'live' | 'noFirmware' | 'noProgram' | 'otherEngine' | 'readFailed'

const panelClass = 'synthwave-panel @container flex min-w-0 flex-col'
const controlsClass = 'grid grid-cols-2 content-start gap-x-3 gap-y-2.5 p-[9px] @sm:grid-cols-3'

/**
 * The editor for a Virtual Analog preset from FM-1+VA: its oscillator, filter, output, LFO, and
 * Envelope rows, and its effects, as the FM1's own screens list them. It edits the library's copy,
 * leaving every byte it does not set exactly as read. While the FM1 plays the preset in its slot
 * (banks A–D, from FM-1_086, read first to check it is a Virtual Analog preset), each change with
 * a controller is sent as it is made; the rest are heard once the patch is written to the FM1.
 */
export function VirtualAnalogEditorPage({
  browserBackRef,
  effects,
  midi,
  onBack,
  onSave,
  patch,
  record,
  voice,
}: VirtualAnalogEditorPageProps) {
  const { i18n, t } = useTranslation()
  const soundControl = useFm1VaSoundControl(midi)
  const reader = useFm1VaPresetReader(midi)
  const sends = {
    sendEffectParameter: midi.sendEffectParameter,
    sendSoundControl: soundControl.sendSoundControl,
  }
  const sendsRef = useRef(sends)
  // Only reads the preset while mounting: App remounts this editor for each patch, keyed by its id.
  const [editor] = useState(
    () =>
      new VirtualAnalogEditorSession(
        makeVirtualAnalogEditorParameters(voice, record, effects),
        () => sendsRef.current,
      ),
  )
  const state = useSyncExternalStore(editor.subscribe, editor.getState)
  const { history, isComparing, syncState } = state
  const parameters = displayedVirtualAnalogParameters(state)
  const isDirty = hasUnsavedVirtualAnalogEdits(state)
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [isNavigationPending, setIsNavigationPending] = useState(false)
  const [isResolvingNavigation, setIsResolvingNavigation] = useState(false)
  const [checked, setChecked] = useState<{
    readPreset: typeof reader.readPreset
    result: LiveStatus
  } | null>(null)
  const unsavedDialogRef = useRef<HTMLDialogElement>(null)
  const saveMenuRef = useDismissableDetails()
  const filterTypeId = useId()
  const program = patch.program
  const canCheck = soundControl.canSend && reader.canRead

  // The session sends through this ref. It follows committed renders only, and a layout effect
  // updates it before the passive effects below or any later event can send through it.
  useLayoutEffect(() => {
    sendsRef.current = sends
  })

  useEffect(() => editor.activate(), [editor])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    if (!isDirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isDirty])

  // Changes play on the FM1 only while it plays this preset: the slot's own, read first to make
  // sure it is a Virtual Analog one, since FM presets read some of the same controllers as their
  // own settings. Changing the ports reads it again.
  const { readPreset } = reader
  useEffect(() => {
    if (program === undefined || !canCheck) {
      editor.goLocal()
      return
    }
    const read = new AbortController()
    editor.checking()
    const check = async () => {
      let result: LiveStatus
      try {
        const preset = await readPreset(program, read.signal)
        result = fm1VaRecordEngine(preset.record) === 'virtual-analog' ? 'live' : 'otherEngine'
      } catch {
        result = 'readFailed'
      }
      if (read.signal.aborted) return
      setChecked({ readPreset, result })
      if (result === 'live') editor.goLive()
      else editor.goLocal()
    }
    void check()
    return () => read.abort()
  }, [canCheck, editor, program, readPreset])

  const liveStatus: LiveStatus =
    program === undefined
      ? 'noProgram'
      : !canCheck
        ? 'noFirmware'
        : checked?.readPreset === readPreset
          ? checked.result
          : 'checking'

  const storedName = String.fromCharCode(
    ...parameters.slice(FM1_VOICE_NAME_START, FM1_VOICE_NAME_START + FM1_VOICE_NAME_LENGTH),
  )
    .replace(/[^\x20-\x7e]/g, ' ')
    .trimEnd()
  const liveName = nameDraft ?? storedName

  const bitcrush = Array.from(parameters.subarray(FM1_VA_BITCRUSH_START, FM1_VA_EFFECT_ORDER_START))
  const effectOrder = Array.from(
    parameters.subarray(FM1_VA_EFFECT_ORDER_START, FM1_EDITOR_PARAMETER_COUNT),
  )
  const offersBitcrush = playsFm1VaBitcrush(midi.firmware)
  const writesDistortionType = hasFm1VaPresetCommands(midi.firmware)
  // On firmware that does not play them, a line says what the patch keeps, as the voice editor's
  // effects panel does.
  const knowsFirmware = midi.firmware.kind !== 'checking'
  const distortionType = parameters[FM1_VA_DISTORTION_TYPE_INDEX]
  const keptDistortionType =
    !writesDistortionType && knowsFirmware && distortionType !== 0 ? distortionType : undefined
  const keepsBitcrush = !offersBitcrush && knowsFirmware && bitcrush[0] === 1
  const keepsEffectOrder =
    !offersBitcrush &&
    knowsFirmware &&
    effectOrder.some((effect, place) => effect !== FM1_VA_STOCK_EFFECT_ORDER[place])

  const saveToLibrary = () =>
    editor.save((saved) => {
      const stored = virtualAnalogFromEditorParameters(voice, record, saved)
      onSave(
        stored.voice,
        getFm1EffectParameters(saved),
        fm1VaRecordWithEffectOrder(
          fm1VaRecordWithBitcrush(
            fm1VaRecordWithDistortionType(stored.record, saved[FM1_VA_DISTORTION_TYPE_INDEX]),
            Array.from(saved.subarray(FM1_VA_BITCRUSH_START, FM1_VA_EFFECT_ORDER_START)),
          ),
          Array.from(saved.subarray(FM1_VA_EFFECT_ORDER_START, FM1_EDITOR_PARAMETER_COUNT)),
        ),
      )
    })

  const requestNavigation = () => {
    if (editor.getState().isComparing || isNavigationPending) return
    if (!isDirty) {
      onBack()
      return
    }
    setIsNavigationPending(true)
    unsavedDialogRef.current?.showModal()
  }

  const finishPendingNavigation = (choice: 'discard' | 'save') => {
    if (!isNavigationPending) return
    setIsResolvingNavigation(true)
    if (choice === 'save') saveToLibrary()
    else editor.revertToSaved()
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

  const toggleCompare = () => {
    if (!editor.toggleCompare()) return
    saveMenuRef.current?.removeAttribute('open')
  }

  const stopComparing = () => {
    if (editor.getState().isComparing) toggleCompare()
  }

  useKeyboardShortcuts([
    { ...editorShortcuts.redo, onTrigger: editor.redo },
    { ...editorShortcuts.undo, onTrigger: editor.undo },
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

  const value = (id: VirtualAnalogRowId) => parameters[virtualAnalogRow(id).index]
  const format = (number: number, digits: number) =>
    new Intl.NumberFormat(i18n.resolvedLanguage, {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(number)
  const cutoffLabel = (step: number) => {
    const hertz = virtualAnalogCutoffHertz(step)
    // The FM1 shows tenths of a kilohertz below 10k, and whole kilohertz above.
    if (hertz < 1000) return t('bitcrush.hertz', { value: format(hertz, 0) })
    if (hertz < 10000) return t('bitcrush.kilohertz', { value: format(hertz / 1000, 1) })
    return t('bitcrush.kilohertz', { value: format(Math.floor(hertz / 1000), 0) })
  }
  const slider = (
    id: VirtualAnalogRowId,
    label: string,
    valueLabel?: (value: number) => string,
  ) => (
    <SliderParameterControl
      label={label}
      max={virtualAnalogRow(id).max}
      onChange={(next) => editor.setRow(id, next)}
      onGestureEnd={editor.endGesture}
      onGestureStart={editor.beginGesture}
      value={value(id)}
      valueLabel={valueLabel}
    />
  )
  const envelopeOn = value('envelope') === 1
  const presetNumber = program === undefined ? '' : fm1VaPresetNumber(program)

  return (
    <section className="patch-editor-page mx-auto grid max-w-[90rem] min-w-0 gap-2.5 px-3 pt-2.5 pb-4 sm:px-5 lg:px-8">
      <PatchEditorHeader
        canRedo={history.future.length > 0}
        canSync={liveStatus === 'live'}
        canUndo={history.past.length > 0}
        isComparing={isComparing}
        isDirty={isDirty}
        liveName={liveName}
        onBack={requestNavigation}
        onCompare={toggleCompare}
        onNameBlur={() => setNameDraft(null)}
        onNameChange={(name) => {
          if (editor.getState().isComparing) return
          setNameDraft(name)
          editor.editName(name)
        }}
        onRedo={editor.redo}
        onResend={() => {
          saveMenuRef.current?.removeAttribute('open')
          editor.goLive()
        }}
        onRevert={() => {
          saveMenuRef.current?.removeAttribute('open')
          editor.revertToSaved()
        }}
        onSave={saveToLibrary}
        onStopCompare={stopComparing}
        onUndo={editor.undo}
        patch={patch}
        saveMenuRef={saveMenuRef}
        syncState={syncState}
      />

      <p className="text-sm leading-6 text-[var(--crt-ink-3)]" role="status">
        {t(`virtualAnalog.${liveStatus}`, { preset: presetNumber })}
      </p>

      <div className="relative min-w-0">
        <div
          className={cn('grid min-w-0 gap-2.5', isComparing && 'opacity-60')}
          inert={isComparing}
        >
          <div className="grid min-w-0 gap-2.5 lg:grid-cols-2">
            <section aria-labelledby="va-oscillator-heading" className={panelClass}>
              <RackPanelTitle
                icon={AudioWaveform}
                id="va-oscillator-heading"
                title={t('virtualAnalog.oscillator')}
              />
              <div className={controlsClass}>
                <div className="col-span-full">
                  <RadioParameterControl
                    label={t('virtualAnalog.waveform')}
                    name={`${filterTypeId}-waveform`}
                    onChange={(next) => editor.chooseRow('waveform', next)}
                    options={[
                      t('virtualAnalog.waveforms.sine'),
                      t('virtualAnalog.waveforms.saw'),
                      t('virtualAnalog.waveforms.triangle'),
                      t('virtualAnalog.waveforms.square'),
                    ]}
                    value={value('waveform')}
                  />
                </div>
                {slider('super', t('virtualAnalog.super'))}
                {slider('detune', t('virtualAnalog.detune'))}
                {slider('drift', t('virtualAnalog.drift'))}
                {slider('sub', t('virtualAnalog.sub'))}
                {slider('noise', t('virtualAnalog.noise'))}
                {slider('pwm', t('virtualAnalog.pwm'))}
              </div>
            </section>

            <section aria-labelledby="va-filter-heading" className={panelClass}>
              <RackPanelTitle
                icon={Funnel}
                id="va-filter-heading"
                title={t('virtualAnalog.filter')}
              />
              <div className={controlsClass}>
                {/* The type's names and Key Tracking's four choices need two columns of room. */}
                <label
                  className="col-span-2 grid min-w-0 gap-1 text-[11px] tracking-[0.1em] text-[var(--crt-ink-3)] uppercase"
                  htmlFor={filterTypeId}
                >
                  {t('virtualAnalog.filterType')}
                  <RackSelect
                    className="crt-inset h-8 bg-[var(--crt-bg-1)] text-xs text-[var(--crt-ink)] normal-case outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
                    id={filterTypeId}
                    onChange={(event) => editor.chooseRow('filterType', Number(event.target.value))}
                    value={value('filterType')}
                  >
                    {(['lowPass12', 'lowPass24', 'bandPass', 'highPass'] as const).map(
                      (type, index) => (
                        <option key={type} value={index}>
                          {t(`virtualAnalog.filterTypes.${type}`)}
                        </option>
                      ),
                    )}
                  </RackSelect>
                </label>
                {slider('cutoff', t('virtualAnalog.cutoff'), cutoffLabel)}
                {slider('resonance', t('virtualAnalog.resonance'))}
                {slider('filterEnvelope', t('virtualAnalog.filterEnvelope'))}
                {slider('filterDecay', t('virtualAnalog.filterDecay'))}
                {slider('filterShape', t('virtualAnalog.filterShape'))}
                {slider('filterVelocity', t('virtualAnalog.filterVelocity'))}
                {slider('lfoToCutoff', t('virtualAnalog.lfoToCutoff'))}
                <div className="col-span-2">
                  <RadioParameterControl
                    label={t('virtualAnalog.keyTracking')}
                    name={`${filterTypeId}-key-tracking`}
                    onChange={(next) => editor.chooseRow('keyTracking', next)}
                    options={[0, 33, 67, 100].map((amount) => format(amount, 0))}
                    value={value('keyTracking')}
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="grid min-w-0 gap-2.5 lg:grid-cols-3">
            <section aria-labelledby="va-output-heading" className={panelClass}>
              <RackPanelTitle
                icon={SlidersHorizontal}
                id="va-output-heading"
                title={t('virtualAnalog.output')}
              />
              <div className={controlsClass}>
                {slider('level', t('virtualAnalog.level'))}
                {slider('velocityToLevel', t('virtualAnalog.velocityToLevel'))}
                <SwitchParameterControl
                  label={t('virtualAnalog.mono')}
                  onChange={(next) => editor.chooseRow('mono', next)}
                  value={value('mono')}
                />
              </div>
            </section>

            <section aria-labelledby="va-lfo-heading" className={panelClass}>
              <RackPanelTitle icon={Waves} id="va-lfo-heading" title={t('virtualAnalog.lfo')} />
              <div className={controlsClass}>
                <div className="col-span-full">
                  <LfoScope
                    ampModDepth={value('ampModDepth')}
                    pitchModDepth={value('pitchModDepth')}
                    speed={value('lfoSpeed')}
                    wave={value('lfoWave')}
                  />
                </div>
                <LfoWaveControl
                  onChange={(next) => editor.chooseRow('lfoWave', next)}
                  value={value('lfoWave')}
                />
                {slider('lfoSpeed', t('editor.lfoSpeed'))}
                {slider('lfoDelay', t('editor.lfoDelay'))}
                {slider('pitchModDepth', t('editor.pitchModDepth'))}
                {slider('ampModDepth', t('editor.ampModDepth'))}
                {slider('pitchModSensitivity', t('editor.pitchModSensitivity'))}
                <SwitchParameterControl
                  label={t('editor.lfoSync')}
                  onChange={(next) => editor.chooseRow('lfoSync', next)}
                  value={value('lfoSync')}
                />
              </div>
            </section>

            <section aria-labelledby="va-envelope-heading" className={panelClass}>
              <RackPanelTitle
                icon={Activity}
                id="va-envelope-heading"
                title={t('virtualAnalog.envelope')}
                titleSwitch={{
                  checked: envelopeOn,
                  onChange: (on) => editor.chooseRow('envelope', on ? 1 : 0),
                }}
              />
              {envelopeOn ? (
                <div className={controlsClass}>
                  {slider('attack', t('virtualAnalog.attack'))}
                  {slider('decay', t('virtualAnalog.decay'))}
                  {slider('sustain', t('virtualAnalog.sustain'))}
                  {slider('release', t('virtualAnalog.release'))}
                </div>
              ) : (
                <p className="p-[9px] text-sm leading-6 text-[var(--crt-ink-3)]">
                  {t('virtualAnalog.envelopeOff')}
                </p>
              )}
            </section>
          </div>

          <section aria-labelledby="va-effects-heading" className="synthwave-panel min-w-0">
            <RackPanelTitle icon={Sparkles} id="va-effects-heading" title={t('editor.effects')} />
            <EffectsUnit
              bitcrush={
                offersBitcrush
                  ? { onChange: editor.setBitcrushSetting, values: bitcrush }
                  : undefined
              }
              distortionType={
                writesDistortionType
                  ? { onChange: editor.setDistortionType, type: distortionType }
                  : undefined
              }
              effectOrder={
                offersBitcrush ? { onMove: editor.moveEffect, order: effectOrder } : undefined
              }
              keepsBitcrush={keepsBitcrush}
              keepsEffectOrder={keepsEffectOrder}
              keptDistortionType={keptDistortionType}
              onApplyPreset={editor.selectEffectPreset}
              onChange={editor.setEffectParameter}
              onGestureEnd={editor.endGesture}
              onGestureStart={editor.beginGesture}
              values={getFm1EffectParameters(parameters)}
            />
          </section>
        </div>
        <CompareOverlay isComparing={isComparing} />
      </div>

      <UnsavedEditorDialog
        dialogRef={unsavedDialogRef}
        isResolving={isResolvingNavigation}
        onClose={() => setIsNavigationPending(false)}
        onDiscard={() => finishPendingNavigation('discard')}
        onSave={() => finishPendingNavigation('save')}
      />
    </section>
  )
}
