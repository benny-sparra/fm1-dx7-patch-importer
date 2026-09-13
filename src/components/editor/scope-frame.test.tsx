// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ScopeFrame, useAnimationLoop } from '@/components/editor/scope-frame'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Loop({ step }: { step: (elapsed: number) => void }) {
  useAnimationLoop(step)
  return null
}

function FramedLoop({ step }: { step: (elapsed: number) => void }) {
  const frameRef = useAnimationLoop(step)
  return (
    <ScopeFrame ref={frameRef} testId="scope">
      <g />
    </ScopeFrame>
  )
}

function stubMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: reduce && query.includes('reduce') })),
  )
  let nextFrame = 0
  const callbacks = new Map<number, FrameRequestCallback>()
  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    nextFrame += 1
    callbacks.set(nextFrame, callback)
    return nextFrame
  })
  const cancelAnimationFrame = vi.fn((frame: number) => callbacks.delete(frame))
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)
  const runFrame = (now: number) => {
    const pending = [...callbacks]
    callbacks.clear()
    pending.forEach(([, callback]) => callback(now))
  }
  return {
    cancelAnimationFrame,
    pendingFrames: () => callbacks.size,
    requestAnimationFrame,
    runFrame,
  }
}

/** An IntersectionObserver whose visibility reports the test controls. */
function stubIntersectionObserver() {
  const observers: { callback: IntersectionObserverCallback; targets: Element[] }[] = []
  class FakeIntersectionObserver {
    private readonly record: (typeof observers)[number]
    constructor(callback: IntersectionObserverCallback) {
      this.record = { callback, targets: [] }
      observers.push(this.record)
    }
    observe(target: Element) {
      this.record.targets.push(target)
    }
    disconnect() {
      this.record.targets = []
    }
  }
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  const report = (intersectionRatio: number, isIntersecting = intersectionRatio > 0) =>
    act(() => {
      observers.forEach(({ callback, targets }) => {
        const entries = targets.map(
          (target) => ({ intersectionRatio, isIntersecting, target }) as IntersectionObserverEntry,
        )
        if (entries.length > 0) callback(entries, {} as IntersectionObserver)
      })
    })
  return { observers, report }
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

  it('observes the scope frame it is attached to', () => {
    stubMotion(false)
    const { observers } = stubIntersectionObserver()
    const { getByTestId } = render(<FramedLoop step={vi.fn()} />)

    expect(observers.flatMap(({ targets }) => targets)).toEqual([getByTestId('scope')])
  })

  it('requests no frames until the scope is reported on screen', () => {
    const { pendingFrames, requestAnimationFrame } = stubMotion(false)
    const { report } = stubIntersectionObserver()
    render(<FramedLoop step={vi.fn()} />)

    expect(requestAnimationFrame).not.toHaveBeenCalled()
    report(1)
    expect(pendingFrames()).toBe(1)
  })

  it('stops requesting frames when the scope leaves the screen', () => {
    const { pendingFrames, runFrame } = stubMotion(false)
    const { report } = stubIntersectionObserver()
    const step = vi.fn()
    render(<FramedLoop step={step} />)
    report(1)
    runFrame(1000)

    report(0, false)
    step.mockClear()
    runFrame(1016)

    expect(pendingFrames()).toBe(0)
    expect(step).not.toHaveBeenCalled()
  })

  it('treats a zero-area intersection, as a folded panel clips to, as hidden', () => {
    const { pendingFrames } = stubMotion(false)
    const { report } = stubIntersectionObserver()
    render(<FramedLoop step={vi.fn()} />)
    report(1)

    report(0, true)

    expect(pendingFrames()).toBe(0)
  })

  it('resumes from a still first frame when the scope returns', () => {
    const { pendingFrames, runFrame } = stubMotion(false)
    const { report } = stubIntersectionObserver()
    const step = vi.fn()
    render(<FramedLoop step={step} />)
    report(1)
    runFrame(1000)
    runFrame(1050)
    report(0, false)

    report(1)
    step.mockClear()
    runFrame(9000)
    runFrame(9020)

    expect(pendingFrames()).toBe(1)
    expect(step.mock.calls).toEqual([[0], [0.02]])
  })

  it('does not double the loop when reported visible twice', () => {
    const { requestAnimationFrame } = stubMotion(false)
    const { report } = stubIntersectionObserver()
    render(<FramedLoop step={vi.fn()} />)

    report(1)
    report(0.5)

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
  })

  it('still redraws a changed parameter while hidden', () => {
    stubMotion(false)
    const { report } = stubIntersectionObserver()
    const step = vi.fn()
    const { rerender } = render(<FramedLoop step={step} />)
    report(0, false)
    step.mockClear()

    rerender(<FramedLoop step={step} />)

    expect(step).toHaveBeenCalledExactlyOnceWith(0)
  })

  it('stops observing and cancels the frame when unmounted', () => {
    const { cancelAnimationFrame } = stubMotion(false)
    const { observers, report } = stubIntersectionObserver()
    const { unmount } = render(<FramedLoop step={vi.fn()} />)
    report(1)

    unmount()

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
    expect(observers[0]?.targets).toEqual([])
  })
})
