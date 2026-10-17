import { Activity, Drum, Eraser, KeyboardMusic, Music, Sparkles, Waves } from 'lucide-react'
import {
  Fragment,
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
import { AdsrScope } from '@/components/editor/adsr-scope'
import { CompareOverlay } from '@/components/editor/compare-overlay'
import { RackPanelHelp } from '@/components/editor/editor-workspace'
import { EffectsUnit } from '@/components/editor/effects-unit'
import { KnobAssignMenu } from '@/components/editor/knob-assign-menu'
import { KnobChoicesPanel } from '@/components/editor/knob-choices-panel'
import { LfoScope } from '@/components/editor/lfo-scope'
import {
  FaderParameterControl,
  LfoWaveControl,
  ParameterControl,
  RadioParameterControl,
  RotaryParameterControl,
  SwitchParameterControl,
} from '@/components/editor/parameter-controls'
import { PatchEditorHeader } from '@/components/editor/patch-editor-header'
import { UnsavedEditorDialog } from '@/components/editor/unsaved-editor-dialog'
import { BevelRadio } from '@/components/ui/bevel-radio'
import { InfoNotice } from '@/components/ui/info-notice'
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
import { initializeEightBit } from '@/lib/eight-bit-presets'
import { resolveFirmwareProfile } from '@/lib/firmware-profile'
import { getFm1EffectParameters } from '@/lib/fm1-effects'
import {
  FM1_EDITOR_PARAMETER_COUNT,
  FM1_VA_BITCRUSH_START,
  FM1_VA_DISTORTION_TYPE_INDEX,
  FM1_VA_EFFECT_ORDER_START,
  FM1_VA_KNOB_CHOICES_START,
  FM1_VA_STOCK_EFFECT_ORDER,
  FM1_VOICE_NAME_LENGTH,
  FM1_VOICE_NAME_START,
} from '@/lib/fm1-parameters'
import {
  eightBitFromEditorParameters,
  eightBitKeyChoice,
  eightBitRow,
  eightBitRows,
  eightBitShownKey,
  makeEightBitEditorParameters,
  type EightBitRowId,
} from '@/lib/fm1-va-eight-bit-editor'
import {
  eightBitAccidentalsNames,
  eightBitArpeggioNames,
  eightBitArpSpeedNames,
  eightBitArpSyncNames,
  eightBitChokeNames,
  eightBitChordNames,
  eightBitDrumKeys,
  eightBitDutySequenceNames,
  eightBitKeyNames,
  eightBitLeadFollowsNames,
  eightBitNoteEngineNames,
  eightBitPatternNames,
  eightBitPulseWaveCount,
  eightBitScaleNames,
  eightBitToneNames,
  eightBitTuningNames,
  eightBitUserArpeggioEnd,
  eightBitUserPattern,
  eightBitVoicingNames,
  eightBitWaveNames,
} from '@/lib/fm1-va-eight-bit-names'
import { fm1VaRecordEngine } from '@/lib/fm1-va-engine'
import {
  displayedFm1VaParameters,
  Fm1VaEditorSession,
  hasUnsavedFm1VaEdits,
} from '@/lib/fm1-va-editor-session'
import { eightBitKnobChoice, fm1VaRecordWithKnobChoices } from '@/lib/fm1-va-knob-choices'
import { fm1VaPresetNumber } from '@/lib/fm1-va-preset-read'
import {
  fm1VaRecordWithBitcrush,
  fm1VaRecordWithDistortionType,
  fm1VaRecordWithEffectOrder,
} from '@/lib/fm1-va-record-effects'
import { editorShortcuts } from '@/lib/keyboard-shortcuts'
import { cn } from '@/lib/utils'

type EightBitEditorPageProps = {
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

/** Whether, and why not, the editor's Envelope, LFO, and effects play on the FM1 as they change. */
type LiveStatus = 'checking' | 'live' | 'noFirmware' | 'noProgram' | 'otherEngine' | 'readFailed'

type Part = 'bass' | 'lead'

const panelClass = 'synthwave-panel @container flex min-w-0 flex-col'
/** The sunken well a row of faders stands in, as a mixer's strip. */
const faderWellClass =
  'crt-inset flex items-stretch justify-evenly gap-6 bg-[var(--crt-bg-well)] px-5 pt-3 pb-2'
/** Knobs three to a row, a shorter row centred under them, lined up by their faces. */
const knobRowClass =
  'flex flex-wrap items-end justify-center gap-x-2 gap-y-2.5 *:basis-[calc((100%-1rem)/3)]'
const dividedClass = 'border-t border-[var(--crt-line-dk)] pt-2'
/** A group of settings the FM1 dims while something else is set, kept but greyed out. */
const dimmableClass = 'm-0 grid min-w-0 gap-2.5 border-0 p-0 disabled:opacity-50'

const signed = (value: number) => (value > 0 ? `+${value}` : String(value))
/** A User Arpeggio step past +18 reads End, which the FM1 stores as 31, shown as 19. */
const userArpeggioEndShown = 31 - 12

/**
 * The editor for an 8-Bit preset from FM-1+VA: its Key, its twelve drums, its bass and lead, the
 * Envelope and LFO, and its effects, under the names the FM1's own screens give them. It edits the
 * library's copy, leaving every bit it does not set exactly as read. While the FM1 plays the
 * preset in its slot (banks A–D, read first to check it is an 8-Bit preset), the Envelope, LFO,
 * and effects are sent as they change, since no other controller reaches an 8-Bit preset; the rest
 * is heard once the patch is written to the FM1.
 */
export function EightBitEditorPage({
  browserBackRef,
  effects,
  midi,
  onBack,
  onSave,
  patch,
  record,
  voice,
}: EightBitEditorPageProps) {
  const { i18n, t } = useTranslation()
  const formatStep = (step: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(step)
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
      new Fm1VaEditorSession<EightBitRowId>(
        makeEightBitEditorParameters(voice, record, effects),
        () => sendsRef.current,
        eightBitRows,
      ),
  )
  const state = useSyncExternalStore(editor.subscribe, editor.getState)
  const [isEffectsCollapsed, setIsEffectsCollapsed] = useState(false)
  const [drum, setDrum] = useState(0)
  const { history, isComparing, syncState } = state
  const parameters = displayedFm1VaParameters(state)
  const isDirty = hasUnsavedFm1VaEdits(state)
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
  const drumGroupName = useId()
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
  // sure it is an 8-Bit one, since the Envelope and LFO controllers would change another preset.
  // Changing the ports reads it again.
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
        result = fm1VaRecordEngine(preset.record) === 'eight-bit' ? 'live' : 'otherEngine'
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
    parameters.subarray(FM1_VA_EFFECT_ORDER_START, FM1_VA_KNOB_CHOICES_START),
  )
  const firmwareCapabilities = resolveFirmwareProfile(midi.firmware).capabilities
  const offersBitcrush = firmwareCapabilities.bitcrush
  const offersKnobChoices = firmwareCapabilities.knobChoices
  const knobChoices = Array.from(
    parameters.subarray(FM1_VA_KNOB_CHOICES_START, FM1_EDITOR_PARAMETER_COUNT),
  )
  const writesDistortionType = firmwareCapabilities.presetWrite
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
      const stored = eightBitFromEditorParameters(voice, record, saved)
      onSave(
        stored.voice,
        getFm1EffectParameters(saved),
        fm1VaRecordWithKnobChoices(
          fm1VaRecordWithEffectOrder(
            fm1VaRecordWithBitcrush(
              fm1VaRecordWithDistortionType(stored.record, saved[FM1_VA_DISTORTION_TYPE_INDEX]),
              Array.from(saved.subarray(FM1_VA_BITCRUSH_START, FM1_VA_EFFECT_ORDER_START)),
            ),
            Array.from(saved.subarray(FM1_VA_EFFECT_ORDER_START, FM1_VA_KNOB_CHOICES_START)),
          ),
          Array.from(saved.subarray(FM1_VA_KNOB_CHOICES_START, FM1_EDITOR_PARAMETER_COUNT)),
          'eight-bit',
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

  const value = (id: EightBitRowId) => parameters[eightBitRow(id).index]
  const key = eightBitShownKey(value('key'))
  const keyed = key !== 0

  /** Where FM-1+VA plays knob choices, a row a knob can turn offers putting it on one. */
  const knobMenu = (id: EightBitRowId, label: string) => {
    const choice = eightBitKnobChoice(id, keyed)
    return offersKnobChoices && choice !== undefined ? (
      <KnobAssignMenu
        choice={choice}
        choices={knobChoices}
        engine="eight-bit"
        onAssign={editor.setKnobChoice}
        parameter={label}
      />
    ) : undefined
  }
  /**
   * A control's name for assistive technology, naming its part where the caption alone would
   * repeat another panel's, such as the bass's and the lead's Decay.
   */
  const scoped = (label: string, scope?: string) =>
    scope ? t('eightBit.partSetting', { part: scope, setting: label }) : undefined
  type ControlOptions = {
    disabled?: boolean
    help?: string
    /** The control's name where its caption is shorter, such as a User Arpeggio step's number. */
    name?: string
    /** The part or drum the control belongs to, which its accessible name names. */
    scope?: string
    valueLabel?: (value: number) => string
  }
  const rotary = (
    id: EightBitRowId,
    label: string,
    { disabled, help, name, scope, valueLabel }: ControlOptions = {},
  ) => {
    const row = eightBitRow(id)
    // A field the FM1 shows with a sign, such as Octave, is turned and typed as it is shown, and
    // stored with its offset back on.
    const offset = row.shownOffset ?? 0
    return (
      <RotaryParameterControl
        accessibleLabel={scoped(name ?? label, scope) ?? name}
        disabled={disabled}
        helpText={help}
        label={label}
        labelAction={knobMenu(id, name ?? label)}
        max={row.max - offset}
        min={(id.endsWith('Sweep') ? 1 : 0) - offset}
        onChange={(next) => editor.setRow(id, next + offset)}
        onGestureEnd={editor.endGesture}
        onGestureStart={editor.beginGesture}
        value={value(id) - offset}
        valueLabel={valueLabel ?? (offset ? signed : undefined)}
      />
    )
  }
  const list = (
    id: EightBitRowId,
    label: string,
    options: readonly string[],
    { disabled, help, scope }: ControlOptions = {},
  ) => (
    <ParameterControl
      accessibleLabel={scoped(label, scope)}
      disabled={disabled}
      helpText={help}
      label={label}
      max={options.length - 1}
      onChange={(next) => editor.chooseRow(id, next)}
      options={[...options]}
      value={value(id)}
    />
  )
  const choice = (
    id: EightBitRowId,
    label: string,
    options: readonly string[],
    { help, scope }: ControlOptions = {},
  ) => (
    <RadioParameterControl
      accessibleLabel={scoped(label, scope)}
      helpText={help}
      label={label}
      name={`${drumGroupName}-${id}`}
      onChange={(next) => editor.chooseRow(id, next)}
      options={[...options]}
      value={value(id)}
    />
  )
  const fader = (id: EightBitRowId, label: string, { disabled, scope }: ControlOptions = {}) => (
    <FaderParameterControl
      accessibleLabel={scoped(label, scope)}
      disabled={disabled}
      label={label}
      max={eightBitRow(id).max}
      onChange={(next) => editor.setRow(id, next)}
      onGestureEnd={editor.endGesture}
      onGestureStart={editor.beginGesture}
      value={value(id)}
    />
  )

  const partPanel = (part: Part) => {
    const row = (field: string) => `${part}${field}` as EightBitRowId
    const title = t(`eightBit.${part}`)
    const wave = value(row('Wave'))
    const autoChord = value(row('NoteEngine')) === 1
    const userPattern = value(row('Pattern')) === eightBitUserPattern
    const headingId = `${drumGroupName}-${part}-heading`
    const scope = (options: ControlOptions = {}) => ({ ...options, scope: title })
    const partRotary = (id: EightBitRowId, label: string, options?: ControlOptions) =>
      rotary(id, label, scope(options))
    const partList = (
      id: EightBitRowId,
      label: string,
      options: readonly string[],
      controlOptions?: ControlOptions,
    ) => list(id, label, options, scope(controlOptions))
    const partChoice = (
      id: EightBitRowId,
      label: string,
      options: readonly string[],
      controlOptions?: ControlOptions,
    ) => choice(id, label, options, scope(controlOptions))
    const partFader = (id: EightBitRowId, label: string) => fader(id, label, scope())
    return (
      <section aria-labelledby={headingId} className={panelClass}>
        <RackPanelTitle
          icon={part === 'bass' ? Music : KeyboardMusic}
          id={headingId}
          title={title}
        />
        <div className="flex flex-1 flex-col gap-2.5 p-[9px]">
          <div className="grid grid-cols-2 gap-2.5">
            {partList(row('Wave'), t('eightBit.wave'), eightBitWaveNames)}
            {partList(row('DutySequence'), t('eightBit.dutySequence'), eightBitDutySequenceNames, {
              help: t('eightBit.help.dutySequence'),
            })}
          </div>
          {wave >= eightBitPulseWaveCount && value(row('DutySequence')) !== 0 ? (
            <p className="text-xs text-[var(--crt-ink-3)]">{t('eightBit.dutySequenceUnheard')}</p>
          ) : null}
          <div className={cn('grid grid-cols-2 gap-2.5', dividedClass)}>
            {keyed ? (
              <>
                {partList(row('Chord'), t('eightBit.chord'), eightBitChordNames, {
                  disabled: userPattern,
                  help: t('eightBit.help.chord'),
                })}
                {partList(row('Pattern'), t('eightBit.pattern'), eightBitPatternNames, {
                  disabled: autoChord,
                  help: t('eightBit.help.pattern'),
                })}
              </>
            ) : (
              partList(row('Arpeggio'), t('eightBit.arpeggio'), eightBitArpeggioNames, {
                help: t('eightBit.help.arpeggio'),
              })
            )}
            {partList(row('ArpSpeed'), t('eightBit.arpSpeed'), eightBitArpSpeedNames, {
              disabled: autoChord,
            })}
          </div>
          {partChoice(row('NoteEngine'), t('eightBit.noteEngine'), eightBitNoteEngineNames, {
            help: t('eightBit.help.noteEngine'),
          })}
          {/* On Auto-Chord with a Key set, the FM1 dims the User Arpeggio and keeps it. */}
          <fieldset className={cn(dimmableClass, dividedClass)} disabled={autoChord && keyed}>
            <legend className="sr-only">{t('eightBit.userArpeggio')}</legend>
            <div className="flex items-center gap-1 text-xs tracking-[0.1em] text-[var(--crt-ink-2)] uppercase">
              <span aria-hidden="true">{t('eightBit.userArpeggio')}</span>
              <RackPanelHelp
                label={t('eightBit.userArpeggio')}
                text={t('eightBit.help.userArpeggio')}
              />
            </div>
            <div className="grid grid-cols-4 gap-x-2 gap-y-2.5 @md:grid-cols-8">
              {Array.from({ length: 8 }, (_, step) => (
                <Fragment key={step}>
                  {partRotary(
                    row(`UserArpeggio${step + 1}`),
                    // Captioned by number alone under the User Arpeggio heading.
                    formatStep(step + 1),
                    {
                      disabled: autoChord && keyed,
                      name: t('eightBit.step', { step: step + 1 }),
                      valueLabel: (shown) =>
                        shown === userArpeggioEndShown ? eightBitUserArpeggioEnd : signed(shown),
                    },
                  )}
                </Fragment>
              ))}
            </div>
          </fieldset>
          <div className={dividedClass}>
            <AdsrScope
              attack={value(row('Attack'))}
              decay={value(row('Decay'))}
              enabled
              onChange={(setting, next) =>
                editor.setRow(row(setting.charAt(0).toUpperCase() + setting.slice(1)), next)
              }
              onGestureEnd={editor.endGesture}
              onGestureStart={editor.beginGesture}
              release={value(row('Release'))}
              sustain={value(row('Sustain'))}
            />
          </div>
          <div className={faderWellClass}>
            {(['Attack', 'Decay', 'Sustain', 'Release'] as const).map((setting) => (
              <Fragment key={setting}>
                {partFader(row(setting), t(`virtualAnalog.${setting.toLowerCase()}`))}
              </Fragment>
            ))}
          </div>
          <div className={knobRowClass}>
            {partRotary(row('Vibrato'), t('eightBit.vibrato'))}
            {partRotary(row('Glide'), t('eightBit.glide'), { help: t('eightBit.help.glide') })}
            {partRotary(row('Sweep'), t('eightBit.sweep'), { help: t('eightBit.help.sweep') })}
          </div>
          <div className={cn(knobRowClass, dividedClass)}>
            {partRotary(row('Octave'), t('eightBit.octave'))}
            {partRotary(row('Level'), t('eightBit.level'))}
            <div className="self-center">
              <SwitchParameterControl
                label={t('eightBit.mono')}
                onChange={(next) => editor.chooseRow(row('Mono'), next)}
                value={value(row('Mono'))}
              />
            </div>
          </div>
        </div>
      </section>
    )
  }

  const drumRow = (field: string) => `drum${drum}${field}` as EightBitRowId
  const drumTitle = t('eightBit.drumHeading', { drum: eightBitDrumKeys[drum] })
  const drumScope = (options: ControlOptions = {}) => ({ ...options, scope: drumTitle })
  const envelopeOn = value('envelope') === 1
  const presetNumber = program === undefined ? '' : fm1VaPresetNumber(program)

  return (
    <section className="patch-editor-page mx-auto grid max-w-[90rem] min-w-0 gap-2.5 px-3 pt-2.5 pb-4 sm:px-5 lg:px-8">
      <PatchEditorHeader
        canRedo={history.future.length > 0}
        canSync={liveStatus === 'live'}
        canUndo={history.past.length > 0}
        engine="eight-bit"
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
              description: t('eightBit.initPatchHelp'),
              icon: Eraser,
              id: 'init',
              name: t('eightBit.initPatch'),
              onSelect: () => {
                presetsMenuRef.current?.removeAttribute('open')
                editor.replaceParameters(initializeEightBit)
              },
            },
          ],
          label: t('virtualAnalog.presets'),
          menuRef: presetsMenuRef,
        }}
        saveMenuRef={saveMenuRef}
        syncState={syncState}
      />

      {/* Says what plays on the FM1 as it changes, and why nothing does when nothing can. */}
      <div role="status">
        <InfoNotice>
          <p>
            {t(
              liveStatus === 'live' || liveStatus === 'noFirmware'
                ? `eightBit.${liveStatus}`
                : `virtualAnalog.${liveStatus}`,
              { preset: presetNumber },
            )}
          </p>
        </InfoNotice>
      </div>

      <div className="relative min-w-0">
        <div
          className={cn('grid min-w-0 gap-2.5', isComparing && 'opacity-60')}
          inert={isComparing}
        >
          {offersKnobChoices ? (
            <KnobChoicesPanel
              choices={knobChoices}
              engine="eight-bit"
              onChange={editor.setKnobChoice}
            />
          ) : null}

          <div className="grid min-w-0 gap-2.5 xl:grid-cols-3">
            <section aria-labelledby={`${drumGroupName}-key-heading`} className={panelClass}>
              <RackPanelTitle
                help={<RackPanelHelp label={t('eightBit.key')} text={t('eightBit.help.key')} />}
                icon={KeyboardMusic}
                id={`${drumGroupName}-key-heading`}
                title={t('eightBit.key')}
              />
              <div className="flex flex-1 flex-col gap-2.5 p-[9px]">
                <div className="grid grid-cols-2 gap-2.5">
                  <ParameterControl
                    label={t('eightBit.key')}
                    max={eightBitKeyNames.length - 1}
                    onChange={(next) => editor.chooseRows(eightBitKeyChoice(parameters, next))}
                    options={[...eightBitKeyNames]}
                    value={key}
                  />
                  {list('scale', t('eightBit.scale'), eightBitScaleNames, { disabled: !keyed })}
                </div>
                {/* The FM1 dims these while the preset plays no Key, and keeps them. */}
                <fieldset className={dimmableClass} disabled={!keyed}>
                  <legend className="sr-only">{t('eightBit.keySettings')}</legend>
                  {choice('accidentals', t('eightBit.accidentals'), eightBitAccidentalsNames, {
                    help: t('eightBit.help.accidentals'),
                  })}
                  {choice('voicing', t('eightBit.voicing'), eightBitVoicingNames, {
                    help: t('eightBit.help.voicing'),
                  })}
                  {choice('leadFollows', t('eightBit.leadFollows'), eightBitLeadFollowsNames, {
                    help: t('eightBit.help.leadFollows'),
                  })}
                </fieldset>
                {choice('arpSync', t('eightBit.arpSync'), eightBitArpSyncNames, {
                  help: t('eightBit.help.arpSync'),
                })}
                <div className={cn('grid gap-2.5', dividedClass)}>
                  {choice('tone', t('eightBit.tone'), eightBitToneNames, {
                    help: t('eightBit.help.tone'),
                  })}
                  {choice('tuning', t('eightBit.tuning'), eightBitTuningNames, {
                    help: t('eightBit.help.tuning'),
                  })}
                </div>
              </div>
            </section>

            <section
              aria-labelledby={`${drumGroupName}-drums-heading`}
              className={cn(panelClass, 'xl:col-span-2')}
            >
              <RackPanelTitle
                help={<RackPanelHelp label={t('eightBit.drums')} text={t('eightBit.help.drums')} />}
                icon={Drum}
                id={`${drumGroupName}-drums-heading`}
                title={t('eightBit.drums')}
              />
              <div className="flex flex-1 flex-col gap-2.5 p-[9px]">
                <div className={knobRowClass}>
                  {rotary('drumsLevel', t('eightBit.drumsLevel'))}
                  {rotary('drumDecay', t('eightBit.drumDecay'), {
                    help: t('eightBit.help.drumDecay'),
                  })}
                </div>
                {/* The twelve drums as pads, each showing its wave; the chosen one's settings
                    follow. */}
                <div
                  aria-label={t('eightBit.drum')}
                  className={cn('grid grid-cols-4 gap-1 @md:grid-cols-6', dividedClass)}
                  role="radiogroup"
                >
                  {eightBitDrumKeys.map((drumKey, index) => (
                    <BevelRadio
                      checked={drum === index}
                      className="flex flex-col items-start gap-0.5 px-2 py-1.5"
                      key={drumKey}
                      name={drumGroupName}
                      onChange={() => setDrum(index)}
                      value={index}
                    >
                      <span className="font-vt323 text-[18px] leading-none text-[var(--crt-led)]">
                        {drumKey}
                      </span>
                      <span className="truncate text-[11px] text-[var(--crt-ink-2)]">
                        {eightBitWaveNames[
                          parameters[eightBitRow(`drum${index as 0}Wave`).index]
                        ] ?? ''}
                      </span>
                    </BevelRadio>
                  ))}
                </div>
                <div className={cn('grid gap-2.5', dividedClass)}>
                  <h3 className="font-vt323 text-[18px] leading-none text-[var(--crt-led)]">
                    {drumTitle}
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {list(drumRow('Wave'), t('eightBit.wave'), eightBitWaveNames, drumScope())}
                    {choice(
                      drumRow('Choke'),
                      t('eightBit.choke'),
                      eightBitChokeNames,
                      drumScope({ help: t('eightBit.help.choke') }),
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 @md:grid-cols-5">
                    {rotary(drumRow('Pitch'), t('eightBit.pitch'), drumScope())}
                    {rotary(
                      drumRow('Sweep'),
                      t('eightBit.sweep'),
                      drumScope({ help: t('eightBit.help.sweep') }),
                    )}
                    {rotary(drumRow('Decay'), t('eightBit.decay'), drumScope())}
                    {rotary(drumRow('Level'), t('eightBit.level'), drumScope())}
                    {rotary(
                      drumRow('Snap'),
                      t('eightBit.snap'),
                      drumScope({ help: t('eightBit.help.snap') }),
                    )}
                  </div>
                </div>
              </div>
            </section>

            {partPanel('bass')}
            {partPanel('lead')}

            <div className="grid min-w-0 content-start gap-2.5">
              <section aria-labelledby={`${drumGroupName}-envelope-heading`} className={panelClass}>
                <RackPanelTitle
                  help={
                    <RackPanelHelp
                      label={t('virtualAnalog.envelope')}
                      text={t('virtualAnalog.help.envelope')}
                    />
                  }
                  icon={Activity}
                  id={`${drumGroupName}-envelope-heading`}
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
                        {fader(id, t(`virtualAnalog.${id}`), {
                          disabled: !envelopeOn,
                          scope: t('virtualAnalog.envelope'),
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </section>

              <section aria-labelledby={`${drumGroupName}-lfo-heading`} className={panelClass}>
                <RackPanelTitle
                  icon={Waves}
                  id={`${drumGroupName}-lfo-heading`}
                  title={t('virtualAnalog.lfo')}
                />
                <div className="grid content-start gap-y-2.5 p-[9px]">
                  <div className="grid grid-cols-2 content-start gap-x-3 gap-y-2.5">
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
                    <div className="self-end justify-self-end">
                      <SwitchParameterControl
                        helpText={t('controlHelp.lfoSync')}
                        label={t('editor.lfoSync')}
                        onChange={(next) => editor.chooseRow('lfoSync', next)}
                        singleLine
                        value={value('lfoSync')}
                      />
                    </div>
                  </div>
                  <div className={cn(knobRowClass, dividedClass)}>
                    {rotary('lfoSpeed', t('editor.lfoSpeed'), { help: t('controlHelp.lfoSpeed') })}
                    {rotary('lfoDelay', t('editor.lfoDelay'), { help: t('controlHelp.lfoDelay') })}
                    {rotary('pitchModDepth', t('editor.pitchModDepth'), {
                      help: t('controlHelp.pitchModDepth'),
                    })}
                  </div>
                  <div className={cn(knobRowClass, dividedClass)}>
                    {rotary('ampModDepth', t('editor.ampModDepth'), {
                      help: t('controlHelp.ampModDepth'),
                    })}
                    {rotary('pitchModSensitivity', t('editor.pitchModSensitivity'), {
                      help: t('controlHelp.pitchModSensitivity'),
                    })}
                  </div>
                </div>
              </section>
            </div>
          </div>

          <section
            aria-labelledby={`${drumGroupName}-effects-heading`}
            className="synthwave-panel min-w-0"
          >
            <RackPanelTitle
              action={
                <RackPanelCollapseToggle
                  collapsed={isEffectsCollapsed}
                  controls={`${drumGroupName}-effects-unit`}
                  onToggle={() => setIsEffectsCollapsed((collapsed) => !collapsed)}
                  panel={t('editor.effects')}
                />
              }
              icon={Sparkles}
              id={`${drumGroupName}-effects-heading`}
              title={t('editor.effects')}
            />
            <RackPanelCollapsibleBody
              collapsed={isEffectsCollapsed}
              id={`${drumGroupName}-effects-unit`}
            >
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
