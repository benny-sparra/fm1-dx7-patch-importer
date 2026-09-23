import { describe, expect, it } from 'vitest'

import {
  auditionPhrases,
  defaultAuditionPhraseId,
  findAuditionPhrase,
  maxPhraseTempo,
  minPhraseTempo,
} from '@/lib/audition-phrases'
import en from '@/i18n/locales/en'

describe('audition phrases', () => {
  it('gives every phrase a unique id', () => {
    const ids = auditionPhrases.map((phrase) => phrase.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('names every phrase in the English locale', () => {
    for (const phrase of auditionPhrases) {
      expect(en.ui.phrases[phrase.id as keyof typeof en.ui.phrases]).toEqual(expect.any(String))
    }
  })

  it('writes every phrase for a tempo the transport allows', () => {
    for (const phrase of auditionPhrases) {
      expect(phrase.tempo).toBeGreaterThanOrEqual(minPhraseTempo)
      expect(phrase.tempo).toBeLessThanOrEqual(maxPhraseTempo)
    }
  })

  it('keeps every note inside the MIDI note and velocity range', () => {
    for (const phrase of auditionPhrases) {
      for (const note of phrase.notes) {
        expect(Number.isInteger(note.note)).toBe(true)
        expect(note.note).toBeGreaterThanOrEqual(0)
        expect(note.note).toBeLessThanOrEqual(127)
        expect(Number.isInteger(note.velocity)).toBe(true)
        expect(note.velocity).toBeGreaterThanOrEqual(1)
        expect(note.velocity).toBeLessThanOrEqual(127)
      }
    }
  })

  it('ends every note before the loop restarts', () => {
    for (const phrase of auditionPhrases) {
      expect(phrase.beats).toBeGreaterThan(0)

      for (const note of phrase.notes) {
        expect(note.start).toBeGreaterThanOrEqual(0)
        expect(note.duration).toBeGreaterThan(0)
        expect(note.start + note.duration).toBeLessThanOrEqual(phrase.beats)
      }
    }
  })

  it('never sounds the same note twice at once', () => {
    for (const phrase of auditionPhrases) {
      const sorted = [...phrase.notes].sort((first, second) => first.start - second.start)

      for (const [index, note] of sorted.entries()) {
        const overlapping = sorted
          .slice(index + 1)
          .find((other) => other.note === note.note && other.start < note.start + note.duration)

        expect(overlapping).toBeUndefined()
      }
    }
  })

  it('finds a phrase by id and answers nothing for an unknown one', () => {
    expect(findAuditionPhrase(defaultAuditionPhraseId)?.id).toBe(defaultAuditionPhraseId)
    expect(findAuditionPhrase('no-such-phrase')).toBeUndefined()
  })
})
