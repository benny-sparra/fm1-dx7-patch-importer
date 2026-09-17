import type { Output } from 'webmidi'

import { describe, expect, it, vi } from 'vitest'

import { createFm1Pattern, fm1NoteStep, fm1RestStep, type Fm1Pattern } from './fm1-sequence'
import {
  Fm1PatternTransmitError,
  fm1PatternTransmitDurationMs,
  fm1SequenceMinHoldMs,
  fm1SequenceMinStepPeriodMs,
  fm1SequenceRestPeriodMs,
  fm1SequenceRestPitch,
  makeFm1PatternTransmission,
  transmitFm1Pattern,
} from './fm1-sequence-transmit'

function pattern(steps: Fm1Pattern['steps'], loopLength = steps.length): Fm1Pattern {
  return { loopLength, steps, gatePercent: 80 }
}

function fakeOutput(failOnSend?: number) {
  const sent: string[] = []
  let sends = 0
  const output = {
    send(bytes: Uint8Array) {
      sends += 1
      if (sends === failOnSend) throw new Error('Port closed.')
      sent.push(
        Array.from(bytes)
          .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
          .join(' '),
      )
    },
  }
  return { output: output as unknown as Output, sent }
}

function fakeClock() {
  const waits: number[] = []
  return {
    waits,
    wait: async (ms: number) => {
      waits.push(ms)
    },
  }
}

describe('makeFm1PatternTransmission', () => {
  it('builds a sounding step as a note on followed by its note off', () => {
    const messages = makeFm1PatternTransmission(pattern([fm1NoteStep(60, 90)]), { channel: 1 })

    expect(messages.map((message) => Array.from(message.bytes))).toEqual([
      [0x90, 0x3c, 0x5a],
      [0x80, 0x3c, 0x00],
    ])
  })

  it('builds a rest as a single velocity-0 note on with no note off', () => {
    const messages = makeFm1PatternTransmission(pattern([fm1RestStep()]), { channel: 1 })

    expect(
      messages.map((message) => ({ kind: message.kind, bytes: Array.from(message.bytes) })),
    ).toEqual([{ kind: 'rest', bytes: [0x90, fm1SequenceRestPitch, 0x00] }])
  })

  it('puts the messages on the requested channel', () => {
    const messages = makeFm1PatternTransmission(pattern([fm1NoteStep(65, 40), fm1RestStep()]), {
      channel: 10,
    })

    expect(messages.map((message) => message.bytes[0])).toEqual([0x99, 0x89, 0x99])
  })

  it('gives two identical successive notes two independent steps', () => {
    const messages = makeFm1PatternTransmission(
      pattern([fm1NoteStep(60, 90), fm1NoteStep(60, 90)]),
      { channel: 1 },
    )

    expect(messages.map((message) => ({ step: message.step, atMs: message.atMs }))).toEqual([
      { step: 0, atMs: 0 },
      { step: 0, atMs: fm1SequenceMinHoldMs },
      { step: 1, atMs: fm1SequenceMinStepPeriodMs },
      { step: 1, atMs: fm1SequenceMinStepPeriodMs + fm1SequenceMinHoldMs },
    ])
  })

  it('leaves a rest a full captured rest period before the next step', () => {
    const messages = makeFm1PatternTransmission(pattern([fm1RestStep(), fm1NoteStep(60, 90)]), {
      channel: 1,
    })

    expect(messages[1].atMs).toBe(fm1SequenceRestPeriodMs)
  })
})

describe('transmitFm1Pattern validation', () => {
  const cases: [string, Fm1Pattern, Parameters<typeof transmitFm1Pattern>[2], string][] = [
    ['a channel outside 1 to 16', createFm1Pattern(1), { channel: 17 }, 'channel'],
    [
      'a step count that differs from the loop length',
      pattern([fm1RestStep()], 4),
      { channel: 1 },
      'pattern',
    ],
    [
      'a hold faster than anything captured',
      createFm1Pattern(1),
      { channel: 1, holdMs: fm1SequenceMinHoldMs - 1 },
      'hold',
    ],
    [
      'a step period faster than anything captured',
      createFm1Pattern(1),
      { channel: 1, stepPeriodMs: fm1SequenceMinStepPeriodMs - 1 },
      'step-period',
    ],
    [
      'a step period that would overlap two notes',
      createFm1Pattern(1),
      { channel: 1, holdMs: 200, stepPeriodMs: 150 },
      'step-period',
    ],
  ]

  it.each(cases)('refuses %s before sending a byte', async (_name, input, options, problem) => {
    const { output, sent } = fakeOutput()

    await expect(transmitFm1Pattern(output, input, options)).rejects.toThrowError(
      expect.objectContaining({ problem }),
    )
    expect(sent).toEqual([])
  })

  it('refuses a pattern with more steps than the device loop can hold', async () => {
    const { output, sent } = fakeOutput()
    const tooLong = pattern(Array.from({ length: 17 }, fm1RestStep), 17)

    await expect(transmitFm1Pattern(output, tooLong, { channel: 1 })).rejects.toThrowError(
      Fm1PatternTransmitError,
    )
    expect(sent).toEqual([])
  })

  it('keeps the underlying pattern problem as the cause without showing its text', async () => {
    const { output } = fakeOutput()

    await expect(
      transmitFm1Pattern(output, pattern([{ kind: 'note', pitch: 60, velocity: 0 }]), {
        channel: 1,
      }),
    ).rejects.toThrowError(expect.objectContaining({ problem: 'pattern' }))
  })
})

