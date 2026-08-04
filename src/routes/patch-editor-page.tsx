import {
  AudioWaveform,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Pencil,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Undo2,
  WandSparkles,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  AlgorithmPanel,
  OperatorStrip,
} from '@/components/editor/editor-workspace'
import { EffectsUnit } from '@/components/editor/effects-unit'
import { EnvelopeEditor } from '@/components/editor/envelope-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpPopover } from '@/components/ui/help-popover'
import { controlHelp } from '@/data/control-help'
import { type Patch } from '@/data/patches'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { type MidiController } from '@/hooks/use-midi'
import {
  makeDx7VoiceNameEdits,
  packDx7Voice,
  unpackDx7Voice,
  type Dx7Voice,
} from '@/lib/dx7'
import { operatorColors } from '@/lib/editor-visuals'
import {
  getFm1EffectParameters,
  getFm1VoiceParameters,
  makeFm1EditorParameters,
} from '@/lib/fm1-effects'
import {
  editParameters,
  makeEditorHistory,
  redoParameters,
  undoParameters,
  type EditorHistory,
  type ParameterEdit,
} from '@/lib/patch-editor'
import {
  applySoundPreset,
  soundPresets,
  type SoundPresetId,
} from '@/lib/sound-presets'
import { cn } from '@/lib/utils'

type PatchEditorPageProps = {
  effects: Uint8Array
  midi: MidiController
  onBack: () => void
  onSave: (voice: Dx7Voice, effects: Uint8Array) => void
  patch: Patch
  voice: Dx7Voice
}

type ParameterControlProps = {
  helpText?: string
  label: string
  max: number
  min?: number
  onChange: (value: number) => void
  options?: string[]
  value: number
}

type SwitchParameterControlProps = {
  helpText?: string
  label: string
  onChange: (value: number) => void
  value: number
}

type SliderParameterControlProps = {
  helpText?: string
  label: string
  max: number
  min?: number
  onChange: (value: number) => void
  onGestureEnd: () => void
  onGestureStart: () => void
  value: number
  valueLabel?: (value: number) => string
}

function SliderParameterControl({
  helpText,
  label,
  max,
  min = 0,
  onChange,
  onGestureEnd,
  onGestureStart,
  value,
  valueLabel = String,
}: SliderParameterControlProps) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-semibold text-muted-foreground">
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate" title={label}>{label}</span>
          {helpText ? <HelpPopover label={label} text={helpText} /> : null}
        </span>
        <output className="rounded border border-border/70 bg-background/70 px-1.5 py-0.5 font-mono text-xs text-foreground">
          {valueLabel(value)}
        </output>
      </span>
      <input
        aria-label={label}
        className="h-2 w-full cursor-pointer accent-[var(--operator-color,var(--color-primary))]"
        max={max}
        min={min}
        onBlur={onGestureEnd}
        onChange={(event) => onChange(Number(event.target.value))}
        onKeyDown={(event) => {
          if (['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp'].includes(event.key)) {
            onGestureStart()
          }
        }}
        onKeyUp={onGestureEnd}
        onPointerCancel={onGestureEnd}
        onPointerDown={onGestureStart}
        onPointerUp={onGestureEnd}
        step={1}
        type="range"
        value={value}
      />
    </label>
  )
}

