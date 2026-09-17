import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  Fm1PlaybackObserver,
  fm1ObservationMaxPasses,
  fm1ObservationMessageLimit,
  fm1ObservationToleranceMs,
  fm1PatternRotationsMatch,
  reconstructFm1Pattern,
  rotateFm1Pattern,
  type Fm1ObservedNoteMessage,
} from './fm1-sequence-observer'
import { createFm1Pattern, fm1NoteStep, fm1RestStep, setFm1PatternStep } from './fm1-sequence'

const fixtureDirectory = fileURLToPath(
  new URL('../../docs/sequencer-fixtures/V15/', import.meta.url),
)

/**
 * Replays a committed hardware capture through the observer exactly as the browser would receive
 * it: raw bytes and a timestamp, in the order the device sent them.
 */
function observeFixture(fixtureId: string, limit?: number) {
  const lines = readFileSync(`${fixtureDirectory}${fixtureId}.ndjson`, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as { captured_at_utc: string; core_midi_packet_hex: string })

  const start = Date.parse(lines[0].captured_at_utc)
  const observer = new Fm1PlaybackObserver(limit)

  lines.forEach((line) => {
    const bytes = line.core_midi_packet_hex.split(' ').map((byte) => Number.parseInt(byte, 16))
    observer.ingest(bytes, Date.parse(line.captured_at_utc) - start)
  })

  return observer
}

/**
 * Every rotation of what was observed. A loop has no audible step 1, so a capture that begins
 * partway through the pattern reads it rotated; the test asserts the loop, not the phase.
 */
function rotationsOf(observed: string[]) {
  return observed.map((_unused, shift) => [...observed.slice(shift), ...observed.slice(0, shift)])
}

function steps(observation: ReturnType<typeof reconstructFm1Pattern>) {
  if (observation.status !== 'observed') throw new Error(`Expected an observed pattern.`)
  return observation.pattern.steps.map((step) =>
    step.kind === 'note' ? `${step.pitch}/${step.velocity}` : '-',
  )
}

describe('reconstructFm1Pattern against hardware captures', () => {
  it('reads two adjacent notes from the two-step capture', () => {
    const observation = observeFixture(
      'seq-V15-pattern-01-two-step-60-65-velocity-90-2026-08-31',
    ).observe({ loopLength: 15 })

    expect(rotationsOf(steps(observation))).toContainEqual([
      '60/90',
      '65/90',
      ...Array.from({ length: 13 }, () => '-'),
    ])
  })

  it('places the single rest the host recorded between two notes', () => {
    const observation = observeFixture('seq-V15-pattern-01-host-rest-single-2026-09-17').observe()

    expect(rotationsOf(steps(observation))).toContainEqual([
      '60/90',
      '-',
      '65/90',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
    ])
  })

  it('places both rests when two were recorded, given the device Step length', () => {
    // Two rests put the notes a whole number of 500 ms apart, which several step lengths divide,
    // so this capture is only unambiguous once the user supplies what the stock page shows.
    const observation = observeFixture('seq-V15-pattern-01-host-rest-double-2026-09-17').observe({
      loopLength: 9,
    })

    expect(rotationsOf(steps(observation))).toContainEqual([
      '60/90',
      '-',
      '-',
      '65/90',
      '-',
      '-',
      '-',
      '-',
      '-',
    ])
  })

  it('keeps two identical successive notes as two steps', () => {
    const observation = observeFixture(
      'seq-V15-pattern-01-repeated-note-60-run-1-2026-09-17',
    ).observe()

    expect(rotationsOf(steps(observation))).toContainEqual([
      '60/90',
      '60/90',
      ...Array.from({ length: 7 }, () => '-'),
    ])
  })

  it('reads the repeat run the same way as its paired run', () => {
    const one = observeFixture('seq-V15-pattern-01-repeated-note-60-run-1-2026-09-17').observe()
    const two = observeFixture('seq-V15-pattern-01-repeated-note-60-run-2-2026-09-17').observe()

    expect(steps(one)).toEqual(steps(two))
  })

  it('preserves the recorded attack velocity rather than the playback release velocity', () => {
    const observation = observeFixture('seq-V15-pattern-01-note-60-velocity-32-2026-08-31').observe(
      { loopLength: 15 },
    )

    expect(steps(observation)[0]).toBe('60/32')
  })

  it('estimates the global gate the device was playing at', () => {
    const loud = observeFixture('seq-V15-pattern-01-two-step-60-65-velocity-90-2026-08-31').observe(
      { loopLength: 15 },
    )
    const halved = observeFixture('seq-V15-pattern-01-two-step-60-65-gate-50-2026-08-31').observe({
      loopLength: 15,
    })

    expect(
      [loud, halved].map(
        (observation) => observation.status === 'observed' && observation.observedGatePercent,
      ),
    ).toEqual([80, 50])
  })

  it('reads the most recent passes when the pattern changed during the capture', () => {
    // The double-rest capture opens with the previous single-rest pattern still looping.
    const observation = observeFixture('seq-V15-pattern-01-host-rest-double-2026-09-17').observe({
      loopLength: 9,
    })

    expect(rotationsOf(steps(observation))).not.toContainEqual([
      '60/90',
      '-',
      '65/90',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
    ])
  })

  it('reports the loop period and step interval it found', () => {
    const observation = observeFixture('seq-V15-pattern-01-host-rest-single-2026-09-17').observe()

    expect(observation.status === 'observed' && Math.round(observation.loopPeriodMs)).toBe(1500)
    expect(observation.status === 'observed' && Math.round(observation.stepIntervalMs)).toBe(167)
  })
})

