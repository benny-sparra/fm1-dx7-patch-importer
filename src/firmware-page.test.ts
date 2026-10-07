// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const html = readFileSync(path.resolve(__dirname, '../firmware/index.html'), 'utf8')
const page = new DOMParser().parseFromString(html, 'text/html')
const entries = [...page.querySelectorAll('article.firmware-entry')]
const named = (list: Element[]) =>
  list.map((entry) => [entry.querySelector('h2')?.textContent?.trim(), entry] as const)

describe('firmware page', () => {
  it('lists at least one firmware', () => {
    expect(entries.length).toBeGreaterThan(0)
  })

  it.each(named(entries))('%s is named by its own heading', (_name, entry) => {
    const heading = entry.querySelector('h2.firmware-title')
    expect(heading?.id).toBeTruthy()
    expect(entry.getAttribute('aria-labelledby')).toBe(heading?.id)
    expect(page.querySelectorAll(`[id="${heading?.id}"]`)).toHaveLength(1)
  })

  it.each(named(entries))('%s has a maker, a support tag, and a blurb', (_name, entry) => {
    expect(entry.querySelector('.synthwave-kicker')?.textContent?.trim()).toBeTruthy()
    expect(['full', 'partial', 'none']).toContain(
      entry.querySelector('.firmware-tag')?.getAttribute('data-support'),
    )
    expect(entry.querySelector('.firmware-blurb')?.textContent?.trim()).toBeTruthy()
  })

  it.each(named(entries))('%s has either a photo or a placeholder', (_name, entry) => {
    expect(entry.querySelectorAll('.firmware-photo img, .firmware-photo-missing')).toHaveLength(1)
  })

  it.each(named(entries.filter((entry) => entry.querySelector('.firmware-photo img'))))(
    '%s gives its photo alt text and the photos’ size',
    (_name, entry) => {
      const image = entry.querySelector('.firmware-photo img')
      expect(image?.getAttribute('alt')).toBeTruthy()
      expect(image?.getAttribute('width')).toBe('923')
      expect(image?.getAttribute('height')).toBe('554')
      expect(image?.getAttribute('src')).toMatch(/^\/src\/assets\//)
    },
  )

  it.each(named(entries.filter((entry) => entry.querySelector('.firmware-photo-missing'))))(
    '%s hides its placeholder from assistive technology',
    (_name, entry) => {
      expect(entry.querySelector('.firmware-photo-missing')?.getAttribute('aria-hidden')).toBe(
        'true',
      )
    },
  )

  it.each(named(entries))('%s links out to its project in a new tab', (_name, entry) => {
    const links = [...entry.querySelectorAll('.firmware-links a')]
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(/^https:\/\//)
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toContain('noopener')
    }
  })
})
