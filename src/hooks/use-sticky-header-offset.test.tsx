// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { stickyHeaderOffsetProperty, useStickyHeaderOffset } from './use-sticky-header-offset'

let resize: () => void = () => {}
const disconnect = vi.fn()

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback
      }
      disconnect = disconnect
      observe = vi.fn()
    },
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  disconnect.mockClear()
})

function Header({ whileMatching }: { whileMatching?: string }) {
  const ref = useRef<HTMLElement>(null)
  useStickyHeaderOffset(ref, whileMatching)
  return <header ref={ref}>Header</header>
}

const offset = () => document.documentElement.style.getPropertyValue(stickyHeaderOffsetProperty)

function setHeaderHeight(height: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height } as DOMRect)
}

describe('useStickyHeaderOffset', () => {
  it('gives the page the header’s height, so focus scrolls clear of it', () => {
    setHeaderHeight(48.4)

    render(<Header />)

    expect(offset()).toBe('49px')
  })

  it('follows the header when it wraps to a second row', () => {
    setHeaderHeight(48)
    render(<Header />)

    setHeaderHeight(92)
    resize()

    expect(offset()).toBe('92px')
  })

  it('leaves the page as it was once the header is gone', () => {
    setHeaderHeight(48)
    const { unmount } = render(<Header />)

    unmount()

    expect(offset()).toBe('')
    expect(disconnect).toHaveBeenCalled()
  })

  it('still sets the height where the browser has no ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    setHeaderHeight(48)

    render(<Header />)

    expect(offset()).toBe('48px')
  })

  it('leaves the page alone while the bar does not stick at this width', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }))
    setHeaderHeight(80)

    render(<Header whileMatching="(max-width: 767.98px)" />)

    expect(offset()).toBe('')
  })

  it('gives the page the bar’s height while its width matches', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query }))
    setHeaderHeight(80)

    render(<Header whileMatching="(max-width: 767.98px)" />)

    expect(offset()).toBe('80px')
  })
})
