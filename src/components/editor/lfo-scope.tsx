import { useEffect, useRef } from 'react'

type LfoScopeProps = {
  /** 0–99, how far the LFO bends pitch; with amp depth, sets how bright the trace is. */
  ampModDepth: number
  pitchModDepth: number
  /** 0–99, the LFO Speed parameter. */
  speed: number
  /** 0–5: Triangle, Saw down, Saw up, Square, Sine, Sample & hold. */
  wave: number
}

const viewWidth = 300
const viewHeight = 48
const visibleCycles = 3
const cycleWidth = viewWidth / visibleCycles
const amplitude = viewHeight / 2 - 7
/** Where the riding dot sits, as a fraction of the scope's width. */
const playheadX = 0.25

/** Sample & hold repeats this many held steps, so the scroll can loop seamlessly. */
const sampleHoldSteps = [0.55, -0.8, 0.15, 0.9, -0.35, -0.95, 0.7, -0.1]

/**
 * Speed 0–99 mapped onto a readable scroll rate. The FM1's real LFO runs up
 * to tens of hertz, which would only strobe on a display, so the top end is
 * capped and the curve kept exponential so every step of the slider shows.
 */
const cyclesPerSecond = (speed: number) => 0.15 * 40 ** (Math.min(99, Math.max(0, speed)) / 99)

/** The waveform's value, -1 to 1, at a phase measured in cycles. */
function sampleWave(wave: number, phase: number) {
  const cycle = Math.floor(phase)
  const t = phase - cycle
  switch (wave) {
    case 1:
      return 1 - 2 * t
    case 2:
      return 2 * t - 1
    case 3:
      return t < 0.5 ? 1 : -1
    case 4:
      return Math.sin(t * Math.PI * 2)
    case 5:
      return sampleHoldSteps[
        ((cycle % sampleHoldSteps.length) + sampleHoldSteps.length) % sampleHoldSteps.length
      ]
    default:
      return t < 0.25 ? 4 * t : t < 0.75 ? 2 - 4 * t : 4 * t - 4
  }
}

/** How many cycles the drawn pattern takes to repeat itself. */
const patternCycles = (wave: number) => (wave === 5 ? sampleHoldSteps.length : 1)

const toY = (value: number) => viewHeight / 2 - value * amplitude

/** One cycle's outline as path commands, with true vertical edges on the jumps. */
function cycleCommands(wave: number, cycle: number) {
  const x = (t: number) => ((cycle + t) * cycleWidth).toFixed(2)
  const point = (t: number, value: number) => `${x(t)} ${toY(value).toFixed(2)}`
  switch (wave) {
    case 1:
      return [point(0, 1), point(1, -1)]
    case 2:
      return [point(0, -1), point(1, 1)]
    case 3:
      return [point(0, 1), point(0.5, 1), point(0.5, -1), point(1, -1)]
    case 4:
      return Array.from({ length: 25 }, (_, step) =>
        point(step / 24, Math.sin((step / 24) * Math.PI * 2)),
      )
    case 5: {
      const value = sampleWave(5, cycle)
      return [point(0, value), point(1, value)]
    }
    default:
      return [point(0, 0), point(0.25, 1), point(0.75, -1), point(1, 0)]
  }
}

function wavePath(wave: number) {
  const cycles = visibleCycles + patternCycles(wave) + 1
  const commands = Array.from({ length: cycles }, (_, cycle) => cycleCommands(wave, cycle)).flat()
  return `M${commands.join(' L')}`
}

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A small oscilloscope for the LFO: the selected wave scrolls past at a rate
 * set by LFO Speed, with a dot riding it where the current value would be.
 * The trace dims when neither mod depth is up, since the LFO is then silent.
 * Purely decorative — the controls beside it carry all the information.
 */
export function LfoScope({ ampModDepth, pitchModDepth, speed, wave }: LfoScopeProps) {
  const traceRef = useRef<SVGGElement>(null)
  const dotRef = useRef<HTMLSpanElement>(null)
  const phaseRef = useRef(0)
  const speedRef = useRef(speed)
  speedRef.current = speed

  useEffect(() => {
    const draw = () => {
      const period = patternCycles(wave)
      const phase = phaseRef.current
      const offset = ((phase % period) + period) % period
      traceRef.current?.setAttribute(
        'transform',
        `translate(${(-offset * cycleWidth).toFixed(2)} 0)`,
      )
      const value = sampleWave(wave, phase + playheadX * visibleCycles)
      if (dotRef.current) dotRef.current.style.top = `${(toY(value) / viewHeight) * 100}%`
    }

    draw()
    if (typeof window.requestAnimationFrame !== 'function' || prefersReducedMotion()) return

    let frame = 0
    let last: number | undefined
    const tick = (now: number) => {
      // Cap the step so a tab returning from the background doesn't lurch.
      const elapsed = last === undefined ? 0 : Math.min(0.1, (now - last) / 1000)
      last = now
      phaseRef.current += elapsed * cyclesPerSecond(speedRef.current)
      draw()
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [wave])

  const active = pitchModDepth > 0 || ampModDepth > 0

  return (
    <div
      aria-hidden="true"
      className="crt-inset relative h-12 min-w-0 overflow-hidden bg-[var(--crt-bg-well)]"
      data-testid="lfo-scope"
    >
      <svg
        className="absolute inset-0 size-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      >
        <g stroke="var(--crt-line-dk)" strokeWidth="1" vectorEffect="non-scaling-stroke">
          {Array.from({ length: visibleCycles * 2 - 1 }, (_, index) => (
            <line
              key={index}
              vectorEffect="non-scaling-stroke"
              x1={((index + 1) * cycleWidth) / 2}
              x2={((index + 1) * cycleWidth) / 2}
              y1="0"
              y2={viewHeight}
            />
          ))}
          <line
            vectorEffect="non-scaling-stroke"
            x1="0"
            x2={viewWidth}
            y1={viewHeight / 2}
            y2={viewHeight / 2}
          />
        </g>
        <g
          className="transition-opacity duration-300"
          opacity={active ? 1 : 0.4}
          style={{ filter: 'drop-shadow(0 0 3px var(--crt-acc))' }}
        >
          <g ref={traceRef}>
            <path
              d={wavePath(wave)}
              fill="none"
              stroke="var(--crt-acc)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </g>
      </svg>
      <span
        className="absolute size-1.5 -translate-1/2 rounded-full bg-[var(--crt-led)] shadow-[0_0_6px_var(--crt-led)] transition-opacity duration-300"
        ref={dotRef}
        style={{ left: `${playheadX * 100}%`, opacity: active ? 1 : 0.4, top: '50%' }}
      />
    </div>
  )
}
