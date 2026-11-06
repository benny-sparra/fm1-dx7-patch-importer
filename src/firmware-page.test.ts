// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { fm1Colorways } from '@/lib/fm1-colorway'

const html = readFileSync(path.resolve(__dirname, '../firmware/index.html'), 'utf8')
const sortScriptPath = path.resolve(__dirname, '../public/firmware-sort.js')
const filterScriptPath = path.resolve(__dirname, '../public/firmware-filter.js')
const blurbScriptPath = path.resolve(__dirname, '../public/firmware-blurbs.js')
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

  it.each(named(entries))(
    '%s has an anchor of its own, which its title links to',
    (_name, entry) => {
      expect(entry.id).toMatch(/^[a-z0-9-]+$/)
      expect(page.querySelectorAll(`[id="${entry.id}"]`)).toHaveLength(1)
      expect(entry.querySelector('h2 > a.firmware-title-link')?.getAttribute('href')).toBe(
        `#${entry.id}`,
      )
    },
  )

  it.each(named(entries))('%s has a maker and a blurb', (_name, entry) => {
    expect(entry.querySelector('.synthwave-kicker')?.textContent?.trim()).toBeTruthy()
    expect(entry.querySelector('.firmware-blurb')?.textContent?.trim()).toBeTruthy()
  })

  // Only the firmwares this editor works with carry a tag, so the rest carry no "not supported".
  it.each(named(entries))(
    '%s carries a support tag only if the editor works with it',
    (_name, entry) => {
      for (const tag of entry.querySelectorAll('.firmware-tag')) {
        expect(['full', 'partial']).toContain(tag.getAttribute('data-support'))
      }
    },
  )

  it('tags the stock firmware and Baud Girl as working with this editor', () => {
    for (const entry of entries.filter((candidate) =>
      ['stock', 'baud-girl'].includes(candidate.id),
    )) {
      expect(entry.querySelector('.firmware-tag')?.getAttribute('data-support')).toBe('full')
    }
  })

  it.each(named(entries))(
    '%s has a photo or none, beside its title, and never a placeholder',
    (_name, entry) => {
      expect(entry.querySelector('.firmware-photo-missing')).toBeNull()
      const photos = entry.querySelectorAll('.firmware-photo')
      expect(photos.length).toBeLessThanOrEqual(1)
      expect(entry.querySelectorAll('.firmware-head > .firmware-photo')).toHaveLength(photos.length)
    },
  )

  it.each(named(entries.filter((entry) => entry.querySelector('.firmware-photo img'))))(
    '%s gives its photo alt text and the size of its source image',
    async (_name, entry) => {
      const image = entry.querySelector('.firmware-photo img')
      const source = image?.getAttribute('src') ?? ''
      const metadata = await sharp(path.resolve(__dirname, '..', `.${source}`)).metadata()
      expect(image?.getAttribute('alt')).toBeTruthy()
      expect(image?.getAttribute('width')).toBe(String(metadata.width))
      expect(image?.getAttribute('height')).toBe(String(metadata.height))
      // A source narrower than the 460 px derivative is served as it is, without a srcset.
      const derivative = source
        .replace('/src/assets/', '/src/assets/generated/')
        .replace(/\.webp$/, '-460.webp')
      expect(image?.getAttribute('srcset')?.replace(/\s+/g, ' ').trim()).toBe(
        (metadata.width ?? 0) > 460
          ? `${derivative} 460w, ${source} ${metadata.width}w`
          : undefined,
      )
    },
  )

  it.each(named(watched))(
    '%s on the watch list has its name and maker in one row',
    (_name, item) => {
      const row = item.querySelector(':scope > p:first-child')
      expect(row?.querySelector('a.firmware-watch-name')).not.toBeNull()
      expect(row?.querySelector('.firmware-watch-maker')).not.toBeNull()
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

  it.each(named(entries))('%s shows one main link, with any others in its menu', (_name, entry) => {
    const links = entry.querySelector('.firmware-links')
    const main = links?.querySelectorAll(':scope > a.firmware-link-main') ?? []
    const others = links?.querySelectorAll(':scope > details.firmware-link-menu .firmware-menu a')
    expect(main).toHaveLength(1)
    expect(links?.querySelectorAll('a')).toHaveLength(1 + (others?.length ?? 0))
  })

  it.each(named(entries.filter((entry) => entry.querySelector('.firmware-link-menu'))))(
    '%s names its menu toggle after the firmware, and lists a link in it',
    (name, entry) => {
      const menu = entry.querySelector('.firmware-link-menu')
      expect(menu?.querySelector('summary')?.getAttribute('aria-label')).toBe(
        `More links for ${name}`,
      )
      expect(menu?.querySelectorAll('.firmware-menu a').length).toBeGreaterThan(0)
    },
  )

  it.each(named(entries))('%s gives every link an icon from the sprite', (_name, entry) => {
    for (const link of entry.querySelectorAll('.firmware-links a')) {
      const icon = link.querySelector('svg.firmware-icon[aria-hidden="true"] use')
      const symbol = icon?.getAttribute('href') ?? ''
      expect(symbol).toMatch(/^#icon-/)
      expect(page.querySelector(`symbol${symbol}`)).not.toBeNull()
    }
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

  it('pins Official Open, the stock firmware, and Baud Girl, which have no star count', () => {
    const pinned = entries.filter((entry) => entry.hasAttribute('data-pinned'))
    expect(pinned.map((entry) => entry.id)).toEqual(['official-open', 'stock', 'baud-girl'])
    expect(entries.slice(0, 3)).toEqual(pinned)
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

  // Official Open is pinned, so it carries no count and no star.
  it.each(named(entries.filter((entry) => entry.id !== 'official-open')))(
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
  const latestTime = page.querySelector('.firmware-latest-title time')
  const latestDate = latestTime?.getAttribute('datetime') ?? ''

  it('dates the Latest strip in full', () => {
    expect(latestDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(latestTime?.textContent).toBe(
      dayOf(latestDate, { day: 'numeric', month: 'long', year: 'numeric' }),
    )
  })

  it('dates the Latest strip no earlier than any release on the page', () => {
    for (const entry of entries) {
      expect((entry.getAttribute('data-updated') ?? '') <= latestDate).toBe(true)
    }
  })

  it.each(latest.map((item) => [item.textContent?.replace(/\s+/g, ' ').trim(), item] as const))(
    'links "%s" to the page',
    (_text, item) => {
      const links = [...item.querySelectorAll('a')]
      expect(links.length).toBeGreaterThan(0)
      for (const link of links) {
        const target = link.getAttribute('href') ?? ''
        expect(target).toMatch(/^#[a-z0-9-]+$/)
        expect(page.getElementById(target.slice(1))).not.toBeNull()
      }
    },
  )

  it('says in the Order dropdown’s tooltip when the star counts were read', () => {
    const order = page.getElementById('firmware-order')
    const date = order?.getAttribute('data-stars-date') ?? ''
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(order?.getAttribute('title')).toBe(
      `Stars on GitHub as of ${dayOf(date, { day: 'numeric', month: 'long', year: 'numeric' })}`,
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
  const order = () => screen.getByRole<HTMLSelectElement>('combobox', { name: 'Order' })
  const choose = (name: string) =>
    userEvent.selectOptions(order(), screen.getByRole('option', { name }))
  const written = entries.map((entry) => entry.id)
  const pinned = written.slice(0, 3)
  const byStars = entries
    .slice(3)
    .toSorted(
      (a, b) =>
        Number(b.getAttribute('data-stars') ?? -1) - Number(a.getAttribute('data-stars') ?? -1),
    )
    .map((entry) => entry.id)

  it('starts alphabetically, as written', async () => {
    const shown = await renderPage()
    expect(shown()).toEqual(written)
    expect(order().value).toBe('name')
  })

  it('orders by stars after the pinned entries, keeping ties alphabetical', async () => {
    const shown = await renderPage()
    await choose('Most starred')
    expect(shown()).toEqual([...pinned, ...byStars])
  })

  it('orders by release date after the pinned entries, newest first, ties alphabetical', async () => {
    const byUpdated = entries
      .slice(3)
      .toSorted((a, b) =>
        (b.getAttribute('data-updated') ?? '').localeCompare(a.getAttribute('data-updated') ?? ''),
      )
      .map((entry) => entry.id)
    const shown = await renderPage()
    await choose('Recently updated')
    expect(shown()).toEqual([...pinned, ...byUpdated])
  })

  it('puts an entry without a star count after the counted ones', async () => {
    const shown = await renderPage()
    await choose('Most starred')
    expect(shown().slice(-2)).toEqual(['groove-os', 'redacted'])
  })

  it('returns to alphabetical order, with the watch list still after the cards', async () => {
    const shown = await renderPage()
    await choose('Most starred')
    await choose('A–Z')
    expect(shown()).toEqual(written)
    const grid = document.querySelector('.firmware-grid')
    expect(grid?.lastElementChild?.matches('article.firmware-entry')).toBe(true)
    expect(grid?.nextElementSibling).toBe(document.querySelector('.firmware-watch'))
  })
})

const categoriesOf = (entry: Element) => (entry.getAttribute('data-categories') ?? '').split(/\s+/)
const filters = [...page.querySelectorAll('.firmware-filter-option')]
const filterCategories = filters.map((filter) => filter.getAttribute('data-category'))

describe('firmware page categories', () => {
  it.each(named(entries))(
    '%s names at least one kind of firmware a filter shows',
    (_name, entry) => {
      const categories = categoriesOf(entry)
      expect(categories.length).toBeGreaterThan(0)
      for (const category of categories) {
        expect(category).not.toBe('all')
        expect(filterCategories).toContain(category)
      }
    },
  )

  it.each(filters.map((filter) => [filter.getAttribute('data-category'), filter] as const))(
    'counts the entries the %s filter shows',
    (category, filter) => {
      const shown = entries.filter(
        (entry) => category === 'all' || categoriesOf(entry).includes(category ?? ''),
      )
      expect(shown.length).toBeGreaterThan(0)
      expect(filter.querySelector('.firmware-filter-count')?.textContent).toBe(String(shown.length))
    },
  )
})

describe('firmware page filter', () => {
  // A link the test follows leaves its card in the address, which would open that card's blurb.
  afterEach(() => {
    history.replaceState(null, '', location.pathname)
  })

  async function renderPage() {
    document.body.innerHTML = page.body.innerHTML
    vi.resetModules()
    await import(/* @vite-ignore */ filterScriptPath)
    return () =>
      [...document.querySelectorAll('article.firmware-entry:not([hidden])')].map(
        (entry) => entry.id,
      )
  }
  const filter = (name: RegExp) => screen.getByRole('button', { name })
  const samplers = entries
    .filter((entry) => categoriesOf(entry).includes('samplers'))
    .map((entry) => entry.id)

  it('starts showing every entry', async () => {
    const shown = await renderPage()
    expect(shown()).toEqual(entries.map((entry) => entry.id))
    expect(filter(/^All/).getAttribute('aria-pressed')).toBe('true')
  })

  it('shows only the entries of the chosen kind and says how many', async () => {
    const shown = await renderPage()
    await userEvent.click(filter(/^Samplers/))
    expect(shown()).toEqual(samplers)
    expect(filter(/^Samplers/).getAttribute('aria-pressed')).toBe('true')
    expect(filter(/^All/).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('status').textContent).toBe(
      `Showing ${samplers.length} of ${entries.length} firmwares`,
    )
  })

  it('shows the kind chosen on the Show button, and closes its menu', async () => {
    await renderPage()
    const menu = document.querySelector<HTMLDetailsElement>('details.firmware-kind-menu')
    if (menu) menu.open = true
    await userEvent.click(filter(/^Samplers/))
    expect(
      document.getElementById('firmware-kind-current')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe(`Samplers ${samplers.length}`)
    expect(menu?.open).toBe(false)
  })

  it('shows every entry again for All', async () => {
    const shown = await renderPage()
    await userEvent.click(filter(/^Samplers/))
    await userEvent.click(filter(/^All/))
    expect(shown()).toHaveLength(entries.length)
    expect(screen.getByRole('status').textContent).toBe(`Showing all ${entries.length} firmwares`)
  })

  it('shows each card’s kinds as icons named for assistive technology', async () => {
    await renderPage()
    for (const entry of entries) {
      const card = document.getElementById(entry.id)
      const kinds = [...(card?.querySelectorAll('.firmware-kind') ?? [])]
      expect(kinds.map((kind) => kind.querySelector('use')?.getAttribute('href'))).toEqual(
        categoriesOf(entry).map((category) => `#icon-${category}`),
      )
      for (const kind of kinds) {
        expect(kind.querySelector('.sr-only')?.textContent).toBe(kind.getAttribute('title'))
      }
    }
  })

  it('counts the firmwares and watched ones in sight, and counts again as they narrow', async () => {
    await renderPage()
    expect(document.getElementById('firmware-count')?.textContent).toBe(
      `${entries.length} firmwares`,
    )
    expect(document.getElementById('firmware-watch-count')?.textContent).toBe(
      String(watched.length),
    )
    await userEvent.click(filter(/^Samplers/))
    expect(document.getElementById('firmware-count')?.textContent).toBe(
      `${samplers.length} of ${entries.length} firmwares`,
    )
    expect(document.getElementById('firmware-watch-count')?.textContent).toBe(
      `0 of ${watched.length}`,
    )
  })

  it('searches the watch list too, and hides it for a kind, which it does not have', async () => {
    await renderPage()
    const item = watched[0]
    const name = item.querySelector('.firmware-watch-name')?.textContent?.replace('↗', '').trim()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search firmwares' }), name ?? '')
    const visible = [...document.querySelectorAll<HTMLElement>('.firmware-watch-item')].filter(
      (element) => !element.hidden,
    )
    expect(
      visible.map((element) => element.querySelector('.firmware-watch-name')?.textContent),
    ).toContain(item.querySelector('.firmware-watch-name')?.textContent)
    expect(visible.length).toBeLessThan(watched.length)
    expect(screen.getByRole('status').textContent).toMatch(/on the watch list$/)
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search firmwares' }))
    await userEvent.click(filter(/^Samplers/))
    expect(document.querySelector<HTMLElement>('.firmware-watch')?.hidden).toBe(true)
  })

  it('shows every entry when a link reaches a card the filter hides', async () => {
    const shown = await renderPage()
    await userEvent.click(filter(/^Samplers/))
    const hidden = entries.find((entry) => !samplers.includes(entry.id))?.id ?? ''
    const link = document.createElement('a')
    link.href = `#${hidden}`
    link.textContent = 'Linked card'
    document.querySelector('.firmware-latest')?.append(link)
    await userEvent.click(screen.getByRole('link', { name: 'Linked card' }))
    expect(shown()).toContain(hidden)
    expect(filter(/^All/).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('firmware page blurbs', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function renderPage(overflowing: boolean) {
    document.body.innerHTML = page.body.innerHTML
    // jsdom lays nothing out, so a blurb is as tall as the test says.
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(overflowing ? 200 : 0)
    vi.resetModules()
    await import(/* @vite-ignore */ blurbScriptPath)
  }
  const single = entries.find((entry) => entry.querySelectorAll('.firmware-blurb').length === 1)
  const several = entries.find((entry) => entry.querySelectorAll('.firmware-blurb').length > 1)
  const nameOf = (entry: Element | undefined) =>
    entry?.querySelector('.firmware-title')?.textContent?.replace(/\s+/g, ' ').trim() ?? ''

  it('marks the page so the stylesheet folds the blurbs', async () => {
    await renderPage(true)
    expect(document.documentElement.hasAttribute('data-firmware-folds')).toBe(true)
  })

  it('opens and folds a long blurb with its More button', async () => {
    await renderPage(true)
    const card = document.getElementById(single?.id ?? '')
    const more = screen.getByRole('button', { name: `More about ${nameOf(single)}` })
    expect(more.getAttribute('aria-expanded')).toBe('false')
    await userEvent.click(more)
    expect(card?.hasAttribute('data-open')).toBe(true)
    expect(more.getAttribute('aria-expanded')).toBe('true')
    expect(more.textContent).toBe('Less')
    expect(more.getAttribute('aria-label')).toBe(`Less about ${nameOf(single)}`)
    await userEvent.click(more)
    expect(card?.hasAttribute('data-open')).toBe(false)
    expect(more.getAttribute('aria-expanded')).toBe('false')
  })

  it('gives a blurb that fits in its folded lines no button', async () => {
    await renderPage(false)
    expect(screen.queryByRole('button', { name: `More about ${nameOf(single)}` })).toBeNull()
  })

  it('gives a blurb with a paragraph after it a button, however short', async () => {
    await renderPage(false)
    expect(screen.getByRole('button', { name: `More about ${nameOf(several)}` })).toBeTruthy()
  })
})

describe('firmware page latest strip', () => {
  const latestScriptPath = path.resolve(__dirname, '../public/firmware-latest.js')
  const date = page.querySelector('.firmware-latest-title time')?.getAttribute('datetime') ?? ''

  afterEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-firmware-latest-hidden')
  })

  async function renderPage() {
    document.body.innerHTML = page.body.innerHTML
    vi.resetModules()
    await import(/* @vite-ignore */ `${latestScriptPath}?${Math.random()}`)
    document.dispatchEvent(new Event('DOMContentLoaded'))
    return screen.getByRole('button', { name: /latest changes/ })
  }

  it('hides the list with its eye button, and remembers it for that day', async () => {
    const toggle = await renderPage()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    await userEvent.click(toggle)
    expect(toggle.getAttribute('aria-label')).toBe('Show the latest changes')
    expect(document.documentElement.hasAttribute('data-firmware-latest-hidden')).toBe(true)
    expect(localStorage.getItem('fm1-firmware-latest-hidden')).toBe(date)
  })

  it('shows the list again once its date has changed', async () => {
    localStorage.setItem('fm1-firmware-latest-hidden', '2000-01-01')
    const toggle = await renderPage()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(document.documentElement.hasAttribute('data-firmware-latest-hidden')).toBe(false)
    expect(localStorage.getItem('fm1-firmware-latest-hidden')).toBeNull()
  })
})

describe('firmware page photos', () => {
  const descriptors = {
    close: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close'),
    showModal: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal'),
  }

  afterEach(() => {
    for (const [name, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
      else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
    }
  })

  const photosScriptPath = path.resolve(__dirname, '../public/firmware-photos.js')
  const withPhoto = entries.find((entry) =>
    entry.querySelector('.firmware-head .firmware-photo img'),
  )
  const name = withPhoto?.querySelector('.firmware-title')?.textContent?.replace(/\s+/g, ' ').trim()

  async function renderPage() {
    document.body.innerHTML = page.body.innerHTML
    // jsdom has no modal dialogs, so the test gives them a showModal and close that toggle open.
    Object.assign(HTMLDialogElement.prototype, {
      showModal(this: HTMLDialogElement) {
        this.open = true
      },
      close(this: HTMLDialogElement) {
        this.open = false
        this.dispatchEvent(new Event('close'))
      },
    })
    vi.resetModules()
    await import(/* @vite-ignore */ `${photosScriptPath}?${Math.random()}`)
  }

  it('opens the full photo in a dialog from its thumbnail, and returns focus on close', async () => {
    await renderPage()
    const thumbnail = screen.getByRole('button', { name: `Enlarge the photo of ${name}` })
    await userEvent.click(thumbnail)
    const dialog = screen.getByRole('dialog', { name })
    const source = withPhoto?.querySelector('.firmware-photo img')?.getAttribute('src')
    expect(dialog.querySelector('img')?.getAttribute('src')).toBe(source)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(thumbnail)
  })
})

describe('firmware page FM1 showcase', () => {
  const showcaseScriptPath = path.resolve(__dirname, '../public/firmware-showcase.js')

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete document.documentElement.dataset.fm1Colorway
  })

  async function renderPage({ colorway = 'black', reduced = false } = {}) {
    document.body.innerHTML = page.body.innerHTML
    document.documentElement.dataset.fm1Colorway = colorway
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: reduced && query.includes('reduce'),
      addEventListener: () => undefined,
    }))
    vi.useFakeTimers()
    vi.resetModules()
    await import(/* @vite-ignore */ `${showcaseScriptPath}?${Math.random()}`)
  }
  // jsdom never loads an image, so a test says when one has.
  const load = (colorway: string) =>
    document.querySelector(`[data-colorway="${colorway}"]`)?.dispatchEvent(new Event('load'))
  const shown = () =>
    [...document.querySelectorAll<HTMLElement>('.firmware-showcase-photo.is-shown')].map(
      (photo) => photo.dataset.colorway,
    )

  it('has one photo per FM1 finish, hidden from assistive technology', () => {
    const showcase = page.querySelector('.firmware-showcase')
    expect(showcase?.getAttribute('aria-hidden')).toBe('true')
    const photos = [...(showcase?.querySelectorAll('img') ?? [])]
    expect(photos.map((photo) => photo.getAttribute('data-colorway'))).toEqual(
      fm1Colorways.map(({ value }) => value),
    )
    for (const photo of photos) expect(photo.getAttribute('alt')).toBe('')
  })

  it('starts on the finish chosen in the editor, then fades to the next once it loads', async () => {
    await renderPage({ colorway: 'orange' })
    expect(shown()).toEqual(['orange'])
    await vi.advanceTimersByTimeAsync(4000)
    expect(shown()).toEqual(['orange'])
    load('black-green')
    await vi.advanceTimersByTimeAsync(0)
    expect(shown()).toEqual(['black-green'])
  })

  it('readies only the photo shown and the next, not all six', async () => {
    await renderPage({ colorway: 'purple' })
    const ready = () =>
      [...document.querySelectorAll<HTMLElement>('.firmware-showcase-photo.is-ready')].map(
        (photo) => photo.dataset.colorway,
      )
    // The next waits for the photo shown to load.
    expect(ready()).toEqual(['purple'])
    load('purple')
    await vi.advanceTimersByTimeAsync(0)
    expect(ready()).toEqual(['purple', 'orange'])
    await vi.advanceTimersByTimeAsync(4000)
    load('orange')
    await vi.advanceTimersByTimeAsync(0)
    expect(ready()).toEqual(['purple', 'orange', 'black-green'])
  })

  it('stays on one finish with reduced motion', async () => {
    await renderPage({ reduced: true })
    await vi.advanceTimersByTimeAsync(12000)
    expect(shown()).toEqual(['black'])
    expect(document.querySelectorAll('.firmware-showcase-photo.is-ready')).toHaveLength(1)
  })
})
