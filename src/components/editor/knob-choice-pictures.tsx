import type { Fm1VaEngine } from '@/lib/fm1-va-engine'

const decay = 'M2 14 L5 2 C9 10 16 13 30 13'
const lowPass = 'M1 5 H17 C22 5 25 9 31 15'
const vibrato = 'M1 8 C3 5 5 5 7 8 S11 11 13 8 S17 5 19 8 S23 11 25 8 S29 5 31 8'
const release = 'M2 14 L5 3 L22 3 L30 14'

/**
 * A line drawing of each knob choice, by engine and choice number, in the 32 × 16 grid and stroke
 * the oscillator's wave pictures use.
 */
const paths: Record<Fm1VaEngine, readonly string[]> = {
  fm: [
    // Brightness: harmonics falling away, as a bright tone keeps more of them.
    'M4 14 V3 M9 14 V5 M14 14 V7 M19 14 V9 M24 14 V11 M29 14 V12.5',
    // Feedback: a signal looping back on itself.
    'M5 12 H22 C28 12 28 4 22 4 H10 M13 1 L10 4 L13 7',
    'M2 14 L10 2 L30 2',
    'M2 14 L5 2 L14 9 L30 9',
    release,
    vibrato,
    // LFO speed: a wave pushed along.
    'M1 9 C4 2 8 2 11 9 S18 16 21 9 M24 9 H31 M28 6 L31 9 L28 12',
    lowPass,
  ],
  'virtual-analog': [
    lowPass,
    'M1 9 H15 C18 9 18 1 20.5 1 C23 1 23 15 31 15',
    'M2 14 L8 3 L16 9 L24 9 L30 14',
    decay,
    // Shape: the filter envelope bending either way.
    'M2 14 Q4 2 30 2 M2 14 Q28 14 30 2',
    // Super: stacked saws.
    'M1 7 L11 2 V7 L21 2 V7 L31 2 M1 14 L11 9 V14 L21 9 V14 L31 9',
    // Detune: two waves drifting apart.
    'M1 8 C4 2 8 2 11 8 S18 14 21 8 S28 2 31 8 M1 11 C5 4 10 4 14 11 S23 18 27 11',
    // LFO to cutoff: a wave over the filter it moves.
    'M1 4 C3 1 5 1 7 4 S11 7 13 4 S17 1 19 4 M1 10 H18 C23 10 25 12 31 15',
  ],
  'eight-bit': [
    'M2 14 V2 C6 10 12 13 30 13',
    'M1 14 H8 V11 H16 V8 H24 V11 H31',
    'M1 8 H8 V5 H16 V2 H24 V5 H31',
    decay,
    'M1 12 H6 V9 H11 V6 H16 V3 M20 8 H31 M28 5 L31 8 L28 11',
    vibrato,
    release,
    'M2 14 V6 C6 11 12 13 30 13',
  ],
}

export function KnobChoicePicture({
  choice,
  className,
  engine,
}: {
  choice: number
  className: string
  engine: Fm1VaEngine
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 32 16"
    >
      <path
        d={paths[engine][choice] ?? paths[engine][0]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
