// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import {
  draggedFrequency,
  OscillatorScope,
  oscillatorScopeCycles,
} from '@/components/editor/oscillator-scope'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const scope = () => screen.getByTestId('oscillator-scope')
const trace = (name: 'operator' | 'reference') =>
  scope().querySelector(`[data-trace="${name}"]`)?.getAttribute('d') ?? null
const traceOpacity = () =>
  scope().querySelector('g[opacity="1"], g[opacity="0.4"]')?.getAttribute('opacity')
const transform = (name: 'operator' | 'reference') =>
  scope().querySelector(`[data-trace="${name}"]`)?.parentElement?.getAttribute('transform')

/** Runs the animation loop by hand: each call to the returned function plays one frame. */
function manualFrames() {
  let pending: FrameRequestCallback | undefined
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    pending = callback
    return 1
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  return (now: number) => pending?.(now)
}

describe('oscillatorScopeCycles', () => {
  it('shows a ratio as that many cycles across the reference', () => {
    expect(oscillatorScopeCycles('ratio', 1, 0)).toBe(1)
    expect(oscillatorScopeCycles('ratio', 2, 0)).toBe(2)
    expect(oscillatorScopeCycles('ratio', 0, 0)).toBe(0.5)
  })

  it('packs a fixed frequency tighter as it rises', () => {
    const low = oscillatorScopeCycles('fixed', 0, 0)
    const mid = oscillatorScopeCycles('fixed', 2, 0)
    const high = oscillatorScopeCycles('fixed', 3, 99)
    expect(low).toBe(1)
    expect(mid).toBeGreaterThan(low)
    expect(high).toBeGreaterThan(mid)
  })
})

