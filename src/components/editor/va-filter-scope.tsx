import { useMemo } from 'react'

import {
  ScopeDot,
  ScopeFrame,
  ScopeGrid,
  ScopeTrace,
  scopeViewHeight as viewHeight,
  scopeViewWidth as viewWidth,
} from '@/components/editor/scope-frame'
import { virtualAnalogCutoffHertz } from '@/lib/fm1-va-virtual-analog-editor'

/** The plot spans the Cutoff's own range, 20 Hz to 20 kHz: three decades. */
const decades = 3
const lowestHertz = 20

const hertzX = (hertz: number) => (viewWidth * Math.log10(hertz / lowestHertz)) / decades

/**
 * The response in dB, at view position `x`, of the Virtual Analog filter's Type (0 LP12, 1 LP24,
 * 2 BP, 3 HP) at a Cutoff step and Resonance, both 0 to 100. A sketch from textbook two-pole
 * responses, LP24 being two in a row, to show the shape each setting gives, not a measurement.
 */
export function vaFilterResponse(type: number, cutoff: number, resonance: number, x: number) {
  const q = 0.6 + (Math.max(0, Math.min(100, resonance)) / 100) * 7
  const w = 10 ** ((decades * (x - hertzX(virtualAnalogCutoffHertz(cutoff)))) / viewWidth)
  const denominator = Math.sqrt((1 - w * w) ** 2 + (w / q) ** 2)
  const numerator = type === 2 ? w / q : type === 3 ? w * w : 1
  const db = 20 * Math.log10(Math.max(1e-6, numerator / denominator))
  return type === 1 ? 2 * db : db
}

/** +20 dB near the top, 0 dB about a third down, -53 dB at the floor. */
const dbToY = (db: number) => Math.min(viewHeight + 2, Math.max(2, 16 - db * 0.6))

/** The icon's own scale: +12 dB at the top, -48 dB at the foot of its 16-unit box. */
const iconDbToY = (db: number) => Math.min(15, Math.max(1, 4 - db / 4))

/**
 * A filter Type's response as a small picture, for the Type's dropdown: the scope's curve at a
 * middle Cutoff and a little Resonance, so the four shapes tell apart at a glance. `className`
 * sizes it; a box of another shape stretches the curve, at the same line width.
 */
export function VaFilterTypeIcon({ className, type }: { className: string; type: number }) {
  const curve = useMemo(() => {
    const points = Array.from({ length: 61 }, (_, step) => {
      const x = (step / 60) * viewWidth
      return `${x.toFixed(2)} ${iconDbToY(vaFilterResponse(type, 50, 15, x)).toFixed(2)}`
    })
    return `M${points.join(' L')}`
  }, [type])

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      preserveAspectRatio="none"
      viewBox={`0 0 ${viewWidth} 16`}
    >
      <path
        d={curve}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * The Virtual Analog filter's frequency response, in the effects' scope well, drawn taller beside
 * the filter's knobs. It is still: unlike the effect scopes, nothing flickers under it.
 */
export function VaFilterScope({
  cutoff,
  resonance,
  type,
}: {
  cutoff: number
  resonance: number
  type: number
}) {
  const curve = useMemo(() => {
    const points = Array.from({ length: 121 }, (_, step) => {
      const x = (step / 120) * viewWidth
      return `${x.toFixed(2)} ${dbToY(vaFilterResponse(type, cutoff, resonance, x)).toFixed(2)}`
    })
    return `M${points.join(' L')}`
  }, [cutoff, resonance, type])
  const markerX = hertzX(virtualAnalogCutoffHertz(cutoff))

  return (
    <ScopeFrame
      className="h-28"
      overlay={
        <ScopeDot
          active
          x={markerX}
          y={dbToY(vaFilterResponse(type, cutoff, resonance, markerX))}
        />
      }
      testId="va-filter-scope"
    >
      <ScopeGrid columns={decades * 2} rowY={dbToY(0)} />
      <ScopeTrace active>
        <path
          d={`${curve} L${viewWidth} ${viewHeight} L0 ${viewHeight} Z`}
          fill="var(--crt-acc)"
          opacity="0.12"
        />
        <path
          d={curve}
          fill="none"
          stroke="var(--crt-acc)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.75"
          vectorEffect="non-scaling-stroke"
        />
      </ScopeTrace>
    </ScopeFrame>
  )
}
