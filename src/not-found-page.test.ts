// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Cloudflare serves public/404.html for any path the site does not hold, so a chunk an old
// deployment named returns 404 rather than the editor's index.html.
const html = readFileSync(path.resolve(__dirname, '../public/404.html'), 'utf8')
const page = new DOMParser().parseFromString(html, 'text/html')

describe('not-found page', () => {
  it('is in British English, like the firmware page', () => {
    expect(page.documentElement.lang).toBe('en-GB')
  })

  it('asks search engines not to index it', () => {
    expect(page.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex')
  })

  it('links back to the editor', () => {
    expect(page.querySelector('main a')?.getAttribute('href')).toBe('/')
  })

  it('needs nothing the Content Security Policy blocks: no script or style element', () => {
    expect(page.querySelectorAll('script, style, link[rel="stylesheet"]')).toHaveLength(0)
  })
})
