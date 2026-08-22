import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { HelpPopover } from '@/components/ui/help-popover'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { rangeStyle } from '@/lib/range-style'
import { cn } from '@/lib/utils'

const lfoWaves = ['Triangle', 'Saw down', 'Saw up', 'Square', 'Sine', 'Sample & hold']

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

export function RotaryParameterControl({
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

export function SliderParameterControl({
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

export function CollapseButton({
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

export function SwitchParameterControl({
  helpText,
  label,
  onChange,
  value,
}: SwitchParameterControlProps) {
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

export function RadioParameterControl({
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

export function ParameterControl({
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

export function LfoWaveControl({
  onChange,
  value,
}: {
  onChange: (value: number) => void
  value: number
}) {
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
