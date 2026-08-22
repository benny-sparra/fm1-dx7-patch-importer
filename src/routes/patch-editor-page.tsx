import {
  AudioWaveform,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Dices,
  Pencil,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Undo2,
  WandSparkles,
} from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AlgorithmPanel, OperatorStrip } from '@/components/editor/editor-workspace'
import { EffectsUnit } from '@/components/editor/effects-unit'
import { EnvelopeEditor } from '@/components/editor/envelope-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogFooter, DialogHeader } from '@/components/ui/dialog'
import { HelpPopover } from '@/components/ui/help-popover'
import { type Patch } from '@/data/patches'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { type MidiController } from '@/hooks/use-midi'
import { makeDx7VoiceNameEdits, packDx7Voice, unpackDx7Voice, type Dx7Voice } from '@/lib/dx7'
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
  createPatchSyncCoordinator,
  type PatchSyncCoordinator,
  type PatchSyncState,
} from '@/lib/patch-sync-coordinator'
import { rangeStyle } from '@/lib/range-style'
import { auditionedParameterValue, makeOperatorAuditionEdits } from '@/lib/operator-audition'
import { applySoundPreset, soundPresets, type SoundPresetId } from '@/lib/sound-presets'
import { randomizeSound } from '@/lib/sound-randomizer'
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
  origin?: number
  value: number
  valueLabel?: (value: number) => string
}

type RotaryParameterControlProps = Omit<SliderParameterControlProps, 'origin'>

const rotaryControlKeys = [
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
]

function RotaryParameterControl({
  helpText,
  label,
  max,
  min = 0,
  onChange,
  onGestureEnd,
  onGestureStart,
  value,
  valueLabel = String,
}: RotaryParameterControlProps) {
  const drag = useRef<{ pointerId: number; startValue: number; startY: number } | null>(null)
  const displayValue = valueLabel(value)
  const fraction = (value - min) / (max - min)
  const angle = -135 + fraction * 270
  const clamp = (nextValue: number) => Math.max(min, Math.min(max, Math.round(nextValue)))

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!rotaryControlKeys.includes(event.key)) return
    event.preventDefault()
    if (!event.repeat) onGestureStart()

    const pageStep = Math.max(1, Math.round((max - min) / 10))
    const nextValue =
      event.key === 'Home'
        ? min
        : event.key === 'End'
          ? max
          : value +
            (['ArrowUp', 'ArrowRight'].includes(event.key)
              ? 1
              : ['ArrowDown', 'ArrowLeft'].includes(event.key)
                ? -1
                : event.key === 'PageUp'
                  ? pageStep
                  : -pageStep)
    onChange(clamp(nextValue))
  }

  return (
    <div className="grid min-w-0 justify-items-center gap-1 text-xs font-semibold text-muted-foreground">
      <span className="flex max-w-full min-w-0 items-center gap-1">
        <span className="truncate" title={label}>
          {label}
        </span>
        {helpText ? <HelpPopover label={label} text={helpText} /> : null}
      </span>
      <div
        aria-label={label}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={value}
        aria-valuetext={displayValue}
        className="group relative size-[4.75rem] cursor-ns-resize touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onBlur={onGestureEnd}
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => {
          if (rotaryControlKeys.includes(event.key)) onGestureEnd()
        }}
        onPointerCancel={() => {
          drag.current = null
          onGestureEnd()
        }}
        onPointerDown={(event) => {
          drag.current = { pointerId: event.pointerId, startValue: value, startY: event.clientY }
          event.currentTarget.setPointerCapture(event.pointerId)
          onGestureStart()
        }}
        onPointerMove={(event) => {
          const activeDrag = drag.current
          if (!activeDrag || activeDrag.pointerId !== event.pointerId) return
          const valuePerPixel = (max - min) / 120
          onChange(
            clamp(activeDrag.startValue + (activeDrag.startY - event.clientY) * valuePerPixel),
          )
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return
          drag.current = null
          event.currentTarget.releasePointerCapture(event.pointerId)
          onGestureEnd()
        }}
        role="slider"
        tabIndex={0}
        title={`${label}: ${displayValue}. Drag up or down to adjust.`}
      >
        <svg aria-hidden="true" className="size-full overflow-visible" viewBox="0 0 76 76">
          {Array.from({ length: 11 }, (_, index) => {
            const tickAngle = -135 + index * 27
            return (
              <line
                className={
                  index / 10 <= fraction ? 'stroke-[var(--operator-color)]' : 'stroke-border'
                }
                key={index}
                strokeLinecap="round"
                strokeWidth="2"
                transform={`rotate(${tickAngle} 38 38)`}
                x1="38"
                x2="38"
                y1="4"
                y2={index % 5 === 0 ? '10' : '8'}
              />
            )
          })}
          <circle
            className="fill-[color-mix(in_srgb,var(--fm1-finish-tint)_24%,white)] stroke-[color-mix(in_srgb,var(--fm1-finish-tint)_55%,var(--color-border))] transition group-hover:stroke-[var(--operator-color)]"
            cx="38"
            cy="38"
            r="24"
            strokeWidth="2"
          />
          <circle cx="38" cy="38" fill="none" r="20.5" stroke="white" strokeOpacity="0.45" />
          <line
            className="stroke-[var(--operator-color)]"
            strokeLinecap="round"
            strokeWidth="3"
            transform={`rotate(${angle} 38 38)`}
            x1="38"
            x2="38"
            y1="17"
            y2="29"
          />
          <circle className="fill-[var(--operator-color)]" cx="38" cy="38" r="2.5" />
        </svg>
      </div>
      <output className="font-vt323 min-w-9 rounded border border-border/70 bg-background/80 px-1.5 py-0.5 text-center text-sm text-foreground">
        {displayValue}
      </output>
    </div>
  )
}

