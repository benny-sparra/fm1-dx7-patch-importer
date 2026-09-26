import { describe, expect, it } from 'vitest'

import type { AuditionPhrase } from '@/lib/audition-phrases'
import { createPhrasePlayer, makePhraseEvents, phraseCycleLength } from '@/lib/phrase-player'

const twoNotePhrase: AuditionPhrase = {
  beats: 2,
  id: 'test',
  notes: [
    { duration: 0.5, note: 60, start: 0, velocity: 100 },
    { duration: 0.5, note: 64, start: 1, velocity: 80 },
  ],
  tempo: 120,
}

/** A clock and timer queue the test drives by hand, so no test waits for real time. */
function makeTestClock() {
  let currentTime = 0
  let nextHandle = 1
  const timers = new Map<number, { at: number; callback: () => void }>()

  function advanceTo(time: number) {
    // Fire timers in due order, letting each one schedule the next.
    for (;;) {
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= time)
        .sort((first, second) => first[1].at - second[1].at)[0]

      if (!due) {
        break
      }

      const [handle, timer] = due
      timers.delete(handle)
      currentTime = Math.max(currentTime, timer.at)
      timer.callback()
    }

    currentTime = time
  }

  return {
    advanceTo,
    /** Holds every timer back until `time`, as a browser does in a hidden tab, then fires it. */
    stallUntil(time: number) {
      currentTime = time
      advanceTo(time)
    },
    clearTimer(handle: number) {
      timers.delete(handle)
    },
    get pendingTimers() {
      return timers.size
    },
    now() {
      return currentTime
    },
    setTimer(callback: () => void, delayMs: number) {
      const handle = nextHandle++
      timers.set(handle, { at: currentTime + delayMs, callback })
      return handle
    },
  }
}

function makeTestPlayer(phrase = twoNotePhrase, tempo = 120) {
  const clock = makeTestClock()
  const sent: string[] = []
  const activeNotes: number[][] = []
  const player = createPhrasePlayer(
    {
      onActiveNotesChange: (notes) => activeNotes.push([...notes].sort((a, b) => a - b)),
      startNote: (note, velocity) => sent.push(`on ${note} ${velocity}`),
      stopNote: (note) => sent.push(`off ${note}`),
    },
    {
      clearTimer: (handle) => clock.clearTimer(handle),
      now: () => clock.now(),
      setTimer: (callback, delayMs) => clock.setTimer(callback, delayMs),
    },
  )

  return { activeNotes, clock, phrase, player, sent, tempo }
}

describe('makePhraseEvents', () => {
  it('turns beats into milliseconds at the given tempo', () => {
    const events = makePhraseEvents(twoNotePhrase, 120)

    expect(events.map((event) => [event.type, event.note, event.at])).toEqual([
      ['on', 60, 0],
      ['off', 60, 250],
      ['on', 64, 500],
      ['off', 64, 750],
    ])
  })

  it('releases a note before striking one at the same moment', () => {
    const phrase: AuditionPhrase = {
      beats: 1,
      id: 'same-moment',
      notes: [
        { duration: 0.5, note: 60, start: 0, velocity: 100 },
        { duration: 0.5, note: 64, start: 0.5, velocity: 100 },
      ],
      tempo: 120,
    }

    const events = makePhraseEvents(phrase, 120)

    expect(events.map((event) => [event.type, event.note])).toEqual([
      ['on', 60],
      ['off', 60],
      ['on', 64],
      ['off', 64],
    ])
  })
})

describe('phraseCycleLength', () => {
  it('measures the loop from its beats and tempo', () => {
    expect(phraseCycleLength(twoNotePhrase, 120)).toBe(1000)
    expect(phraseCycleLength(twoNotePhrase, 60)).toBe(2000)
  })
})

