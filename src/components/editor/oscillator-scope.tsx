import { type PointerEvent, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import '@/i18n/editor-help'

import { usePhosphorTrace } from '@/components/editor/phosphor-trace'
import {
  ScopeFrame,
  ScopeGrid,
  ScopeTrace,
  scopeViewHeight,
  scopeViewWidth,
  useAnimationLoop,
} from '@/components/editor/scope-frame'
import { type OscillatorMode, operatorFixedHertz, operatorRatio } from '@/lib/operator-frequency'

type FrequencySetting = { coarse: number; fine: number }

type OscillatorScopeProps = {
  coarse: number
  /** -7 to +7, as the Detune knob shows it. */
  detune: number
  fine: number
  mode: OscillatorMode
  /** Dragging the scope sideways sets Coarse and Fine; without this it only shows them. */
  onChange?: (setting: FrequencySetting) => void
  onGestureEnd?: () => void
  onGestureStart?: () => void
  /** 0–99; the trace dims at 0, since the operator is then silent. */
  outputLevel: number
}

const viewWidth = scopeViewWidth
const viewHeight = scopeViewHeight
const amplitude = viewHeight / 2 - 6
/** How fast the whole display scrolls, in reference cycles (scope widths) a second. */
const scrollRate = 0.2
/** How fast one step of Detune slides the operator against the reference, in cycles a second. */
const detuneDrift = 0.06
const samplesPerCycle = 24
/** Enough points that a dense trace still reads as a sine, few enough to draw cheaply. */
const maxSamples = 900

/**
 * How many of the operator's cycles fill the scope. In ratio mode the
 * reference, 1.00, is one cycle across, so a ratio of 2 shows two. In fixed
 * mode 1 Hz to about 10 kHz maps onto about 1 to 36 cycles, on a log scale so
 * both ends of the range read.
 */
export function oscillatorScopeCycles(mode: OscillatorMode, coarse: number, fine: number) {
  if (mode === 'ratio') return operatorRatio(coarse, fine)
  return 2 ** (Math.log10(operatorFixedHertz(coarse, fine)) * 1.3)
}

const coarseMax = 31
const fineMax = 99
const decadeBits = 0b11
/** The top of fixed mode's range, as decade × 100 + Fine: 10^3.99 Hz. */
const fixedPositionMax = decadeBits * 100 + fineMax

/** How many pixels of drag make one step, so whole ratios are easy to land on and Shift is finer. */
function dragPixelsPerStep(mode: OscillatorMode, fineSteps: boolean) {
  if (fineSteps) return 3
  return mode === 'ratio' ? 12 : 6
}

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value))

/**
 * Where a drag of `steps` from `start` lands. In ratio mode a step is one
 * Coarse, or with Shift one Fine. In fixed mode the frequency is
 * 10^(decade + Fine/100), so decade × 100 + Fine runs evenly up the log scale:
 * a step moves it by 10, or with Shift by 1, carrying into the decade, which is
 * Coarse's low two bits; the bits above them are kept as read.
 */
export function draggedFrequency(
  mode: OscillatorMode,
  start: FrequencySetting,
  steps: number,
  fineSteps: boolean,
): FrequencySetting {
  if (mode === 'ratio') {
    return fineSteps
      ? { coarse: start.coarse, fine: clamp(start.fine + steps, fineMax) }
      : { coarse: clamp(start.coarse + steps, coarseMax), fine: start.fine }
  }
  const position = clamp(
    (start.coarse & decadeBits) * 100 + start.fine + steps * (fineSteps ? 1 : 10),
    fixedPositionMax,
  )
  return {
    coarse: (start.coarse & ~decadeBits) | Math.floor(position / 100),
    fine: position % 100,
  }
}

/** A sine from x = 0 to the scope's width plus one cycle, so a scroll of up to a cycle wraps. */
function sinePath(cycles: number) {
  const cycleWidth = viewWidth / cycles
  const end = viewWidth + cycleWidth
  const steps = Math.min(maxSamples, Math.ceil((cycles + 1) * samplesPerCycle))
  const points = Array.from({ length: steps + 1 }, (_, step) => {
    const x = (step / steps) * end
    const y = viewHeight / 2 - Math.sin((x / cycleWidth) * Math.PI * 2) * amplitude
    return `${x.toFixed(2)} ${y.toFixed(2)}`
  })
  return `M${points.join(' L')}`
}

