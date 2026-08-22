// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useMediaQuery } from './use-media-query'

function MediaQueryState({ query = '(min-width: 1024px)' }) {
  return <output>{useMediaQuery(query) ? 'large' : 'small'}</output>
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useMediaQuery', () => {
  it('uses the non-matching fallback when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined)
    render(<MediaQueryState />)
    expect(screen.getByText('small')).toBeTruthy()
  })

  it('uses the initial browser match on the first render', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    )
    render(<MediaQueryState />)
    expect(screen.getByText('large')).toBeTruthy()
  })

  it('updates at a breakpoint change and removes the modern listener on unmount', () => {
    let listener: ((event: MediaQueryListEvent) => void) | undefined
    const removeEventListener = vi.fn()
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        addEventListener: (_type: string, nextListener: (event: MediaQueryListEvent) => void) => {
          listener = nextListener
        },
        matches: false,
        removeEventListener,
      })),
    )
    const view = render(<MediaQueryState />)
    act(() => listener?.({ matches: true } as MediaQueryListEvent))
    expect(screen.getByText('large')).toBeTruthy()
    view.unmount()
    expect(removeEventListener).toHaveBeenCalledOnce()
  })

  it('supports and cleans up the legacy media-query listener API', () => {
    const addListener = vi.fn()
    const removeListener = vi.fn()
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ addListener, matches: false, removeListener })),
    )
    const view = render(<MediaQueryState />)
    expect(addListener).toHaveBeenCalledOnce()
    view.unmount()
    expect(removeListener).toHaveBeenCalledOnce()
  })
})