describe('OscillatorScope', () => {
  it('redraws the operator trace when the ratio changes', () => {
    const { rerender } = render(
      <OscillatorScope coarse={1} detune={0} fine={0} mode="ratio" outputLevel={99} />,
    )
    const before = trace('operator')
    rerender(<OscillatorScope coarse={3} detune={0} fine={0} mode="ratio" outputLevel={99} />)
    expect(trace('operator')).not.toBe(before)
  })

  it('draws the 1.00 reference only in ratio mode', () => {
    const { rerender } = render(
      <OscillatorScope coarse={1} detune={0} fine={0} mode="ratio" outputLevel={99} />,
    )
    expect(trace('reference')).not.toBeNull()
    rerender(<OscillatorScope coarse={1} detune={0} fine={0} mode="fixed" outputLevel={99} />)
    expect(trace('reference')).toBeNull()
  })

  it('slides the operator against the reference only when detuned', () => {
    const frame = manualFrames()
    const { rerender } = render(
      <OscillatorScope coarse={1} detune={0} fine={0} mode="ratio" outputLevel={99} />,
    )
    // At ratio 1.00 with no detune the two traces scroll in step.
    frame(0)
    for (let now = 100; now <= 1000; now += 100) frame(now)
    expect(transform('operator')).toMatch(/translate\(-[1-9]/)
    expect(transform('operator')).toBe(transform('reference'))

    rerender(<OscillatorScope coarse={1} detune={7} fine={0} mode="ratio" outputLevel={99} />)
    for (let now = 1100; now <= 2000; now += 100) frame(now)
    expect(transform('operator')).not.toBe(transform('reference'))
  })

  it('dims the trace while the operator’s output level is zero', () => {
    const { rerender } = render(
      <OscillatorScope coarse={1} detune={0} fine={0} mode="ratio" outputLevel={0} />,
    )
    expect(traceOpacity()).toBe('0.4')
    rerender(<OscillatorScope coarse={1} detune={0} fine={0} mode="ratio" outputLevel={1} />)
    expect(traceOpacity()).toBe('1')
  })

  it('stays hidden from assistive tech', () => {
    render(<OscillatorScope coarse={1} detune={0} fine={0} mode="ratio" outputLevel={99} />)
    expect(scope().getAttribute('aria-hidden')).toBe('true')
  })
})

describe('draggedFrequency', () => {
  it('steps Coarse in ratio mode, keeping Fine, within 0 to 31', () => {
    expect(draggedFrequency('ratio', { coarse: 2, fine: 50 }, 3, false)).toEqual({
      coarse: 5,
      fine: 50,
    })
    expect(draggedFrequency('ratio', { coarse: 2, fine: 50 }, -9, false).coarse).toBe(0)
    expect(draggedFrequency('ratio', { coarse: 30, fine: 0 }, 9, false).coarse).toBe(31)
  })

  it('steps Fine with Shift in ratio mode, within 0 to 99', () => {
    expect(draggedFrequency('ratio', { coarse: 2, fine: 50 }, 7, true)).toEqual({
      coarse: 2,
      fine: 57,
    })
    expect(draggedFrequency('ratio', { coarse: 2, fine: 95 }, 9, true).fine).toBe(99)
  })

  it('carries a fixed frequency into the next decade, keeping Coarse’s upper bits', () => {
    // Coarse 5 is decade 1 with bit 2 set; 1.95 decades plus 0.1 is 2.05.
    expect(draggedFrequency('fixed', { coarse: 5, fine: 95 }, 1, false)).toEqual({
      coarse: 6,
      fine: 5,
    })
    expect(draggedFrequency('fixed', { coarse: 4, fine: 0 }, -1, true)).toEqual({
      coarse: 4,
      fine: 0,
    })
    expect(draggedFrequency('fixed', { coarse: 3, fine: 90 }, 5, false)).toEqual({
      coarse: 3,
      fine: 99,
    })
  })
})

describe('OscillatorScope dragging', () => {
  const dragTarget = () => screen.getByTestId('oscillator-scope-drag')

  it('sets Coarse from a sideways drag as one gesture', () => {
    const onChange = vi.fn()
    const onGestureStart = vi.fn()
    const onGestureEnd = vi.fn()
    render(
      <OscillatorScope
        coarse={1}
        detune={0}
        fine={0}
        mode="ratio"
        onChange={onChange}
        onGestureEnd={onGestureEnd}
        onGestureStart={onGestureStart}
        outputLevel={99}
      />,
    )

    fireEvent.pointerDown(dragTarget(), { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(dragTarget(), { clientX: 125, pointerId: 1 })
    fireEvent.pointerUp(dragTarget(), { clientX: 125, pointerId: 1 })

    expect(onChange).toHaveBeenLastCalledWith({ coarse: 3, fine: 0 })
    expect(onGestureStart).toHaveBeenCalledTimes(1)
    expect(onGestureEnd).toHaveBeenCalledTimes(1)
  })

  it('sets Fine while Shift is held', () => {
    const onChange = vi.fn()
    render(
      <OscillatorScope
        coarse={1}
        detune={0}
        fine={10}
        mode="ratio"
        onChange={onChange}
        outputLevel={99}
      />,
    )

    fireEvent.pointerDown(dragTarget(), { clientX: 100, pointerId: 1, shiftKey: true })
    fireEvent.pointerMove(dragTarget(), { clientX: 115, pointerId: 1, shiftKey: true })

    expect(onChange).toHaveBeenLastCalledWith({ coarse: 1, fine: 15 })
  })

  it('ignores a second pointer moving during the drag', () => {
    const onChange = vi.fn()
    render(
      <OscillatorScope
        coarse={1}
        detune={0}
        fine={0}
        mode="ratio"
        onChange={onChange}
        outputLevel={99}
      />,
    )

    fireEvent.pointerDown(dragTarget(), { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(dragTarget(), { clientX: 400, pointerId: 2 })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('names what a drag does in its tooltip, for the mode it is in', () => {
    const { rerender } = render(
      <OscillatorScope
        coarse={1}
        detune={0}
        fine={0}
        mode="ratio"
        onChange={vi.fn()}
        outputLevel={99}
      />,
    )
    expect(dragTarget().title).toBe('Drag sideways to change the ratio. Hold Shift to change Fine.')

    rerender(
      <OscillatorScope
        coarse={1}
        detune={0}
        fine={0}
        mode="fixed"
        onChange={vi.fn()}
        outputLevel={99}
      />,
    )
    expect(dragTarget().title).toBe(
      'Drag sideways to change the frequency. Hold Shift for smaller steps.',
    )
  })

  it('offers no drag without a change handler', () => {
    render(<OscillatorScope coarse={1} detune={0} fine={0} mode="ratio" outputLevel={99} />)
    expect(screen.queryByTestId('oscillator-scope-drag')).toBeNull()
  })
})
