import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { operatorColors } from '@/lib/editor-visuals'
import { fm1Colorways, type Fm1Colorway } from '@/lib/fm1-colorway'

/*
 * WCAG 2.2 AA contrast for the CRT shell, checked against the tokens in
 * `src/index.css` rather than rendered pixels.
 *
 * axe cannot judge most of this UI: the fixed scanline overlay and the
 * hatched headers leave it unable to resolve a background, so it reports
 * those elements as incomplete. Resolving the ramp directly covers every
 * colourway, and tests hatched headers against their lighter stripe.
 *
 * Each pairing below is one the UI actually renders. When a component starts
 * putting a token on a new surface, add the pairing here.
 */

const stylesheet = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

const TEXT = 4.5 // 1.4.3, normal-size text
const NON_TEXT = 3 // 1.4.11, icons, control boundaries and state indicators

type Pairing = {
  /** A custom property name, a CSS colour, or either with `@alpha` for translucency. */
  foreground: string
  /** As `foreground`, or `top|base|alpha` for a translucent fill over a surface. */
  background: string
  minimum: number
  where: string
}

const textTokens = [
  '--crt-ink',
  '--crt-ink-2',
  '--crt-ink-3',
  '--crt-ink-4',
  '--crt-acc',
  '--crt-acc-br',
  '--crt-acc-lt',
  '--crt-led',
  '--color-destructive',
]

const surfaces = [
  '--crt-bg-0',
  '--crt-bg-well',
  '--crt-bg-1',
  '--crt-bg-2',
  '--crt-bg-3',
  '--crt-bg-panel',
  '--crt-bg-panel2',
  '--crt-bg-panel3',
  '--crt-bg-head',
  '--crt-hatch-a',
  '--crt-btn-face',
]

/** The envelope editor paints its own dark gradient; this is its lighter stop. */
const envelopePlot = 'hsl(255 48% 9%)'

const pairings: Pairing[] = [
  ...textTokens.flatMap((foreground) =>
    surfaces.map((background) => ({
      foreground,
      background,
      minimum: TEXT,
      where: 'text on a shell surface',
    })),
  ),
  ...['--crt-ink', '--crt-acc-br', '--crt-acc-lt', '--crt-led'].map((foreground) => ({
    foreground,
    background: '--crt-sel-bg',
    minimum: TEXT,
    where: 'text on a selected or hovered row',
  })),
  { foreground: '--crt-acc-mid', background: '--crt-bg-2', minimum: TEXT, where: 'editor tile' },

  // Filled controls.
  { foreground: '#fff', background: '--crt-btn', minimum: TEXT, where: 'primary button' },
  { foreground: '#fff', background: '--crt-btn-hover', minimum: TEXT, where: 'primary hover' },
  { foreground: '--crt-ink', background: '--crt-btn', minimum: TEXT, where: 'latched rack button' },
  {
    foreground: '--color-destructive-foreground',
    background: '--color-destructive',
    minimum: TEXT,
    where: 'destructive fill',
  },
  { foreground: '--crt-bg-0', background: '--crt-led', minimum: TEXT, where: 'audition badge' },
  { foreground: '--crt-bg-0', background: '--crt-acc', minimum: TEXT, where: 'held white key' },

  // Error boxes tint their surface with 10% of the destructive colour.
  {
    foreground: '--color-destructive',
    background: '--color-destructive|--crt-bg-panel2|0.1',
    minimum: TEXT,
    where: 'error box in a dialog',
  },
  {
    foreground: '--color-destructive',
    background: '--color-destructive|--crt-bg-0|0.1',
    minimum: TEXT,
    where: 'error box on the page',
  },

  // Status colours borrowed from Tailwind's palette.
  { foreground: '#34d399', background: '--crt-bg-0', minimum: TEXT, where: 'success status' },
  { foreground: '#34d399', background: '--crt-bg-panel2', minimum: TEXT, where: 'dialog success' },
  { foreground: '#34d399', background: '--crt-bg-panel', minimum: NON_TEXT, where: 'toast icon' },
  {
    foreground: '#d97706',
    background: '--crt-bg-panel2',
    minimum: NON_TEXT,
    where: 'warning icon',
  },

  // Control boundaries and state indicators.
  {
    foreground: '--color-input',
    background: '--crt-bg-panel2',
    minimum: NON_TEXT,
    where: 'field outline against a dialog',
  },
  {
    foreground: '--color-input',
    background: '--crt-bg-well',
    minimum: NON_TEXT,
    where: 'field outline against its own fill',
  },
  {
    foreground: '--crt-acc-dim',
    background: '--crt-bg-well',
    minimum: NON_TEXT,
    where: 'MIDI switch knob, off',
  },
  {
    foreground: '--crt-acc-dim',
    background: '--crt-bg-2',
    minimum: NON_TEXT,
    where: 'empty bank icon',
  },

  // Translucent ink.
  { foreground: '#fff@0.5', background: envelopePlot, minimum: TEXT, where: 'envelope labels' },
  { foreground: '#fff@0.85', background: envelopePlot, minimum: TEXT, where: 'envelope title' },
  { foreground: '#fff@0.6', background: envelopePlot, minimum: NON_TEXT, where: 'envelope help' },
  {
    foreground: '--crt-ink-3@0.75',
    background: '--crt-bg-panel',
    minimum: NON_TEXT,
    where: 'help button',
  },
  {
    foreground: '--crt-ink@0.85',
    background: '--crt-bg-panel2',
    minimum: TEXT,
    where: 'help popover body',
  },

  // Each unselected operator column heads with its number in its own colour.
  ...operatorColors.map((foreground, index) => ({
    foreground,
    background: '--crt-bg-head',
    minimum: TEXT,
    where: `operator ${index + 1} number`,
  })),
]

