import { describe, expect, it } from 'vitest'

import { defaultNoteVelocity, scaleNoteVelocity } from '@/lib/note-velocity'

describe('scaleNoteVelocity', () => {
  it('leaves a velocity as written at the default level', () => {
    expect(scaleNoteVelocity(72, defaultNoteVelocity)).toBe(72)
  })

  it('scales a velocity in proportion to the level', () => {
    expect(scaleNoteVelocity(80, 48)).toBe(40)
  })

  it('stops at the hardest strike MIDI allows', () => {
    expect(scaleNoteVelocity(120, 127)).toBe(127)
  })

  it('never scales a note down to silence', () => {
    expect(scaleNoteVelocity(1, 1)).toBe(1)
  })
})
