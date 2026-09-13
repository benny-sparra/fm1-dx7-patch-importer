import { useMemo, useRef } from 'react'

import {
  ScopeDot,
  ScopeFrame,
  ScopeGrid,
  ScopeTrace,
  scopeViewHeight as viewHeight,
  scopeViewWidth as viewWidth,
  useAnimationLoop,
} from '@/components/editor/scope-frame'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/*
  Filter: a frequency-response curve over three decades, with a faint noise
  spectrum flickering underneath so it reads as live signal.
*/

/** 0 low pass, 1 band pass, 2 high pass. */
type FilterScopeProps = { cutoff: number; enabled: boolean; resonance: number; type: number }

const filterCutoffMax = 107
const filterResonanceMax = 10
const filterDecades = 3
const spectrumBars = 40
/** Bars redraw at this rate; every frame would just look like static. */
const spectrumFps = 12

const cutoffX = (cutoff: number) => viewWidth * (0.05 + 0.9 * clamp01(cutoff / filterCutoffMax))

/** Response in dB of a two-pole filter at view position `x`. */
function filterResponse(type: number, cutoff: number, resonance: number, x: number) {
  const q = 0.6 + clamp01(resonance / filterResonanceMax) * 7
  const w = 10 ** ((filterDecades * (x - cutoffX(cutoff))) / viewWidth)
  const denominator = Math.sqrt((1 - w * w) ** 2 + (w / q) ** 2)
  const numerator = type === 1 ? w / q : type === 2 ? w * w : 1
  return 20 * Math.log10(Math.max(1e-6, numerator / denominator))
}

/** +20 dB near the top, 0 dB about a third down, -53 dB at the floor. */
const dbToY = (db: number) => Math.min(viewHeight + 2, Math.max(2, 16 - db * 0.6))

