import { useId, useRef, type KeyboardEvent, type PointerEvent } from 'react'

import { HelpPopover } from '@/components/ui/help-popover'
import {
  clampEnvelopeValue,
  envelopePath,
  envelopePointPosition,
  pitchEnvelopeLevelFromY,
  pitchEnvelopePointPosition,
} from '@/lib/editor-visuals'
import { cn } from '@/lib/utils'

type EnvelopeEditorProps = {
  color: string
  helpText: string
  levels: number[]
  onChange: (rate: number, level: number, point: number) => void
  onGestureEnd: () => void
  onGestureStart: () => void
  rates: number[]
  showTitle?: boolean
  title: string
  variant?: 'amplitude' | 'pitch'
}

const width = 400
const height = 180
const plotTop = 20
const plotBottom = 156
const slotWidth = 90

export function EnvelopeEditor({
  color,
  helpText,
  levels,
  onChange,
  onGestureEnd,
  onGestureStart,
  rates,
  showTitle = true,
  title,
  variant = 'amplitude',
}: EnvelopeEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const activePointer = useRef<number | null>(null)
  // Two envelopes share the page, so the fill gradient needs its own id.
  const fillId = `envelope-fill-${useId().replace(/:/g, '')}`

  const updateFromPointer = (event: PointerEvent<SVGRectElement>, point: number) => {
    const bounds = svgRef.current?.getBoundingClientRect()
    if (!bounds) return

    const x = ((event.clientX - bounds.left) / bounds.width) * width
    const y = ((event.clientY - bounds.top) / bounds.height) * height
    const slotStart = 28 + point * slotWidth
    const rate = clampEnvelopeValue(99 - ((x - slotStart) / 58) * 99, rates[point] ?? 0)
    const level =
      variant === 'pitch'
        ? pitchEnvelopeLevelFromY(y)
        : clampEnvelopeValue(((plotBottom - y) / (plotBottom - plotTop)) * 99, levels[point] ?? 0)
    onChange(rate, level, point)
  }

  const handleKeyDown = (event: KeyboardEvent<SVGRectElement>, point: number) => {
    const step = event.shiftKey ? 10 : 1
    const nextRate =
      event.key === 'ArrowLeft'
        ? rates[point] + step
        : event.key === 'ArrowRight'
          ? rates[point] - step
          : rates[point]
    const nextLevel =
      event.key === 'ArrowUp'
        ? levels[point] + step
        : event.key === 'ArrowDown'
          ? levels[point] - step
          : levels[point]

    if (!event.key.startsWith('Arrow')) return
    event.preventDefault()
    onChange(nextRate, nextLevel, point)
  }

  const pointerHandlers = (point: number) => ({
    onPointerCancel: () => {
      activePointer.current = null
      onGestureEnd()
    },
    onPointerDown: (event: PointerEvent<SVGRectElement>) => {
      activePointer.current = event.pointerId
      event.currentTarget.setPointerCapture(event.pointerId)
      onGestureStart()
      updateFromPointer(event, point)
    },
    onPointerMove: (event: PointerEvent<SVGRectElement>) => {
      if (activePointer.current === event.pointerId) updateFromPointer(event, point)
    },
    onPointerUp: (event: PointerEvent<SVGRectElement>) => {
      if (activePointer.current !== event.pointerId) return
      activePointer.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
      onGestureEnd()
    },
  })

  const pointPosition = variant === 'pitch' ? pitchEnvelopePointPosition : envelopePointPosition
  const fillBaseline = variant === 'pitch' ? pitchEnvelopePointPosition(0, 50, 0).y : plotBottom
  const points = rates.map((rate, index) => pointPosition(rate, levels[index], index))

  const updateNumericValue = (kind: 'level' | 'rate', value: number, point: number) => {
    const currentRate = rates[point] ?? 0
    const currentLevel = levels[point] ?? 0
    const currentValue = kind === 'rate' ? currentRate : currentLevel
    const nextValue = clampEnvelopeValue(value, currentValue)
    onChange(
      kind === 'rate' ? nextValue : currentRate,
      kind === 'level' ? nextValue : currentLevel,
      point,
    )
  }

  const inputClass =
    'font-vt323 h-6 w-full min-w-0 bg-transparent text-center text-[17px] leading-none text-[var(--crt-led)] outline-none [appearance:textfield] focus:bg-[var(--crt-sel-bg)] focus-visible:outline-1 focus-visible:outline-[var(--crt-led)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

  return (
    <div
      className="@container flex min-h-0 min-w-0 flex-col gap-[7px]"
      style={{ '--operator-color': color } as React.CSSProperties}
    >
      <div className="crt-well relative min-h-0 p-[3px]">
        <div className="flex items-center justify-end gap-1 px-[5px] pt-[3px] pb-2 text-[11px] tracking-[0.12em] text-[var(--crt-acc-mid)] uppercase">
          {showTitle ? (
            <>
              {title}
              <HelpPopover
                className="text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]"
                label={title}
                text={helpText}
              />
            </>
          ) : (
            <span aria-hidden="true">R / L</span>
          )}
        </div>
        <svg
          aria-label={title}
          className={cn(
            'block min-h-0 w-full flex-1 touch-none',
            variant === 'amplitude' && 'max-h-60',
          )}
          ref={svgRef}
          role="group"
          viewBox={`0 0 ${width} ${height}`}
        >
          <defs>
            <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((line) => (
            <line
              key={`h-${line}`}
              stroke={variant === 'pitch' && line === 2 ? 'var(--crt-line)' : 'var(--crt-grid)'}
              x1="8"
              x2="392"
              y1={plotTop + line * 34}
              y2={plotTop + line * 34}
            />
          ))}
          {[0, 1, 2, 3, 4].map((line) => (
            <line
              key={`v-${line}`}
              stroke="var(--crt-grid)"
              x1={8 + line * 96}
              x2={8 + line * 96}
              y1={plotTop}
              y2={plotBottom}
            />
          ))}
          <path
            d={`${envelopePath(rates, levels, pointPosition)} L ${points.at(-1)?.x ?? 360} ${fillBaseline} L 8 ${fillBaseline} Z`}
            fill={`url(#${fillId})`}
          />
          <path
            d={envelopePath(rates, levels, pointPosition)}
            fill="none"
            stroke={color}
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
          {points.map((point, index) => (
            <g key={index}>
              <text
                className="font-vt323"
                fill="var(--crt-ink-4)"
                fontSize="14"
                textAnchor="middle"
                x={point.x}
                y="176"
              >
                {index + 1}
              </text>
              {/* The drawn square is small once the plot scales down, so an
                  invisible square around it takes the grab as well. */}
              <rect
                aria-hidden="true"
                className="cursor-grab active:cursor-grabbing"
                fill="transparent"
                height="36"
                width="36"
                x={point.x - 18}
                y={point.y - 18}
                {...pointerHandlers(index)}
              />
              <rect
                aria-label={`${title} point ${index + 1}`}
                aria-valuemax={99}
                aria-valuemin={0}
                aria-valuenow={levels[index]}
                aria-valuetext={`Rate ${rates[index]}, level ${levels[index]}`}
                className="cursor-grab outline-none focus-visible:stroke-[var(--crt-led)] focus-visible:[filter:drop-shadow(0_0_5px_var(--crt-led))] active:cursor-grabbing"
                fill="var(--crt-bg-well)"
                height="12"
                onKeyDown={(event) => handleKeyDown(event, index)}
                {...pointerHandlers(index)}
                role="slider"
                stroke={color}
                strokeWidth="2"
                tabIndex={0}
                width="12"
                x={point.x - 6}
                y={point.y - 6}
              />
            </g>
          ))}
        </svg>
      </div>
      {/* Rate/level pairs, one bevelled readout per stage, editable in place. */}
      <div className="grid grid-cols-2 gap-1 @[17rem]:grid-cols-4">
        {rates.map((rate, index) => (
          <div
            className="crt-inset grid min-w-0 grid-cols-2 gap-px bg-[var(--crt-bg-1)] px-0.5 pt-0.5"
            key={index}
          >
            <label className="grid min-w-0 text-center text-[10px] tracking-[0.1em] text-[var(--crt-ink-4)] uppercase">
              R{index + 1}
              <input
                aria-label={`${title} rate ${index + 1}`}
                className={inputClass}
                inputMode="numeric"
                max={99}
                min={0}
                onBlur={onGestureEnd}
                onChange={(event) =>
                  updateNumericValue('rate', event.currentTarget.valueAsNumber, index)
                }
                onFocus={(event) => {
                  onGestureStart()
                  event.currentTarget.select()
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                }}
                step={1}
                type="number"
                value={rate}
              />
            </label>
            <label className="grid min-w-0 text-center text-[10px] tracking-[0.1em] text-[var(--crt-ink-4)] uppercase">
              L{index + 1}
              <input
                aria-label={`${title} level ${index + 1}`}
                className={inputClass}
                inputMode="numeric"
                max={99}
                min={0}
                onBlur={onGestureEnd}
                onChange={(event) =>
                  updateNumericValue('level', event.currentTarget.valueAsNumber, index)
                }
                onFocus={(event) => {
                  onGestureStart()
                  event.currentTarget.select()
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                }}
                step={1}
                type="number"
                value={levels[index] ?? 0}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
