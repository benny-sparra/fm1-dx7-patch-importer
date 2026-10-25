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

  it('takes only the figures, the point, and the minus, which are all the font draws', () => {
    expect(dseg7Face()).toContain('unicode-range: U+002D-002E, U+0030-0039;')
  })

  it('scales its digits to the advance of VT323 so a readout keeps its width as it loads', () => {
    const sizeAdjust = Number(dseg7Face().match(/size-adjust: ([\d.]+)%/)?.[1])
    const digitAdvance = 0.816
    expect(digitAdvance * (sizeAdjust / 100)).toBeCloseTo(0.55, 1)
  })

  it('falls back to VT323 for every character it lacks', () => {
    expect(indexCss).toMatch(/\.font-seven-segment\s*{\s*font-family: 'DSEG7', 'VT323',/)
  })
})
