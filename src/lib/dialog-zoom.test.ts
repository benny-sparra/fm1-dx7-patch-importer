// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  dialogOpenerWindowMs,
  holdDialogForZoom,
  rememberDialogOpeners,
  zoomDialogClosed,
  zoomDialogOpen,
} from './dialog-zoom'
import { zoomRectsArriveMs } from './zoom-rects'

const zooms = () => document.querySelectorAll('.zoom-rects')

/** An element of the given type with a box on screen, as jsdom lays nothing out. */
function placed<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  rect: { height: number; left: number; top: number; width: number },
) {
  const element = document.createElement(tag)
  element.getBoundingClientRect = () => new DOMRect(rect.left, rect.top, rect.width, rect.height)
  document.body.append(element)
  return element
}

const opener = () => placed('button', { height: 24, left: 900, top: 20, width: 24 })
const dialog = () => placed('dialog', { height: 400, left: 300, top: 100, width: 600 })

/** The outlines of the first zoom drawn: where it starts and where it ends. */
function firstZoom() {
  const outlines = [...(zooms()[0]?.children ?? [])] as HTMLElement[]
  const box = (outline?: HTMLElement) => outline && [outline.style.left, outline.style.top]
  return { from: box(outlines[0]), to: box(outlines.at(-1)) }
}

beforeAll(() => {
  rememberDialogOpeners()
})

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  document.body.replaceChildren()
})

describe('zoomDialogOpen', () => {
  it('zooms a dialog out of the control clicked to open it', () => {
    opener().click()

    expect(zoomDialogOpen(dialog())).toBeDefined()
    expect(firstZoom()).toEqual({ from: ['900px', '20px'], to: ['300px', '100px'] })
  })

  it('zooms from where the control was clicked, though a closing menu has since hidden it', () => {
    const item = opener()
    item.click()
    item.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0)

    zoomDialogOpen(dialog())

    expect(firstZoom().from).toEqual(['900px', '20px'])
  })

  it('leaves a dialog that opens by itself, with no click, unzoomed', () => {
    expect(zoomDialogOpen(dialog())).toBeUndefined()
    expect(zooms()).toHaveLength(0)
  })

  it('leaves a dialog unzoomed when the click came long before it', () => {
    opener().click()
    vi.advanceTimersByTime(dialogOpenerWindowMs + 1)

    expect(zoomDialogOpen(dialog())).toBeUndefined()
  })

  it('zooms only the first dialog a click opens', () => {
    opener().click()
    zoomDialogOpen(dialog())

    expect(zoomDialogOpen(dialog())).toBeUndefined()
  })
})

describe('holdDialogForZoom', () => {
  it('keeps a dialog a click opens hidden until its zoom arrives', () => {
    opener().click()
    const opening = dialog()

    holdDialogForZoom(opening)
    zoomDialogOpen(opening)
    expect(opening.hasAttribute('data-zooming')).toBe(true)
    vi.advanceTimersByTime(zoomRectsArriveMs)

    expect(opening.hasAttribute('data-zooming')).toBe(false)
  })

  it('shows a dialog that opens by itself at once', () => {
    const opening = dialog()

    holdDialogForZoom(opening)

    expect(opening.hasAttribute('data-zooming')).toBe(false)
  })
})

describe('zoomDialogClosed', () => {
  /** Opens a dialog from a control, returning what it closes back into. */
  function openFrom(control: HTMLElement) {
    control.click()
    const opened = dialog()
    return { anchor: zoomDialogOpen(opened)!, opened }
  }

  function close(closing: HTMLDialogElement, anchor: Element) {
    zoomDialogClosed(closing, anchor)
    closing.dispatchEvent(new Event('close'))
    vi.advanceTimersToNextFrame()
  }

  it('zooms a closing dialog back into the control that opened it', () => {
    const { anchor, opened } = openFrom(opener())
    document.querySelector('.zoom-rects')?.remove()

    close(opened, anchor)

    expect(firstZoom()).toEqual({ from: ['300px', '100px'], to: ['900px', '20px'] })
  })

  it('zooms a dialog opened from a menu back into the menu’s toggle, as the item has gone', () => {
    const menu = document.createElement('details')
    const toggle = placed('summary', { height: 24, left: 40, top: 300, width: 24 })
    const item = placed('button', { height: 32, left: 60, top: 330, width: 180 })
    menu.append(toggle, item)
    document.body.append(menu)
    const { anchor, opened } = openFrom(item)
    document.querySelector('.zoom-rects')?.remove()
    item.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0)

    close(opened, anchor)

    expect(firstZoom().to).toEqual(['40px', '300px'])
  })

  it('zooms back into the control focus returns to when what opened it has gone', () => {
    const { anchor, opened } = openFrom(opener())
    document.querySelector('.zoom-rects')?.remove()
    anchor.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0)
    const toggle = placed('button', { height: 24, left: 800, top: 200, width: 24 })
    toggle.focus()

    close(opened, anchor)

    expect(firstZoom().to).toEqual(['800px', '200px'])
  })

  it('draws nothing when neither the opener nor focus is on screen', () => {
    const { anchor, opened } = openFrom(opener())
    document.querySelector('.zoom-rects')?.remove()
    anchor.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0)

    close(opened, anchor)

    expect(zooms()).toHaveLength(0)
  })
})