function CollapseButton({
  controls,
  expanded,
  label,
  onClick,
}: {
  controls: string
  expanded: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button
      aria-controls={controls}
      aria-expanded={expanded}
      aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label}`}
      className="size-8 shrink-0 text-muted-foreground"
      onClick={onClick}
      size="icon"
      title={`${expanded ? 'Collapse' : 'Expand'} ${label}`}
      type="button"
      variant="ghost"
    >
      {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
    </Button>
  )
}

function SwitchParameterControl({
  helpText,
  label,
  onChange,
  value,
}: SwitchParameterControlProps) {
  const checked = value > 0

  return (
    <label className="grid min-w-0 cursor-pointer gap-1 text-xs font-semibold text-muted-foreground">
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate" title={label}>{label}</span>
        {helpText ? <HelpPopover label={label} text={helpText} /> : null}
      </span>
      <span className="flex h-9 items-center gap-2">
        <input
          aria-label={label}
          checked={checked}
          className="peer sr-only"
          onChange={(event) => onChange(event.target.checked ? 1 : 0)}
          role="switch"
          type="checkbox"
        />
        <span
          aria-hidden="true"
          className="relative h-6 w-11 shrink-0 rounded-full border border-border bg-muted transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-[1.125rem] after:rounded-full after:bg-background after:shadow-sm after:transition-transform peer-checked:border-primary peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
        />
        <span className="text-sm font-bold text-foreground">{checked ? 'On' : 'Off'}</span>
      </span>
    </label>
  )
}

function RadioParameterControl({
  helpText,
  label,
  name,
  onChange,
  options,
  value,
}: {
  helpText?: string
  label: string
  name: string
  onChange: (value: number) => void
  options: string[]
  value: number
}) {
  return (
    <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted-foreground">
      <span className="flex items-center gap-1">
        {label}
        {helpText ? <HelpPopover label={label} text={helpText} /> : null}
      </span>
      <div aria-label={label} className="grid grid-cols-2 gap-1" role="radiogroup">
        {options.map((option, index) => (
          <label
            className={cn(
              'flex h-9 cursor-pointer items-center justify-center rounded-md border px-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring',
              value === index
                ? 'border-[var(--operator-color)] bg-[color-mix(in_srgb,var(--operator-color)_14%,transparent)] font-bold text-foreground'
                : 'border-border bg-background/70 text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
            key={option}
          >
            <input
              checked={value === index}
              className="sr-only"
              name={name}
              onChange={() => onChange(index)}
              type="radio"
              value={index}
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  )
}

function ParameterControl({
  helpText,
  label,
  max,
  min = 0,
  onChange,
  options,
  value,
}: ParameterControlProps) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-semibold text-muted-foreground">
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate" title={label}>{label}</span>
        {helpText ? <HelpPopover label={label} text={helpText} /> : null}
      </span>
      {options ? (
        <select
          className="h-9 min-w-0 rounded-md border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => onChange(Number(event.target.value))}
          value={value}
        >
          {options.map((option, index) => (
            <option key={option} value={index}>{option}</option>
          ))}
        </select>
      ) : (
        <input
          className="h-9 min-w-0 rounded-md border bg-background px-2 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          max={max}
          min={min}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) onChange(next)
          }}
          type="number"
          value={value}
        />
      )}
    </label>
  )
}

function WaveShapeIcon({ wave }: { wave: number }) {
  const paths = [
    'M1 12 L8.5 3 L16 12 L23.5 3 L31 12',
    'M1 3 L16 13 L16 3 L31 13',
    'M1 13 L16 3 L16 13 L31 3',
    'M1 12 L1 4 L16 4 L16 12 L31 12 L31 4',
    'M1 8 C3.5 1 8.5 1 11 8 S18.5 15 21 8 S28.5 1 31 8',
    'M1 10 L6 10 L6 4 L13 4 L13 12 L20 12 L20 7 L26 7 L26 3 L31 3',
  ]

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-7 shrink-0"
      fill="none"
      viewBox="0 0 32 16"
    >
      <path
        d={paths[wave] ?? paths[0]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  )
}

function LfoWaveControl({
  onChange,
  value,
}: {
  onChange: (value: number) => void
  value: number
}) {
  const dropdownRef = useDismissableDetails()
  const selectedWave = lfoWaves[value] ?? lfoWaves[0]

  const selectWave = (wave: number) => {
    onChange(wave)
    dropdownRef.current?.removeAttribute('open')
  }

  return (
    <div className="grid min-w-0 gap-1 text-xs font-semibold text-muted-foreground">
      <span className="flex items-center gap-1">
        LFO wave
        <HelpPopover label="LFO wave" text={controlHelp.lfoWave} />
      </span>
      <details className="group relative min-w-0" ref={dropdownRef}>
        <summary
          aria-label={`LFO wave: ${selectedWave}. Choose waveform`}
          className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md border bg-background px-2 text-sm text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
        >
          <WaveShapeIcon wave={value} />
          <span className="min-w-0 flex-1 truncate">{selectedWave}</span>
          <ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div
          aria-label="LFO waveform"
          className="absolute left-0 top-[calc(100%+0.25rem)] z-30 grid w-full min-w-48 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
          role="radiogroup"
        >
          {lfoWaves.map((wave, index) => (
            <button
              aria-checked={value === index}
              className={cn(
                'flex h-9 w-full items-center gap-2 rounded px-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                value === index && 'bg-accent text-accent-foreground',
              )}
              key={wave}
              onClick={() => selectWave(index)}
              role="radio"
              type="button"
            >
              <WaveShapeIcon wave={index} />
              <span className="flex-1">{wave}</span>
              {value === index && <Check className="size-4 shrink-0" />}
            </button>
          ))}
        </div>
      </details>
    </div>
  )
}

const curves = ['− Linear', '− Exponential', '+ Exponential', '+ Linear']
const oscillatorModes = ['Ratio', 'Fixed']
const lfoWaves = ['Triangle', 'Saw down', 'Saw up', 'Square', 'Sine', 'Sample & hold']

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
  const initialParameters = useMemo(
    () => makeFm1EditorParameters(unpackDx7Voice(voice), effects),
    [patch.id],
  )
  const [history, setHistory] = useState(() => makeEditorHistory(initialParameters))
  const [savedParameters, setSavedParameters] = useState(() => initialParameters.slice())
  const [selectedOperator, setSelectedOperator] = useState(1)
  const [leftPanelTab, setLeftPanelTab] = useState<'effects' | 'global'>('global')
  const [isPitchEnvelopeOpen, setIsPitchEnvelopeOpen] = useState(true)
  const [isLfoGlobalOpen, setIsLfoGlobalOpen] = useState(true)
  const [syncState, setSyncState] = useState<'live' | 'local' | 'sending'>('sending')
  const [syncMessage, setSyncMessage] = useState('Sending this browser patch to the FM1 edit buffer…')
  const [isNavigationPending, setIsNavigationPending] = useState(false)
  const [isResolvingNavigation, setIsResolvingNavigation] = useState(false)
  const historyRef = useRef(history)
  const unsavedDialogRef = useRef<HTMLDialogElement>(null)
  const presetsMenuRef = useDismissableDetails()
  const saveMenuRef = useDismissableDetails()
  const gestureStart = useRef<EditorHistory | null>(null)
  const sentPatchId = useRef('')
  const sendInFlight = useRef(false)
  const sentName = useRef(history.present.slice(145, 155))
  const parameters = history.present
  const isDirty = !parametersMatch(parameters, savedParameters)

  useEffect(() => {
    historyRef.current = history
  }, [history])

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
    () => String.fromCharCode(...parameters.slice(145, 155)).replace(/[^\x20-\x7e]/g, ' ').trimEnd(),
    [parameters],
  )

  const applyEdits = useCallback((edits: ParameterEdit[], send = true) => {
    const activeGesture = gestureStart.current
    setHistory((current) => {
      const edited = editParameters(current, edits)
      if (edited === current) return current
      if (!activeGesture) return edited
      return { ...edited, past: activeGesture.past }
    })

    if (send && syncState === 'live') {
      edits.forEach(([index, value, min = 0, max = 127]) => {
        midi.sendParameter(index, Math.max(min, Math.min(max, Math.round(value))))
      })
    }
  }, [midi, syncState])

  const setParameter = useCallback((
    index: number,
    value: number,
    max = 127,
    min = 0,
    send = true,
  ) => {
    applyEdits([[index, value, min, max]], send)
  }, [applyEdits])

  const beginGesture = useCallback(() => {
    if (!gestureStart.current) gestureStart.current = historyRef.current
  }, [])

  const endGesture = useCallback(() => {
    const start = gestureStart.current
    gestureStart.current = null
    if (!start) return

    setHistory((current) => {
      if (parametersMatch(start.present, current.present)) return current
      return {
        ...current,
        past: [...start.past, start.present].slice(-100),
      }
    })
  }, [])

  const sendParametersToFm1 = useCallback(async (
    nextParameters: Uint8Array,
    message = 'Sending the current editor settings to the FM1 edit buffer…',
  ) => {
    if (sendInFlight.current) return false
    sendInFlight.current = true
    setSyncState('sending')
    setSyncMessage(message)
    const currentVoice = packDx7Voice(getFm1VoiceParameters(nextParameters))
    const sent = await midi.sendVoice(currentVoice)
    const effectsSent = sent
      ? await midi.sendEffectSettings(getFm1EffectParameters(nextParameters))
      : false
    sendInFlight.current = false
    if (sent && effectsSent) {
      sentName.current = nextParameters.slice(145, 155)
      setSyncState('live')
      setSyncMessage(`${currentVoice.name} is loaded on the FM1. Parameter changes are sent live.`)
      return true
    } else {
      setSyncState('local')
      setSyncMessage('Editing locally. Connect a SysEx-capable MIDI output to hear changes live.')
      return false
    }
  }, [midi])

  const sendToFm1 = useCallback(
    () => sendParametersToFm1(historyRef.current.present),
    [sendParametersToFm1],
  )

  useEffect(() => {
    if (sentPatchId.current === patch.id) return
    sentPatchId.current = patch.id
    void sendToFm1()
  }, [patch.id, sendToFm1])

  const updateName = (name: string) => {
    const edits = makeDx7VoiceNameEdits(parameters, name)
      .map(([parameter, value]) => [parameter, value] as ParameterEdit)
    applyEdits(edits, false)
  }

  const sendNameToFm1 = () => {
    if (syncState !== 'live') return
    const lastSentParameters = parameters.slice()
    lastSentParameters.set(sentName.current, 145)
    const edits = makeDx7VoiceNameEdits(lastSentParameters, liveName)
    edits.forEach(([parameter, value]) => {
      if (midi.sendParameter(parameter, value)) sentName.current[parameter - 145] = value
    })
  }

  const restoreHistory = (direction: 'undo' | 'redo') => {
    const next = direction === 'undo' ? undoParameters(history) : redoParameters(history)
    if (next === history) return
    setHistory(next)
    if (syncState === 'live') {
      void midi.sendVoice(packDx7Voice(getFm1VoiceParameters(next.present)))
        .then((sent) => sent
          ? midi.sendEffectSettings(getFm1EffectParameters(next.present))
          : false)
    }
  }

  const setEffectParameter = useCallback((controller: number, value: number) => {
    applyEdits([[155 + controller, value, 0, 127]], false)
    if (syncState === 'live') midi.sendEffectParameter(controller, value)
  }, [applyEdits, midi, syncState])

  const saveToLibrary = () => {
    const current = historyRef.current.present
    onSave(
      packDx7Voice(getFm1VoiceParameters(current)),
      getFm1EffectParameters(current),
    )
    setSavedParameters(current.slice())
  }

  const requestNavigation = () => {
    if (!isDirty) {
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
      saveToLibrary()
    } else {
      const restored = makeEditorHistory(savedParameters)
      historyRef.current = restored
      setHistory(restored)
      await sendParametersToFm1(
        savedParameters,
        'Restoring the saved library version on the FM1…',
      )
    }
    setIsResolvingNavigation(false)
    unsavedDialogRef.current?.close()
    setIsNavigationPending(false)
    onBack()
  }

  const revertToSaved = async () => {
    saveMenuRef.current?.removeAttribute('open')
    const restored = makeEditorHistory(savedParameters)
    historyRef.current = restored
    setHistory(restored)
    await sendParametersToFm1(
      savedParameters,
      'Restoring the saved library version on the FM1…',
    )
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
    historyRef.current = next
    setHistory(next)
    void sendParametersToFm1(
      next.present,
      'Applying the sound starter to the FM1 edit buffer…',
    )
  }

  const operatorBase = (6 - selectedOperator) * 21
  const operatorColor = operatorColors[selectedOperator - 1]
  const control = (
    label: string,
    offset: number,
    max: number,
    options?: string[],
    helpText?: string,
  ) => (
    <ParameterControl
      helpText={helpText}
      key={`${selectedOperator}-${offset}`}
      label={label}
      max={max}
      onChange={(value) => setParameter(operatorBase + offset, value, max)}
      options={options}
      value={parameters[operatorBase + offset]}
    />
  )
  const sliderControl = (
    label: string,
    offset: number,
    max: number,
    helpText?: string,
  ) => (
    <SliderParameterControl
      helpText={helpText}
      key={`${selectedOperator}-${offset}`}
      label={label}
      max={max}
      onChange={(value) => setParameter(operatorBase + offset, value, max)}
      onGestureEnd={endGesture}
      onGestureStart={beginGesture}
      value={parameters[operatorBase + offset]}
    />
  )

  return (
    <section className="mx-auto grid min-w-0 max-w-[90rem] gap-4 px-3 py-4 sm:px-5 lg:px-8">
      <header className="sticky top-0 z-20 min-w-0 border-b border-primary/15 bg-background/90 px-3 py-3 shadow-sm backdrop-blur-xl sm:px-5 lg:px-8">
        <div className="relative mx-auto flex max-w-[90rem] flex-wrap items-center gap-3">
          <Button aria-label="Back to patch banks" disabled={syncState === 'sending'} onClick={requestNavigation} size="icon" type="button" variant="outline">
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              {patch.bank}{String(patch.number).padStart(2, '0')}
            </p>
            <div className="flex items-center gap-2">
              <label className="min-w-0" title="Edit patch name">
                <span className="sr-only">Patch name</span>
                <span className="flex items-center gap-1">
                  <input
                    aria-label="Patch name"
                    className="-ml-1 w-[12ch] max-w-[42vw] rounded border border-transparent bg-transparent px-1 text-xl font-black uppercase text-foreground outline-none transition hover:border-border hover:bg-card/60 focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/30"
                    maxLength={10}
                    onBlur={sendNameToFm1}
                    onChange={(event) => updateName(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur()
                    }}
                    spellCheck={false}
                    value={liveName}
                  />
                  <Pencil aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground/70" />
                </span>
              </label>
              {isDirty ? (
                <span aria-label="Unsaved changes" className="size-2 rounded-full bg-amber-500" title="Unsaved changes" />
              ) : null}
            </div>
          </div>

          <p
            aria-live="polite"
            className={cn(
              'order-last flex basis-full items-center gap-2 rounded-md border px-3 py-2 text-xs sm:order-none sm:ml-2 sm:basis-auto',
              (syncState === 'local' || isDirty) && 'border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
              syncState === 'sending' && 'bg-muted text-muted-foreground',
              syncState === 'live' && !isDirty && 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300',
            )}
            role="status"
            title={syncMessage}
          >
            <CircleDot className={cn('size-3.5', syncState === 'sending' && 'animate-pulse')} />
            <span className="font-bold">
              {syncState === 'sending'
                ? 'Sending…'
                : `${isDirty ? 'Unsaved' : 'Saved'} · ${syncState === 'live' ? 'Live on FM1' : 'Local only'}`}
            </span>
          </p>

          <div className="ml-auto flex items-center gap-1.5">
            <details className="group static sm:relative" ref={presetsMenuRef}>
              <summary
                aria-label="Sound presets"
                className="flex h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-bold transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
                title="Sound presets"
              >
                <WandSparkles className="size-4" />
                <span className="hidden xl:inline">Presets</span>
                <ChevronDown className="hidden size-3.5 transition-transform group-open:rotate-180 xl:block" />
              </summary>
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 grid max-h-[min(26rem,calc(100vh-1.5rem))] gap-1 overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-xl sm:left-auto sm:top-12 sm:max-h-none sm:w-[min(22rem,calc(100vw-1.5rem))]">
                <div className="px-2 pb-2 pt-1">
                  <p className="text-sm font-bold">Sound presets</p>
                  <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                    Try a direction, then shape it with the controls. Your current sound is one undo away.
                  </p>
                </div>
                {soundPresets.map((preset) => (
                  <button
                    className="grid w-full gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    disabled={syncState === 'sending'}
                    key={preset.id}
                    onClick={() => selectPreset(preset.id)}
                    type="button"
                  >
                    <span className="text-sm font-bold">{preset.name}</span>
                    <span className="text-xs leading-4 text-muted-foreground">{preset.description}</span>
                  </button>
                ))}
              </div>
            </details>
            <Button
              aria-label="Undo"
              disabled={history.past.length === 0}
              onClick={() => restoreHistory('undo')}
              size="icon"
              title="Undo"
              type="button"
              variant="ghost"
            >
              <Undo2 />
            </Button>
            <Button
              aria-label="Redo"
              disabled={history.future.length === 0}
              onClick={() => restoreHistory('redo')}
              size="icon"
              title="Redo"
              type="button"
              variant="ghost"
            >
              <Redo2 />
            </Button>
            <div className="flex items-center">
              <Button
                className="rounded-r-none pr-3"
                disabled={!isDirty}
                onClick={saveToLibrary}
                type="button"
              >
                <Save />
                <span className="hidden sm:inline">Save to Library</span>
              </Button>
              <details className="group relative" ref={saveMenuRef}>
                <summary
                  aria-haspopup="menu"
                  aria-label="More save options"
                  className="flex h-10 w-9 cursor-pointer list-none items-center justify-center rounded-r-md border-l border-primary-foreground/25 bg-primary text-primary-foreground shadow-[0_0_14px_hsl(315_100%_60%_/_0.16)] transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
                  title="More save options"
                >
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <div
                  className="absolute right-0 top-12 z-40 grid w-64 gap-1 rounded-lg border bg-popover p-2 text-popover-foreground shadow-xl"
                  role="menu"
                >
                  <button
                    className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    disabled={syncState === 'sending'}
                    onClick={resendToFm1}
                    role="menuitem"
                    type="button"
                  >
                    <RefreshCw className={cn('mt-0.5 size-4 shrink-0', syncState === 'sending' && 'animate-spin')} />
                    <span>
                      <span className="block text-sm font-bold">Resend to FM1</span>
                      <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">Send the current editor settings again.</span>
                    </span>
                  </button>
                  <button
                    className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    disabled={!isDirty || syncState === 'sending'}
                    onClick={() => void revertToSaved()}
                    role="menuitem"
                    title="Discard every edit since the last library save and restore that sound on the FM1"
                    type="button"
                  >
                    <RotateCcw className="mt-0.5 size-4 shrink-0" />
                    <span>
                      <span className="block text-sm font-bold">Revert to Saved</span>
                      <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">Discard edits and restore the saved sound.</span>
                    </span>
                  </button>
                </div>
              </details>
            </div>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(14rem,1fr)_minmax(0,3fr)] lg:items-start">
        <aside aria-label="Patch configuration" className="grid min-w-0 gap-4">
          <div
            aria-label="Patch configuration sections"
            className="grid grid-cols-2 rounded-lg border border-primary/20 bg-card/75 p-1 shadow-sm"
            role="tablist"
          >
            <button
              aria-controls="global-configuration-panel"
              aria-selected={leftPanelTab === 'global'}
              className={cn(
                'flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                leftPanelTab === 'global' && 'bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground',
              )}
              id="global-configuration-tab"
              onClick={() => setLeftPanelTab('global')}
              role="tab"
              type="button"
            >
              <SlidersHorizontal className="size-4" />
              Global
            </button>
            <button
              aria-controls="effects-configuration-panel"
              aria-selected={leftPanelTab === 'effects'}
              className={cn(
                'flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                leftPanelTab === 'effects' && 'bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground',
              )}
              id="effects-configuration-tab"
              onClick={() => setLeftPanelTab('effects')}
              role="tab"
              type="button"
            >
              <AudioWaveform className="size-4" />
              Effects
            </button>
          </div>

          <div
            aria-labelledby="global-configuration-tab"
            className="grid min-w-0 gap-4"
            hidden={leftPanelTab !== 'global'}
            id="global-configuration-panel"
            role="tabpanel"
          >
            <AlgorithmPanel
              algorithm={parameters[134]}
              feedback={parameters[135]}
              onAlgorithmChange={(algorithm) => setParameter(134, algorithm, 31)}
              onFeedbackChange={(feedback) => setParameter(135, feedback, 7)}
              onFeedbackGestureEnd={endGesture}
              onFeedbackGestureStart={beginGesture}
            />

            <Card className="min-w-0 border-primary/20 bg-card/95">
              <CardHeader className={cn('flex-row items-center justify-between gap-2 px-4 py-3', isPitchEnvelopeOpen && 'border-b')}>
                <CardTitle className="flex min-w-0 items-center gap-1 text-base text-primary">
                  Pitch envelope
                  <HelpPopover label="Pitch envelope" text={controlHelp.pitchEnvelope} />
                </CardTitle>
                <CollapseButton
                  controls="pitch-envelope-controls"
                  expanded={isPitchEnvelopeOpen}
                  label="pitch envelope"
                  onClick={() => setIsPitchEnvelopeOpen((open) => !open)}
                />
              </CardHeader>
              <CardContent
                className="grid grid-cols-2 gap-x-3 gap-y-5 p-4"
                hidden={!isPitchEnvelopeOpen}
                id="pitch-envelope-controls"
              >
                {[0, 1, 2, 3].map((offset) => (
                  <SliderParameterControl
                    helpText={controlHelp.pitchEnvelopeRate}
                    key={`pr-${offset}`}
                    label={`Rate ${offset + 1}`}
                    max={99}
                    onChange={(value) => setParameter(126 + offset, value, 99)}
                    onGestureEnd={endGesture}
                    onGestureStart={beginGesture}
                    value={parameters[126 + offset]}
                  />
                ))}
                {[0, 1, 2, 3].map((offset) => (
                  <SliderParameterControl
                    helpText={controlHelp.pitchEnvelopeLevel}
                    key={`pl-${offset}`}
                    label={`Level ${offset + 1}`}
                    max={99}
                    onChange={(value) => setParameter(130 + offset, value, 99)}
                    onGestureEnd={endGesture}
                    onGestureStart={beginGesture}
                    value={parameters[130 + offset]}
                  />
                ))}
              </CardContent>
            </Card>

            <Card className="min-w-0 border-primary/20 bg-card/95">
              <CardHeader className={cn('flex-row items-center justify-between gap-2 px-4 py-3', isLfoGlobalOpen && 'border-b')}>
                <CardTitle className="text-base text-primary">LFO &amp; global</CardTitle>
                <CollapseButton
                  controls="lfo-global-controls"
                  expanded={isLfoGlobalOpen}
                  label="LFO and global"
                  onClick={() => setIsLfoGlobalOpen((open) => !open)}
                />
              </CardHeader>
              <CardContent
                className="grid grid-cols-2 gap-x-3 gap-y-4 p-4"
                hidden={!isLfoGlobalOpen}
                id="lfo-global-controls"
              >
                <SwitchParameterControl helpText={controlHelp.oscillatorSync} label="Oscillator sync" onChange={(value) => setParameter(136, value, 1)} value={parameters[136]} />
                <SwitchParameterControl helpText={controlHelp.lfoSync} label="LFO sync" onChange={(value) => setParameter(141, value, 1)} value={parameters[141]} />
                <LfoWaveControl onChange={(value) => setParameter(142, value, 5)} value={parameters[142]} />
                <SliderParameterControl helpText={controlHelp.lfoSpeed} label="LFO speed" max={99} onChange={(value) => setParameter(137, value, 99)} onGestureEnd={endGesture} onGestureStart={beginGesture} value={parameters[137]} />
                <SliderParameterControl helpText={controlHelp.lfoDelay} label="LFO delay" max={99} onChange={(value) => setParameter(138, value, 99)} onGestureEnd={endGesture} onGestureStart={beginGesture} value={parameters[138]} />
                <SliderParameterControl helpText={controlHelp.pitchModDepth} label="Pitch mod depth" max={99} onChange={(value) => setParameter(139, value, 99)} onGestureEnd={endGesture} onGestureStart={beginGesture} value={parameters[139]} />
                <SliderParameterControl helpText={controlHelp.ampModDepth} label="Amp mod depth" max={99} onChange={(value) => setParameter(140, value, 99)} onGestureEnd={endGesture} onGestureStart={beginGesture} value={parameters[140]} />
                <SliderParameterControl helpText={controlHelp.pitchModSensitivity} label="Pitch mod sens." max={7} onChange={(value) => setParameter(143, value, 7)} onGestureEnd={endGesture} onGestureStart={beginGesture} value={parameters[143]} />
                <SliderParameterControl
                  helpText={controlHelp.transpose}
                  label="Transpose"
                  max={24}
                  min={-24}
                  onChange={(value) => setParameter(144, value + 24, 48)}
                  onGestureEnd={endGesture}
                  onGestureStart={beginGesture}
                  value={parameters[144] - 24}
                  valueLabel={(value) => value > 0 ? `+${value}` : String(value)}
                />
              </CardContent>
            </Card>
          </div>

          <div
            aria-labelledby="effects-configuration-tab"
            hidden={leftPanelTab !== 'effects'}
            id="effects-configuration-panel"
            role="tabpanel"
          >
            <EffectsUnit
              layout="sidebar"
              onChange={setEffectParameter}
              onGestureEnd={endGesture}
              onGestureStart={beginGesture}
              values={getFm1EffectParameters(parameters)}
            />
          </div>
        </aside>

        <div className="grid min-w-0 gap-0">
          <OperatorStrip
            algorithm={parameters[134]}
            onSelect={setSelectedOperator}
            parameters={parameters}
            selectedOperator={selectedOperator}
          />

          <Card
          className="@container -mt-px min-w-0 rounded-t-none border-[var(--operator-color)] bg-card/95 shadow-[0_16px_48px_hsl(260_60%_5%_/_0.16)]"
          id="focused-operator-panel"
          role="tabpanel"
          style={{ '--operator-color': operatorColor } as React.CSSProperties}
        >
          <CardHeader className="editor-operator-header border-b px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>
              <span className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-[var(--operator-color)] font-mono text-lg font-black text-slate-950 shadow-[0_0_18px_var(--operator-color)]">
                  {selectedOperator}
                </span>
                <span className="flex items-center gap-1 text-base text-white">
                  Operator {selectedOperator}
                  <HelpPopover className="text-white/65 hover:bg-white/10 hover:text-white" label="FM operators" text={controlHelp.operator} />
                </span>
              </span>
              </CardTitle>
              <div className="flex items-center gap-2">
              <label className="flex min-w-[10rem] items-center gap-2 rounded-md border border-white/10 bg-black/15 px-3 py-2 text-xs text-white/70 sm:min-w-[13rem]">
                <span className="flex items-center gap-1 font-mono font-black uppercase tracking-wide">
                  Out
                  <HelpPopover className="text-white/60 hover:bg-white/10 hover:text-white" label="Operator output level" text={controlHelp.outputLevel} />
                </span>
                <input
                  aria-label={`Operator ${selectedOperator} output level`}
                  className="h-2 min-w-0 flex-1 cursor-pointer accent-[var(--operator-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  max={99}
                  min={0}
                  onBlur={endGesture}
                  onChange={(event) => setParameter(operatorBase + 16, Number(event.target.value), 99)}
                  onKeyDown={(event) => {
                    if (['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp'].includes(event.key)) {
                      beginGesture()
                    }
                  }}
                  onKeyUp={endGesture}
                  onPointerCancel={endGesture}
                  onPointerDown={beginGesture}
                  onPointerUp={endGesture}
                  step={1}
                  type="range"
                  value={parameters[operatorBase + 16]}
                />
                <output className="w-6 text-right font-mono font-black text-white">
                  {parameters[operatorBase + 16]}
                </output>
              </label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-5 p-4 sm:p-5 @3xl:grid-cols-[minmax(0,3fr)_minmax(16rem,1fr)]">
            <EnvelopeEditor
              color={operatorColor}
              levels={Array.from(parameters.slice(operatorBase + 4, operatorBase + 8))}
              onChange={(rate, level, point) => {
                applyEdits([
                  [operatorBase + point, rate, 0, 99],
                  [operatorBase + 4 + point, level, 0, 99],
                ])
              }}
              onGestureEnd={endGesture}
              onGestureStart={beginGesture}
              rates={Array.from(parameters.slice(operatorBase, operatorBase + 4))}
            />

            <div className="grid gap-5">
              <fieldset className="min-w-0 rounded-xl border border-[color-mix(in_srgb,var(--operator-color)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--operator-color)_5%,var(--color-card))] px-3 pb-4 sm:px-4">
                <legend className="-ml-1 mb-2 px-1 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                  Oscillator
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 @3xl:grid-cols-1">
                  <RadioParameterControl
                    helpText={controlHelp.oscillatorMode}
                    label="Mode"
                    name={`oscillator-mode-${selectedOperator}`}
                    onChange={(value) => setParameter(operatorBase + 17, value, 1)}
                    options={oscillatorModes}
                    value={parameters[operatorBase + 17]}
                  />
                  <SliderParameterControl
                    helpText={controlHelp.coarse}
                    label="Coarse"
                    max={31}
                    onChange={(value) => setParameter(operatorBase + 18, value, 31)}
                    onGestureEnd={endGesture}
                    onGestureStart={beginGesture}
                    value={parameters[operatorBase + 18]}
                  />
                  <SliderParameterControl
                    helpText={controlHelp.fine}
                    label="Fine"
                    max={99}
                    onChange={(value) => setParameter(operatorBase + 19, value, 99)}
                    onGestureEnd={endGesture}
                    onGestureStart={beginGesture}
                    value={parameters[operatorBase + 19]}
                  />
                  <SliderParameterControl
                    helpText={controlHelp.detune}
                    label="Detune"
                    max={7}
                    min={-7}
                    onChange={(value) => setParameter(operatorBase + 20, value + 7, 14)}
                    onGestureEnd={endGesture}
                    onGestureStart={beginGesture}
                    value={parameters[operatorBase + 20] - 7}
                    valueLabel={(value) => value > 0 ? `+${value}` : String(value)}
                  />
                </div>
              </fieldset>

              <fieldset className="min-w-0 rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_4%,var(--color-card))] px-3 pb-4 sm:px-4">
                <legend className="-ml-1 mb-2 px-1 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                  Keyboard scaling
                </legend>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 @3xl:grid-cols-1">
                  {sliderControl('Breakpoint', 8, 99, controlHelp.breakpoint)}
                  {sliderControl('Left depth', 9, 99, controlHelp.leftDepth)}
                  {sliderControl('Right depth', 10, 99, controlHelp.rightDepth)}
                  {sliderControl('Rate scaling', 13, 7, controlHelp.rateScaling)}
                  <div className="col-span-full grid grid-cols-2 gap-x-4 gap-y-3">
                    {control('Left curve', 11, 3, curves, controlHelp.curve)}
                    {control('Right curve', 12, 3, curves, controlHelp.curve)}
                  </div>
                  {sliderControl('Velocity', 15, 7, controlHelp.velocity)}
                  {sliderControl('Amp mod sens.', 14, 3, controlHelp.ampModSensitivity)}
                </div>
              </fieldset>
            </div>
          </CardContent>
          </Card>
        </div>
      </div>

      <dialog
        aria-labelledby="unsaved-editor-title"
        className="fixed inset-0 z-50 m-auto w-[min(480px,calc(100vw-2rem))] rounded-lg border border-primary/30 bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/55"
        onClose={() => setIsNavigationPending(false)}
        ref={unsavedDialogRef}
      >
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-bold" id="unsaved-editor-title">Unsaved patch changes</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Save this working copy to the browser library, or discard it and restore the saved sound on the FM1.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            disabled={isResolvingNavigation}
            onClick={() => unsavedDialogRef.current?.close()}
            type="button"
            variant="ghost"
          >
            Keep Editing
          </Button>
          <Button
            disabled={isResolvingNavigation}
            onClick={() => void finishPendingNavigation('discard')}
            type="button"
            variant="outline"
          >
            {isResolvingNavigation ? 'Restoring…' : 'Discard Changes'}
          </Button>
          <Button
            disabled={isResolvingNavigation}
            onClick={() => void finishPendingNavigation('save')}
            type="button"
          >
            Save to Library
          </Button>
        </div>
      </dialog>

    </section>
  )
}
