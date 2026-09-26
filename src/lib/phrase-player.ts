import type { AuditionPhrase } from '@/lib/audition-phrases'
import { defaultNoteVelocity, scaleNoteVelocity } from '@/lib/note-velocity'

/**
 * A small loop player for the audition phrases.
 *
 * It exists only to play a fixed phrase while a patch is edited, so it has no transport, no
 * recording, and no editing: the FM1's own sequencer is a separate feature. Each event is timed
 * from the absolute start of the loop rather than from the previous event, so a late timer
 * cannot push the rest of the phrase along with it.
 */

/**
 * How late a timer may fire before the notes it missed are dropped rather than sent. Browsers
 * hold back timers in a hidden tab, by up to a minute, and sending everything due since then at
 * once would flood the FM1 with hundreds of notes.
 */
const phraseLatenessLimitMs = 250

export type PhraseEvent = {
  /** When the event happens, in milliseconds from the start of the loop. */
  at: number
  note: number
  type: 'off' | 'on'
  velocity: number
}

export type PhrasePlayerHandlers = {
  onActiveNotesChange?: (notes: ReadonlySet<number>) => void
  startNote: (note: number, velocity: number) => void
  stopNote: (note: number) => void
}

export type PhrasePlayerTimers = {
  clearTimer?: (handle: number) => void
  now?: () => number
  setTimer?: (callback: () => void, delayMs: number) => number
}

export type PhrasePlayer = {
  /** Starts `phrase` looping at `tempo`, replacing anything already playing. */
  play: (phrase: AuditionPhrase, tempo: number) => void
  /**
   * Plays on at `tempo` from where the phrase has got to, re-timing the notes still to come, so
   * dragging the tempo slider is heard at once but neither restarts the phrase nor retriggers a
   * note for every step of the drag.
   */
  setTempo: (tempo: number) => void
  /**
   * Plays every note from the next one on at `level`, the keyboard's Level, scaling the phrase's
   * written velocities. It lasts across phrases until changed.
   */
  setLevel: (level: number) => void
  /** Silences every sounding note and stops the loop. */
  stop: () => void
}

export function phraseCycleLength(phrase: AuditionPhrase, tempo: number) {
  return (phrase.beats * 60_000) / tempo
}

/**
 * Expands a phrase into the note-on and note-off events of one loop, in the order they are sent.
 * A note-off comes before a note-on at the same moment, so a note repeated across the loop
 * boundary is released before it is struck again.
 */
export function makePhraseEvents(phrase: AuditionPhrase, tempo: number): PhraseEvent[] {
  const msPerBeat = 60_000 / tempo
  const events = phrase.notes.flatMap((note) => [
    { at: note.start * msPerBeat, note: note.note, type: 'on' as const, velocity: note.velocity },
    {
      at: (note.start + note.duration) * msPerBeat,
      note: note.note,
      type: 'off' as const,
      velocity: 0,
    },
  ])

  return events.sort((first, second) => {
    if (first.at !== second.at) {
      return first.at - second.at
    }

    if (first.type !== second.type) {
      return first.type === 'off' ? -1 : 1
    }

    return first.note - second.note
  })
}

export function createPhrasePlayer(
  handlers: PhrasePlayerHandlers,
  timers: PhrasePlayerTimers = {},
): PhrasePlayer {
  const clearTimer = timers.clearTimer ?? ((handle: number) => window.clearTimeout(handle))
  const now = timers.now ?? (() => performance.now())
  const setTimer =
    timers.setTimer ??
    ((callback: () => void, delayMs: number) => window.setTimeout(callback, delayMs))

  const activeNotes = new Set<number>()
  let events: PhraseEvent[] = []
  let phrase: AuditionPhrase | null = null
  let tempo = 0
  let level = defaultNoteVelocity
  let cycleLength = 0
  let cycleStart = 0
  let index = 0
  let handle: number | null = null

  function reportActiveNotes() {
    handlers.onActiveNotesChange?.(new Set(activeNotes))
  }

  function releaseAllNotes() {
    if (activeNotes.size === 0) {
      return
    }

    activeNotes.forEach((note) => handlers.stopNote(note))
    activeNotes.clear()
    reportActiveNotes()
  }

  function cancelTimer() {
    if (handle !== null) {
      clearTimer(handle)
      handle = null
    }
  }

  function applyEvent(event: PhraseEvent) {
    if (event.type === 'on') {
      if (activeNotes.has(event.note)) {
        handlers.stopNote(event.note)
      }

      activeNotes.add(event.note)
      handlers.startNote(event.note, scaleNoteVelocity(event.velocity, level))
      return
    }

    if (activeNotes.delete(event.note)) {
      handlers.stopNote(event.note)
    }
  }

  function scheduleNextEvent() {
    const event = events[index]

    if (!event) {
      return
    }

    handle = setTimer(fireDueEvents, Math.max(0, cycleStart + event.at - now()))
  }

  /**
   * Silences the phrase and drops every event due before `time`, picking the loop up where it
   * would be by now.
   */
  function skipTo(time: number) {
    releaseAllNotes()

    if (time >= cycleStart + cycleLength) {
      cycleStart += Math.floor((time - cycleStart) / cycleLength) * cycleLength
    }

    index = events.findIndex((event) => cycleStart + event.at >= time)

    if (index === -1) {
      index = 0
      cycleStart += cycleLength
    }
  }

  function fireDueEvents() {
    handle = null
    const current = now()
    const next = events[index]

    if (next && current - (cycleStart + next.at) > phraseLatenessLimitMs) {
      skipTo(current)
    }

    let changed = false

    while (events.length > 0) {
      const event = events[index]

      if (!event || cycleStart + event.at > current) {
        break
      }

      applyEvent(event)
      changed = true
      index += 1

      if (index >= events.length) {
        index = 0
        cycleStart += cycleLength
      }
    }

    if (changed) {
      reportActiveNotes()
    }

    scheduleNextEvent()
  }

  return {
    play(nextPhrase, nextTempo) {
      cancelTimer()
      releaseAllNotes()

      cycleLength = phraseCycleLength(nextPhrase, nextTempo)
      const playable = Number.isFinite(cycleLength) && cycleLength > 0
      events = playable ? makePhraseEvents(nextPhrase, nextTempo) : []

      if (events.length === 0) {
        phrase = null
        return
      }

      phrase = nextPhrase
      tempo = nextTempo
      cycleStart = now()
      index = 0
      fireDueEvents()
    },
    setTempo(nextTempo) {
      if (!phrase || !Number.isFinite(nextTempo) || nextTempo <= 0 || nextTempo === tempo) {
        return
      }

      // Scaling every event by the same factor keeps their order, so the next event to send is
      // still `index`; only when it is due changes. The loop start moves so the beat the phrase
      // has reached lands on the present moment at the new tempo.
      const current = now()
      const beatsIn = ((current - cycleStart) * tempo) / 60_000
      tempo = nextTempo
      cycleLength = phraseCycleLength(phrase, tempo)
      events = makePhraseEvents(phrase, tempo)
      cycleStart = current - (beatsIn * 60_000) / tempo
      cancelTimer()
      scheduleNextEvent()
    },
    setLevel(nextLevel) {
      if (Number.isFinite(nextLevel)) {
        level = nextLevel
      }
    },
    stop() {
      cancelTimer()
      releaseAllNotes()
      events = []
      phrase = null
      index = 0
    },
  }
}
