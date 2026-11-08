// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Fm1Wireframe } from '@/components/fm1-wireframe'

// A 2D context that records what is stroked, so a test can tell a redraw from a held frame.
function fakeContext() {
  const calls = { fills: 0, strokes: 0 }
  const context = {
    beginPath: vi.fn(),
    fillRect: vi.fn(() => {
      calls.fills += 1
    }),
    fillStyle: '',
    font: '',
    lineTo: vi.fn(),
    lineWidth: 1,
    measureText: () => ({ width: 40 }),
    moveTo: vi.fn(),
    stroke: vi.fn(() => {
      calls.strokes += 1
    }),
    strokeStyle: '',
    strokeText: vi.fn(),
  }
  return { calls, context }
}

let frames: Array<(time: number) => void>
let hidden = false

function runFrames(time: number) {
  const pending = frames
  frames = []
  act(() => pending.forEach((callback) => callback(time)))
}

beforeEach(() => {
  frames = []
  hidden = false
  vi.stubGlobal('requestAnimationFrame', (callback: (time: number) => void) =>
    frames.push(callback),
  )
  vi.stubGlobal('cancelAnimationFrame', () => {
    frames = []
  })
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function installContext() {
  const fake = fakeContext()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    fake.context as unknown as CanvasRenderingContext2D,
  )
  return fake
}

const mount = () => {
  const view = render(<Fm1Wireframe colorway="black" fallback={<p>photo</p>} />)
  act(() => {
    vi.advanceTimersByTime(1)
  })
  return view
}

describe('Fm1Wireframe', () => {
  it('is decoration: hidden from assistive technology, with no role, name, or focus', () => {
    installContext()
    const { container } = mount()
    const canvas = container.querySelector('canvas')

    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
    expect(canvas?.hasAttribute('tabindex')).toBe(false)
    expect(canvas?.hasAttribute('aria-label')).toBe(false)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('draws a frame as it mounts, so the canvas is never blank', () => {
    const { calls } = installContext()
    mount()

    expect(calls.strokes).toBeGreaterThan(0)
  })

  it('shows the photo when the browser cannot draw it', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const { container } = mount()

    expect(screen.getByText('photo')).toBeTruthy()
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('redraws about twelve times a second rather than on every animation frame', () => {
    const { calls } = installContext()
    mount()
    const afterFirst = calls.strokes

    runFrames(1)
    const afterStart = calls.strokes
    runFrames(20)
    runFrames(40)
    expect(calls.strokes).toBe(afterStart)
    runFrames(100)
    expect(calls.strokes).toBeGreaterThan(afterStart)
    expect(afterStart).toBeGreaterThanOrEqual(afterFirst)
  })

  it('stops drawing while the tab is hidden and carries on when it returns', () => {
    installContext()
    mount()
    runFrames(1)
    expect(frames).toHaveLength(1)

    hidden = true
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(frames).toHaveLength(0)

    hidden = false
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(frames).toHaveLength(1)
  })

  it('stops drawing when it is scrolled out of view, and resumes when it returns', () => {
    installContext()
    let notify: (entries: Array<{ isIntersecting: boolean }>) => void = () => {}
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof notify) {
          notify = callback
        }
        disconnect() {}
        observe() {}
      },
    )
    mount()
    runFrames(1)
    expect(frames).toHaveLength(1)

    act(() => notify([{ isIntersecting: false }]))
    expect(frames).toHaveLength(0)
    act(() => notify([{ isIntersecting: true }]))
    expect(frames).toHaveLength(1)
  })

  it('stops its loop when it is unmounted', () => {
    installContext()
    const { unmount } = mount()
    runFrames(1)
    expect(frames).toHaveLength(1)

    unmount()
    expect(frames).toHaveLength(0)
  })

  it('turns when it is dragged', () => {
    const { calls } = installContext()
    const { container } = mount()
    const canvas = container.querySelector('canvas')!
    const before = calls.strokes

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 140, clientY: 100, pointerId: 1 })
    expect(calls.strokes).toBeGreaterThan(before)

    const afterDrag = calls.strokes
    fireEvent.pointerUp(canvas, { pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 200, clientY: 100, pointerId: 1 })
    expect(calls.strokes).toBe(afterDrag)
  })

  it('turns from the arrow keys while the dialog around it has the keyboard', () => {
    const { calls } = installContext()
    const { container } = render(
      <dialog open>
        <Fm1Wireframe colorway="black" fallback={null} />
      </dialog>,
    )
    act(() => {
      vi.advanceTimersByTime(1)
    })
    const dialog = container.querySelector('dialog')!
    const before = calls.strokes

    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(calls.strokes).toBeGreaterThan(before)

    const afterArrow = calls.strokes
    fireEvent.keyDown(dialog, { ctrlKey: true, key: 'ArrowRight' })
    fireEvent.keyDown(dialog, { key: 'a' })
    expect(calls.strokes).toBe(afterArrow)
  })

  it('leaves a key another control in the dialog used, such as a tab, unturned', () => {
    const { calls } = installContext()
    const { container } = render(
      <dialog open>
        <button onKeyDown={(event) => event.preventDefault()} type="button">
          Tab
        </button>
        <Fm1Wireframe colorway="black" fallback={null} />
      </dialog>,
    )
    act(() => {
      vi.advanceTimersByTime(1)
    })
    const before = calls.strokes

    fireEvent.keyDown(container.querySelector('button')!, { key: 'ArrowRight' })
    expect(calls.strokes).toBe(before)
  })

  it('draws nothing while the dialog around it is closed', () => {
    const { calls } = installContext()
    render(
      <dialog>
        <Fm1Wireframe colorway="black" fallback={null} />
      </dialog>,
    )
    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(calls.strokes).toBe(0)
  })
})
