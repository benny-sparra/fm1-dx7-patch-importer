import { Check, ChevronDown } from 'lucide-react'
import { type ComponentProps, type ReactNode, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import '@/i18n/editor-help'
import { ErrorNotice } from '@/components/ui/error-notice'
import { HelpPopover } from '@/components/ui/help-popover'
import { Switch } from '@/components/ui/switch'
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
const ledClass = 'font-vt323 text-[var(--crt-led)]'

/** A sunken field — selects, number entry and the wave picker's trigger. */
const fieldSurfaceClass =
  'crt-inset h-8 min-w-0 rounded-none bg-[var(--crt-bg-1)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]'
const fieldFrameClass = `${fieldSurfaceClass} px-2`
const fieldClass = `${fieldFrameClass} text-xs text-[var(--crt-ink)]`

/**
 * A rack dropdown. The browser's own arrow sits hard against the right edge,
 * so it is hidden and a chevron is drawn inset from the edge instead, as the
 * wave picker's is. `className` sets the field's surface, size and text; the
 * horizontal padding is the component's, leaving room for the chevron.
 */
export function RackSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative block min-w-0">
      <select {...props} className={cn('peer w-full appearance-none pr-7 pl-2', className)} />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-[var(--crt-ink-3)] peer-disabled:opacity-50"
      />
    </span>
  )
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
  /** Keeps the name on one line rather than wrapping it in a narrow column. */
  singleLine?: boolean
  value: number
}

type SliderParameterControlProps = {
  helpText?: string
  label: string
  /** A control beside the label, after its help, such as the menu putting it on an FM1 knob. */
  labelAction?: ReactNode
  max: number
  min?: number
  onChange: (value: number) => void
  onGestureEnd: () => void
  onGestureStart: () => void
  origin?: number
  value: number
  valueLabel?: (value: number) => string
}

type RotaryParameterControlProps = Omit<SliderParameterControlProps, 'origin'> & {
  /** The knob's accessible name where the caption alone is not enough, such as "Bitcrush Bits". */
  accessibleLabel?: string
  /** Greys the knob out and ignores the pointer and keys, as a disabled range input does. */
  disabled?: boolean
}

const rangeControlKeys = [
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
]

/**
 * The gesture handlers a native range input takes, so that a drag or a held arrow key is one undo
 * step: it starts on pointer down or a range key, and ends on pointer up or cancel, key up, or blur.
 */
export function rangeInputGestureHandlers(onGestureStart: () => void, onGestureEnd: () => void) {
  return {
    onBlur: onGestureEnd,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (rangeControlKeys.includes(event.key)) onGestureStart()
    },
    onKeyUp: onGestureEnd,
    onPointerCancel: onGestureEnd,
    onPointerDown: onGestureStart,
    onPointerUp: onGestureEnd,
  }
}

/**
 * Where one of `rangeControlKeys` moves a knob or fader from `value`, as a range input moves:
 * arrows by one, Page Up and Page Down by a tenth of the range, Home and End to its ends.
 */
function rangeKeyValue(key: string, value: number, min: number, max: number) {
  const pageStep = Math.max(1, Math.round((max - min) / 10))
  if (key === 'Home') return min
  if (key === 'End') return max
  if (key === 'ArrowUp' || key === 'ArrowRight') return value + 1
  if (key === 'ArrowDown' || key === 'ArrowLeft') return value - 1
  return value + (key === 'PageUp' ? pageStep : -pageStep)
}