type Rgb = [number, number, number]

function declarations(selector: string) {
  const start = stylesheet.indexOf(selector)
  if (start === -1) throw new Error(`index.css has no ${selector} block`)
  const body = stylesheet.slice(stylesheet.indexOf('{', start) + 1, stylesheet.indexOf('}', start))
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  )
}

const themeTokens = { ...declarations('@theme {'), ...declarations(':root {') }

function tokensFor(colorway: Fm1Colorway) {
  return { ...themeTokens, ...declarations(`:root[data-fm1-colorway='${colorway}']`) }
}

function hslToRgb(hue: number, saturation: number, lightness: number): Rgb {
  const s = saturation / 100
  const l = lightness / 100
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12
    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255
  }
  return [channel(0), channel(8), channel(4)]
}

function parseColor(tokens: Record<string, string>, color: string): Rgb {
  if (color.startsWith('--') && !(color in tokens)) throw new Error(`Unknown token ${color}`)
  let value = tokens[color] ?? color
  for (let depth = 0; value.includes('var('); depth++) {
    if (depth > 10) throw new Error(`Unresolvable colour ${color}`)
    value = value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
      if (!(name in tokens)) throw new Error(`Unknown token ${name} in ${color}`)
      return tokens[name]
    })
  }

  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1]
  if (hex) {
    const full = hex.length === 3 ? hex.replace(/./g, '$&$&') : hex
    const n = Number.parseInt(full, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }

  const hsl = value.match(/^hsl\(([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\)$/)
  if (hsl) return hslToRgb(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]))

  throw new Error(`Cannot parse ${color} (resolved to ${value})`)
}

const blend = (top: Rgb, base: Rgb, alpha: number) =>
  top.map((channel, index) => channel * alpha + base[index] * (1 - alpha)) as Rgb

function relativeLuminance(rgb: Rgb) {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a: Rgb, b: Rgb) {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

function pairingContrast(tokens: Record<string, string>, { foreground, background }: Pairing) {
  const [top, base, fillAlpha] = background.split('|')
  const backgroundRgb = base
    ? blend(parseColor(tokens, top), parseColor(tokens, base), Number(fillAlpha))
    : parseColor(tokens, background)

  const [color, alpha = '1'] = foreground.split('@')
  const foregroundRgb = blend(parseColor(tokens, color), backgroundRgb, Number(alpha))

  return contrastRatio(foregroundRgb, backgroundRgb)
}

describe('contrast calculation', () => {
  it('matches the WCAG reference values', () => {
    const tokens = tokensFor('black')
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21)
    expect(contrastRatio(parseColor(tokens, '#767676'), [255, 255, 255])).toBeCloseTo(4.54, 2)
    expect(parseColor(tokens, 'hsl(0 100% 50%)')).toEqual([255, 0, 0])
  })

  it('resolves shell tokens through their var() chains', () => {
    expect(parseColor(tokensFor('black'), '--color-foreground')).toEqual(
      parseColor(tokensFor('black'), 'hsl(190 25% 92%)'),
    )
  })
})

describe.each(fm1Colorways.map(({ value }) => value))('%s colourway', (colorway) => {
  it('meets WCAG AA contrast for every pairing the shell renders', () => {
    const tokens = tokensFor(colorway)
    const failures = pairings.flatMap((pairing) => {
      const ratio = pairingContrast(tokens, pairing)
      return ratio >= pairing.minimum
        ? []
        : [
            `${pairing.foreground} on ${pairing.background} (${pairing.where}): ` +
              `${ratio.toFixed(2)}:1, needs ${pairing.minimum}:1`,
          ]
    })

    expect(failures).toEqual([])
  })
})
