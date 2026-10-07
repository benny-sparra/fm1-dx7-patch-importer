import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'

import { cn } from '@/lib/utils'

const width = 600
/** The drawing's least height; it grows to fill the well, so it fills the row it shares. */
const minHeight = 180
/** Room under the plot for the stage letters, as the operator envelope leaves. */
const labelBand = 24
const left = 8
/** Each stage's time takes up to a quarter of the plot. */
const stageWidth = (width - 2 * left) / 4

type AdsrSetting = 'attack' | 'decay' | 'release' | 'sustain'

type AdsrValues = Record<AdsrSetting, number>

type AdsrPlot = { bottom: number; top: number }

/** The plot's top and bottom in a drawing `height` units tall. */
const plotFor = (height: number): AdsrPlot => ({ bottom: height - labelBand, top: 20 })

type AdsrScopeProps = AdsrValues & {
  /** Dims the drawing, and stops its points dragging, while the Envelope is off. */
  enabled: boolean
  /** Sets a setting from a dragged point; without it the drawing only shows the envelope. */
  onChange?: (setting: AdsrSetting, value: number) => void
  onGestureEnd?: () => void
  onGestureStart?: () => void
}

const clampSetting = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

/**
 * The corners of an Attack, Decay, Sustain, Release envelope, each setting 0 to 100: the attack
 * rises to the top, the decay falls to the sustain level, which holds for a fixed quarter, and the
 * release falls to silence. A longer setting takes more of its quarter.
 */
export function adsrPoints(
  { attack, decay, release, sustain }: AdsrValues,
  { bottom, top }: AdsrPlot = plotFor(minHeight),
) {
  const span = (value: number) => (clampSetting(value) / 100) * stageWidth
  const sustainY = bottom - (clampSetting(sustain) / 100) * (bottom - top)
  const peak = { x: left + span(attack), y: top }
  const sustainStart = { x: peak.x + span(decay), y: sustainY }
  const sustainEnd = { x: sustainStart.x + stageWidth, y: sustainY }
  const end = { x: sustainEnd.x + span(release), y: bottom }
  return [peak, sustainStart, sustainEnd, end]
}

/**
 * The settings a point dragged to (`x`, `y`) sets: the peak's x sets Attack, the decay's end sets
 * Decay by its x and Sustain by its y, the sustain's end sets Sustain, and the release's end sets
 * Release. Each time is measured from the point before, as the drawing lays them out.
 */
export function adsrSettingsAt(
  values: AdsrValues,
  point: number,
  x: number,
  y: number,
  plot: AdsrPlot = plotFor(minHeight),
) {
  const { bottom, top } = plot
  const [peak, , sustainEnd] = adsrPoints(values, plot)
  const time = (from: number) => clampSetting(((x - from) / stageWidth) * 100)
  const level = clampSetting(((bottom - y) / (bottom - top)) * 100)
  const settings: Partial<AdsrValues>[] = [
    { attack: time(left) },
    { decay: time(peak.x), sustain: level },
    { sustain: level },
    { release: time(sustainEnd.x) },
  ]
  return settings[point] ?? {}
}

/** The stage letters' places under the drawing, kept apart where a stage is too short for one. */
function stageLabels(points: ReturnType<typeof adsrPoints>) {
  const starts = [left, ...points.map(({ x }) => x)]
  let previous = -Infinity
  return ['A', 'D', 'S', 'R'].map((letter, stage) => {
    const x = Math.max((starts[stage] + starts[stage + 1]) / 2, previous + 16)
    previous = x
    return { letter, x }
  })
}

/**
 * The drawing's height in drawing units, matching its box's shape as it resizes and never less
 * than `minHeight`, so the drawing fills its well without stretching its squares.
 */
