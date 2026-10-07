import { Activity, AudioWaveform, Dices, Eraser, Sparkles, Waves } from 'lucide-react'
import {
  Fragment,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useTranslation } from 'react-i18next'

import '@/i18n/editor-help'
import { AdsrScope } from '@/components/editor/adsr-scope'
import { CompareOverlay } from '@/components/editor/compare-overlay'
import { RackPanelHelp } from '@/components/editor/editor-workspace'
import { EffectsUnit } from '@/components/editor/effects-unit'
import { LfoScope } from '@/components/editor/lfo-scope'
import {
  VaFilterPanelIcon,
  VaFilterScope,
  VaFilterTypeIcon,
} from '@/components/editor/va-filter-scope'
import {
  LfoWaveControl,
  PicturePickerControl,
  FaderParameterControl,
  PictureRadioControl,
  RotaryParameterControl,
  SwitchParameterControl,
  WaveShapeIcon,
} from '@/components/editor/parameter-controls'
import { PatchEditorHeader } from '@/components/editor/patch-editor-header'
import { UnsavedEditorDialog } from '@/components/editor/unsaved-editor-dialog'
import {
  RackPanelCollapseToggle,
  RackPanelCollapsibleBody,
  RackPanelTitle,
} from '@/components/ui/rack-panel'
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
  applyVirtualAnalogPreset,
  initializeVirtualAnalog,
  randomizeVirtualAnalog,
  virtualAnalogPresets,
} from '@/lib/virtual-analog-presets'
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

/** Draws an LFO wave of the oscillator waveform's shape at the size the picker gives it. */
const wavePicture = (wave: number) => (className: string) => (
  <WaveShapeIcon className={className} wave={wave} />
)

const filterTypePicture = (type: number) => (className: string) => (
  <VaFilterTypeIcon className={className} type={type} />
)

const panelClass = 'synthwave-panel @container flex min-w-0 flex-col'
/**
 * Side by side, the Filter and LFO panels share four rows of the page's grid: their titles, then
 * three rows of controls, so each row of one lines up with the row beside it. A size container
 * cannot pass its parent's rows on, so there they are not containers, and their columns follow
 * the viewport.
 */
/** The sunken well a row of faders stands in, as a mixer's strip. */
const faderWellClass =
  'crt-inset flex items-stretch justify-evenly gap-6 bg-[var(--crt-bg-well)] px-5 pt-3 pb-2'
const sharedRowsPanelClass =
  'synthwave-panel flex min-w-0 flex-col max-xl:@container xl:row-span-4 xl:grid xl:grid-rows-subgrid xl:gap-y-0'
const sharedRowsClass = 'xl:row-span-3 xl:grid-rows-subgrid'
/** Knobs three to a row, a shorter row centred under them, lined up by their faces whatever
    their labels' lengths. */
