import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  assertFm1Pattern,
  createFm1Pattern,
  Fm1SequenceError,
  fm1NoteStep,
  fm1RestStep,
  fm1SequenceDefaultGatePercent,
  fm1SequenceMaxLoopLength,
  fm1SequenceMaxGatePercent,
  fm1SequenceMaxPitch,
  fm1SequenceMaxVelocity,
  fm1SequenceMinGatePercent,
  fm1SequenceMinLoopLength,
  fm1SequenceMinPitch,
  fm1SequenceMinVelocity,
  fm1SequenceProvenance,
  isFm1Pattern,
  padFm1PatternToLoopLength,
  setFm1PatternStep,
} from './fm1-sequence'

const fixtureDirectory = fileURLToPath(
  new URL('../../docs/sequencer-fixtures/V15/', import.meta.url),
)

describe('fm1SequenceProvenance', () => {
  it('names hardware fixtures that exist for every modelled field', () => {
    const missing = Object.values(fm1SequenceProvenance)
      .flatMap((field) => field.fixtures)
      .filter((fixture) => !existsSync(`${fixtureDirectory}${fixture}.json`))

    expect(missing).toEqual([])
  })

  it('pairs every field with at least two fixtures, as the differential rule requires', () => {
    Object.entries(fm1SequenceProvenance).forEach(([field, { fixtures }]) => {
      expect(`${field}: ${fixtures.length}`).toBe(`${field}: 2`)
    })
  })

  it('marks the pattern-global controls as not transmittable by a host', () => {
    expect(fm1SequenceProvenance.loopLength.transmittable).toBe(false)
    expect(fm1SequenceProvenance.gatePercent.transmittable).toBe(false)
  })

  it('marks rests and repeated pitches transmittable, as SEQ-001B established', () => {
    expect(fm1SequenceProvenance.rest.transmittable).toBe(true)
    expect(fm1SequenceProvenance.repeatedPitch.transmittable).toBe(true)
  })
})

describe('createFm1Pattern', () => {
  it('fills the whole loop with rests so no step is left undefined', () => {
    const pattern = createFm1Pattern(4)

    expect(pattern.steps).toEqual([fm1RestStep(), fm1RestStep(), fm1RestStep(), fm1RestStep()])
  })

  it('refuses a loop length beyond the sixteen steps the device offers', () => {
    expect(() => createFm1Pattern(fm1SequenceMaxLoopLength + 1)).toThrowError(
      expect.objectContaining({ problem: 'loop-length' }),
    )
  })

  it('refuses a fractional loop length', () => {
    expect(() => createFm1Pattern(2.5)).toThrowError(Fm1SequenceError)
  })

  it('refuses a loop shorter than one step', () => {
    expect(() => createFm1Pattern(fm1SequenceMinLoopLength - 1)).toThrowError(
      expect.objectContaining({ problem: 'loop-length' }),
    )
  })

  it('takes the stock gate default when none is given', () => {
    expect(createFm1Pattern(1).gatePercent).toBe(fm1SequenceDefaultGatePercent)
  })

  it('refuses a gate above the stock control range', () => {
    expect(() => createFm1Pattern(4, fm1SequenceMaxGatePercent + 1)).toThrowError(
      expect.objectContaining({ problem: 'gate' }),
    )
  })

  it('refuses a gate below the stock control range', () => {
    expect(() => createFm1Pattern(4, fm1SequenceMinGatePercent - 1)).toThrowError(
      expect.objectContaining({ problem: 'gate' }),
    )
  })
})

describe('fm1NoteStep', () => {
  it('refuses velocity 0, which the recording path reserves for a rest', () => {
    expect(() => fm1NoteStep(60, fm1SequenceMinVelocity - 1)).toThrowError(
      expect.objectContaining({ problem: 'velocity' }),
    )
  })

  it('accepts the whole MIDI pitch range', () => {
    expect([
      fm1NoteStep(fm1SequenceMinPitch, 90).pitch,
      fm1NoteStep(fm1SequenceMaxPitch, 90).pitch,
    ]).toEqual([fm1SequenceMinPitch, fm1SequenceMaxPitch])
  })

  it('accepts the loudest velocity the MIDI range allows', () => {
    expect(fm1NoteStep(60, fm1SequenceMaxVelocity).velocity).toBe(fm1SequenceMaxVelocity)
  })

  it('refuses a pitch outside the MIDI range', () => {
    expect(() => fm1NoteStep(fm1SequenceMaxPitch + 1, 90)).toThrowError(
      expect.objectContaining({ problem: 'pitch' }),
    )
  })

  it('keeps pitch and attack velocity exactly as given', () => {
    expect(fm1NoteStep(60, 90)).toEqual({ kind: 'note', pitch: 60, velocity: 90 })
  })
})

describe('setFm1PatternStep', () => {
  it('replaces one step without disturbing the others', () => {
    const pattern = setFm1PatternStep(createFm1Pattern(3), 1, fm1NoteStep(67, 90))

    expect(pattern.steps).toEqual([
      fm1RestStep(),
      { kind: 'note', pitch: 67, velocity: 90 },
      fm1RestStep(),
    ])
  })

  it('leaves the original pattern unchanged', () => {
    const pattern = createFm1Pattern(2)
    setFm1PatternStep(pattern, 0, fm1NoteStep(60, 90))

    expect(pattern.steps).toEqual([fm1RestStep(), fm1RestStep()])
  })

  it('refuses a step index outside the loop', () => {
    expect(() => setFm1PatternStep(createFm1Pattern(2), 2, fm1RestStep())).toThrowError(
      expect.objectContaining({ problem: 'step-count' }),
    )
  })
})

describe('padFm1PatternToLoopLength', () => {
  it('grows a short pattern with rests', () => {
    const pattern = padFm1PatternToLoopLength({
      loopLength: 3,
      steps: [fm1NoteStep(60, 90)],
      gatePercent: 80,
    })

    expect(pattern.steps).toEqual([
      { kind: 'note', pitch: 60, velocity: 90 },
      fm1RestStep(),
      fm1RestStep(),
    ])
  })

  it('refuses to truncate a pattern that holds more steps than its loop length', () => {
    expect(() =>
      padFm1PatternToLoopLength({
        loopLength: 1,
        steps: [fm1NoteStep(60, 90), fm1NoteStep(62, 90)],
        gatePercent: 80,
      }),
    ).toThrowError(expect.objectContaining({ problem: 'step-count' }))
  })
})

describe('assertFm1Pattern', () => {
  it('accepts a pattern whose steps fill its loop', () => {
    expect(isFm1Pattern(createFm1Pattern(16))).toBe(true)
  })

  it('refuses a pattern whose step count differs from its loop length', () => {
    expect(() =>
      assertFm1Pattern({ loopLength: 4, steps: [fm1RestStep()], gatePercent: 80 }),
    ).toThrowError(expect.objectContaining({ problem: 'step-count' }))
  })

  it('refuses a step carrying an out-of-range velocity', () => {
    expect(() =>
      assertFm1Pattern({
        loopLength: 1,
        steps: [{ kind: 'note', pitch: 60, velocity: 200 }],
        gatePercent: 80,
      }),
    ).toThrowError(expect.objectContaining({ problem: 'velocity' }))
  })
})
