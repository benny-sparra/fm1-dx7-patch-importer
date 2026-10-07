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
 * The Virtual Analog filter panel's title icon, drawn in Lucide's grid and stroke: a low-pass
 * response with a resonant peak, the shape a synth's filter is known by.
 */
export function VaFilterPanelIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M2 11h9c2.5 0 3.5-5 5-5s2 3 3 7l2 7" />
    </svg>
  )
}

/** Twelve semitones from C, true where the key is black. */
const blackKeys = [false, true, false, true, false, false, true, false, true, false, true, false]

/** A note's pitch in Hz, numbered as MIDI numbers it (69 is A4, 440 Hz). */
const noteHertz = (note: number) => 440 * 2 ** ((note - 69) / 12)
const noteX = (note: number) => hertzX(noteHertz(note))
const semitoneWidth = noteX(61) - noteX(60)

/**
 * Key Tracking's four steps as the octaves the cutoff moves for each octave played. A sketch: the
 * FM1's own scale, and the note it pivots on, are not measured.
 */
const trackingAmounts = [0, 1 / 3, 2 / 3, 1]

/**
 * The notes the scope shows Key Tracking on, two octaves either side of middle C, which it takes
 * as the note the Cutoff is set for. Each is lit on the keyboard in its curve's colour.
 */
const trackedNotes = [
  { colour: 'var(--crt-acc-dim)', name: 'low', note: 36 },
  { colour: 'var(--crt-acc)', name: 'middle', note: 60 },
  { colour: 'var(--crt-led)', name: 'high', note: 84 },
] as const
const pivotNote = 60

const keyboardHeight = 7
const keyboardTop = viewHeight - keyboardHeight
const keyboardNotes = Array.from(
  {
    length:
      Math.floor(12 * Math.log2(20000 / 440)) - Math.ceil(12 * Math.log2(lowestHertz / 440)) + 1,
  },
  (_, index) => Math.ceil(12 * Math.log2(lowestHertz / 440) + 69) + index,
)

/**
 * A keyboard along the foot of the scope, each key at its own pitch on the frequency axis, so
 * ten octaves fill the three decades and a note lines up with the frequency it plays.
 */
function ScopeKeyboard() {
  return (
    <g>
      <rect
        fill="var(--crt-bg-head)"
        height={keyboardHeight}
        width={viewWidth}
        x="0"
        y={keyboardTop}
      />
      {keyboardNotes
        .filter((note) => note % 12 === 0)
        .map((note) => (
          <line
            key={note}
            stroke="var(--crt-line)"
            vectorEffect="non-scaling-stroke"
            x1={noteX(note) - semitoneWidth / 2}
            x2={noteX(note) - semitoneWidth / 2}
            y1={keyboardTop}
            y2={viewHeight}
          />
        ))}
      {keyboardNotes
        .filter((note) => blackKeys[note % 12])
        .map((note) => (
          <rect
            fill="var(--crt-bg-well)"
            height={keyboardHeight * 0.6}
            key={note}
            width={semitoneWidth}
            x={noteX(note) - semitoneWidth / 2}
            y={keyboardTop}
          />
        ))}
      {trackedNotes.map(({ colour, note }) => (
        <rect
          fill={colour}
          height={keyboardHeight}
          key={note}
          style={{ filter: `drop-shadow(0 0 2px ${colour})` }}
          width={semitoneWidth * 1.6}
          x={noteX(note) - semitoneWidth * 0.8}
          y={keyboardTop}
        />
      ))}
    </g>
  )
}

/**
 * The Virtual Analog filter's frequency response, in the effects' scope well, drawn taller beside
 * the filter's knobs, over a keyboard laid along its frequency axis. While Key Tracking is on,
 * dashed copies show where it moves the response for a low and a high note. It is still: unlike
 * the effect scopes, nothing flickers under it.
 */
export function VaFilterScope({
  cutoff,
  keyTracking,
  resonance,
  type,
}: {
  cutoff: number
  keyTracking: number
  resonance: number
  type: number
}) {
  const amount = trackingAmounts[keyTracking] ?? 0
  const curves = useMemo(
    () =>
      trackedNotes.map(({ colour, name, note }) => {
        const shift = (noteX(note) - noteX(pivotNote)) * amount
        const points = Array.from({ length: 121 }, (_, step) => {
          const x = (step / 120) * viewWidth
          const y = Math.min(
            keyboardTop,
            dbToY(vaFilterResponse(type, cutoff, resonance, x - shift)),
          )
          return `${x.toFixed(2)} ${y.toFixed(2)}`
        })
        return { colour, d: `M${points.join(' L')}`, name }
      }),
    [amount, cutoff, resonance, type],
  )
  const curve = curves.find(({ name }) => name === 'middle')!.d
  const markerX = hertzX(virtualAnalogCutoffHertz(cutoff))

  return (
    <ScopeFrame
      className="h-40"
      overlay={
        <ScopeDot
          active
          x={markerX}
          y={Math.min(keyboardTop, dbToY(vaFilterResponse(type, cutoff, resonance, markerX)))}
        />
      }
      testId="va-filter-scope"
    >
      <ScopeGrid columns={decades * 2} rowY={dbToY(0)} />
      <ScopeKeyboard />
      {amount > 0
        ? curves
            .filter(({ name }) => name !== 'middle')
            .map(({ colour, d, name }) => (
              <path
                d={d}
                data-note={name}
                fill="none"
                key={name}
                opacity="0.85"
                stroke={colour}
                strokeDasharray="3 3"
                strokeWidth="1.25"
                style={{ filter: `drop-shadow(0 0 3px ${colour})` }}
                vectorEffect="non-scaling-stroke"
              />
            ))
        : null}
      <ScopeTrace active>
        <path
          d={`${curve} L${viewWidth} ${keyboardTop} L0 ${keyboardTop} Z`}
          fill="var(--crt-acc)"
          opacity="0.12"
        />
        <path
          d={curve}
          data-note="middle"
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