describe('createPhrasePlayer', () => {
  it('sends the phrase in time order as the clock advances', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    expect(sent).toEqual(['on 60 100'])

    clock.advanceTo(300)
    expect(sent).toEqual(['on 60 100', 'off 60'])

    clock.advanceTo(800)
    expect(sent).toEqual(['on 60 100', 'off 60', 'on 64 80', 'off 64'])
  })

  it('loops the phrase from the start', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    clock.advanceTo(1000)

    expect(sent).toEqual(['on 60 100', 'off 60', 'on 64 80', 'off 64', 'on 60 100'])
  })

  it('times each loop from the start rather than from the last timer, so it cannot drift', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    // A busy page leaves every timer late; the fifth loop must still begin at four seconds.
    clock.advanceTo(3999)
    const beforeLoop = sent.length
    clock.advanceTo(4000)

    expect(sent.slice(beforeLoop)).toEqual(['on 60 100'])
  })

  it('still plays a note whose timer fires a little late', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    clock.advanceTo(300)
    // Its timer fires 200 ms after the note was due.
    clock.stallUntil(700)

    expect(sent).toEqual(['on 60 100', 'off 60', 'on 64 80'])
  })

  it('drops the notes a stalled timer missed rather than sending them all at once', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    // A hidden tab can hold a timer back for a minute: sixty loops of this phrase.
    clock.stallUntil(60_100)

    expect(sent).toEqual(['on 60 100', 'off 60'])
  })

  it('picks the loop up where it would be by the end of a stall', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    clock.stallUntil(60_100)
    const afterStall = sent.length
    clock.advanceTo(61_000)

    expect(sent.slice(afterStall)).toEqual(['on 64 80', 'off 64', 'on 60 100'])
  })

  it('waits for the next loop when a stall ends after the last note of a loop', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    clock.stallUntil(60_900)
    const afterStall = sent.length
    clock.advanceTo(60_999)
    expect(sent).toHaveLength(afterStall)

    clock.advanceTo(61_000)
    expect(sent.slice(afterStall)).toEqual(['on 60 100'])
  })

  it('keeps a tempo chosen before a stall', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    player.setTempo(60)
    clock.stallUntil(10_100)
    const afterStall = sent.length
    clock.advanceTo(12_000)

    // The tempo took effect at once, so the two-second loops start on even seconds: the stall
    // ends a tenth of a second into one, and its second note comes a second in.
    expect(sent.slice(afterStall)).toEqual(['on 64 80', 'off 64', 'on 60 100'])
  })

  it('silences a sounding note when it is stopped', () => {
    const { player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    player.stop()

    expect(sent).toEqual(['on 60 100', 'off 60'])
  })

  it('sends nothing more after it is stopped', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    player.stop()
    const afterStop = sent.length
    clock.advanceTo(5000)

    expect(sent).toHaveLength(afterStop)
    expect(clock.pendingTimers).toBe(0)
  })

  it('stops a sounding phrase before starting another', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    clock.advanceTo(100)
    player.play({ ...twoNotePhrase, id: 'other', notes: [twoNotePhrase.notes[1]] }, 120)
    clock.advanceTo(600)

    expect(sent).toEqual(['on 60 100', 'off 60', 'on 64 80'])
  })

  it('stays quiet when stopped twice', () => {
    const { player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    player.stop()
    player.stop()

    expect(sent).toEqual(['on 60 100', 'off 60'])
  })

  it('reports the notes that are sounding', () => {
    const { activeNotes, clock, player } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    clock.advanceTo(600)
    player.stop()

    expect(activeNotes).toEqual([[60], [], [64], []])
  })

  it('takes up a new tempo at once, from where the phrase has got to', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    // Half a beat in, as the first note is released.
    clock.advanceTo(250)
    player.setTempo(60)

    // The second note, a beat into the loop, is now half a beat away at a second a beat.
    clock.advanceTo(749)
    expect(sent).toEqual(['on 60 100', 'off 60'])
    clock.advanceTo(750)
    expect(sent).toEqual(['on 60 100', 'off 60', 'on 64 80'])
  })

  it('carries on the loop at the new tempo rather than restarting the phrase', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    clock.advanceTo(250)
    player.setTempo(60)

    // The loop that started at 0 now ends two beats in, at 1750, and the next starts there.
    clock.advanceTo(1749)
    expect(sent).toEqual(['on 60 100', 'off 60', 'on 64 80', 'off 64'])
    clock.advanceTo(1750)
    expect(sent).toEqual(['on 60 100', 'off 60', 'on 64 80', 'off 64', 'on 60 100'])
  })

  it('keeps a note sounding across a tempo change', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    // A tenth of a beat into the first note, which lasts half a beat.
    clock.advanceTo(50)
    player.setTempo(60)

    // Its release, four tenths of a beat away, now comes 400ms later rather than 200ms.
    clock.advanceTo(449)
    expect(sent).toEqual(['on 60 100'])
    clock.advanceTo(450)
    expect(sent).toEqual(['on 60 100', 'off 60'])
  })

  it('plays the notes after a level change at that level', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 120)
    player.setLevel(48)
    clock.advanceTo(800)

    expect(sent).toEqual(['on 60 100', 'off 60', 'on 64 40', 'off 64'])
  })

  it('keeps its level for the next phrase it plays', () => {
    const { player, sent } = makeTestPlayer()

    player.setLevel(48)
    player.play(twoNotePhrase, 120)

    expect(sent).toEqual(['on 60 50'])
  })

  it('ignores a level that is not a number', () => {
    const { player, sent } = makeTestPlayer()

    player.setLevel(Number.NaN)
    player.play(twoNotePhrase, 120)

    expect(sent).toEqual(['on 60 100'])
  })

  it('ignores a tempo change while nothing is playing', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.setTempo(60)
    clock.advanceTo(2000)

    expect(sent).toEqual([])
  })

  it('plays nothing at a tempo of zero', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play(twoNotePhrase, 0)
    clock.advanceTo(5000)

    expect(sent).toEqual([])
  })

  it('plays nothing for a phrase without notes', () => {
    const { clock, player, sent } = makeTestPlayer()

    player.play({ ...twoNotePhrase, notes: [] }, 120)
    clock.advanceTo(5000)

    expect(sent).toEqual([])
  })
})