const knobRowClass =
  'flex flex-wrap items-end justify-center gap-x-2 gap-y-2.5 *:basis-[calc((100%-1rem)/3)]'

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
  const [isEffectsCollapsed, setIsEffectsCollapsed] = useState(false)
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
  const presetsMenuRef = useDismissableDetails()
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
    presetsMenuRef.current?.removeAttribute('open')
    saveMenuRef.current?.removeAttribute('open')
  }

  const replaceSound = (replace: (parameters: Uint8Array) => Uint8Array) => {
    presetsMenuRef.current?.removeAttribute('open')
    editor.replaceParameters(replace)
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
  // The Envelope's help covers its four settings, so only the oscillator's levels have their own.
  const fader = (id: VirtualAnalogRowId, label: string, help?: string, disabled = false) => (
    <FaderParameterControl
      disabled={disabled}
      helpText={help}
      label={label}
      max={virtualAnalogRow(id).max}
      onChange={(next) => editor.setRow(id, next)}
      onGestureEnd={editor.endGesture}
      onGestureStart={editor.beginGesture}
      value={value(id)}
    />
  )
  const rotary = (
    id: VirtualAnalogRowId,
    label: string,
    valueLabel?: (value: number) => string,
    help = t(`virtualAnalog.help.${id}`),
  ) => (
    <RotaryParameterControl
      helpText={help}
      label={label}
      valueLabel={valueLabel}
      max={virtualAnalogRow(id).max}
      onChange={(next) => editor.setRow(id, next)}
      onGestureEnd={editor.endGesture}
      onGestureStart={editor.beginGesture}
      value={value(id)}
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
        engine="virtual-analog"
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
        presets={{
          items: [
            {
              description: t('virtualAnalog.initPatchHelp'),
              icon: Eraser,
              id: 'init',
              name: t('virtualAnalog.initPatch'),
              onSelect: () => replaceSound(initializeVirtualAnalog),
            },
            {
              description: t('virtualAnalog.randomiseHelp'),
              icon: Dices,
              id: 'randomise',
              name: t('editor.randomise'),
              onSelect: () => replaceSound((present) => randomizeVirtualAnalog(present)),
            },
            ...virtualAnalogPresets.map(({ id }) => ({
              description: t(`virtualAnalog.presetOptions.${id}.description`),
              id,
              name: t(`virtualAnalog.presetOptions.${id}.name`),
              onSelect: () => replaceSound((present) => applyVirtualAnalogPreset(present, id)),
            })),
          ],
          label: t('virtualAnalog.presets'),
          menuRef: presetsMenuRef,
        }}
        saveMenuRef={saveMenuRef}
        syncState={syncState}
      />

      {/* Says why changes do not play on the FM1 as they are made; while they do, it is silent. */}
      <p className="text-sm leading-6 text-[var(--crt-ink-3)] empty:hidden" role="status">
        {liveStatus === 'live' ? null : t(`virtualAnalog.${liveStatus}`, { preset: presetNumber })}
      </p>

      <div className="relative min-w-0">
        <div
          className={cn('grid min-w-0 gap-2.5', isComparing && 'opacity-60')}
          inert={isComparing}
        >
          {/* Three columns from xl, as the voice editor's rack has them: the busy Oscillator and
              Filter take two, each beside the panel that works with it. */}
          <div className="grid min-w-0 gap-2.5 xl:grid-cols-3">
            <section
              aria-labelledby="va-oscillator-heading"
              className={cn(panelClass, 'xl:col-span-2')}
            >
              <RackPanelTitle
                icon={AudioWaveform}
                id="va-oscillator-heading"
                title={t('virtualAnalog.oscillator')}
              />
              {/* The waveform down the left, picked as the algorithm is, its settings beside it.
                  From xl the row is held tall enough for knobs, and the Envelope fills it. */}
              <div className="grid flex-1 grid-cols-[auto_minmax(0,1fr)] gap-3 p-[9px] xl:min-h-80">
                <div className="flex w-40 flex-col gap-2.5">
                  <PicturePickerControl
                    helpText={t('virtualAnalog.help.waveform')}
                    label={t('virtualAnalog.waveform')}
                    onChange={(next) => editor.chooseRow('waveform', next)}
                    // Sine, Saw, Triangle, and Square, drawn as the LFO's waves of the same shapes.
                    options={(
                      [
                        ['sine', 4],
                        ['saw', 2],
                        ['triangle', 0],
                        ['square', 3],
                      ] as const
                    ).map(([name, wave]) => ({
                      label: t(`virtualAnalog.waveforms.${name}`),
                      picture: wavePicture(wave),
                    }))}
                    value={value('waveform')}
                  />
                  {/* Mono sits under the waveform's square, level with Level and Velocity. */}
                  <SwitchParameterControl
                    helpText={t('virtualAnalog.help.mono')}
                    label={t('virtualAnalog.mono')}
                    onChange={(next) => editor.chooseRow('mono', next)}
                    value={value('mono')}
                  />
                </div>
                {/* The oscillator's character as knobs, and its levels as a Juno's faders in a
                    mixer of their own beside them. */}
                <div className="grid gap-3 @2xl:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="grid content-around gap-2.5">
                    <div className={knobRowClass}>
                      {rotary('super', t('virtualAnalog.super'))}
                      {rotary('detune', t('virtualAnalog.detune'))}
                    </div>
                    <div className={cn(knobRowClass, 'border-t border-[var(--crt-line-dk)] pt-2')}>
                      {rotary('drift', t('virtualAnalog.drift'))}
                      {rotary('pwm', t('virtualAnalog.pwm'))}
                      {rotary('velocityToLevel', t('virtualAnalog.velocityToLevel'))}
                    </div>
                  </div>
                  <div className={faderWellClass}>
                    {fader('sub', t('virtualAnalog.sub'), t('virtualAnalog.help.sub'))}
                    {fader('noise', t('virtualAnalog.noise'), t('virtualAnalog.help.noise'))}
                    {fader('level', t('virtualAnalog.level'), t('virtualAnalog.help.level'))}
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="va-envelope-heading" className={panelClass}>
              <RackPanelTitle
                icon={Activity}
                help={
                  <RackPanelHelp
                    label={t('virtualAnalog.envelope')}
                    text={t('virtualAnalog.help.envelope')}
                  />
                }
                id="va-envelope-heading"
                title={t('virtualAnalog.envelope')}
                titleSwitch={{
                  checked: envelopeOn,
                  onChange: (on) => editor.chooseRow('envelope', on ? 1 : 0),
                }}
              />
              <div className="flex flex-1 flex-col gap-2.5 p-[9px]">
                <AdsrScope
                  attack={value('attack')}
                  decay={value('decay')}
                  enabled={envelopeOn}
                  onChange={(setting, next) => editor.setRow(setting, next)}
                  onGestureEnd={editor.endGesture}
                  onGestureStart={editor.beginGesture}
                  release={value('release')}
                  sustain={value('sustain')}
                />
                {/* FM-1+VA plays these only while the Envelope is on, so they wait for its switch. */}
                <div className={faderWellClass}>
                  {(['attack', 'decay', 'sustain', 'release'] as const).map((id) => (
                    <Fragment key={id}>
                      {fader(id, t(`virtualAnalog.${id}`), undefined, !envelopeOn)}
                    </Fragment>
                  ))}
                </div>
              </div>
            </section>

            <section
              aria-labelledby="va-filter-heading"
              className={cn(sharedRowsPanelClass, 'xl:col-span-2')}
            >
              <RackPanelTitle
                icon={VaFilterPanelIcon}
                id="va-filter-heading"
                title={t('virtualAnalog.filter')}
              />
              {/* The response and the choices at the left, the knobs in three groups beside them:
                  where the filter sits, its own envelope, and what else moves it. */}
              <div
                className={cn(
                  'grid flex-1 gap-x-3 gap-y-2.5 p-[9px] xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]',
                  sharedRowsClass,
                )}
              >
                {/* The graph takes the column's spare height, so Filter Type ends level with the
                    knobs beside it. */}
                <div className="flex flex-col gap-4 xl:row-span-3">
                  <VaFilterScope
                    className="min-h-40 flex-1"
                    cutoff={value('cutoff')}
                    keyTracking={value('keyTracking')}
                    noteLabel={(octave) => t('virtualAnalog.keyTrackingNote', { octave })}
                    resonance={value('resonance')}
                    type={value('filterType')}
                  />
                  {/* The column has room for every type, so they show at once, as the
                      oscillator's dropdown shows its waveforms. */}
                  <PictureRadioControl
                    helpText={t('virtualAnalog.help.filterType')}
                    label={t('virtualAnalog.filterType')}
                    onChange={(next) => editor.chooseRow('filterType', next)}
                    options={(['lowPass12', 'lowPass24', 'bandPass', 'highPass'] as const).map(
                      (name, type) => ({
                        label: t(`virtualAnalog.filterTypes.${name}`),
                        picture: filterTypePicture(type),
                      }),
                    )}
                    value={value('filterType')}
                  />
                </div>
                <div className={cn('grid content-start gap-2.5', sharedRowsClass)}>
                  <div className={knobRowClass}>
                    {rotary('cutoff', t('virtualAnalog.cutoff'), cutoffLabel)}
                    {rotary('resonance', t('virtualAnalog.resonance'))}
                  </div>
                  <div className={cn(knobRowClass, 'border-t border-[var(--crt-line-dk)] pt-2')}>
                    {rotary('filterEnvelope', t('virtualAnalog.filterEnvelope'))}
                    {rotary('filterDecay', t('virtualAnalog.filterDecay'))}
                    {rotary('filterShape', t('virtualAnalog.filterShape'))}
                  </div>
                  <div className={cn(knobRowClass, 'border-t border-[var(--crt-line-dk)] pt-2')}>
                    {rotary('filterVelocity', t('virtualAnalog.filterVelocity'))}
                    {rotary('lfoToCutoff', t('virtualAnalog.lfoToCutoff'))}
                    {rotary('keyTracking', t('virtualAnalog.keyTracking'), (step) =>
                      format([0, 33, 67, 100][step] ?? 0, 0),
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="va-lfo-heading" className={sharedRowsPanelClass}>
              <RackPanelTitle icon={Waves} id="va-lfo-heading" title={t('virtualAnalog.lfo')} />
              <div className={cn('grid content-start gap-y-2.5 p-[9px]', sharedRowsClass)}>
                <div className="grid grid-cols-2 content-start gap-x-3 gap-y-2.5 xl:grid-cols-3 @sm:grid-cols-3">
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
                  {/* LFO Sync shares the wave's row at its far end, its name kept on one line. */}
                  <div className="col-[-2/-1] self-end justify-self-end">
                    <SwitchParameterControl
                      helpText={t('controlHelp.lfoSync')}
                      label={t('editor.lfoSync')}
                      onChange={(next) => editor.chooseRow('lfoSync', next)}
                      singleLine
                      value={value('lfoSync')}
                    />
                  </div>
                </div>
                {/* The LFO's amounts as knobs, as the voice editor's operators have them, in two
                    rows that line up with the filter's beside them. */}
                <div className={cn(knobRowClass, 'border-t border-[var(--crt-line-dk)] pt-2')}>
                  {rotary('lfoSpeed', t('editor.lfoSpeed'), undefined, t('controlHelp.lfoSpeed'))}
                  {rotary('lfoDelay', t('editor.lfoDelay'), undefined, t('controlHelp.lfoDelay'))}
                  {rotary(
                    'pitchModDepth',
                    t('editor.pitchModDepth'),
                    undefined,
                    t('controlHelp.pitchModDepth'),
                  )}
                </div>
                <div className={cn(knobRowClass, 'border-t border-[var(--crt-line-dk)] pt-2')}>
                  {rotary(
                    'ampModDepth',
                    t('editor.ampModDepth'),
                    undefined,
                    t('controlHelp.ampModDepth'),
                  )}
                  {rotary(
                    'pitchModSensitivity',
                    t('editor.pitchModSensitivity'),
                    undefined,
                    t('controlHelp.pitchModSensitivity'),
                  )}
                </div>
              </div>
            </section>
          </div>

          <section aria-labelledby="va-effects-heading" className="synthwave-panel min-w-0">
            <RackPanelTitle
              action={
                <RackPanelCollapseToggle
                  collapsed={isEffectsCollapsed}
                  controls="va-effects-unit"
                  onToggle={() => setIsEffectsCollapsed((collapsed) => !collapsed)}
                  panel={t('editor.effects')}
                />
              }
              icon={Sparkles}
              id="va-effects-heading"
              title={t('editor.effects')}
            />
            <RackPanelCollapsibleBody collapsed={isEffectsCollapsed} id="va-effects-unit">
              <EffectsUnit
                bitcrush={
                  offersBitcrush
                    ? {
                        onApplyPreset: editor.selectBitcrushPreset,
                        onChange: editor.setBitcrushSetting,
                        values: bitcrush,
                      }
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
            </RackPanelCollapsibleBody>
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