describe('reconstructFm1Pattern when the capture cannot support a pattern', () => {
  it('refuses a capture holding only one pass', () => {
    const observation = observeFixture(
      'seq-V15-pattern-01-fifteen-step-60-through-74-2026-08-31',
    ).observe()

    expect(observation).toEqual({ status: 'incomplete', problem: 'no-repeat', passes: 0 })
  })

  it('refuses playback whose passes are too far apart to be one loop', () => {
    const observation = observeFixture('seq-V15-pattern-01-one-note-64-repeat-2026-08-31').observe()

    expect(observation.status).toBe('incomplete')
  })

  it('refuses a single-note loop rather than guessing how many rests follow it', () => {
    const observation = observeFixture(
      'seq-V15-pattern-01-note-60-velocity-90-2026-08-31',
    ).observe()

    expect(observation.status === 'incomplete' && observation.problem).toBe(
      'loop-length-unresolved',
    )
    expect(observation.status === 'incomplete' && observation.candidateLoopLengths?.length).toBe(16)
  })

  it('resolves that same capture once the user supplies the device Step length', () => {
    const observation = observeFixture('seq-V15-pattern-01-note-60-velocity-90-2026-08-31').observe(
      { loopLength: 16 },
    )

    expect(steps(observation)).toEqual(['60/90', ...Array.from({ length: 15 }, () => '-')])
  })

  it('refuses a capture of someone playing the keys rather than a loop', () => {
    const observation = observeFixture('seq-V15-pattern-01-keypress-attempt-2026-08-31').observe()

    expect(observation.status).toBe('incomplete')
  })

  it('refuses a step length the playback does not fit', () => {
    const observation = observeFixture('seq-V15-pattern-01-host-rest-single-2026-09-17').observe({
      loopLength: 4,
    })

    expect(observation.status === 'incomplete' && observation.problem).toBe('off-grid')
  })

  it('refuses a stream holding fewer than two notes', () => {
    expect(reconstructFm1Pattern([])).toEqual({
      status: 'incomplete',
      problem: 'too-few-notes',
      passes: 0,
    })
  })

  it('refuses passes that disagree, as they do when someone plays along', () => {
    const played: Fm1ObservedNoteMessage[] = [
      { atMs: 0, kind: 'on', pitch: 60, velocity: 90 },
      { atMs: 1000, kind: 'on', pitch: 60, velocity: 90 },
      { atMs: 1200, kind: 'on', pitch: 72, velocity: 100 },
      { atMs: 2000, kind: 'on', pitch: 60, velocity: 90 },
    ]

    expect(reconstructFm1Pattern(played)).toEqual({
      status: 'incomplete',
      problem: 'inconsistent-passes',
      passes: 0,
    })
  })
})

