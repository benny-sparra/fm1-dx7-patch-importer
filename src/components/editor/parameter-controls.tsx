import { Check, ChevronDown } from 'lucide-react'
import { useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { HelpPopover } from '@/components/ui/help-popover'
import { OnOffLabel } from '@/components/ui/on-off-label'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { rotaryControlAngle } from '@/lib/editor-visuals'
import { rangeStyle } from '@/lib/range-style'
import { cn } from '@/lib/utils'

const lfoWaveKeys = [
  'ui.lfoWaves.triangle',
  'ui.lfoWaves.sawDown',
  'ui.lfoWaves.sawUp',
  'ui.lfoWaves.square',
  'ui.lfoWaves.sine',
  'ui.lfoWaves.sampleAndHold',
] as const

/** The rack's control caption: small, tracked-out capitals in the dim ink. */
const captionClass = 'text-[11px] font-normal tracking-[0.1em] text-[var(--crt-ink-3)] uppercase'

/** An LED readout: the amber VT323 figures every value on the rack uses. */
const ledClass = 'font-vt323 leading-none text-[var(--crt-led)]'

/** A sunken field — selects, number entry and the wave picker's trigger. */
const fieldClass =
  'crt-inset h-8 min-w-0 rounded-none bg-[var(--crt-bg-1)] px-2 text-xs text-[var(--crt-ink)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]'

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

export const rangeControlKeys = [
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
  const { t } = useTranslation()
  const drag = useRef<{ pointerId: number; startValue: number; startY: number } | null>(null)
  const faceId = `knob-face-${useId().replace(/:/g, '')}`
  const displayValue = valueLabel(value)
  const fraction = (value - min) / (max - min)
  const angle = rotaryControlAngle(value, min, max)
  const clamp = (nextValue: number) => Math.max(min, Math.min(max, Math.round(nextValue)))

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!rangeControlKeys.includes(event.key)) return
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
    <div className={cn('grid min-w-0 justify-items-center gap-1', captionClass)}>
      <span className="flex max-w-full min-w-0 items-center gap-1">
        <span className="min-w-0 text-balance break-words" title={label}>
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
        className="group relative size-[3.6rem] cursor-ns-resize touch-none rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
        onBlur={onGestureEnd}
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => {
          if (rangeControlKeys.includes(event.key)) onGestureEnd()
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
        title={t('ui.rotaryTitle', { label, value: displayValue })}
      >
        {/*
          A bevelled knob: a domed face lit from the top left, an arc of
          ticks that fills with the value, and a glowing pointer.
        */}
        <svg aria-hidden="true" className="size-full overflow-visible" viewBox="0 0 76 76">
          <defs>
            <radialGradient cx="35%" cy="28%" id={faceId} r="75%">
              <stop offset="0%" style={{ stopColor: 'var(--crt-hatch-a)' }} />
              <stop offset="70%" style={{ stopColor: 'var(--crt-bg-1)' }} />
            </radialGradient>
          </defs>
          {Array.from({ length: 11 }, (_, index) => {
            const tickAngle = -135 + index * 27
            return (
              <line
                className={
                  index / 10 <= fraction
                    ? 'stroke-[var(--operator-color,var(--crt-acc))]'
                    : 'stroke-[var(--crt-line)]'
                }
                key={index}
                strokeWidth="2"
                transform={`rotate(${tickAngle} 38 38)`}
                x1="38"
                x2="38"
                y1="2"
                y2={index % 5 === 0 ? '9' : '7'}
              />
            )
          })}
          <circle cx="38" cy="38" fill={`url(#${faceId})`} r="25" />
          <circle
            className="stroke-[var(--crt-shadow)]"
            cx="38"
            cy="38"
            fill="none"
            r="25"
            strokeWidth="2.5"
          />
          <circle
            className="stroke-[var(--crt-bevel)] transition group-hover:stroke-[var(--crt-bevel-lt)]"
            cx="38"
            cy="38"
            fill="none"
            r="25"
            strokeDasharray="78.5 78.5"
            strokeWidth="2.5"
            transform="rotate(135 38 38)"
          />
          <line
            className="stroke-[var(--operator-color,var(--crt-acc))] [filter:drop-shadow(0_0_3px_var(--operator-color,var(--crt-acc)))]"
            strokeWidth="2.5"
            transform={`rotate(${angle} 38 38)`}
            x1="38"
            x2="38"
            y1="16"
            y2="34"
          />
        </svg>
      </div>
      <output
        className={cn(
          ledClass,
          'min-w-11 border border-[var(--crt-line-dk)] bg-[var(--crt-bg-1)] px-1.5 py-0.5 text-center text-[19px]',
        )}
      >
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
    <label className={cn('grid min-w-0 gap-1', captionClass)}>
      <span className="flex min-w-0 items-center gap-1 overflow-hidden">
        <span className="min-w-0 text-balance break-words" title={label}>
          {label}
        </span>
        {helpText ? <HelpPopover label={label} text={helpText} /> : null}
      </span>
      <span className="flex min-h-6 min-w-0 items-center gap-2">
        <input
          aria-label={label}
          className="min-w-0 flex-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
          max={max}
          min={min}
          onBlur={onGestureEnd}
          onChange={(event) => onChange(Number(event.target.value))}
          onKeyDown={(event) => {
            if (rangeControlKeys.includes(event.key)) onGestureStart()
          }}
          onKeyUp={onGestureEnd}
          onPointerCancel={onGestureEnd}
          onPointerDown={onGestureStart}
          onPointerUp={onGestureEnd}
          step={1}
          style={rangeStyle(value, min, max, 'var(--crt-acc)', origin)}
          type="range"
          value={value}
        />
        <output className={cn(ledClass, 'min-w-7 shrink-0 text-right text-lg')}>
          {valueLabel(value)}
        </output>
      </span>
    </label>
  )
}