export function FilterScope({ cutoff, enabled, resonance, type }: FilterScopeProps) {
  const barRefs = useRef<(SVGRectElement | null)[]>([])
  const sinceBarsRef = useRef(Infinity)

  const curve = useMemo(() => {
    const points = Array.from({ length: 97 }, (_, step) => {
      const x = (step / 96) * viewWidth
      return `${x.toFixed(2)} ${dbToY(filterResponse(type, cutoff, resonance, x)).toFixed(2)}`
    })
    return `M${points.join(' L')}`
  }, [cutoff, resonance, type])

  const barWidth = viewWidth / spectrumBars

  useAnimationLoop((elapsed) => {
    sinceBarsRef.current += elapsed
    // Render redraws (elapsed 0) always refresh so the bars follow the knobs.
    if (elapsed > 0 && sinceBarsRef.current < 1 / spectrumFps) return
    sinceBarsRef.current = 0
    barRefs.current.forEach((bar, index) => {
      if (!bar) return
      const x = (index + 0.5) * barWidth
      const db = filterResponse(type, cutoff, resonance, x) - 8 + (Math.random() - 0.5) * 14
      const top = dbToY(db)
      bar.setAttribute('y', top.toFixed(2))
      bar.setAttribute('height', Math.max(0, viewHeight - top).toFixed(2))
    })
  })

  const markerX = cutoffX(cutoff)

  return (
    <ScopeFrame
      overlay={
        <ScopeDot
          active={enabled}
          x={markerX}
          y={dbToY(filterResponse(type, cutoff, resonance, markerX))}
        />
      }
      testId="filter-scope"
    >
      <ScopeGrid columns={filterDecades * 2} rowY={dbToY(0)} />
      <ScopeTrace active={enabled}>
        <g fill="var(--crt-acc)" opacity="0.16">
          {Array.from({ length: spectrumBars }, (_, index) => (
            <rect
              height="0"
              key={index}
              ref={(element) => {
                barRefs.current[index] = element
              }}
              width={(barWidth * 0.6).toFixed(2)}
              x={(index * barWidth + barWidth * 0.2).toFixed(2)}
              y={viewHeight}
            />
          ))}
        </g>
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

/*
  Delay: a dry hit followed by echo taps, spaced by Rate and shrinking by
  Decay. The taps flash in turn, as if the hit had just played.
*/

type DelayScopeProps = { decay: number; enabled: boolean; mix: number; rate: number }

const delayFirstTapX = 14
const delayBaseline = viewHeight - 5
const delayTapHeight = viewHeight - 11
/** Taps quieter than this aren't worth drawing. */
const delayQuietest = 0.04
/** How fast the hit travels through the taps, in view units per second. */
const delayTravelSpeed = 150
/** Extra distance past the right edge before the next hit, as a breather. */
const delayRest = 120
const delayRestingOpacity = 0.55

export function delayTaps(decay: number, rate: number) {
  const gap = 12 + clamp01(rate / 100) * 48
  const feedback = clamp01(decay / 100) * 0.92
  const taps: { level: number; x: number }[] = []
  for (let index = 0; delayFirstTapX + index * gap <= viewWidth - 6; index += 1) {
    const level = index === 0 ? 1 : feedback ** index
    if (level < delayQuietest) break
    taps.push({ level, x: delayFirstTapX + index * gap })
  }
  return taps
}

export function DelayScope({ decay, enabled, mix, rate }: DelayScopeProps) {
  const tapRefs = useRef<(SVGLineElement | null)[]>([])
  const headRef = useRef(viewWidth + delayRest)
  const taps = useMemo(() => delayTaps(decay, rate), [decay, rate])
  const wetOpacity = 0.2 + 0.8 * clamp01(mix / 100)

  useAnimationLoop((elapsed) => {
    headRef.current = (headRef.current + elapsed * delayTravelSpeed) % (viewWidth + delayRest)
    const head = headRef.current
    tapRefs.current.forEach((tap, index) => {
      if (!tap) return
      const since = head - (taps[index]?.x ?? 0)
      const flash = since >= 0 ? Math.exp(-since / 30) : 0
      const base = index === 0 ? 1 : wetOpacity
      tap.setAttribute(
        'opacity',
        (base * (delayRestingOpacity + (1 - delayRestingOpacity) * flash)).toFixed(3),
      )
    })
  })

  return (
    <ScopeFrame testId="delay-scope">
      <ScopeGrid columns={6} rowY={delayBaseline} />
      <ScopeTrace active={enabled}>
        {taps.map((tap, index) => (
          <line
            data-testid="delay-tap"
            key={index}
            ref={(element) => {
              tapRefs.current[index] = element
            }}
            stroke={index === 0 ? 'var(--crt-led)' : 'var(--crt-acc)'}
            strokeLinecap="round"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
            x1={tap.x}
            x2={tap.x}
            y1={delayBaseline}
            y2={delayBaseline - tap.level * delayTapHeight}
          />
        ))}
      </ScopeTrace>
    </ScopeFrame>
  )
}

/*
  Chorus: the dry wave with two detuned copies that drift ahead of and behind
  it. Frequency sets how quickly they drift, Depth how far, Mix how bright.
*/

type ChorusScopeProps = { depth: number; enabled: boolean; frequency: number; mix: number }

const chorusCycles = 2
const chorusCycleWidth = viewWidth / chorusCycles
const chorusAmplitude = viewHeight / 2 - 8
/** The whole picture scrolls slowly so it never sits still. */
const chorusScrollRate = 0.35
/** At full Depth a copy strays this far from the dry wave, in cycles. */
const chorusMaxOffset = 0.2
/** Each copy's drift runs this far out of step with the other. */
const chorusVoicePhases = [0, 0.37]

const chorusRate = (frequency: number) => 0.12 * 25 ** clamp01(frequency / 100)

/** A sine running from one cycle before the view to one past it, for scrolling. */
const chorusPath = (() => {
  const steps = (chorusCycles + 2) * 24
  const points = Array.from({ length: steps + 1 }, (_, step) => {
    const x = ((step / 24 - 1) * chorusCycleWidth).toFixed(2)
    const y = viewHeight / 2 - Math.sin((step / 24) * Math.PI * 2) * chorusAmplitude
    return `${x} ${y.toFixed(2)}`
  })
  return `M${points.join(' L')}`
})()

export function ChorusScope({ depth, enabled, frequency, mix }: ChorusScopeProps) {
  const dryRef = useRef<SVGPathElement>(null)
  const voiceRefs = useRef<(SVGPathElement | null)[]>([])
  const scrollRef = useRef(0)
  const driftRef = useRef(0)

  useAnimationLoop((elapsed) => {
    scrollRef.current = (scrollRef.current + elapsed * chorusScrollRate) % 1
    driftRef.current = (driftRef.current + elapsed * chorusRate(frequency)) % 1
    const translate = (cycles: number) =>
      `translate(${(-(((cycles % 1) + 1) % 1) * chorusCycleWidth).toFixed(2)} 0)`
    dryRef.current?.setAttribute('transform', translate(scrollRef.current))
    voiceRefs.current.forEach((voice, index) => {
      const drift = Math.sin((driftRef.current + chorusVoicePhases[index]) * Math.PI * 2)
      const offset = drift * clamp01(depth / 100) * chorusMaxOffset * (index === 0 ? 1 : -1)
      voice?.setAttribute('transform', translate(scrollRef.current + offset))
    })
  })

  const wetOpacity = 0.15 + 0.6 * clamp01(mix / 100)

  return (
    <ScopeFrame testId="chorus-scope">
      <ScopeGrid columns={chorusCycles * 2} rowY={viewHeight / 2} />
      <ScopeTrace active={enabled}>
        {chorusVoicePhases.map((_, index) => (
          <path
            d={chorusPath}
            data-testid="chorus-voice"
            fill="none"
            key={index}
            opacity={wetOpacity}
            ref={(element) => {
              voiceRefs.current[index] = element
            }}
            stroke="var(--crt-acc-lt)"
            strokeLinejoin="round"
            strokeWidth="1.25"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path
          d={chorusPath}
          fill="none"
          ref={dryRef}
          stroke="var(--crt-acc)"
          strokeLinejoin="round"
          strokeWidth="1.75"
          vectorEffect="non-scaling-stroke"
        />
      </ScopeTrace>
    </ScopeFrame>
  )
}

/*
  Reverb: the dry hit, a few early reflections, then a dense tail that
  decays away. Space sets the reflections and how long the room rings, Decay
  stretches the tail, Mix sets its brightness. The tail redraws itself from
  each new hit, with a fresh scatter of grains every time.
*/

/** 0 Room, 1 Hall, 2 Plate. */
type ReverbScopeProps = { decay: number; enabled: boolean; mix: number; space: number }

type ReverbSpace = { predelay: number; reflections: number[]; scale: number }

/** Early reflections are offsets from the hit, in view units, with their levels baked in by order. */
const reverbSpaces: ReverbSpace[] = [
  { predelay: 12, reflections: [5, 9, 14, 19], scale: 0.6 },
  { predelay: 30, reflections: [9, 16, 24, 31, 40, 49], scale: 1 },
  { predelay: 2, reflections: [], scale: 0.8 },
]

const reverbHitX = 10
const reverbGrains = 110
const reverbGrainGap = (viewWidth - reverbHitX - 4) / reverbGrains
const reverbAmplitude = viewHeight / 2 - 5
/** The tail draws in at this many view units per second. */
const reverbDrawSpeed = 240
const reverbHold = 0.9
const reverbFade = 0.45

/** Tail envelope, 0–1, at `distance` view units after the hit. */
export function reverbEnvelope(space: number, decay: number, distance: number) {
  const { predelay, scale } = reverbSpaces[space] ?? reverbSpaces[0]
  if (distance < predelay) return 0
  const length = viewWidth * (0.06 + 0.86 * clamp01(decay / 100)) * scale
  const build = Math.min(1, (distance - predelay) / 8)
  return build * Math.exp((-3.5 * (distance - predelay)) / length)
}

export function ReverbScope({ decay, enabled, mix, space }: ReverbScopeProps) {
  const grainRefs = useRef<(SVGLineElement | null)[]>([])
  const groupRef = useRef<SVGGElement>(null)
  const drawTime = viewWidth / reverbDrawSpeed
  // Start fully drawn, so a still frame (reduced motion) shows the whole tail.
  const clockRef = useRef(drawTime)
  const scatterRef = useRef<number[]>([])
  if (scatterRef.current.length === 0) {
    scatterRef.current = Array.from({ length: reverbGrains }, () => 0.3 + 0.7 * Math.random())
  }

  const reflections = (reverbSpaces[space] ?? reverbSpaces[0]).reflections
  const wetOpacity = 0.25 + 0.75 * clamp01(mix / 100)

  useAnimationLoop((elapsed) => {
    const period = drawTime + reverbHold
    clockRef.current += elapsed
    if (clockRef.current >= period) {
      clockRef.current %= period
      scatterRef.current = scatterRef.current.map(() => 0.3 + 0.7 * Math.random())
    }
    const clock = clockRef.current
    const head = clock * reverbDrawSpeed
    const fade = clamp01((period - clock) / reverbFade)
    groupRef.current?.setAttribute('opacity', fade.toFixed(3))
    grainRefs.current.forEach((grain, index) => {
      if (!grain) return
      const x = reverbHitX + (index + 1) * reverbGrainGap
      const half =
        reverbEnvelope(space, decay, x - reverbHitX) * scatterRef.current[index] * reverbAmplitude
      grain.setAttribute('y1', (viewHeight / 2 - half).toFixed(2))
      grain.setAttribute('y2', (viewHeight / 2 + half).toFixed(2))
      grain.setAttribute('opacity', x <= head ? '1' : '0')
    })
  })

  return (
    <ScopeFrame testId="reverb-scope">
      <ScopeGrid columns={6} rowY={viewHeight / 2} />
      <ScopeTrace active={enabled}>
        <g ref={groupRef}>
          <g opacity={wetOpacity} stroke="var(--crt-acc)" strokeWidth="1.25">
            {Array.from({ length: reverbGrains }, (_, index) => (
              <line
                key={index}
                ref={(element) => {
                  grainRefs.current[index] = element
                }}
                vectorEffect="non-scaling-stroke"
                x1={reverbHitX + (index + 1) * reverbGrainGap}
                x2={reverbHitX + (index + 1) * reverbGrainGap}
                y1={viewHeight / 2}
                y2={viewHeight / 2}
              />
            ))}
            {reflections.map((offset, index) => {
              const half = reverbAmplitude * 0.8 * 0.82 ** index
              return (
                <line
                  data-testid="reverb-reflection"
                  key={offset}
                  stroke="var(--crt-acc-lt)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  x1={reverbHitX + offset}
                  x2={reverbHitX + offset}
                  y1={viewHeight / 2 - half}
                  y2={viewHeight / 2 + half}
                />
              )
            })}
          </g>
          <line
            stroke="var(--crt-led)"
            strokeLinecap="round"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
            x1={reverbHitX}
            x2={reverbHitX}
            y1={viewHeight / 2 - reverbAmplitude}
            y2={viewHeight / 2 + reverbAmplitude}
          />
        </g>
      </ScopeTrace>
    </ScopeFrame>
  )
}

/*
  Distortion: a sine scrolls past with the clean input ghosted behind it.
  Gain squashes the tops flat, Tone sets how hard the corners are (round
  saturation to sharp clipping), Level sets the output height.
*/

type DistortionScopeProps = { enabled: boolean; gain: number; level: number; tone: number }

const distortionCycles = 2
const distortionCycleWidth = viewWidth / distortionCycles
const distortionAmplitude = viewHeight / 2 - 6
const distortionScrollRate = 0.5
const distortionSteps = 48

/** The shaped output, -1 to 1 before Level, for an input of -1 to 1. */
export function distortionShape(gain: number, tone: number, input: number) {
  const drive = 1 + clamp01(gain / 100) * 14
  const soft = Math.tanh(drive * input) / Math.tanh(drive)
  const hard = Math.max(-1, Math.min(1, drive * input))
  const hardness = clamp01(tone / 100)
  return soft + (hard - soft) * hardness
}

/** One cycle before the view to one past it, so the trace can scroll. */
function distortionPath(shape: (input: number) => number, height: number) {
  const steps = (distortionCycles + 2) * distortionSteps
  const points = Array.from({ length: steps + 1 }, (_, step) => {
    const x = ((step / distortionSteps - 1) * distortionCycleWidth).toFixed(2)
    const value = shape(Math.sin((step / distortionSteps) * Math.PI * 2))
    return `${x} ${(viewHeight / 2 - value * height).toFixed(2)}`
  })
  return `M${points.join(' L')}`
}

const cleanDistortionPath = distortionPath((input) => input, distortionAmplitude)

export function DistortionScope({ enabled, gain, level, tone }: DistortionScopeProps) {
  const traceRef = useRef<SVGGElement>(null)
  const scrollRef = useRef(0)

  const shaped = useMemo(
    () =>
      distortionPath(
        (input) => distortionShape(gain, tone, input),
        distortionAmplitude * (0.2 + 0.8 * clamp01(level / 100)),
      ),
    [gain, level, tone],
  )

  useAnimationLoop((elapsed) => {
    scrollRef.current = (scrollRef.current + elapsed * distortionScrollRate) % 1
    traceRef.current?.setAttribute(
      'transform',
      `translate(${(-scrollRef.current * distortionCycleWidth).toFixed(2)} 0)`,
    )
  })

  return (
    <ScopeFrame testId="distortion-scope">
      <ScopeGrid columns={distortionCycles * 2} rowY={viewHeight / 2} />
      <ScopeTrace active={enabled}>
        <g ref={traceRef}>
          <path
            d={cleanDistortionPath}
            fill="none"
            opacity="0.25"
            stroke="var(--crt-acc-lt)"
            strokeDasharray="3 3"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={shaped}
            data-testid="distortion-trace"
            fill="none"
            stroke="var(--crt-acc)"
            strokeLinejoin="round"
            strokeWidth="1.75"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </ScopeTrace>
    </ScopeFrame>
  )
}

/*
  Phaser: a flat response with a pair of notches sweeping back and forth.
  Frequency sets the sweep speed, Depth how far it travels, Mix how deep the
  notches cut.
*/

type PhaserScopeProps = { depth: number; enabled: boolean; frequency: number; mix: number }

const phaserCentre = viewWidth * 0.38
/** The second notch sits this far above the first. */
const phaserNotchSpacing = viewWidth * 0.26
const phaserNotchWidth = 9
const phaserMaxSweep = viewWidth * 0.3
const phaserSteps = 120

const phaserRate = (frequency: number) => 0.08 * 30 ** clamp01(frequency / 100)
/** 0 dB near the top, -40 dB near the floor. */
const phaserDbToY = (db: number) => 9 - db * 0.85

/** The response path with the first notch at `notchX`. */
export function phaserPath(notchX: number, mix: number) {
  const notchDb = 2 + 38 * clamp01(mix / 100)
  const points = Array.from({ length: phaserSteps + 1 }, (_, step) => {
    const x = (step / phaserSteps) * viewWidth
    const db = [notchX, notchX + phaserNotchSpacing].reduce(
      (total, centre) => total - notchDb / (1 + ((x - centre) / phaserNotchWidth) ** 2),
      0,
    )
    return `${x.toFixed(2)} ${phaserDbToY(Math.max(-40, db)).toFixed(2)}`
  })
  return `M${points.join(' L')}`
}

export function PhaserScope({ depth, enabled, frequency, mix }: PhaserScopeProps) {
  const lineRef = useRef<SVGPathElement>(null)
  const fillRef = useRef<SVGPathElement>(null)
  const phaseRef = useRef(0)

  useAnimationLoop((elapsed) => {
    phaseRef.current = (phaseRef.current + elapsed * phaserRate(frequency)) % 1
    const notchX =
      phaserCentre +
      Math.sin(phaseRef.current * Math.PI * 2) * phaserMaxSweep * clamp01(depth / 100)
    const path = phaserPath(notchX, mix)
    lineRef.current?.setAttribute('d', path)
    fillRef.current?.setAttribute('d', `${path} L${viewWidth} ${viewHeight} L0 ${viewHeight} Z`)
  })

  const initial = phaserPath(phaserCentre, mix)

  return (
    <ScopeFrame testId="phaser-scope">
      <ScopeGrid columns={6} rowY={phaserDbToY(0)} />
      <ScopeTrace active={enabled}>
        <path
          d={`${initial} L${viewWidth} ${viewHeight} L0 ${viewHeight} Z`}
          fill="var(--crt-acc)"
          opacity="0.12"
          ref={fillRef}
        />
        <path
          d={initial}
          data-testid="phaser-trace"
          fill="none"
          ref={lineRef}
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