describe('Fm1PlaybackObserver', () => {
  it('keeps note messages and ignores everything else on the port', () => {
    const observer = new Fm1PlaybackObserver()

    expect([
      observer.ingest([0x90, 0x3c, 0x5a], 0),
      observer.ingest([0x80, 0x3c, 0x64], 100),
      observer.ingest([0xb0, 0x01, 0x40], 200),
      observer.ingest([0xf0, 0x43, 0xf7], 300),
    ]).toEqual([true, true, false, false])
    expect(observer.observed).toHaveLength(2)
  })

  it('treats a velocity-0 note on as a release, as MIDI does everywhere else', () => {
    const observer = new Fm1PlaybackObserver()
    observer.ingest([0x90, 0x3c, 0x00], 0)

    expect(observer.observed[0].kind).toBe('off')
  })

  it('keeps a bounded window rather than growing while a device is connected', () => {
    const observer = observeFixture('seq-V15-pattern-01-host-rest-double-2026-09-17', 8)

    expect(observer.observed).toHaveLength(8)
  })

  it('still reconstructs the pattern from a window holding two complete passes', () => {
    const observer = observeFixture('seq-V15-pattern-01-host-rest-single-2026-09-17', 12)

    expect(rotationsOf(steps(observer.observe()))).toContainEqual([
      '60/90',
      '-',
      '65/90',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
    ])
  })

  it('forgets what it heard when it is cleared', () => {
    const observer = observeFixture('seq-V15-pattern-01-host-rest-single-2026-09-17')
    observer.clear()

    expect(observer.observe()).toEqual({
      status: 'incomplete',
      problem: 'too-few-notes',
      passes: 0,
    })
  })

  it('holds enough messages for the passes it compares', () => {
    expect(fm1ObservationMessageLimit).toBeGreaterThanOrEqual(
      16 * 2 * (fm1ObservationMaxPasses + 1),
    )
  })

  it('tolerates the few milliseconds of jitter the captures show', () => {
    const jittered: Fm1ObservedNoteMessage[] = [0, 1000, 1500, 2503, 3000, 4001].map(
      (atMs, index) => ({
        atMs,
        kind: 'on' as const,
        pitch: index % 2 === 0 ? 60 : 65,
        velocity: 90,
      }),
    )

    expect(reconstructFm1Pattern(jittered, { loopLength: 3 }).status).toBe('observed')
    expect(fm1ObservationToleranceMs).toBeGreaterThanOrEqual(3)
  })
})

describe('fm1PatternRotationsMatch', () => {
  it('matches a transmitted pattern against the rotation that was heard back', () => {
    const transmitted = setFm1PatternStep(
      setFm1PatternStep(createFm1Pattern(4), 0, fm1NoteStep(60, 90)),
      2,
      fm1NoteStep(65, 90),
    )

    expect(fm1PatternRotationsMatch(transmitted, rotateFm1Pattern(transmitted, 2))).toBe(true)
  })

  it('does not match a pattern whose notes differ', () => {
    const transmitted = setFm1PatternStep(createFm1Pattern(4), 0, fm1NoteStep(60, 90))
    const heard = setFm1PatternStep(createFm1Pattern(4), 0, fm1NoteStep(61, 90))

    expect(fm1PatternRotationsMatch(transmitted, heard)).toBe(false)
  })

  it('does not match a pattern whose velocity differs', () => {
    const transmitted = setFm1PatternStep(createFm1Pattern(2), 0, fm1NoteStep(60, 90))
    const heard = setFm1PatternStep(createFm1Pattern(2), 0, fm1NoteStep(60, 40))

    expect(fm1PatternRotationsMatch(transmitted, heard)).toBe(false)
  })

  it('does not match loops of different lengths', () => {
    expect(fm1PatternRotationsMatch(createFm1Pattern(4), createFm1Pattern(8))).toBe(false)
  })
})

describe('rotateFm1Pattern', () => {
  it('moves the named step to the front', () => {
    const pattern = setFm1PatternStep(createFm1Pattern(3), 2, fm1NoteStep(60, 90))

    expect(rotateFm1Pattern(pattern, 2).steps).toEqual([
      fm1NoteStep(60, 90),
      fm1RestStep(),
      fm1RestStep(),
    ])
  })

  it('accepts a negative rotation', () => {
    const pattern = setFm1PatternStep(createFm1Pattern(3), 2, fm1NoteStep(60, 90))

    expect(rotateFm1Pattern(pattern, -1).steps[0]).toEqual(fm1NoteStep(60, 90))
  })
})
