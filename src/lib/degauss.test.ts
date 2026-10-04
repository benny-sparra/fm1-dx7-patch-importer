// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { degauss, degaussMs } from './degauss'

const blotches = () => document.querySelectorAll<HTMLElement>('.degauss')

function screenElement() {
  const screen = document.createElement('main')
  document.body.append(screen)
  return screen
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  document.body.replaceChildren()
})

describe('degauss', () => {
  it('shudders the screen and swirls colour blotches over it', () => {
    const screen = screenElement()

    degauss(screen)

    expect(screen.hasAttribute('data-degauss')).toBe(true)
    expect(blotches()).toHaveLength(1)
  })

  it('keeps the blotches from assistive technology', () => {
    degauss(screenElement())

    expect(blotches()[0]?.getAttribute('aria-hidden')).toBe('true')
  })

  it('settles once the degauss is over', () => {
    const screen = screenElement()

    degauss(screen)
    vi.advanceTimersByTime(degaussMs)

    expect(screen.hasAttribute('data-degauss')).toBe(false)
    expect(blotches()).toHaveLength(0)
  })

  it('starts afresh when pressed again part-way, with one layer of blotches', () => {
    const screen = screenElement()

    degauss(screen)
    vi.advanceTimersByTime(degaussMs / 2)
    degauss(screen)
    vi.advanceTimersByTime(degaussMs / 2)

    expect(screen.hasAttribute('data-degauss')).toBe(true)
    expect(blotches()).toHaveLength(1)
  })

  it('does nothing without a screen', () => {
    degauss(null)

    expect(blotches()).toHaveLength(0)
  })
})
