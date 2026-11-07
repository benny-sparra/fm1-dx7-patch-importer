// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  flashChosenMenuItem,
  installRetroMotion,
  menuFlashMs,
  scrambledName,
  scrambleLeadMs,
  scrambleLetterMs,
  scramblePatchName,
} from './retro-motion'

/** Answers the reduced-motion query, which jsdom cannot evaluate. */
function requestReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: reduce && query.includes('reduce') })),
  )
}

/** Animation frames run only when a test runs them, so a test can close a menu first. */
let frames: FrameRequestCallback[] = []
const runFrames = () => {
  const due = frames
  frames = []
  for (const frame of due) frame(performance.now())
}

/** An open menu on screen, holding a labelled item and a danger item. */
function openMenu() {
  const menu = document.createElement('div')
  menu.className = 'menu-surface'
  menu.innerHTML =
    '<button id="edit" type="button"><span>Edit…</span></button>' +
    '<button style="color: rgb(255, 120, 140)" type="button">Delete…</button>'
  menu.getBoundingClientRect = () => new DOMRect(40, 60, 200, 80)
  document.body.append(menu)
  return menu
}

/** Clicks an item the way a browser does, with the flash listening in the capture phase. */
function choose(item: Element, closesMenu = true) {
  const event = new MouseEvent('click')
  Object.defineProperty(event, 'target', { value: item })
  flashChosenMenuItem(event)
  if (closesMenu) item.closest('.menu-surface')?.remove()
  else item.getClientRects = () => [new DOMRect(0, 0, 10, 10)] as unknown as DOMRectList
  runFrames()
}

const copy = () => document.querySelector<HTMLElement>('.menu-flash-copy')

beforeEach(() => {
  requestReducedMotion(false)
  frames = []
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((frame) => {
    frames.push(frame)
    return frames.length
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe('flashChosenMenuItem', () => {
  it('leaves a copy of a menu that closed where the menu was, with the chosen item flashing', () => {
    const menu = openMenu()
    choose(menu.querySelector('#edit')!)

    expect(copy()?.style).toMatchObject({ height: '80px', left: '40px', top: '60px' })
    expect(copy()?.querySelector('.menu-flash')?.textContent).toBe('Edit…')
  })

  it('keeps the copy from assistive technology, the keyboard, and the page’s ids', () => {
    const menu = openMenu()
    choose(menu.querySelector('#edit')!)

    expect(copy()?.getAttribute('aria-hidden')).toBe('true')
    expect(copy()?.inert).toBe(true)
    expect(copy()?.querySelector('[id]')).toBeNull()
  })

  it('flashes an item in its own colour, so a danger item flashes red', () => {
    const menu = openMenu()
    choose(menu.querySelectorAll('button')[1])

    expect(
      copy()?.querySelector<HTMLElement>('.menu-flash')?.style.getPropertyValue('--menu-flash-ink'),
    ).toBe('rgb(255, 120, 140)')
  })

  it('removes the copy once the flash is over', () => {
    vi.useFakeTimers()
    const menu = openMenu()
    choose(menu.querySelector('#edit')!)

    vi.advanceTimersByTime(menuFlashMs)

    expect(copy()).toBeNull()
  })

  it('draws nothing when the item leaves its menu open', () => {
    const menu = openMenu()
    choose(menu.querySelector('#edit')!, false)

    expect(copy()).toBeNull()
  })

  it('draws nothing for a disabled item', () => {
    const menu = openMenu()
    const item = menu.querySelector('#edit')!
    item.setAttribute('aria-disabled', 'true')
    choose(item)

    expect(copy()).toBeNull()
  })

  it('draws nothing when reduced motion is requested', () => {
    requestReducedMotion(true)
    const menu = openMenu()
    choose(menu.querySelector('#edit')!)

    expect(copy()).toBeNull()
  })
})

describe('scrambledName', () => {
  const settled = (letters: number) => scrambleLeadMs + letters * scrambleLetterMs

  it('settles the name from the left, one letter at a time', () => {
    const shown = scrambledName('PIANO 1', settled(2), () => 0)

    expect(shown).toBe('PIAAA A')
  })

  it('keeps every space in place and the name’s length', () => {
    const shown = scrambledName('E.PIANO  1', 0, () => 0.99)

    expect(shown).toHaveLength(10)
    expect(shown?.slice(7, 9)).toBe('  ')
  })

  it('is over once the last letter has settled', () => {
    expect(scrambledName('BRASS', settled(4))).toBeUndefined()
  })
})

describe('scramblePatchName', () => {
  function patchName(text: string) {
    const name = document.createElement('span')
    name.className = 'patch-name'
    name.textContent = text
    document.body.append(name)
    return name
  }

  it('shows glyphs over the name, then clears them once it settles', () => {
    vi.useFakeTimers()
    const name = patchName('MARIMBA')

    scramblePatchName(name)
    const scrambling = name.dataset.scramble
    vi.advanceTimersByTime(scrambleLeadMs + 7 * scrambleLetterMs)

    expect(scrambling).toHaveLength(7)
    expect(name.dataset.scramble).toBeUndefined()
  })

  it('leaves the name’s own text alone', () => {
    vi.useFakeTimers()
    const name = patchName('MARIMBA')

    scramblePatchName(name)

    expect(name.textContent).toBe('MARIMBA')
  })

  it('does nothing when reduced motion is requested', () => {
    requestReducedMotion(true)
    const name = patchName('MARIMBA')

    scramblePatchName(name)

    expect(name.dataset.scramble).toBeUndefined()
  })
})

describe('installRetroMotion', () => {
  const observed = () => new Promise((resolve) => setTimeout(resolve))

  it('scrambles a slot’s name when its sound changes', async () => {
    vi.spyOn(window, 'setInterval').mockReturnValue(1 as unknown as ReturnType<typeof setInterval>)
    const slot = document.createElement('div')
    slot.innerHTML = '<span class="patch-name">VIBES 1</span>'
    document.body.append(slot)
    const stop = installRetroMotion()

    const glow = document.createElement('span')
    glow.className = 'patch-cell-changed'
    slot.prepend(glow)
    await observed()
    stop()

    expect(slot.querySelector<HTMLElement>('.patch-name')?.dataset.scramble).toHaveLength(7)
  })

  it('stops watching once stopped', async () => {
    const slot = document.createElement('div')
    slot.innerHTML = '<span class="patch-name">VIBES 1</span>'
    document.body.append(slot)
    installRetroMotion()()

    const glow = document.createElement('span')
    glow.className = 'patch-cell-changed'
    slot.prepend(glow)
    await observed()

    expect(slot.querySelector<HTMLElement>('.patch-name')?.dataset.scramble).toBeUndefined()
  })
})
