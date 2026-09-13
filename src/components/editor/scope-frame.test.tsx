// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAnimationLoop } from '@/components/editor/scope-frame'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Loop({ step }: { step: (elapsed: number) => void }) {
  useAnimationLoop(step)
  return null
}

function stubMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: reduce && query.includes('reduce') })),
  )
  const requestAnimationFrame = vi.fn(() => 1)
  const cancelAnimationFrame = vi.fn()
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)
  return { cancelAnimationFrame, requestAnimationFrame }
}

describe('useAnimationLoop', () => {
  it('runs every frame and stops when unmounted', () => {
    const { cancelAnimationFrame, requestAnimationFrame } = stubMotion(false)
    const { unmount } = render(<Loop step={vi.fn()} />)

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    unmount()
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })

  it('draws still frames on render without animating when motion is reduced', () => {
    const { requestAnimationFrame } = stubMotion(true)
    const step = vi.fn()
    const { rerender } = render(<Loop step={step} />)
    rerender(<Loop step={step} />)

    expect(requestAnimationFrame).not.toHaveBeenCalled()
    expect(step).toHaveBeenCalledTimes(2)
    expect(step).toHaveBeenNthCalledWith(2, 0)
  })
})