function SliderParameterControl({
  helpText,
  label,
  max,
  min = 0,
  onChange,
  onGestureEnd,
  onGestureStart,
  origin,
  value,
  valueLabel = String,
}: SliderParameterControlProps) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-semibold text-muted-foreground">
      <span className="flex min-w-0 items-center gap-2">
        <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <span className="min-w-0 flex-1 truncate" title={label}>
            {label}
          </span>
          {helpText ? <HelpPopover label={label} text={helpText} /> : null}
        </span>
        <output className="font-vt323 shrink-0 rounded border border-border/70 bg-background/70 px-1.5 py-0.5 text-xs text-foreground">
          {valueLabel(value)}
        </output>
      </span>
      <input
        aria-label={label}
        className="h-2 w-full cursor-pointer accent-primary"
        max={max}
        min={min}
        onBlur={onGestureEnd}
        onChange={(event) => onChange(Number(event.target.value))}
        onKeyDown={(event) => {
          if (
            [
              'ArrowDown',
              'ArrowLeft',
              'ArrowRight',
              'ArrowUp',
              'End',
              'Home',
              'PageDown',
              'PageUp',
            ].includes(event.key)
          ) {
            onGestureStart()
          }
        }}
        onKeyUp={onGestureEnd}
        onPointerCancel={onGestureEnd}
        onPointerDown={onGestureStart}
        onPointerUp={onGestureEnd}
        step={1}
        style={rangeStyle(value, min, max, undefined, origin)}
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
  const { t } = useTranslation()
  const actionLabel = t(expanded ? 'editor.collapse' : 'editor.expand', { label })
  return (
    <Button
      aria-controls={controls}
      aria-expanded={expanded}
      aria-label={actionLabel}
      className="size-8 shrink-0 text-muted-foreground"
      onClick={onClick}
      size="icon"
      title={actionLabel}
      type="button"
      variant="ghost"
    >
      {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
    </Button>
  )
}