function useDrawingHeight() {
  const boxRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(minHeight)

  useEffect(() => {
    const box = boxRef.current
    if (!box || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const { height: boxHeight, width: boxWidth } = entry.contentRect
      if (boxWidth <= 0 || boxHeight <= 0) return
      setHeight(Math.max(minHeight, Math.round((boxHeight / boxWidth) * width)))
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  return { boxRef, height }
}

/**
 * The Virtual Analog Envelope drawn as the operator envelope is, in its well with the same grid,
 * fill, and corner squares, whose points drag to set it. The sliders below it are the controls
 * assistive technology and the keyboard use, so the drawing is hidden from them.
 */
export function AdsrScope({
  enabled,
  onChange,
  onGestureEnd,
  onGestureStart,
  ...values
}: AdsrScopeProps) {
  const fillId = `adsr-fill-${useId().replace(/:/g, '')}`
  const svgRef = useRef<SVGSVGElement>(null)
  const dragged = useRef<number | null>(null)
  const { boxRef, height } = useDrawingHeight()
  const plot = plotFor(height)
  const { bottom, top } = plot
  const points = adsrPoints(values, plot)
  const line = `M ${left} ${bottom} ${points.map(({ x, y }) => `L ${x} ${y}`).join(' ')}`
  const color = 'var(--crt-acc)'
  const draggable = enabled && Boolean(onChange)

  const moveTo = (event: PointerEvent<SVGElement>, point: number) => {
    const box = svgRef.current?.getBoundingClientRect()
    if (!box || box.width <= 0 || box.height <= 0) return
    const x = ((event.clientX - box.left) / box.width) * width
    const y = ((event.clientY - box.top) / box.height) * height
    for (const [setting, value] of Object.entries(adsrSettingsAt(values, point, x, y, plot))) {
      if (values[setting as AdsrSetting] !== value) onChange?.(setting as AdsrSetting, value)
    }
  }

  const finish = (event: PointerEvent<SVGElement>) => {
    if (dragged.current === null) return
    dragged.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    onGestureEnd?.()
  }

  const pointerHandlers = (point: number) =>
    draggable
      ? {
          onLostPointerCapture: finish,
          onPointerCancel: finish,
          onPointerDown: (event: PointerEvent<SVGElement>) => {
            event.preventDefault()
            event.currentTarget.setPointerCapture?.(event.pointerId)
            dragged.current = point
            onGestureStart?.()
            moveTo(event, point)
          },
          onPointerMove: (event: PointerEvent<SVGElement>) => {
            if (dragged.current === point) moveTo(event, point)
          },
          onPointerUp: finish,
        }
      : {}

  return (
    // The drawing is measured from the well and drawn over all of it, so it never pushes the well,
    // or its row, any taller.
    <div
      aria-hidden="true"
      className="crt-well relative min-h-40 flex-1"
      data-testid="adsr-scope"
      ref={boxRef}
    >
      <svg
        className="absolute inset-[3px] block h-[calc(100%-6px)] w-[calc(100%-6px)] touch-none"
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((index) => (
          <line
            key={`h-${index}`}
            stroke="var(--crt-grid)"
            x1={left}
            x2={width - left}
            y1={top + (index * (bottom - top)) / 4}
            y2={top + (index * (bottom - top)) / 4}
          />
        ))}
        {[0, 1, 2, 3, 4].map((index) => (
          <line
            key={`v-${index}`}
            stroke="var(--crt-grid)"
            x1={left + index * stageWidth}
            x2={left + index * stageWidth}
            y1={top}
            y2={bottom}
          />
        ))}
        <g opacity={enabled ? 1 : 0.4}>
          <path d={`${line} Z`} fill={`url(#${fillId})`} />
          <path d={line} fill="none" stroke={color} strokeLinejoin="round" strokeWidth="2.4" />
          {stageLabels(points).map(({ letter, x }) => (
            <text
              className="font-vt323"
              fill="var(--crt-ink-4)"
              fontSize="14"
              key={letter}
              textAnchor="middle"
              x={x}
              y={height - 4}
            >
              {letter}
            </text>
          ))}
          {points.map(({ x, y }, index) => (
            <g key={index}>
              {/* The drawn square is small once the plot scales down, so an invisible square
                  around it takes the grab as well. */}
              <rect
                className={cn(draggable && 'cursor-grab active:cursor-grabbing')}
                data-testid={`adsr-point-${index + 1}`}
                fill="transparent"
                height="36"
                width="36"
                x={x - 18}
                y={y - 18}
                {...pointerHandlers(index)}
              />
              <rect
                fill="var(--crt-bg-well)"
                height="12"
                pointerEvents="none"
                stroke={color}
                strokeWidth="2"
                width="12"
                x={x - 6}
                y={y - 6}
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
