// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { RotaryParameterControl } from '@/components/editor/parameter-controls'

afterEach(cleanup)

const ignore = () => {}

function pointerTransform(value: number) {
  const { container } = render(
    <RotaryParameterControl
      label="Transpose"
      max={24}
      min={-24}
      onChange={ignore}
      onGestureEnd={ignore}
      onGestureStart={ignore}
      value={value}
    />,
  )
  return container.querySelector('line[y1="16"]')?.getAttribute('transform')
}

describe('RotaryParameterControl dragging', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = () => {}
    HTMLElement.prototype.releasePointerCapture = () => {}
  })

  function renderKnob() {
    const onChange = vi.fn()
    const onGestureEnd = vi.fn()
    const onGestureStart = vi.fn()
    render(
      <RotaryParameterControl
        label="Transpose"
        max={24}
        min={-24}
        onChange={onChange}
        onGestureEnd={onGestureEnd}
        onGestureStart={onGestureStart}
        value={0}
      />,
    )
    return {
      knob: screen.getByRole('slider', { name: 'Transpose' }),
      onChange,
      onGestureEnd,
      onGestureStart,
    }
  }

  it('turns up as the pointer moves up, within one gesture', () => {
    const { knob, onChange, onGestureEnd, onGestureStart } = renderKnob()

    fireEvent.pointerDown(knob, { clientY: 200, pointerId: 1 })
    // 120 pixels cover the whole range, so each pixel is 48 / 120 of a step.
    fireEvent.pointerMove(knob, { clientY: 190, pointerId: 1 })
    fireEvent.pointerMove(knob, { clientY: 170, pointerId: 1 })
    fireEvent.pointerUp(knob, { clientY: 170, pointerId: 1 })

    expect(onChange.mock.calls).toEqual([[4], [12]])
    expect(onGestureStart).toHaveBeenCalledTimes(1)
    expect(onGestureEnd).toHaveBeenCalledTimes(1)
  })

  it('stops at the end of its range however far the pointer goes', () => {
    const { knob, onChange } = renderKnob()

    fireEvent.pointerDown(knob, { clientY: 200, pointerId: 1 })
    fireEvent.pointerMove(knob, { clientY: 500, pointerId: 1 })

    expect(onChange).toHaveBeenLastCalledWith(-24)
  })

  it('ignores a second pointer while one is dragging', () => {
    const { knob, onChange } = renderKnob()

    fireEvent.pointerDown(knob, { clientY: 200, pointerId: 1 })
    fireEvent.pointerMove(knob, { clientY: 100, pointerId: 2 })
    fireEvent.pointerUp(knob, { clientY: 100, pointerId: 2 })
    fireEvent.pointerMove(knob, { clientY: 190, pointerId: 1 })

    expect(onChange.mock.calls).toEqual([[4]])
  })

  it('ends the gesture and stops following when the pointer is cancelled', () => {
    const { knob, onChange, onGestureEnd } = renderKnob()

    fireEvent.pointerDown(knob, { clientY: 200, pointerId: 1 })
    fireEvent.pointerCancel(knob, { pointerId: 1 })
    fireEvent.pointerMove(knob, { clientY: 150, pointerId: 1 })

    expect(onGestureEnd).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('RotaryParameterControl pointer', () => {
  it('points at the middle of its travel for a centred value', () => {
    expect(pointerTransform(0)).toBe('rotate(0 38 38)')
  })

  it('stops at the end of its travel for a value outside its range', () => {
    expect(pointerTransform(30)).toBe('rotate(135 38 38)')
  })
})

describe('RotaryParameterControl steps', () => {
  function ticks(max: number, value: number) {
    const { container } = render(
      <RotaryParameterControl
        label="Key tracking"
        max={max}
        onChange={ignore}
        onGestureEnd={ignore}
        onGestureStart={ignore}
        value={value}
      />,
    )
    return Array.from(container.querySelectorAll('line[y1="2"]'))
  }

  it('draws a long tick for each position of a knob with only a few', () => {
    const steps = ticks(3, 2)

    expect(steps.map((tick) => tick.getAttribute('transform'))).toEqual([
      'rotate(-135 38 38)',
      'rotate(-45 38 38)',
      'rotate(45 38 38)',
      'rotate(135 38 38)',
    ])
    expect(steps.every((tick) => tick.getAttribute('y2') === '9')).toBe(true)
    expect(steps.map((tick) => tick.getAttribute('class')?.includes('--crt-line'))).toEqual([
      false,
      false,
      false,
      true,
    ])
  })

  it('keeps the eleven-tick scale for a knob with a wide range', () => {
    expect(ticks(99, 50)).toHaveLength(11)
  })
})

describe('RotaryParameterControl disabled', () => {
  it('leaves the tab order and ignores the pointer and keys', () => {
    const onChange = vi.fn()
    const onGestureStart = vi.fn()
    render(
      <RotaryParameterControl
        accessibleLabel="Bitcrush Bits"
        disabled
        label="Bits"
        max={16}
        min={1}
        onChange={onChange}
        onGestureEnd={ignore}
        onGestureStart={onGestureStart}
        value={8}
      />,
    )
    const knob = screen.getByRole('slider', { name: 'Bitcrush Bits' })

    fireEvent.keyDown(knob, { key: 'ArrowUp' })
    fireEvent.pointerDown(knob, { clientY: 200, pointerId: 1 })
    fireEvent.pointerMove(knob, { clientY: 100, pointerId: 1 })

    expect(knob.getAttribute('aria-disabled')).toBe('true')
    expect(knob.hasAttribute('tabindex')).toBe(false)
    expect(onChange).not.toHaveBeenCalled()
    expect(onGestureStart).not.toHaveBeenCalled()
  })
})