describe('transmitFm1Pattern', () => {
  it('sends the whole loop in step order and reports it as sent', async () => {
    const { output, sent } = fakeOutput()
    const clock = fakeClock()

    const result = await transmitFm1Pattern(
      output,
      pattern([fm1NoteStep(60, 90), fm1RestStep(), fm1NoteStep(65, 40)]),
      { channel: 1 },
      { wait: clock.wait },
    )

    expect(sent).toEqual(['90 3C 5A', '80 3C 00', '90 3C 00', '90 41 28', '80 41 00'])
    expect(result).toEqual({ outcome: 'sent', stepsSent: 3, stepCount: 3 })
  })

  it('waits the hold inside a step and the remainder of the period between steps', async () => {
    const clock = fakeClock()

    await transmitFm1Pattern(
      fakeOutput().output,
      pattern([fm1NoteStep(60, 90), fm1NoteStep(62, 90)]),
      { channel: 1 },
      { wait: clock.wait },
    )

    expect(clock.waits).toEqual([
      fm1SequenceMinHoldMs,
      fm1SequenceMinStepPeriodMs - fm1SequenceMinHoldMs,
      fm1SequenceMinHoldMs,
    ])
  })

  it('reports each step as it completes, so a caller can show progress', async () => {
    const progress: string[] = []

    await transmitFm1Pattern(
      fakeOutput().output,
      pattern([fm1NoteStep(60, 90), fm1RestStep(), fm1NoteStep(62, 90)]),
      { channel: 1 },
      {
        onStepSent: (stepsSent, stepCount) => progress.push(`${stepsSent}/${stepCount}`),
        wait: fakeClock().wait,
      },
    )

    expect(progress).toEqual(['1/3', '2/3', '3/3'])
  })

  it('does not report a step it could not send', async () => {
    const progress: number[] = []

    await transmitFm1Pattern(
      fakeOutput(3).output,
      pattern([fm1NoteStep(60, 90), fm1NoteStep(62, 90)]),
      { channel: 1 },
      { onStepSent: (stepsSent) => progress.push(stepsSent), wait: fakeClock().wait },
    )

    expect(progress).toEqual([1])
  })

  it('does not wait after the final step', async () => {
    const clock = fakeClock()

    await transmitFm1Pattern(
      fakeOutput().output,
      pattern([fm1RestStep()]),
      { channel: 1 },
      { wait: clock.wait },
    )

    expect(clock.waits).toEqual([])
  })

  it('stops at a step boundary when cancelled and reports the partial pass', async () => {
    const { output, sent } = fakeOutput()
    const controller = new AbortController()

    const result = await transmitFm1Pattern(
      output,
      pattern([fm1NoteStep(60, 90), fm1NoteStep(62, 90), fm1NoteStep(64, 90)]),
      { channel: 1 },
      {
        signal: controller.signal,
        wait: async () => {
          controller.abort()
        },
      },
    )

    expect(sent).toEqual(['90 3C 5A', '80 3C 00'])
    expect(result).toEqual({ outcome: 'cancelled', stepsSent: 1, stepCount: 3 })
  })

  it('sends nothing at all when it is cancelled before it starts', async () => {
    const { output, sent } = fakeOutput()
    const controller = new AbortController()
    controller.abort()

    const result = await transmitFm1Pattern(
      output,
      pattern([fm1NoteStep(60, 90)]),
      { channel: 1 },
      { signal: controller.signal, wait: fakeClock().wait },
    )

    expect(sent).toEqual([])
    expect(result).toEqual({ outcome: 'cancelled', stepsSent: 0, stepCount: 1 })
  })

  it('reports a port failure as an interrupted pass rather than a success', async () => {
    const { output, sent } = fakeOutput(3)

    const result = await transmitFm1Pattern(
      output,
      pattern([fm1NoteStep(60, 90), fm1NoteStep(62, 90)]),
      { channel: 1 },
      { wait: fakeClock().wait },
    )

    expect(result.outcome).toBe('interrupted')
    expect(result.stepsSent).toBe(1)
    // The failed note on may still have reached the wire, so its release is sent regardless.
    expect(sent).toEqual(['90 3C 5A', '80 3C 00', '80 3E 00'])
  })

  it('closes the note it had already started when the port fails mid-step', async () => {
    const { output, sent } = fakeOutput(1)
    const send = vi.spyOn(output, 'send')

    await transmitFm1Pattern(
      output,
      pattern([fm1NoteStep(60, 90)]),
      { channel: 1 },
      { wait: fakeClock().wait },
    )

    expect(Array.from(send.mock.calls[1][0] as Uint8Array)).toEqual([0x80, 0x3c, 0x00])
    expect(sent).toEqual(['80 3C 00'])
  })

  it('never retries by itself after a failure', async () => {
    const { output, sent } = fakeOutput(1)

    await transmitFm1Pattern(
      output,
      pattern([fm1NoteStep(60, 90), fm1NoteStep(62, 90)]),
      { channel: 1 },
      { wait: fakeClock().wait },
    )

    expect(sent).toEqual(['80 3C 00'])
  })
})

describe('fm1PatternTransmitDurationMs', () => {
  it('measures the pass from its first message to its last', () => {
    const duration = fm1PatternTransmitDurationMs(
      pattern([fm1NoteStep(60, 90), fm1RestStep(), fm1NoteStep(62, 90)]),
      { channel: 1 },
    )

    expect(duration).toBe(
      fm1SequenceMinStepPeriodMs + fm1SequenceRestPeriodMs + fm1SequenceMinHoldMs,
    )
  })

  it('keeps a full sixteen-step pattern inside two seconds at the captured note cadence', () => {
    const duration = fm1PatternTransmitDurationMs(
      pattern(Array.from({ length: 16 }, () => fm1NoteStep(60, 90))),
      { channel: 1 },
    )

    expect(duration).toBeLessThan(2000)
  })
})
