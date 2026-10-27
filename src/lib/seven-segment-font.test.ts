import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const fontsCss = readFileSync('src/fonts.css', 'utf8')
const indexCss = readFileSync('src/index.css', 'utf8')

function dseg7Face(): string {
  const face = fontsCss.match(/@font-face\s*{[^}]*font-family: 'DSEG7'[^}]*}/)
  if (!face) throw new Error('fonts.css has no DSEG7 face')
  return face[0]
}

describe('seven-segment numbers', () => {
  it('vendors the DSEG7 file with its licence beside it', () => {
    expect(existsSync('src/fonts/dseg/DSEG7Classic-Regular.woff2')).toBe(true)
    expect(readFileSync('src/fonts/dseg/LICENSE', 'utf8')).toContain('SIL OPEN FONT LICENSE')
  })

  it('takes the figures, the point, the minus, and the letters, which are all the font draws', () => {
    expect(dseg7Face()).toContain(
      'unicode-range: U+002D-002E, U+0030-0039, U+0041-005A, U+0061-007A;',
    )
  })

  it('keeps the line box of VT323, so a readout is as tall as it was', () => {
    const face = dseg7Face()
    const sizeAdjust = Number(face.match(/size-adjust: ([\d.]+)%/)?.[1]) / 100
    const ascent = Number(face.match(/ascent-override: ([\d.]+)%/)?.[1]) / 100
    const descent = Number(face.match(/descent-override: ([\d.]+)%/)?.[1]) / 100
    expect(ascent * sizeAdjust).toBeCloseTo(1.1, 2)
    expect(descent * sizeAdjust).toBeCloseTo(0.275, 2)
  })

  it('falls back to VT323 for every character it lacks', () => {
    expect(indexCss).toMatch(/\.font-seven-segment\s*{\s*font-family: 'DSEG7', 'VT323',/)
  })
})
