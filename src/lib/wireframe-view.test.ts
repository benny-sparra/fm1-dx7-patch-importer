// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { dx7Algorithms } from '@/lib/dx7-algorithms'
import { wireScene } from '@/lib/wireframe-3d'
import { createWireframeView, WIREFRAME_FPS, WIREFRAME_MOVE_STEPS } from '@/lib/wireframe-view'
import { makeFakeCanvas } from '@/test/fake-canvas'

const frame = 1000 / WIREFRAME_FPS
const labels = ['1', '2', '3', '4', '5', '6']
const first = wireScene(dx7Algorithms[0])
const second = wireScene(dx7Algorithms[4])

function requestReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: reduce && query.includes('reduce') })),
  )
}

/** Where each operator's number was drawn, as the last six fillText calls. */
const lastPlaces = (fillText: ReturnType<typeof vi.fn>) =>
  fillText.mock.calls
    .slice(-12)
    .filter(([text]) => /^\d$/.test(String(text)))
    .map(([, x, y]) => [x, y].join())

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('createWireframeView', () => {
  it('rearranges the cubes over six stepped frames, not smoothly', () => {
    requestReducedMotion(false)
    const { canvas, context } = makeFakeCanvas()
    const view = createWireframeView(canvas)
    view.update(first, labels)
    vi.advanceTimersByTime(frame)
    view.update(second, labels)

    const seen = new Set<string>()
    for (let step = 0; step < WIREFRAME_MOVE_STEPS; step++) {
      vi.advanceTimersByTime(frame)
      seen.add(lastPlaces(context.fillText).join('|'))
    }
    expect(seen.size).toBe(WIREFRAME_MOVE_STEPS)

    // Fresh, the same scene lands on the same places once the moves are done (sway aside).
    view.dispose()
  })

  it('snaps to the new algorithm in one frame when motion is reduced', () => {
    requestReducedMotion(true)
    const { canvas, context } = makeFakeCanvas()
    const view = createWireframeView(canvas)
    view.update(first, labels)
    vi.advanceTimersByTime(frame)
    context.fillText.mockClear()

    view.update(second, labels)
    vi.advanceTimersByTime(frame)
    const snapped = lastPlaces(context.fillText)

    const fresh = makeFakeCanvas()
    const freshView = createWireframeView(fresh.canvas)
    freshView.update(second, labels)
    vi.advanceTimersByTime(frame)
    expect(snapped).toEqual(lastPlaces(fresh.context.fillText))
    view.dispose()
    freshView.dispose()
  })

  it('stops redrawing when motion is reduced and nothing is moving', () => {
    requestReducedMotion(true)
    const { canvas } = makeFakeCanvas()
    const view = createWireframeView(canvas)
    view.update(first, labels)
    vi.advanceTimersByTime(frame * 2)
    expect(vi.getTimerCount()).toBe(0)
    view.dispose()
  })

  it('keeps swaying while idle when motion is allowed, and stops when disposed', () => {
    requestReducedMotion(false)
    const { canvas } = makeFakeCanvas()
    const view = createWireframeView(canvas)
    view.update(first, labels)
    vi.advanceTimersByTime(frame * 5)
    expect(vi.getTimerCount()).toBe(1)
    view.dispose()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('pauses while the tab is hidden and resumes when it returns', () => {
    requestReducedMotion(false)
    const { canvas } = makeFakeCanvas()
    const view = createWireframeView(canvas)
    view.update(first, labels)
    let state: DocumentVisibilityState = 'hidden'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => state)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(vi.getTimerCount()).toBe(0)

    state = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(vi.getTimerCount()).toBe(1)
    view.dispose()
  })

  it('pauses while the canvas is off screen', () => {
    requestReducedMotion(false)
    let report: IntersectionObserverCallback = () => {}
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          report = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    const { canvas } = makeFakeCanvas()
    const view = createWireframeView(canvas)
    view.update(first, labels)
    const entry = (isIntersecting: boolean) =>
      [{ isIntersecting } as IntersectionObserverEntry] as IntersectionObserverEntry[]

    report(entry(false), {} as IntersectionObserver)
    expect(vi.getTimerCount()).toBe(0)
    report(entry(true), {} as IntersectionObserver)
    expect(vi.getTimerCount()).toBe(1)
    view.dispose()
  })

  it('turns when asked, even with motion reduced', () => {
    requestReducedMotion(true)
    const { canvas, context } = makeFakeCanvas()
    const view = createWireframeView(canvas)
    view.update(first, labels)
    vi.advanceTimersByTime(frame)
    const before = lastPlaces(context.fillText)

    view.turn(0.3, 0)
    vi.advanceTimersByTime(frame)
    expect(lastPlaces(context.fillText)).not.toEqual(before)
    view.dispose()
  })

  it('does nothing, without throwing, where there is no 2D context', () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockReturnValue(null)
    const view = createWireframeView(canvas)
    expect(() => {
      view.update(first, labels)
      view.turn(0.1, 0.1)
      view.dispose()
    }).not.toThrow()
  })
})