export function SwitchParameterControl({
  helpText,
  label,
  onChange,
  value,
}: SwitchParameterControlProps) {
  const checked = value > 0
  const inputId = useId()

  return (
    <div className={cn('grid min-w-0 content-start gap-1', captionClass)}>
      <span className="flex min-w-0 items-center gap-1">
        <span className="min-w-0 text-balance break-words" title={label}>
          {label}
        </span>
        {helpText ? <HelpPopover label={label} text={helpText} /> : null}
      </span>
      <label className="flex cursor-pointer" htmlFor={inputId}>
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
        {/* A latching panel button: lit and raised-bright while on. */}
        <span
          className={cn(
            'flex items-center gap-1.5 border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] px-3 py-[3px] text-[11px] tracking-[0.1em] uppercase peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--crt-led)]',
            checked
              ? 'border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-btn)] text-[var(--crt-ink)]'
              : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]',
          )}
        >
          <span aria-hidden="true" className="crt-led" data-state={checked ? 'on' : 'off'} />
          <OnOffLabel on={checked} />
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
  showLabel = true,
  value,
}: {
  helpText?: string
  label: string
  name: string
  onChange: (value: number) => void
  options: string[]
  /** Hide the caption where a panel heading already names the choice. */
  showLabel?: boolean
  value: number
}) {
  return (
    <div
      className={cn(
        'min-w-0',
        captionClass,
        showLabel ? 'grid gap-1' : 'flex items-center gap-1.5',
      )}
    >
      {showLabel ? (
        <span className="flex items-center gap-1">
          {label}
          {helpText ? <HelpPopover label={label} text={helpText} /> : null}
        </span>
      ) : helpText ? (
        <HelpPopover label={label} text={helpText} />
      ) : null}
      <div aria-label={label} className="flex" role="radiogroup">
        {options.map((option, index) => (
          <label
            className={cn(
              'flex flex-1 cursor-pointer items-center justify-center border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] px-2.5 py-[3px] text-[11px] tracking-[0.1em] uppercase transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--crt-led)]',
              value === index
                ? 'border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-btn)] text-[var(--crt-ink)]'
                : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]',
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
    <label className={cn('grid min-w-0 gap-1', captionClass)}>
      <span className="flex min-w-0 items-center gap-1">
        <span className="min-w-0 text-balance break-words" title={label}>
          {label}
        </span>
        {helpText ? <HelpPopover label={label} text={helpText} /> : null}
      </span>
      {options ? (
        <select
          className={cn(fieldClass, 'normal-case')}
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
          className={cn(fieldClass, 'font-vt323 text-base text-[var(--crt-led)]')}
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
  const lfoWaves = lfoWaveKeys.map((key) => t(key))
  const selectedWave = lfoWaves[value] ?? lfoWaves[0]

  const selectWave = (wave: number) => {
    onChange(wave)
    dropdownRef.current?.removeAttribute('open')
  }

  return (
    <div className={cn('grid min-w-0 content-start gap-1', captionClass)}>
      <span className="flex items-center gap-1">
        {t('ui.lfoWave')}
        <HelpPopover label={t('ui.lfoWave')} text={t('controlHelp.lfoWave')} />
      </span>
      <details className="group relative min-w-0" ref={dropdownRef}>
        <summary
          aria-label={`${t('ui.lfoWave')}: ${selectedWave}`}
          className={cn(
            fieldClass,
            'flex cursor-pointer list-none items-center gap-1.5 normal-case transition-colors hover:bg-[var(--crt-bg-head)] [&::-webkit-details-marker]:hidden',
          )}
        >
          <WaveShapeIcon wave={value} />
          <span className="min-w-0 flex-1 truncate">{selectedWave}</span>
          <ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <div
          aria-label={t('editor.lfoWave')}
          className="menu-surface crt-raised absolute top-[calc(100%+0.25rem)] left-0 z-30 grid w-full min-w-48 overflow-hidden bg-[var(--crt-bg-panel2)] p-1 text-[var(--crt-ink)] normal-case"
          role="radiogroup"
        >
          {lfoWaves.map((wave, index) => (
            <button
              aria-checked={value === index}
              className={cn(
                'flex h-8 w-full items-center gap-2 px-2 text-left text-xs tracking-normal transition-colors hover:bg-[var(--crt-sel-bg)] hover:text-[var(--crt-acc-lt)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)]',
                value === index && 'bg-[var(--crt-sel-bg)] text-[var(--crt-led)]',
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
