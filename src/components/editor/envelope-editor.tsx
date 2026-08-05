import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

import { HelpPopover } from '@/components/ui/help-popover'
import { controlHelp } from '@/data/control-help'
import {
  clampEnvelopeValue,
  envelopePath,
  envelopePointPosition,
} from '@/lib/editor-visuals'
import { cn } from '@/lib/utils'

type EnvelopeEditorProps = {
  color: string
  levels: number[]
  onChange: (rate: number, level: number, point: number) => void
  onGestureEnd: () => void
  onGestureStart: () => void
  rates: number[]
}

const width = 400
const height = 180
const plotTop = 20
const plotBottom = 156
const slotWidth = 90

export function EnvelopeEditor({
  color,
  levels,
  onChange,
  onGestureEnd,
  onGestureStart,
  rates,
}: EnvelopeEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const activePointer = useRef<number | null>(null)

  const updateFromPointer = (event: PointerEvent<SVGCircleElement>, point: number) => {
    const bounds = svgRef.current?.getBoundingClientRect()
    if (!bounds) return

    const x = ((event.clientX - bounds.left) / bounds.width) * width
    const y = ((event.clientY - bounds.top) / bounds.height) * height
    const slotStart = 28 + point * slotWidth
    const rate = 99 - ((x - slotStart) / 58) * 99
    const level = ((plotBottom - y) / (plotBottom - plotTop)) * 99
    onChange(rate, level, point)
  }

  const handleKeyDown = (event: KeyboardEvent<SVGCircleElement>, point: number) => {
    const step = event.shiftKey ? 10 : 1
    const nextRate = event.key === 'ArrowLeft' ? rates[point] + step
      : event.key === 'ArrowRight' ? rates[point] - step
        : rates[point]
    const nextLevel = event.key === 'ArrowUp' ? levels[point] + step
      : event.key === 'ArrowDown' ? levels[point] - step
        : levels[point]

    if (!event.key.startsWith('Arrow')) return
    event.preventDefault()
    onChange(nextRate, nextLevel, point)
  }

  const points = rates.map((rate, index) => envelopePointPosition(rate, levels[index], index))

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
          <p className="flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-white/85">
            Amplitude envelope
            <HelpPopover
              className="text-white/60 hover:bg-white/10 hover:text-white"
              label="Amplitude envelope"
              text={controlHelp.amplitudeEnvelope}
            />
          </p>
          <p className="text-[11px] text-white/50">Drag a point; arrows adjust, Shift moves by 10.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
          <span className="size-2 rounded-full bg-[var(--operator-color)] shadow-[0_0_10px_var(--operator-color)]" />
          R / L
        </div>
      </div>
      <svg
        aria-label="Editable four-stage amplitude envelope"
        className="block min-h-0 w-full flex-1 touch-none"
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
            stroke="rgba(255,255,255,.08)"
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
          d={`${envelopePath(rates, levels)} L ${points.at(-1)?.x ?? 360} ${plotBottom} L 8 ${plotBottom} Z`}
          fill="url(#envelope-fill)"
        />
        <path
          d={envelopePath(rates, levels)}
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
            <circle
              aria-label={`Envelope point ${index + 1}`}
              aria-valuemax={99}
              aria-valuemin={0}
              aria-valuenow={levels[index]}
              aria-valuetext={`Rate ${rates[index]}, level ${levels[index]}`}
              className={cn(
                'cursor-grab outline-none transition-[r] focus-visible:[filter:drop-shadow(0_0_5px_var(--operator-color))] active:cursor-grabbing',
              )}
              cx={point.x}
              cy={point.y}
              fill="hsl(253 52% 8%)"
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
              r="7"
              role="slider"
              stroke={color}
              strokeWidth="3"
              tabIndex={0}
            />
          </g>
        ))}
      </svg>
      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-white/10 pt-3">
        {rates.map((rate, index) => (
          <div className="grid min-w-0 grid-cols-2 gap-1 rounded-md border border-white/10 bg-black/20 p-1.5" key={index}>
            <label className="grid min-w-0 gap-1 text-center text-[9px] font-black uppercase tracking-wide text-white/50">
              R{index + 1}
              <input
                aria-label={`Envelope rate ${index + 1}`}
                className="h-7 min-w-0 w-full rounded border border-white/15 bg-white/[0.06] px-1 text-center font-mono text-xs font-bold text-white outline-none transition [appearance:textfield] focus:border-[var(--operator-color)] focus:ring-1 focus:ring-[var(--operator-color)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                inputMode="numeric"
                max={99}
                min={0}
                onBlur={onGestureEnd}
                onChange={(event) => updateNumericValue('rate', event.currentTarget.valueAsNumber, index)}
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
            <label className="grid min-w-0 gap-1 text-center text-[9px] font-black uppercase tracking-wide text-white/50">
              L{index + 1}
              <input
                aria-label={`Envelope level ${index + 1}`}
                className="h-7 min-w-0 w-full rounded border border-white/15 bg-white/[0.06] px-1 text-center font-mono text-xs font-bold text-white outline-none transition [appearance:textfield] focus:border-[var(--operator-color)] focus:ring-1 focus:ring-[var(--operator-color)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                inputMode="numeric"
                max={99}
                min={0}
                onBlur={onGestureEnd}
                onChange={(event) => updateNumericValue('level', event.currentTarget.valueAsNumber, index)}
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
