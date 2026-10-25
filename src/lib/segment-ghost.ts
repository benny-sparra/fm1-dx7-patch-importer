/**
 * What a seven-segment readout shows unlit behind its figures: an 8 for each digit, so every
 * segment is drawn, dimmed. The point and minus keep their place and every other character, which
 * VT323 draws, becomes a space of the same advance, so the ghost lines up with the text above it.
 */
export function segmentGhost(text: string): string {
  return text.replace(/[^.-]/g, (character) => (/[0-9]/.test(character) ? '8' : ' '))
}
