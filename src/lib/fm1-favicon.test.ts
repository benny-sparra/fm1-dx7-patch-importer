// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { fm1Colorways } from './fm1-colorway'
import { applyFm1Favicon } from './fm1-favicon'

// jsdom's import.meta.url is not a file: URL, so these resolve from the repository root.
const stylesheet = readFileSync(path.resolve('src/index.css'), 'utf8')

function declarations(selector: string) {
  const start = stylesheet.indexOf(selector)
  if (start === -1) throw new Error(`index.css has no ${selector} block`)
  const body = stylesheet.slice(stylesheet.indexOf('{', start) + 1, stylesheet.indexOf('}', start))
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  )
}

// Resolves an `hsl(var(--crt-h) var(--crt-s-…) L%)` token to the hex the icon files carry.
function tokenHex(tokens: Record<string, string>, name: string) {
  const value = tokens[name].replace(/var\((--[\w-]+)\)/g, (_, token: string) => tokens[token])
  const match = value.match(/^hsl\(([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\)$/)
  if (!match) throw new Error(`Cannot parse ${name} (resolved to ${value})`)
  const [hue, saturation, lightness] = match.slice(1).map(Number)
  const s = saturation / 100
  const l = lightness / 100
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
  }
  return `#${[0, 8, 4].map((n) => channel(n).toString(16).padStart(2, '0')).join('')}`
}

describe('applyFm1Favicon', () => {
  afterEach(() => {
    document.head.querySelector('link[rel="icon"]')?.remove()
  })

  it('points the favicon at the selected colourway', () => {
    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = '/favicon.svg'
    document.head.append(link)

    applyFm1Favicon('purple')

    expect(link.getAttribute('href')).toBe('/favicon-purple.svg')
  })

  it('does nothing when the page has no favicon link', () => {
    expect(() => applyFm1Favicon('orange')).not.toThrow()
  })

  it.each(fm1Colorways.map(({ value }) => value))(
    'paints favicon-%s.svg in that colourway’s tokens',
    (colorway) => {
      const tokens = {
        ...declarations(':root {'),
        ...declarations(`:root[data-fm1-colorway='${colorway}']`),
      }
      const svg = readFileSync(path.resolve(`public/favicon-${colorway}.svg`), 'utf8')

      expect(svg).toContain(
        `<rect width="64" height="64" rx="13" fill="${tokenHex(tokens, '--crt-bg-0')}"/>`,
      )
      expect(svg).toContain(`<path fill="${tokenHex(tokens, '--crt-acc-br')}"`)
    },
  )
})
