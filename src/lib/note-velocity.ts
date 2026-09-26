// Kept apart from `midi.ts` so the lazy piano keyboard can read these without importing the MIDI
// module, which would make the bundler split modules it shares with the entry into new chunks.

export const defaultNoteVelocity = 96
/** The softest and hardest strike a played note can ask for; a Note On at 0 releases the note. */
export const minNoteVelocity = 1
export const maxNoteVelocity = 127

/**
 * Plays a written velocity at the keyboard's Level. At the default level it is unchanged; other
 * levels scale it in proportion, so the phrase keeps its accents, and stop at the MIDI range.
 */
export function scaleNoteVelocity(velocity: number, level: number) {
  const scaled = Math.round((velocity * level) / defaultNoteVelocity)
  return Math.min(maxNoteVelocity, Math.max(minNoteVelocity, scaled))
}
