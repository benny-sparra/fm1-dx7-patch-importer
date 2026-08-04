import { describe, expect, it } from 'vitest'

import { normalizeFm1Colorway } from './fm1-colorway'

describe('normalizeFm1Colorway', () => {
  it('keeps a supported FM1 finish', () => {
    expect(normalizeFm1Colorway('black-green')).toBe('black-green')
  })

  it('defaults a missing finish to black', () => {
    expect(normalizeFm1Colorway(null)).toBe('black')
  })

  it('defaults an invalid stored finish to black', () => {
    expect(normalizeFm1Colorway('ultraviolet')).toBe('black')
  })
})