export function RotaryParameterControl({
  accessibleLabel,
  disabled = false,
  helpText,
  label,
  labelAction,
  max,
  min = 0,
  onChange,
  onGestureEnd,
  onGestureStart,
  value,
  valueLabel = String,
}: RotaryParameterControlProps) {
  const { t } = useTranslation()
  const name = accessibleLabel ?? label
  const drag = useRef<{ pointerId: number; startValue: number; startY: number } | null>(null)
  const faceId = `knob-face-${useId().replace(/:/g, '')}`
  const displayValue = valueLabel(value)
  const fraction = (value - min) / (max - min)
  const angle = rotaryControlAngle(value, min, max)
  const isStepped = max - min < 10
  const tickCount = isStepped ? max - min + 1 : 11
  const clamp = (nextValue: number) => Math.max(min, Math.min(max, Math.round(nextValue)))

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !rangeControlKeys.includes(event.key)) return
    event.preventDefault()
    if (!event.repeat) onGestureStart()

    onChange(clamp(rangeKeyValue(event.key, value, min, max)))
  }

  return (
    <div className={cn('grid min-w-0 justify-items-center gap-1', captionClass)}>
      {/* The help button flows after the label's last word, so a label that wraps keeps it
          beside the text rather than at the column's far edge. */}
      <span className="max-w-full text-center text-balance break-words">
        <span title={label}>{label}</span>
        {helpText ? (
          <span className="ml-1 inline-block align-middle">
            <HelpPopover label={name} text={helpText} />
          </span>
        ) : null}
        {labelAction}
      </span>
      <div
        aria-disabled={disabled || undefined}
        aria-label={name}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={value}
        aria-valuetext={displayValue}
        className={cn(
          'group relative size-[3.6rem] touch-none rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]',
          disabled ? 'cursor-not-allowed opacity-40' : 'cursor-ns-resize',
        )}
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
          if (disabled) return
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
        // A disabled knob leaves the tab order, as a disabled range input does.
        tabIndex={disabled ? undefined : 0}
        title={t('ui.rotaryTitle', { label: name, value: displayValue })}
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
          {/* A knob with a few positions, such as Key Tracking's four, clicks between them: a
              tick for each, all long, rather than the scale's eleven. */}
          {Array.from({ length: tickCount }, (_, index) => {
            const tickAngle = -135 + (index * 270) / (tickCount - 1)
            return (
              <line
                className={
                  !disabled && index / (tickCount - 1) <= fraction
                    ? 'stroke-[var(--operator-color,var(--crt-acc))]'
                    : 'stroke-[var(--crt-line)]'
                }
                key={index}
                strokeWidth="2"
                transform={`rotate(${tickAngle} 38 38)`}
                x1="38"
                x2="38"
                y1="2"
                y2={isStepped || index % 5 === 0 ? '9' : '7'}
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
            className={
              disabled
                ? 'stroke-[var(--crt-ink-4)]'
                : 'stroke-[var(--operator-color,var(--crt-acc))] [filter:drop-shadow(0_0_3px_var(--operator-color,var(--crt-acc)))]'
            }
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
          'font-vt323 min-w-11 border border-[var(--crt-line-dk)] bg-[var(--crt-bg-1)] px-1.5 py-0.5 text-center text-[19px]',
          disabled ? 'text-[var(--crt-ink-4)]' : 'text-[var(--crt-led)]',
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
  labelAction,
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
        {labelAction}
      </span>
      <span className="flex min-h-6 min-w-0 items-center gap-2">
        <input
          aria-label={label}
          className="min-w-0 flex-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
          max={max}
          min={min}
          {...rangeInputGestureHandlers(onGestureStart, onGestureEnd)}
          onChange={(event) => onChange(Number(event.target.value))}
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

/**
 * A level as an upright fader, as a Juno's sliders are: the sliders' LED meter stood on end, lit
 * from the bottom, with a metal cap. It fills the height its row gives it. Dragging moves the cap
 * to the pointer, and the keys move it as they move a knob; a drag or a held key is one gesture.
 */
export function FaderParameterControl({
  accessibleLabel,
  disabled = false,
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
  const name = accessibleLabel ?? label
  const dragPointer = useRef<number | null>(null)
  const displayValue = valueLabel(value)
  const percent = ((Math.max(min, Math.min(max, value)) - min) / (max - min)) * 100
  const clamp = (nextValue: number) => Math.max(min, Math.min(max, Math.round(nextValue)))

  /** The value at the pointer's height on the travel, the cap's centre at either end. */
  const valueAtPointer = (track: HTMLElement, clientY: number) => {
    const { bottom, height } = track.getBoundingClientRect()
    return clamp(min + ((bottom - clientY) / Math.max(1, height)) * (max - min))
  }

  return (
    <div
      className={cn(
        'grid min-h-0 min-w-0 grid-rows-[auto_minmax(6rem,1fr)_auto] justify-items-center gap-1.5',
        captionClass,
      )}
    >
      <span className="max-w-full text-center text-balance break-words">
        <span title={label}>{label}</span>
        {helpText ? (
          <span className="ml-1 inline-block align-middle">
            <HelpPopover label={name} text={helpText} />
          </span>
        ) : null}
      </span>
      <div
        aria-disabled={disabled || undefined}
        aria-label={name}
        aria-orientation="vertical"
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={value}
        aria-valuetext={displayValue}
        className={cn(
          'group relative h-full w-10 touch-none outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]',
          disabled ? 'cursor-not-allowed opacity-40' : 'cursor-ns-resize',
        )}
        onBlur={onGestureEnd}
        onKeyDown={(event) => {
          if (disabled || !rangeControlKeys.includes(event.key)) return
          event.preventDefault()
          if (!event.repeat) onGestureStart()
          onChange(clamp(rangeKeyValue(event.key, value, min, max)))
        }}
        onKeyUp={(event) => {
          if (rangeControlKeys.includes(event.key)) onGestureEnd()
        }}
        onPointerCancel={() => {
          dragPointer.current = null
          onGestureEnd()
        }}
        onPointerDown={(event) => {
          if (disabled) return
          dragPointer.current = event.pointerId
          event.currentTarget.setPointerCapture(event.pointerId)
          onGestureStart()
          const track = event.currentTarget.querySelector<HTMLElement>('[data-fader-track]')
          if (track) onChange(valueAtPointer(track, event.clientY))
        }}
        onPointerMove={(event) => {
          if (dragPointer.current !== event.pointerId) return
          const track = event.currentTarget.querySelector<HTMLElement>('[data-fader-track]')
          if (track) onChange(valueAtPointer(track, event.clientY))
        }}
        onPointerUp={(event) => {
          if (dragPointer.current !== event.pointerId) return
          dragPointer.current = null
          event.currentTarget.releasePointerCapture(event.pointerId)
          onGestureEnd()
        }}
        role="slider"
        // A disabled fader leaves the tab order, as a disabled range input does.
        tabIndex={disabled ? undefined : 0}
        title={t('ui.rotaryTitle', { label: name, value: displayValue })}
      >
        {/* A scale down each side, a long tick at either end and the middle. */}
        {(['left-0 items-start', 'right-0 items-end'] as const).map((side) => (
          <div
            aria-hidden="true"
            className={cn('absolute inset-y-1 flex w-1.5 flex-col justify-between', side)}
            key={side}
          >
            {Array.from({ length: 11 }, (_, index) => (
              <span
                className={cn(
                  'block h-px bg-[var(--crt-line-lt)]',
                  index % 5 === 0 ? 'w-full' : 'w-3/5',
                )}
                key={index}
              />
            ))}
          </div>
        ))}
        <div
          aria-hidden="true"
          className="crt-fader-track absolute inset-y-1 left-1/2 w-2.5 -translate-x-1/2"
          data-fader-track
          style={rangeStyle(value, min, max, 'var(--crt-acc)')}
        />
        <div
          aria-hidden="true"
          className="crt-fader-cap pointer-events-none absolute left-1/2 h-3.5 w-7 -translate-x-1/2 translate-y-1/2"
          style={{ bottom: `calc(0.25rem + (100% - 0.5rem) * ${percent / 100})` }}
        />
      </div>
      <output className={cn(ledClass, 'min-w-7 text-center text-2xl', disabled && 'opacity-40')}>
        {displayValue}
      </output>
    </div>
  )
}

/**
 * An on/off parameter as the CRT slide switch, labelled by the parameter's name, as the effects'
 * switches are. The name stays the same in either state; the switch says which it is.
 */
export function SwitchParameterControl({
  helpText,
  label,
  onChange,
  singleLine = false,
  value,
}: SwitchParameterControlProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-1', captionClass)}>
      <Switch
        checked={value > 0}
        className="-ml-1 inline-flex min-h-6 min-w-0 items-center gap-2 px-1 transition-colors"
        onChange={(checked) => onChange(checked ? 1 : 0)}
      >
        <span className={singleLine ? 'whitespace-nowrap' : 'min-w-0 text-balance break-words'}>
          {label}
        </span>
      </Switch>
      {helpText ? <HelpPopover label={label} text={helpText} /> : null}
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
      {/*
        A segmented control: the options share one sunken track and only the
        chosen one stands raised out of it, so they read as one choice between
        them. Focus rings the whole track, where no option can paint over it;
        the arrow keys move the choice, as in any radio group.
      */}
      <div
        aria-label={label}
        className="crt-inset flex gap-[2px] bg-[var(--crt-bg-1)] p-[2px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--crt-led)]"
        role="radiogroup"
      >
        {options.map((option, index) => (
          <label
            className={cn(
              'flex flex-1 cursor-pointer items-center justify-center border-t border-r border-b border-l px-2.5 py-px text-[11px] leading-4 tracking-[0.1em] uppercase transition-colors',
              value === index
                ? 'border-t-[var(--crt-bevel-lt)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-btn)] text-[var(--crt-ink)]'
                : 'border-transparent text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]',
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
        <RackSelect
          className={`${fieldSurfaceClass} text-xs text-[var(--crt-ink)] normal-case`}
          onChange={(event) => onChange(Number(event.target.value))}
          value={value}
        >
          {options.map((option, index) => (
            <option key={option} value={index}>
              {option}
            </option>
          ))}
        </RackSelect>
      ) : (
        <input
          className={cn(fieldFrameClass, 'font-vt323 text-base text-[var(--crt-led)]')}
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

type TypedValueControlProps = {
  helpText?: string
  /** The translated message shown when the typed text cannot be used. */
  invalidMessage: string
  label: string
  /** Applies the typed text, returning false when it cannot be used. */
  onCommit: (text: string) => boolean
  value: string
}

/**
 * A value typed rather than turned, such as an operator's ratio. It shows the
 * current value until edited, applies the text on Enter or when focus leaves,
 * and then shows whatever value the text produced. Escape, or leaving text
 * that cannot be used, puts the current value back.
 */
export function TypedValueControl({
  helpText,
  invalidMessage,
  label,
  onCommit,
  value,
}: TypedValueControlProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const errorId = useId()

  const discard = () => {
    setDraft(null)
    setInvalid(false)
  }
  const commit = () => {
    if (draft === null) return true
    if (!onCommit(draft)) {
      setInvalid(true)
      return false
    }
    discard()
    return true
  }

  return (
    <div className="grid min-w-0 gap-1">
      <label className={cn('grid min-w-0 gap-1', captionClass)}>
        <span className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 text-balance break-words" title={label}>
            {label}
          </span>
          {helpText ? <HelpPopover label={label} text={helpText} /> : null}
        </span>
        <input
          aria-describedby={invalid ? errorId : undefined}
          aria-invalid={invalid || undefined}
          aria-label={label}
          autoComplete="off"
          className={cn(
            fieldFrameClass,
            'font-vt323 w-28 justify-self-start text-base text-[var(--crt-led)]',
          )}
          inputMode="decimal"
          onBlur={() => {
            if (!commit()) discard()
          }}
          onChange={(event) => {
            setDraft(event.target.value)
            setInvalid(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            } else if (event.key === 'Escape' && draft !== null) {
              event.preventDefault()
              discard()
            }
          }}
          spellCheck={false}
          type="text"
          value={draft ?? value}
        />
      </label>
      {invalid ? (
        <div id={errorId}>
          <ErrorNotice>{invalidMessage}</ErrorNotice>
        </div>
      ) : null}
    </div>
  )
}

/**
 * An LFO wave's shape, by its DX7 number: triangle, saw down, saw up, square, sine, sample and
 * hold. `className` sizes it; a box of another shape stretches the wave, at the same line width.
 */
export function WaveShapeIcon({ className, wave }: { className?: string; wave: number }) {
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
      className={className ?? 'h-4 w-7 shrink-0'}
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 32 16"
    >
      <path
        d={paths[wave] ?? paths[0]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
        vectorEffect="non-scaling-stroke"
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

/**
 * A choice drawn as pictures, picked as the algorithm is: a dropdown of tiles, each option's
 * picture under its name, and the chosen one's picture in a square well below the trigger, as the
 * algorithm panel draws its diagram. The well's picture is decorative; the trigger names the
 * choice. A choice that a scope beside it already draws, such as the filter's Type, leaves the
 * well out with `well={false}`.
 */
/** A picture picker's choice: its name, and its picture at the size its box gives it. */
type PictureOption = { label: string; picture: (className: string) => ReactNode }

/** A picture picker's tile, raised and lit while it holds the choice. */
const pictureTileClass = (selected: boolean) =>
  cn(
    'grid min-w-0 cursor-pointer justify-items-center gap-2 border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] px-2 pt-1.5 pb-3 transition-colors hover:bg-[var(--crt-bg-head)] hover:text-[var(--crt-acc-lt)]',
    selected
      ? 'border-t-[var(--crt-acc)] border-l-[var(--crt-acc)] bg-[var(--crt-sel-bg)] text-[var(--crt-led)]'
      : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-1)] text-[var(--crt-acc-mid)]',
  )

const pictureTileLabelClass =
  'justify-self-start text-[11px] tracking-[0.1em] text-[var(--crt-ink-4)] uppercase'

export function PicturePickerControl({
  helpText,
  label,
  onChange,
  options,
  value,
}: {
  helpText?: string
  label: string
  onChange: (value: number) => void
  options: PictureOption[]
  value: number
}) {
  const dropdownRef = useDismissableDetails()
  const selected = options[value] ?? options[0]

  const select = (index: number) => {
    onChange(index)
    dropdownRef.current?.removeAttribute('open')
  }

  return (
    <div className={cn('flex min-w-0 flex-1 flex-col gap-1', captionClass)}>
      <span className="flex items-center gap-1">
        {label}
        {helpText ? <HelpPopover label={label} text={helpText} /> : null}
      </span>
      <details className="group relative min-w-0" ref={dropdownRef}>
        <summary
          aria-label={`${label}: ${selected.label}`}
          className={cn(
            fieldClass,
            'flex cursor-pointer list-none items-center gap-1.5 transition-colors hover:bg-[var(--crt-bg-head)] [&::-webkit-details-marker]:hidden',
          )}
        >
          {selected.picture('h-4 w-7 shrink-0 text-[var(--crt-acc-lt)]')}
          <span className="min-w-0 flex-1 truncate tracking-[0.1em]">{selected.label}</span>
          <ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <div
          aria-label={label}
          className="editor-menu-surface absolute top-[calc(100%+0.3rem)] left-0 z-30 grid w-[min(20rem,calc(100vw-1.5rem))] grid-cols-2 gap-1.5 border-t-2 border-r-2 border-b-2 border-l-2 border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel2)] p-2"
          role="radiogroup"
        >
          {options.map((option, index) => (
            <button
              aria-checked={value === index}
              aria-label={option.label}
              className={cn(
                pictureTileClass(value === index),
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]',
              )}
              key={option.label}
              onClick={() => select(index)}
              role="radio"
              type="button"
            >
              <span className={pictureTileLabelClass}>{option.label}</span>
              {option.picture('h-8 w-16')}
            </button>
          ))}
        </div>
      </details>
      <div aria-hidden="true" className="crt-well relative aspect-square">
        {selected.picture(
          'absolute top-3 left-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] text-[var(--crt-led)] drop-shadow-[0_0_6px_var(--crt-led-glow)]',
        )}
      </div>
    </div>
  )
}

/**
 * The picture picker's choices laid out on the panel rather than in a dropdown, for a panel with
 * room to show them all, such as the Virtual Analog filter's types. Native radios, so the arrow
 * keys move the choice and focus rings the tile that holds it.
 */
export function PictureRadioControl({
  helpText,
  label,
  onChange,
  options,
  value,
}: {
  helpText?: string
  label: string
  onChange: (value: number) => void
  options: PictureOption[]
  value: number
}) {
  const name = useId()
  return (
    <div className={cn('grid min-w-0 gap-1', captionClass)}>
      <span className="flex items-center gap-1">
        {label}
        {helpText ? <HelpPopover label={label} text={helpText} /> : null}
      </span>
      <div aria-label={label} className="grid grid-cols-2 gap-1.5" role="radiogroup">
        {options.map((option, index) => (
          <label
            className={cn(
              pictureTileClass(value === index),
              'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--crt-led)]',
            )}
            key={option.label}
          >
            <input
              checked={value === index}
              className="sr-only"
              name={name}
              onChange={() => onChange(index)}
              type="radio"
              value={index}
            />
            <span className={pictureTileLabelClass}>{option.label}</span>
            {option.picture('h-8 w-16')}
          </label>
        ))}
      </div>
    </div>
  )
}
