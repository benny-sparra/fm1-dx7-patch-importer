// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { visibleBox, zoomRectCount, zoomRectStepMs, zoomRects } from './zoom-rects'

const slot = { height: 48, left: 760, top: 300, width: 240 }
const editor = { height: 600, left: 0, top: 120, width: 1280 }
const layer = () => document.querySelector('.zoom-rects')
const outlines = () => [...document.querySelectorAll<HTMLElement>('.zoom-rect')]

afterEach(() => {
  vi.useRealTimers()
  document.body.replaceChildren()
})

describe('zoomRects', () => {
  it('steps its outlines from the first box to the second', () => {
    zoomRects(slot, editor)

    const drawn = outlines()
    expect(drawn).toHaveLength(zoomRectCount)
    expect(drawn[0].style).toMatchObject({ height: '48px', left: '760px', top: '300px' })
    expect(drawn.at(-1)?.style).toMatchObject({ height: '600px', left: '0px', width: '1280px' })
    expect(drawn.map((outline) => outline.style.animationDelay)).toEqual(
      drawn.map((_, index) => `${index * zoomRectStepMs}ms`),
    )
  })

  it('keeps the outlines from assistive technology', () => {
    zoomRects(slot, editor)

    expect(layer()?.getAttribute('aria-hidden')).toBe('true')
  })

  it('removes the outlines once the last has gone dark', () => {
    vi.useFakeTimers()
    zoomRects(slot, editor)

    vi.advanceTimersByTime((zoomRectCount - 1) * zoomRectStepMs)
    expect(layer()).not.toBeNull()
    vi.runAllTimers()
    expect(layer()).toBeNull()
  })

  it('draws nothing when either box is off screen', () => {
    zoomRects(undefined, editor)
    zoomRects(slot, undefined)

    expect(layer()).toBeNull()
  })
})

describe('visibleBox', () => {
  const elementAt = ({
    bottom,
    left,
    right,
    top,
  }: Record<'bottom' | 'left' | 'right' | 'top', number>) => {
    const element = document.createElement('div')
    element.getBoundingClientRect = () => new DOMRect(left, top, right - left, bottom - top)
    return element
  }

  it('clips an element to the viewport', () => {
    vi.stubGlobal('innerHeight', 768)
    const element = elementAt({ bottom: 2000, left: 0, right: 1024, top: 200 })

    expect(visibleBox(element)).toEqual({ height: 568, left: 0, top: 200, width: 1024 })
    vi.unstubAllGlobals()
  })

  it('gives nothing for an element scrolled out of view', () => {
    const element = elementAt({ bottom: -10, left: 0, right: 200, top: -60 })

    expect(visibleBox(element)).toBeUndefined()
  })
})
