import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

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

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-[linear-gradient(180deg,hsl(255_48%_9%),hsl(253_52%_6%))] p-3 shadow-inner"
      style={{ '--operator-color': color } as React.CSSProperties}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          {showTitle ? (
            <p className="flex items-center gap-1 text-xs font-black tracking-[0.18em] text-white/85 uppercase">
              {title}
              <HelpPopover
                className="text-white/60 hover:bg-white/10 hover:text-white"
                label={title}
                text={helpText}
              />
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-white/50 uppercase">
          <span className="size-2 rounded-full bg-[var(--operator-color)] shadow-[0_0_10px_var(--operator-color)]" />
          R / L
        </div>
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
          <linearGradient id="envelope-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((line) => (
          <line
            key={`h-${line}`}
            stroke={
              variant === 'pitch' && line === 2 ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.08)'
            }
            x1="8"
            x2="392"
            y1={plotTop + line * 34}
            y2={plotTop + line * 34}
          />
        ))}
        {[0, 1, 2, 3, 4].map((line) => (
          <line
            key={`v-${line}`}
            stroke="rgba(255,255,255,.06)"
            x1={8 + line * 96}
            x2={8 + line * 96}
            y1={plotTop}
            y2={plotBottom}
          />
        ))}
        <path
          d={`${envelopePath(rates, levels, pointPosition)} L ${points.at(-1)?.x ?? 360} ${fillBaseline} L 8 ${fillBaseline} Z`}
          fill="url(#envelope-fill)"
        />
        <path
          d={envelopePath(rates, levels, pointPosition)}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        {points.map((point, index) => (
          <g key={index}>
            <text
              fill="rgba(255,255,255,.48)"
              fontSize="10"
              fontWeight="800"
              textAnchor="middle"
              x={point.x}
              y="174"
            >
              {index + 1}
            </text>
            <rect
              aria-label={`${title} point ${index + 1}`}
              aria-valuemax={99}
              aria-valuemin={0}
              aria-valuenow={levels[index]}
              aria-valuetext={`Rate ${rates[index]}, level ${levels[index]}`}
              className={cn(
                'cursor-grab outline-none focus-visible:[filter:drop-shadow(0_0_5px_var(--operator-color))] active:cursor-grabbing',
              )}
              fill="hsl(253 52% 8%)"
              height="14"
              onKeyDown={(event) => handleKeyDown(event, index)}
              onPointerCancel={() => {
                activePointer.current = null
                onGestureEnd()
              }}
              onPointerDown={(event) => {
                activePointer.current = event.pointerId
                event.currentTarget.setPointerCapture(event.pointerId)
                onGestureStart()
                updateFromPointer(event, index)
              }}
              onPointerMove={(event) => {
                if (activePointer.current === event.pointerId) updateFromPointer(event, index)
              }}
              onPointerUp={(event) => {
                if (activePointer.current !== event.pointerId) return
                activePointer.current = null
                event.currentTarget.releasePointerCapture(event.pointerId)
                onGestureEnd()
              }}
              role="slider"
              stroke={color}
              strokeWidth="3"
              tabIndex={0}
              width="14"
              x={point.x - 7}
              y={point.y - 7}
            />
          </g>
        ))}
      </svg>
      <div
        className={cn(
          'mt-3 grid gap-2 border-t border-white/10 pt-3',
          variant === 'pitch' ? 'grid-cols-2' : 'grid-cols-4',
        )}
      >
        {rates.map((rate, index) => (
          <div
            className="grid min-w-0 grid-cols-2 gap-1 rounded-md border border-white/10 bg-black/20 p-1.5"
            key={index}
          >
            <label className="grid min-w-0 gap-1 text-center text-[9px] font-black tracking-wide text-white/50 uppercase">
              R{index + 1}
              <input
                aria-label={`${title} rate ${index + 1}`}
                className="font-vt323 h-9 w-full min-w-0 rounded border border-white/15 bg-white/[0.06] px-1 text-center text-xs font-bold text-white transition outline-none focus:border-[var(--operator-color)] focus:ring-1 focus:ring-[var(--operator-color)]"
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
            <label className="grid min-w-0 gap-1 text-center text-[9px] font-black tracking-wide text-white/50 uppercase">
              L{index + 1}
              <input
                aria-label={`${title} level ${index + 1}`}
                className="font-vt323 h-9 w-full min-w-0 rounded border border-white/15 bg-white/[0.06] px-1 text-center text-xs font-bold text-white transition outline-none focus:border-[var(--operator-color)] focus:ring-1 focus:ring-[var(--operator-color)]"
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
