// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { crtSwitchOff, crtSwitchOffMs } from './crt-switch-off'

const layer = () => document.querySelector<HTMLElement>('.crt-switch-off')

/** A bank grid on screen, holding a labelled slot. */
function gridAt(rect: { height: number; left: number; top: number; width: number }) {
  const grid = document.createElement('div')
  grid.id = 'grid'
  grid.innerHTML =
    '<button aria-labelledby="slot-name" type="button"><span id="slot-name">PIANO 1</span></button>'
  grid.getBoundingClientRect = () => new DOMRect(rect.left, rect.top, rect.width, rect.height)
  document.body.append(grid)
  return grid
}

afterEach(() => {
  vi.useRealTimers()
  document.body.replaceChildren()
})

describe('crtSwitchOff', () => {
  it('draws a copy of the element over the part of it on screen', () => {
    crtSwitchOff(gridAt({ height: 400, left: 20, top: 200, width: 900 }))

    expect(layer()?.style).toMatchObject({ height: '400px', left: '20px', top: '200px' })
    expect(layer()?.textContent).toBe('PIANO 1')
  })

  it('keeps the copy from assistive technology and the keyboard', () => {
    crtSwitchOff(gridAt({ height: 400, left: 0, top: 200, width: 900 }))

    expect(layer()?.getAttribute('aria-hidden')).toBe('true')
    expect(layer()?.inert).toBe(true)
  })

  it('leaves the page’s ids to the element itself', () => {
    crtSwitchOff(gridAt({ height: 400, left: 0, top: 200, width: 900 }))

    expect(document.querySelectorAll('#grid')).toHaveLength(1)
    expect(document.querySelectorAll('#slot-name')).toHaveLength(1)
  })

  it('removes the copy once it has switched off', () => {
    vi.useFakeTimers()
    crtSwitchOff(gridAt({ height: 400, left: 0, top: 200, width: 900 }))

    vi.advanceTimersByTime(crtSwitchOffMs - 1)
    expect(layer()).not.toBeNull()
    vi.advanceTimersByTime(1)
    expect(layer()).toBeNull()
  })

  it('draws nothing for an element that is missing or off screen', () => {
    crtSwitchOff(null)
    crtSwitchOff(gridAt({ height: 400, left: 0, top: -900, width: 900 }))

    expect(layer()).toBeNull()
  })
})
