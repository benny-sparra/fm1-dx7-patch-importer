// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const html = readFileSync(path.resolve(__dirname, '../firmware/index.html'), 'utf8')
const sortScriptPath = path.resolve(__dirname, '../public/firmware-sort.js')
const page = new DOMParser().parseFromString(html, 'text/html')
const entries = [...page.querySelectorAll('article.firmware-entry')]
const watched = [...page.querySelectorAll('.firmware-watch-item')]
const named = (list: Element[]) =>
  list.map(
    (entry) =>
      [
        (entry.querySelector('h2, .firmware-watch-name')?.textContent ?? '')
          .replace('↗', '')
          .trim(),
        entry,
      ] as const,
  )

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

  it.each(named(entries))('%s has an anchor of its own that links to it', (_name, entry) => {
    expect(entry.id).toMatch(/^[a-z0-9-]+$/)
    expect(page.querySelectorAll(`[id="${entry.id}"]`)).toHaveLength(1)
    expect(entry.querySelector('a.firmware-anchor')?.getAttribute('href')).toBe(`#${entry.id}`)
    expect(entry.querySelector('a.firmware-anchor')?.getAttribute('aria-label')).toBe(
      `Link to ${entry.querySelector('h2')?.textContent?.trim()}`,
    )
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
    '%s gives its photo alt text and the size of its source image',
    async (_name, entry) => {
      const image = entry.querySelector('.firmware-photo img')
      const source = image?.getAttribute('src') ?? ''
      const metadata = await sharp(path.resolve(__dirname, '..', `.${source}`)).metadata()
      expect(image?.getAttribute('alt')).toBeTruthy()
      expect(image?.getAttribute('width')).toBe(String(metadata.width))
      expect(image?.getAttribute('height')).toBe(String(metadata.height))
      expect(image?.getAttribute('srcset')?.replace(/\s+/g, ' ').trim()).toBe(
        `${source.replace('/src/assets/', '/src/assets/generated/').replace(/\.webp$/, '-460.webp')} 460w, ${source} ${metadata.width}w`,
      )
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

  it.each(named(watched))('%s on the watch list has a maker and a note', (_name, item) => {
    expect(item.querySelector('.firmware-watch-maker')?.textContent?.trim()).toBeTruthy()
    expect(item.querySelector('.firmware-blurb')?.textContent?.trim()).toBeTruthy()
  })

  it.each(named(watched))('%s on the watch list links out in a new tab', (_name, item) => {
    const link = item.querySelector('a.firmware-watch-name')
    expect(link?.getAttribute('href')).toMatch(/^https:\/\//)
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(link?.getAttribute('rel')).toContain('noopener')
  })

  it('keeps every firmware either listed or watched, never both', () => {
    const projectLinks = (list: Element[]) =>
      new Set(list.flatMap((element) => [...element.querySelectorAll('a')].map((a) => a.href)))
    const listed = projectLinks(entries)
    for (const link of projectLinks(watched)) expect(listed).not.toContain(link)
  })

  it.each(named(entries))('%s links out to its project in a new tab', (_name, entry) => {
    const links = [...entry.querySelectorAll('.firmware-links a')]
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(/^https:\/\//)
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toContain('noopener')
    }
  })

  it('pins the stock firmware and Baud Girl, which have no star count', () => {
    const pinned = entries.filter((entry) => entry.hasAttribute('data-pinned'))
    expect(pinned.map((entry) => entry.id)).toEqual(['stock', 'baud-girl'])
    expect(entries.slice(0, 2)).toEqual(pinned)
    for (const entry of pinned) expect(entry.hasAttribute('data-stars')).toBe(false)
  })

  const starred = entries.filter(
    (entry) =>
      !entry.hasAttribute('data-pinned') && entry.querySelector('a[href^="https://github.com/"]'),
  )

  it.each(named(starred))('%s shows the star count it is sorted by', (_name, entry) => {
    const stars = entry.getAttribute('data-stars') ?? ''
    expect(stars).toMatch(/^\d+$/)
    const label = entry.querySelector('.firmware-status .firmware-stars')
    expect(label?.getAttribute('data-counted')).toBe('true')
    expect(label?.querySelector('[aria-hidden="true"]:not(svg)')?.textContent).toBe(stars)
  })

  it.each(named(starred))(
    '%s names its star count in full for assistive technology and the tooltip',
    (_name, entry) => {
      const stars = entry.getAttribute('data-stars') ?? ''
      const full = `${stars} ${stars === '1' ? 'star' : 'stars'} on GitHub`
      const label = entry.querySelector('.firmware-status .firmware-stars')
      expect(label?.querySelector('.sr-only')?.textContent).toBe(full)
      expect(label?.getAttribute('title')).toBe(full)
    },
  )

  it.each(named(entries.filter((entry) => !entry.querySelector('a[href^="https://github.com/"]'))))(
    '%s says it is not on GitHub and has no star count',
    (_name, entry) => {
      expect(entry.hasAttribute('data-stars')).toBe(false)
      const label = entry.querySelector('.firmware-status .firmware-stars')
      expect(label?.getAttribute('data-counted')).toBe('false')
      expect(label?.textContent?.trim()).toBe('Not on GitHub')
    },
  )

  it.each(named(entries))(
    '%s draws its star from the page symbol, hidden from assistive technology',
    (_name, entry) => {
      const star = entry.querySelector('.firmware-stars svg.firmware-star')
      expect(star?.getAttribute('aria-hidden')).toBe('true')
      const symbol = star?.querySelector('use')?.getAttribute('href') ?? ''
      expect(page.querySelector(`svg[hidden] symbol${symbol}`)).not.toBeNull()
    },
  )

  const dayOf = (iso: string, options: Intl.DateTimeFormatOptions) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' })

  it.each(named(entries))('%s shows the date it was last updated', (_name, entry) => {
    const updated = entry.getAttribute('data-updated') ?? ''
    expect(updated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const time = entry.querySelector('.firmware-status .firmware-updated time')
    expect(time?.getAttribute('datetime')).toBe(updated)
    expect(time?.textContent).toBe(
      dayOf(updated, { day: 'numeric', month: 'short', year: 'numeric' }),
    )
  })

  const latest = [...page.querySelectorAll('.firmware-latest-item')]
  const latestDates = latest.map(
    (item) => item.querySelector('time')?.getAttribute('datetime') ?? '',
  )

  it('keeps the Latest strip to six dated lines, newest first', () => {
    expect(latest.length).toBeGreaterThan(0)
    expect(latest.length).toBeLessThanOrEqual(6)
    for (const iso of latestDates) expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(latestDates).toEqual(latestDates.toSorted().toReversed())
  })

  it('keeps only the last week in the Latest strip', () => {
    const newest = Date.parse(latestDates[0] ?? '')
    for (const iso of latestDates) {
      expect(newest - Date.parse(iso)).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000)
    }
  })

  it.each(latest.map((item) => [item.textContent?.replace(/\s+/g, ' ').trim(), item] as const))(
    'dates "%s" and links it to the page',
    (_text, item) => {
      const time = item.querySelector('time')
      const iso = time?.getAttribute('datetime') ?? ''
      expect(time?.textContent).toBe(dayOf(iso, { day: 'numeric', month: 'short' }))
      const links = [...item.querySelectorAll('a')]
      expect(links.length).toBeGreaterThan(0)
      for (const link of links) {
        const target = link.getAttribute('href') ?? ''
        expect(target).toMatch(/^#[a-z0-9-]+$/)
        expect(page.getElementById(target.slice(1))).not.toBeNull()
      }
    },
  )

  it('says when the star counts were read', () => {
    const time = page.querySelector('.firmware-sort-note time')
    expect(time?.getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(time?.textContent).toBe(
      new Date(`${time?.getAttribute('datetime')}T00:00:00Z`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
        year: 'numeric',
      }),
    )
  })
})

describe('firmware page order', () => {
  async function renderPage() {
    document.body.innerHTML = page.body.innerHTML
    vi.resetModules()
    await import(/* @vite-ignore */ sortScriptPath)
    return () => [...document.querySelectorAll('article.firmware-entry')].map((entry) => entry.id)
  }
  const option = (name: string) => screen.getByRole('button', { name })
  const written = entries.map((entry) => entry.id)
  const pinned = written.slice(0, 2)
  const byStars = entries
    .slice(2)
    .toSorted(
      (a, b) =>
        Number(b.getAttribute('data-stars') ?? -1) - Number(a.getAttribute('data-stars') ?? -1),
    )
    .map((entry) => entry.id)

  it('starts alphabetically, as written', async () => {
    const order = await renderPage()
    expect(order()).toEqual(written)
    expect(option('A–Z').getAttribute('aria-pressed')).toBe('true')
    expect(option('Most starred').getAttribute('aria-pressed')).toBe('false')
  })

  it('orders by stars after the pinned entries, keeping ties alphabetical', async () => {
    const order = await renderPage()
    await userEvent.click(option('Most starred'))
    expect(order()).toEqual([...pinned, ...byStars])
    expect(option('Most starred').getAttribute('aria-pressed')).toBe('true')
    expect(option('A–Z').getAttribute('aria-pressed')).toBe('false')
  })

  it('orders by release date after the pinned entries, newest first, ties alphabetical', async () => {
    const byUpdated = entries
      .slice(2)
      .toSorted((a, b) =>
        (b.getAttribute('data-updated') ?? '').localeCompare(a.getAttribute('data-updated') ?? ''),
      )
      .map((entry) => entry.id)
    const order = await renderPage()
    await userEvent.click(option('Recently updated'))
    expect(order()).toEqual([...pinned, ...byUpdated])
    expect(option('Recently updated').getAttribute('aria-pressed')).toBe('true')
    expect(option('A–Z').getAttribute('aria-pressed')).toBe('false')
  })

  it('puts an entry without a star count after the counted ones', async () => {
    const order = await renderPage()
    await userEvent.click(option('Most starred'))
    expect(order().at(-1)).toBe('groove-os')
  })

  it('returns to alphabetical order, with the watch list still last', async () => {
    const order = await renderPage()
    await userEvent.click(option('Most starred'))
    await userEvent.click(option('A–Z'))
    expect(order()).toEqual(written)
    expect(document.querySelector('article.firmware-entry:last-of-type')?.nextElementSibling).toBe(
      document.querySelector('.firmware-watch'),
    )
  })
})