function SwitchParameterControl({ helpText, label, onChange, value }: SwitchParameterControlProps) {
  const { t } = useTranslation()
  const checked = value > 0
  const inputId = useId()

  return (
    <div className="grid min-w-0 gap-1 text-xs font-semibold text-muted-foreground">
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate" title={label}>
          {label}
        </span>
        {helpText ? <HelpPopover label={label} text={helpText} /> : null}
      </span>
      <label className="flex h-9 cursor-pointer items-center gap-2" htmlFor={inputId}>
        <input
          aria-checked={checked}
          aria-label={label}
          checked={checked}
          className="peer sr-only"
          id={inputId}
          onChange={(event) => onChange(event.target.checked ? 1 : 0)}
          role="switch"
          type="checkbox"
        />
        <span
          aria-hidden="true"
          className="relative h-6 w-11 shrink-0 rounded-full border border-border bg-muted transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring after:absolute after:top-0.5 after:left-0.5 after:size-[1.125rem] after:rounded-full after:bg-background after:shadow-sm after:transition-transform peer-checked:after:translate-x-5"
        />
        <span className="text-sm font-bold text-foreground">
          {checked ? t('editor.on') : t('editor.off')}
        </span>
      </label>
    </div>
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
        <span className="truncate" title={label}>
          {label}
        </span>
        {helpText ? <HelpPopover label={label} text={helpText} /> : null}
      </span>
      {options ? (
        <select
          className="h-9 min-w-0 rounded-md border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => onChange(Number(event.target.value))}
          value={value}
        >
          {options.map((option, index) => (
            <option key={option} value={index}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="font-vt323 h-9 min-w-0 rounded-md border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
    <svg aria-hidden="true" className="h-4 w-7 shrink-0" fill="none" viewBox="0 0 32 16">
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

function LfoWaveControl({ onChange, value }: { onChange: (value: number) => void; value: number }) {
  const { t } = useTranslation()
  const dropdownRef = useDismissableDetails()
  const selectedWave = lfoWaves[value] ?? lfoWaves[0]

  const selectWave = (wave: number) => {
    onChange(wave)
    dropdownRef.current?.removeAttribute('open')
  }

  return (
    <div className="grid min-w-0 gap-1 text-xs font-semibold text-muted-foreground">
      <span className="flex items-center gap-1">
        {t('ui.lfoWave')}
        <HelpPopover label={t('ui.lfoWave')} text={t('controlHelp.lfoWave')} />
      </span>
      <details className="group relative min-w-0" ref={dropdownRef}>
        <summary
          aria-label={`${t('ui.lfoWave')}: ${selectedWave}`}
          className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md border bg-background px-2 text-sm text-foreground transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
        >
          <WaveShapeIcon wave={value} />
          <span className="min-w-0 flex-1 truncate">{selectedWave}</span>
          <ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div
          aria-label={t('editor.lfoWave')}
          className="absolute top-[calc(100%+0.25rem)] left-0 z-30 grid w-full min-w-48 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
          role="radiogroup"
        >
          {lfoWaves.map((wave, index) => (
            <button
              aria-checked={value === index}
              className={cn(
                'flex h-9 w-full items-center gap-2 rounded px-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset',
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
  const { t } = useTranslation()
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
  const mutedOperatorsRef = useRef<ReadonlySet<number>>(mutedOperators)
  const soloOperatorRef = useRef<number | null>(soloOperator)
  const unsavedDialogRef = useRef<HTMLDialogElement>(null)
  const presetsMenuRef = useDismissableDetails()
  const saveMenuRef = useDismissableDetails()
  const gestureStart = useRef<EditorHistory | null>(null)
  const sentName = useRef(history.present.slice(145, 155))
  const patchSyncRef = useRef<PatchSyncCoordinator | null>(null)
  const parameters = history.present
  const isDirty = !parametersMatch(parameters, savedParameters)

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
        sentName.current = sentParameters.slice(145, 155)
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
      String.fromCharCode(...parameters.slice(145, 155))
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
      makeOperatorAuditionEdits(nextParameters, nextMutedOperators, nextSoloOperator).forEach(
        ([parameter, value]) => midi.sendParameter(parameter, value),
      )
    },
    [midi],
  )

  const commitHistory = useCallback((next: EditorHistory) => {
    const current = historyRef.current
    if (next === current) return false

    historyRef.current = next
    if (!parametersMatch(current.present, next.present)) historyRevisionRef.current += 1
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

      if (send && syncStateRef.current === 'live') {
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
    [commitHistory, midi],
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

  const sendToFm1 = useCallback(() => patchSyncRef.current!.requestSync(), [])

  useEffect(() => {
    void patchSyncRef.current!.requestInitialSync(patch.id)
  }, [patch.id])

  const updateName = (name: string) => {
    const edits = makeDx7VoiceNameEdits(historyRef.current.present, name).map(
      ([parameter, value]) => [parameter, value] as ParameterEdit,
    )
    applyEdits(edits, false)
  }

  const sendNameToFm1 = () => {
    if (syncStateRef.current !== 'live') return
    const lastSentParameters = parameters.slice()
    lastSentParameters.set(sentName.current, 145)
    const edits = makeDx7VoiceNameEdits(lastSentParameters, liveName)
    edits.forEach(([parameter, value]) => {
      if (midi.sendParameter(parameter, value)) sentName.current[parameter - 145] = value
    })
  }

  const restoreHistory = (direction: 'undo' | 'redo') => {
    const current = historyRef.current
    const next = direction === 'undo' ? undoParameters(current) : redoParameters(current)
    if (!commitHistory(next)) return
    if (syncStateRef.current === 'live') void sendToFm1()
  }

  const setEffectParameter = useCallback(
    (controller: number, value: number) => {
      applyEdits([[155 + controller, value, 0, 127]], false)
      if (syncStateRef.current === 'live') midi.sendEffectParameter(controller, value)
    },
    [applyEdits, midi],
  )

  const updateOperatorAudition = (
    nextMutedOperators: ReadonlySet<number>,
    nextSoloOperator: number | null,
    send = syncStateRef.current === 'live',
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

  const clearOperatorAudition = (send = syncStateRef.current === 'live') => {
    if (mutedOperatorsRef.current.size === 0 && soloOperatorRef.current === null) return
    updateOperatorAudition(new Set(), null, send)
  }

  const saveToLibrary = () => {
    const current = historyRef.current.present
    onSave(packDx7Voice(getFm1VoiceParameters(current)), getFm1EffectParameters(current))
    setSavedParameters(current.slice())
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

  const operatorBase = (6 - selectedOperator) * 21
  const operatorColor = operatorColors[selectedOperator - 1]
  const selectedOperatorIsMuted = mutedOperators.has(selectedOperator)
  const selectedOperatorIsSoloed = soloOperator === selectedOperator
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
  const rotaryControl = (label: string, offset: number, max: number, helpText?: string) => (
    <RotaryParameterControl
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
    <section className="patch-editor-page mx-auto grid max-w-[90rem] min-w-0 gap-4 px-3 py-4 sm:px-5 lg:px-8">
      <header className="sticky top-0 z-20 ml-[calc(50%_-_50vw)] w-screen min-w-0 border-b border-primary/15 bg-white py-3 shadow-sm">
        <div className="relative mx-auto flex max-w-[90rem] flex-wrap items-center gap-3 px-3 sm:px-5 lg:px-8">
          <Button
            aria-label={t('editor.back')}
            className="border-[color-mix(in_srgb,var(--fm1-finish-tint)_72%,var(--color-border))] bg-[color-mix(in_srgb,var(--fm1-finish-tint)_38%,white)] text-foreground hover:border-[var(--fm1-finish-tint)] hover:bg-[var(--fm1-finish-tint)] hover:text-[var(--fm1-finish-foreground)]"
            disabled={syncState === 'sending'}
            onClick={requestNavigation}
            size="icon"
            type="button"
            variant="outline"
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">
              {patch.bank}
              {String(patch.number).padStart(2, '0')}
            </p>
            <div className="flex items-center gap-2">
              <label className="min-w-0" title={t('editor.editName')}>
                <span className="sr-only">{t('editor.patchName')}</span>
                <span className="flex items-center gap-1">
                  <input
                    aria-label={t('editor.patchName')}
                    className="font-dot-matrix -ml-1 w-[12ch] max-w-[42vw] rounded border border-transparent bg-transparent px-1 text-xl font-black text-foreground uppercase transition outline-none hover:border-border hover:bg-card/60 focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/30"
                    maxLength={10}
                    onBlur={sendNameToFm1}
                    onChange={(event) => updateName(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur()
                    }}
                    spellCheck={false}
                    value={liveName}
                  />
                  <Pencil
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-muted-foreground/70"
                  />
                </span>
              </label>
              {isDirty ? (
                <span
                  aria-label={t('editor.unsaved')}
                  className="size-2 rounded-full bg-amber-500"
                  title={t('editor.unsaved')}
                />
              ) : null}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              aria-label={t('editor.undo')}
              disabled={history.past.length === 0}
              onClick={() => restoreHistory('undo')}
              size="icon"
              title={t('editor.undo')}
              type="button"
              variant="outline"
            >
              <Undo2 />
            </Button>
            <Button
              aria-label={t('editor.redo')}
              disabled={history.future.length === 0}
              onClick={() => restoreHistory('redo')}
              size="icon"
              title={t('editor.redo')}
              type="button"
              variant="outline"
            >
              <Redo2 />
            </Button>
            <details className="group static sm:relative" ref={presetsMenuRef}>
              <summary
                aria-label={t('editor.presets')}
                className="flex h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-bold transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden"
                title={t('editor.presets')}
              >
                <WandSparkles className="size-4" />
                <span className="hidden xl:inline">{t('editor.presetsShort')}</span>
                <ChevronDown className="hidden size-3.5 transition-transform group-open:rotate-180 xl:block" />
              </summary>
              <div className="absolute top-[calc(100%+0.5rem)] right-0 left-0 z-40 grid max-h-[min(26rem,calc(100vh-1.5rem))] gap-1 overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-xl sm:top-12 sm:left-auto sm:max-h-none sm:w-[min(22rem,calc(100vw-1.5rem))]">
                <div className="px-2 pt-1 pb-2">
                  <p className="text-sm font-bold">{t('editor.presets')}</p>
                  <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                    {t('editor.presetsHelp')}
                  </p>
                </div>
                {soundPresets.map((preset) => (
                  <button
                    className="grid w-full gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50"
                    disabled={syncState === 'sending'}
                    key={preset.id}
                    onClick={() => selectPreset(preset.id)}
                    type="button"
                  >
                    <span className="text-sm font-bold">
                      {t(`editor.presetOptions.${preset.id}.name`)}
                    </span>
                    <span className="text-xs leading-4 text-muted-foreground">
                      {t(`editor.presetOptions.${preset.id}.description`)}
                    </span>
                  </button>
                ))}
              </div>
            </details>
            <Button
              aria-label={t('editor.randomise')}
              className="font-vt323"
              disabled={syncState === 'sending'}
              onClick={randomise}
              title={t('editor.randomise')}
              type="button"
              variant="outline"
            >
              <Dices />
              <span className="hidden xl:inline">{t('editor.randomise')}</span>
            </Button>
            <div className="flex items-center">
              <Button
                className="font-vt323 rounded-r-none pr-3"
                disabled={!isDirty}
                onClick={saveToLibrary}
                type="button"
              >
                <Save />
                <span className="hidden sm:inline">{t('editor.save')}</span>
              </Button>
              <details className="group relative" ref={saveMenuRef}>
                <summary
                  aria-haspopup="menu"
                  aria-label={t('editor.moreSave')}
                  className="flex h-10 w-9 cursor-pointer list-none items-center justify-center rounded-r-md border-l border-primary-foreground/25 bg-primary text-primary-foreground shadow-[0_0_14px_hsl(315_100%_60%_/_0.16)] transition-all hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden"
                  title={t('editor.moreSave')}
                >
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <div
                  className="absolute top-12 right-0 z-40 grid w-64 gap-1 rounded-lg border bg-popover p-2 text-popover-foreground shadow-xl"
                  role="menu"
                >
                  <button
                    className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50"
                    disabled={syncState === 'sending'}
                    onClick={resendToFm1}
                    role="menuitem"
                    type="button"
                  >
                    <RefreshCw
                      className={cn(
                        'mt-0.5 size-4 shrink-0',
                        syncState === 'sending' && 'animate-spin',
                      )}
                    />
                    <span>
                      <span className="block text-sm font-bold">{t('editor.resend')}</span>
                      <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                        {t('editor.resendHelp')}
                      </span>
                    </span>
                  </button>
                  <button
                    className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50"
                    disabled={!isDirty || syncState === 'sending'}
                    onClick={() => void revertToSaved()}
                    role="menuitem"
                    title={t('ui.revertTitle')}
                    type="button"
                  >
                    <RotateCcw className="mt-0.5 size-4 shrink-0" />
                    <span>
                      <span className="block text-sm font-bold">{t('editor.revert')}</span>
                      <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                        {t('editor.revertHelp')}
                      </span>
                    </span>
                  </button>
                </div>
              </details>
            </div>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(14rem,1fr)_minmax(0,3fr)] lg:items-start">
        <aside aria-label={t('editor.configuration')} className="grid min-w-0 gap-4">
          <div
            aria-label={t('editor.sections')}
            className="relative grid grid-cols-2 rounded-lg border border-primary/20 bg-white p-1 shadow-sm"
            role="tablist"
          >
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-primary shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none',
                leftPanelTab === 'effects' && 'translate-x-full',
              )}
            />
            <button
              aria-controls="global-configuration-panel"
              aria-selected={leftPanelTab === 'global'}
              className={cn(
                'relative z-10 flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                leftPanelTab === 'global' &&
                  'text-primary-foreground hover:bg-transparent hover:text-primary-foreground',
              )}
              id="global-configuration-tab"
              onClick={() => setLeftPanelTab('global')}
              role="tab"
              type="button"
            >
              <SlidersHorizontal className="size-4" />
              {t('editor.global')}
            </button>
            <button
              aria-controls="effects-configuration-panel"
              aria-selected={leftPanelTab === 'effects'}
              className={cn(
                'relative z-10 flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                leftPanelTab === 'effects' &&
                  'text-primary-foreground hover:bg-transparent hover:text-primary-foreground',
              )}
              id="effects-configuration-tab"
              onClick={() => setLeftPanelTab('effects')}
              role="tab"
              type="button"
            >
              <AudioWaveform className="size-4" />
              {t('editor.effects')}
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
              <CardHeader
                className={cn(
                  'flex-row items-center justify-between gap-2 px-4 py-3',
                  isPitchEnvelopeOpen && 'border-b',
                )}
              >
                <CardTitle className="flex min-w-0 items-center gap-1 text-base text-black">
                  {t('editor.pitchEnvelope')}
                  <HelpPopover
                    label={t('editor.pitchEnvelope')}
                    text={t('controlHelp.pitchEnvelope')}
                  />
                </CardTitle>
                <CollapseButton
                  controls="pitch-envelope-controls"
                  expanded={isPitchEnvelopeOpen}
                  label={t('editor.pitchEnvelope')}
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
                    helpText={t('controlHelp.pitchEnvelopeRate')}
                    key={`pr-${offset}`}
                    label={t('editor.rate', { number: offset + 1 })}
                    max={99}
                    onChange={(value) => setParameter(126 + offset, value, 99)}
                    onGestureEnd={endGesture}
                    onGestureStart={beginGesture}
                    value={parameters[126 + offset]}
                  />
                ))}
                {[0, 1, 2, 3].map((offset) => (
                  <SliderParameterControl
                    helpText={t('controlHelp.pitchEnvelopeLevel')}
                    key={`pl-${offset}`}
                    label={t('editor.level', { number: offset + 1 })}
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
              <CardHeader
                className={cn(
                  'flex-row items-center justify-between gap-2 px-4 py-3',
                  isLfoGlobalOpen && 'border-b',
                )}
              >
                <CardTitle className="text-base text-black">{t('editor.lfoGlobal')}</CardTitle>
                <CollapseButton
                  controls="lfo-global-controls"
                  expanded={isLfoGlobalOpen}
                  label={t('editor.lfoGlobal')}
                  onClick={() => setIsLfoGlobalOpen((open) => !open)}
                />
              </CardHeader>
              <CardContent
                className="grid grid-cols-2 gap-x-3 gap-y-4 p-4"
                hidden={!isLfoGlobalOpen}
                id="lfo-global-controls"
              >
                <SwitchParameterControl
                  helpText={t('controlHelp.oscillatorSync')}
                  label={t('editor.oscillatorSync')}
                  onChange={(value) => setParameter(136, value, 1)}
                  value={parameters[136]}
                />
                <SwitchParameterControl
                  helpText={t('controlHelp.lfoSync')}
                  label={t('editor.lfoSync')}
                  onChange={(value) => setParameter(141, value, 1)}
                  value={parameters[141]}
                />
                <LfoWaveControl
                  onChange={(value) => setParameter(142, value, 5)}
                  value={parameters[142]}
                />
                <SliderParameterControl
                  helpText={t('controlHelp.lfoSpeed')}
                  label={t('editor.lfoSpeed')}
                  max={99}
                  onChange={(value) => setParameter(137, value, 99)}
                  onGestureEnd={endGesture}
                  onGestureStart={beginGesture}
                  value={parameters[137]}
                />
                <SliderParameterControl
                  helpText={t('controlHelp.lfoDelay')}
                  label={t('editor.lfoDelay')}
                  max={99}
                  onChange={(value) => setParameter(138, value, 99)}
                  onGestureEnd={endGesture}
                  onGestureStart={beginGesture}
                  value={parameters[138]}
                />
                <SliderParameterControl
                  helpText={t('controlHelp.pitchModDepth')}
                  label={t('editor.pitchModDepth')}
                  max={99}
                  onChange={(value) => setParameter(139, value, 99)}
                  onGestureEnd={endGesture}
                  onGestureStart={beginGesture}
                  value={parameters[139]}
                />
                <SliderParameterControl
                  helpText={t('controlHelp.ampModDepth')}
                  label={t('editor.ampModDepth')}
                  max={99}
                  onChange={(value) => setParameter(140, value, 99)}
                  onGestureEnd={endGesture}
                  onGestureStart={beginGesture}
                  value={parameters[140]}
                />
                <SliderParameterControl
                  helpText={t('controlHelp.pitchModSensitivity')}
                  label={t('editor.pitchModSensitivity')}
                  max={7}
                  onChange={(value) => setParameter(143, value, 7)}
                  onGestureEnd={endGesture}
                  onGestureStart={beginGesture}
                  value={parameters[143]}
                />
                <SliderParameterControl
                  helpText={t('controlHelp.transpose')}
                  label={t('editor.transpose')}
                  max={24}
                  min={-24}
                  onChange={(value) => setParameter(144, value + 24, 48)}
                  onGestureEnd={endGesture}
                  onGestureStart={beginGesture}
                  value={parameters[144] - 24}
                  valueLabel={(value) => (value > 0 ? `+${value}` : String(value))}
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
            mutedOperators={mutedOperators}
            onSelect={setSelectedOperator}
            parameters={parameters}
            selectedOperator={selectedOperator}
            soloOperator={soloOperator}
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
                    <span className="font-dot-matrix grid size-9 place-items-center rounded-full bg-[var(--operator-color)] text-lg font-black text-slate-950 shadow-[0_0_18px_var(--operator-color)]">
                      {selectedOperator}
                    </span>
                    <span className="flex items-center gap-1 text-base text-white">
                      {t('editor.operator', { number: selectedOperator })}
                      <HelpPopover
                        className="text-white/65 hover:bg-white/10 hover:text-white"
                        label={t('editor.fmOperators')}
                        text={t('controlHelp.operator')}
                      />
                    </span>
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div
                    aria-label={t('ui.auditionGroup', { number: selectedOperator })}
                    className="flex items-center gap-1"
                    role="group"
                  >
                    <Button
                      aria-label={t('ui.auditionAction', {
                        action: t(selectedOperatorIsMuted ? 'ui.unmute' : 'ui.mute'),
                        number: selectedOperator,
                      })}
                      aria-pressed={selectedOperatorIsMuted}
                      className={cn(
                        'h-8 w-[4.25rem] border-white/15 bg-black/15 px-3 text-xs font-black text-white/70 hover:bg-white/10 hover:text-white',
                        selectedOperatorIsMuted &&
                          'border-rose-400 bg-rose-400/20 text-rose-200 hover:bg-rose-400/25 hover:text-rose-100',
                      )}
                      disabled={syncState === 'sending'}
                      onClick={() => toggleOperatorMute(selectedOperator)}
                      size="sm"
                      title={
                        syncState === 'local'
                          ? t('ui.auditionConnect', {
                              action: t(selectedOperatorIsMuted ? 'ui.unmute' : 'ui.mute'),
                              number: selectedOperator,
                            })
                          : t('ui.auditionTemporary', {
                              action: t(selectedOperatorIsMuted ? 'ui.unmute' : 'ui.mute'),
                              number: selectedOperator,
                            })
                      }
                      type="button"
                      variant="outline"
                    >
                      {t('ui.mute')}
                    </Button>
                    <Button
                      aria-label={t('ui.auditionAction', {
                        action: t(selectedOperatorIsSoloed ? 'ui.unsolo' : 'ui.solo'),
                        number: selectedOperator,
                      })}
                      aria-pressed={selectedOperatorIsSoloed}
                      className={cn(
                        'h-8 w-[4.25rem] border-white/15 bg-black/15 px-3 text-xs font-black text-white/70 hover:bg-white/10 hover:text-white',
                        selectedOperatorIsSoloed &&
                          'border-amber-300 bg-amber-300/20 text-amber-100 hover:bg-amber-300/25 hover:text-amber-50',
                      )}
                      disabled={syncState === 'sending'}
                      onClick={() => toggleOperatorSolo(selectedOperator)}
                      size="sm"
                      title={
                        syncState === 'local'
                          ? t('ui.auditionConnect', {
                              action: t(selectedOperatorIsSoloed ? 'ui.unsolo' : 'ui.solo'),
                              number: selectedOperator,
                            })
                          : t('ui.auditionTemporary', {
                              action: t(selectedOperatorIsSoloed ? 'ui.unsolo' : 'ui.solo'),
                              number: selectedOperator,
                            })
                      }
                      type="button"
                      variant="outline"
                    >
                      {t('ui.solo')}
                    </Button>
                  </div>
                  <label className="flex min-w-[10rem] items-center gap-2 rounded-md border border-white/10 bg-black/15 px-3 py-2 text-xs text-white/70 sm:min-w-[13rem]">
                    <span className="font-vt323 flex items-center gap-1 font-black tracking-wide uppercase">
                      {t('editor.output')}
                      <HelpPopover
                        className="text-white/60 hover:bg-white/10 hover:text-white"
                        label={t('editor.outputLevel')}
                        text={t('controlHelp.outputLevel')}
                      />
                    </span>
                    <input
                      aria-label={t('ui.operatorOutput', { number: selectedOperator })}
                      className="h-2 min-w-0 flex-1 cursor-pointer accent-[var(--operator-color)] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                      max={99}
                      min={0}
                      onBlur={endGesture}
                      onChange={(event) =>
                        setParameter(operatorBase + 16, Number(event.target.value), 99)
                      }
                      onKeyDown={(event) => {
                        if (
                          [
                            'ArrowDown',
                            'ArrowLeft',
                            'ArrowRight',
                            'ArrowUp',
                            'End',
                            'Home',
                            'PageDown',
                            'PageUp',
                          ].includes(event.key)
                        ) {
                          beginGesture()
                        }
                      }}
                      onKeyUp={endGesture}
                      onPointerCancel={endGesture}
                      onPointerDown={beginGesture}
                      onPointerUp={endGesture}
                      step={1}
                      style={rangeStyle(
                        parameters[operatorBase + 16],
                        0,
                        99,
                        'var(--operator-color)',
                      )}
                      type="range"
                      value={parameters[operatorBase + 16]}
                    />
                    <output className="font-vt323 w-6 text-right font-black text-white">
                      {parameters[operatorBase + 16]}
                    </output>
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-5 p-4 sm:p-5 @3xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
              <EnvelopeEditor
                color="var(--fm1-accent)"
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

              <div className="grid min-w-0 content-start gap-3">
                <div
                  aria-label={`${t('ui.oscillator')} / ${t('ui.keyboardScaling')}`}
                  className="relative grid grid-cols-2 rounded-lg border border-[color-mix(in_srgb,var(--operator-color)_35%,var(--color-border))] bg-white p-1 shadow-sm"
                  role="tablist"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-[var(--operator-color)] shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none',
                      operatorPanelTab === 'scaling' && 'translate-x-full',
                    )}
                  />
                  <button
                    aria-controls="operator-oscillator-panel"
                    aria-selected={operatorPanelTab === 'oscillator'}
                    className={cn(
                      'relative z-10 flex h-10 min-w-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      operatorPanelTab === 'oscillator' &&
                        'text-slate-950 hover:bg-transparent hover:text-slate-950',
                    )}
                    id="operator-oscillator-tab"
                    onClick={() => setOperatorPanelTab('oscillator')}
                    role="tab"
                    type="button"
                  >
                    <AudioWaveform className="size-4 shrink-0" />
                    <span className="truncate" title={t('ui.oscillator')}>
                      {t('ui.oscillator')}
                    </span>
                  </button>
                  <button
                    aria-controls="operator-scaling-panel"
                    aria-selected={operatorPanelTab === 'scaling'}
                    className={cn(
                      'relative z-10 flex h-10 min-w-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      operatorPanelTab === 'scaling' &&
                        'text-slate-950 hover:bg-transparent hover:text-slate-950',
                    )}
                    id="operator-scaling-tab"
                    onClick={() => setOperatorPanelTab('scaling')}
                    role="tab"
                    type="button"
                  >
                    <SlidersHorizontal className="size-4 shrink-0" />
                    <span className="truncate" title={t('ui.keyboardScaling')}>
                      {t('ui.keyboardScaling')}
                    </span>
                  </button>
                </div>

                <section
                  aria-labelledby="operator-oscillator-tab"
                  className="min-w-0 rounded-xl border border-[color-mix(in_srgb,var(--fm1-finish-tint)_30%,var(--color-border))] bg-white p-4 transition-colors"
                  hidden={operatorPanelTab !== 'oscillator'}
                  id="operator-oscillator-panel"
                  role="tabpanel"
                >
                  <div className="grid gap-4">
                    <RadioParameterControl
                      helpText={t('controlHelp.oscillatorMode')}
                      label={t('ui.mode')}
                      name={`oscillator-mode-${selectedOperator}`}
                      onChange={(value) => setParameter(operatorBase + 17, value, 1)}
                      options={oscillatorModes}
                      value={parameters[operatorBase + 17]}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <RotaryParameterControl
                        helpText={t('controlHelp.coarse')}
                        key={`${selectedOperator}-18`}
                        label={t('ui.coarse')}
                        max={31}
                        onChange={(value) => setParameter(operatorBase + 18, value, 31)}
                        onGestureEnd={endGesture}
                        onGestureStart={beginGesture}
                        value={parameters[operatorBase + 18]}
                      />
                      <RotaryParameterControl
                        helpText={t('controlHelp.fine')}
                        key={`${selectedOperator}-19`}
                        label={t('ui.fine')}
                        max={99}
                        onChange={(value) => setParameter(operatorBase + 19, value, 99)}
                        onGestureEnd={endGesture}
                        onGestureStart={beginGesture}
                        value={parameters[operatorBase + 19]}
                      />
                      <RotaryParameterControl
                        helpText={t('controlHelp.detune')}
                        key={`${selectedOperator}-20`}
                        label={t('ui.detune')}
                        max={7}
                        min={-7}
                        onChange={(value) => setParameter(operatorBase + 20, value + 7, 14)}
                        onGestureEnd={endGesture}
                        onGestureStart={beginGesture}
                        value={parameters[operatorBase + 20] - 7}
                        valueLabel={(value) => (value > 0 ? `+${value}` : String(value))}
                      />
                    </div>
                  </div>
                </section>

                <section
                  aria-labelledby="operator-scaling-tab"
                  className="min-w-0 rounded-xl border border-[color-mix(in_srgb,var(--fm1-finish-tint)_30%,var(--color-border))] bg-white p-4 transition-colors"
                  hidden={operatorPanelTab !== 'scaling'}
                  id="operator-scaling-panel"
                  role="tabpanel"
                >
                  <div className="grid gap-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {rotaryControl(t('ui.breakpoint'), 8, 99, t('controlHelp.breakpoint'))}
                      {rotaryControl(t('ui.rateScaling'), 13, 7, t('controlHelp.rateScaling'))}
                    </div>
                    <div className="grid gap-y-1">
                      <p className="text-center text-xs font-bold text-foreground">
                        {t('ui.depth')}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {rotaryControl(t('ui.left'), 9, 99, t('controlHelp.leftDepth'))}
                        {rotaryControl(t('ui.right'), 10, 99, t('controlHelp.rightDepth'))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {control(t('ui.leftCurve'), 11, 3, curves, t('controlHelp.curve'))}
                      {control(t('ui.rightCurve'), 12, 3, curves, t('controlHelp.curve'))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {rotaryControl(t('ui.velocity'), 15, 7, t('controlHelp.velocity'))}
                      {rotaryControl(
                        t('ui.ampModSensitivity'),
                        14,
                        3,
                        t('controlHelp.ampModSensitivity'),
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        aria-labelledby="unsaved-editor-title"
        closeOnBackdrop={false}
        onClose={() => setIsNavigationPending(false)}
        ref={unsavedDialogRef}
        size="2xl"
      >
        <DialogHeader className="block">
          <h2 className="text-lg font-bold" id="unsaved-editor-title">
            {t('editor.unsavedTitle')}
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{t('ui.unsavedBody')}</p>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end">
          <Button
            className="sm:h-auto sm:min-h-10 sm:min-w-0 sm:flex-1 sm:shrink sm:whitespace-normal"
            disabled={isResolvingNavigation}
            onClick={() => unsavedDialogRef.current?.close()}
            type="button"
            variant="ghost"
          >
            {t('editor.keepEditing')}
          </Button>
          <Button
            className="sm:h-auto sm:min-h-10 sm:min-w-0 sm:flex-1 sm:shrink sm:whitespace-normal"
            disabled={isResolvingNavigation}
            onClick={() => void finishPendingNavigation('discard')}
            type="button"
            variant="outline"
          >
            {isResolvingNavigation ? `${t('editor.discard')}…` : t('editor.discard')}
          </Button>
          <Button
            className="sm:h-auto sm:min-h-10 sm:min-w-0 sm:flex-1 sm:shrink sm:whitespace-normal"
            disabled={isResolvingNavigation}
            onClick={() => void finishPendingNavigation('save')}
            type="button"
          >
            {t('editor.saveAndReturn')}
          </Button>
        </DialogFooter>
      </Dialog>
    </section>
  )
}
