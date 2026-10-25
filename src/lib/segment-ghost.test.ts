import { describe, expect, it } from 'vitest'
import { segmentGhost } from './segment-ghost'

describe('segmentGhost', () => {
  it('shows every segment of each digit', () => {
    expect(segmentGhost('07')).toBe('88')
  })

  it('keeps the point and the minus where they are', () => {
    expect(segmentGhost('-1.05')).toBe('-8.88')
  })

  it('leaves a space the width of each character it does not draw', () => {
    expect(segmentGhost('+3 Hz')).toBe(' 8   ')
    expect(segmentGhost('25/75')).toBe('88 88')
  })
})