/**
 * A small oscilloscope for the open operator's oscillator. In ratio mode its
 * sine runs against a dim reference at 1.00, so the ratio shows as cycles per
 * reference cycle and Detune as the operator slowly sliding against it, the
 * beating it makes heard. In fixed mode the reference goes, and the wave packs
 * tighter as the frequency rises.
 *
 * Given `onChange`, dragging it sideways sets the ratio or frequency, one
 * gesture and one undo step per drag. It is a larger target for the pointer
 * only: the Coarse and Fine knobs beside it are the keyboard's way to the same
 * values (WCAG 2.5.7), so the scope stays out of the tab order and hidden from
 * assistive technology, with its hint as a tooltip.
 */
export function OscillatorScope({
  coarse,
  detune,
  fine,
  mode,
  onChange,
  onGestureEnd,
  onGestureStart,
  outputLevel,
}: OscillatorScopeProps) {
  const { t } = useTranslation()
  const dragRef = useRef<{
    fineSteps: boolean
    pointerId: number
    start: FrequencySetting
    x: number
  } | null>(null)
  const operatorRef = useRef<SVGGElement>(null)
  const referenceRef = useRef<SVGGElement>(null)
  const phaseRef = useRef({ operator: 0, reference: 0 })

  const cycles = oscillatorScopeCycles(mode, coarse, fine)
  const cycleWidth = viewWidth / cycles
  const active = outputLevel > 0
  const trace = usePhosphorTrace(`${mode}:${cycles}`, 'sweep')

  const frameRef = useAnimationLoop((elapsed) => {
    const phase = phaseRef.current
    phase.reference = (phase.reference + elapsed * scrollRate) % 1
    // Scrolling together keeps the two lined up; Detune alone moves one against the other.
    const drift = mode === 'ratio' ? detune * detuneDrift : 0
    phase.operator = (((phase.operator + elapsed * (scrollRate * cycles + drift)) % 1) + 1) % 1
    operatorRef.current?.setAttribute(
      'transform',
      `translate(${(-phase.operator * cycleWidth).toFixed(2)} 0)`,
    )
    referenceRef.current?.setAttribute(
      'transform',
      `translate(${(-phase.reference * viewWidth).toFixed(2)} 0)`,
    )
  }, active)

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    trace.hold(false)
    onGestureEnd?.()
  }
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!onChange || event.button !== 0 || dragRef.current) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      fineSteps: event.shiftKey,
      pointerId: event.pointerId,
      start: { coarse, fine },
      x: event.clientX,
    }
    trace.hold(true)
    onGestureStart?.()
  }
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !onChange) return
    // Pressing or releasing Shift mid-drag carries on from where the drag has got to.
    if (event.shiftKey !== drag.fineSteps) {
      dragRef.current = {
        ...drag,
        fineSteps: event.shiftKey,
        start: { coarse, fine },
        x: event.clientX,
      }
      return
    }
    const steps = Math.trunc((event.clientX - drag.x) / dragPixelsPerStep(mode, drag.fineSteps))
    const next = draggedFrequency(mode, drag.start, steps, drag.fineSteps)
    if (next.coarse !== coarse || next.fine !== fine) onChange(next)
  }

  const scope = (
    <ScopeFrame className="h-8" ref={frameRef} testId="oscillator-scope">
      <ScopeGrid columns={4} rowY={viewHeight / 2} />
      {mode === 'ratio' ? (
        <g opacity="0.35" ref={referenceRef}>
          <path
            d={sinePath(1)}
            data-trace="reference"
            fill="none"
            stroke="var(--crt-acc-dim)"
            strokeDasharray="3 3"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ) : null}
      <ScopeTrace active={active}>
        <g ref={operatorRef}>
          <path
            d={sinePath(cycles)}
            data-trace="operator"
            fill="none"
            ref={trace.pathRef}
            stroke="var(--crt-acc)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </ScopeTrace>
    </ScopeFrame>
  )
  if (!onChange) return scope

  return (
    <div
      className="min-w-0 cursor-ew-resize touch-pan-y select-none"
      data-testid="oscillator-scope-drag"
      onLostPointerCapture={endDrag}
      onPointerCancel={endDrag}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      title={t(mode === 'ratio' ? 'ui.ratioScopeHint' : 'ui.frequencyScopeHint')}
    >
      {scope}
    </div>
  )
}
