// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { FaderParameterControl } from '@/components/editor/parameter-controls'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = () => {}
  HTMLElement.prototype.releasePointerCapture = () => {}
})

function renderFader({ disabled = false, value = 20 } = {}) {
  const onChange = vi.fn()
  const onGestureEnd = vi.fn()
  const onGestureStart = vi.fn()
  render(
    <FaderParameterControl
      disabled={disabled}
      label="Noise"
      max={100}
      onChange={onChange}
      onGestureEnd={onGestureEnd}
      onGestureStart={onGestureStart}
      value={value}
      valueLabel={(level) => `${level}%`}
    />,
  )
  return {
    fader: screen.getByRole('slider', { name: 'Noise' }),
    onChange,
    onGestureEnd,
    onGestureStart,
  }
}

/** A track 100 px tall, its foot at 200 px, so a pointer at y moves the fader to 200 - y. */
function mockTrack() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    bottom: 200,
    height: 100,
    top: 100,
  } as DOMRect)
}

describe('FaderParameterControl', () => {
  it('stands upright and reads out only its value', () => {
    const { fader } = renderFader()

    expect(fader.getAttribute('aria-orientation')).toBe('vertical')
    expect(fader.getAttribute('aria-valuenow')).toBe('20')
    expect(fader.getAttribute('aria-valuetext')).toBe('20%')
  })

  it('steps with the arrow keys, pages by a tenth, and goes to either end, as a knob does', () => {
    const { fader, onChange } = renderFader()

    for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']) {
      fireEvent.keyDown(fader, { key })
    }

    expect(onChange.mock.calls.map(([value]) => value)).toEqual([21, 19, 30, 10, 0, 100])
  })

  it('takes a held key as one gesture', () => {
    const { fader, onGestureEnd, onGestureStart } = renderFader()

    fireEvent.keyDown(fader, { key: 'ArrowUp' })
    fireEvent.keyDown(fader, { key: 'ArrowUp', repeat: true })
    fireEvent.keyUp(fader, { key: 'ArrowUp' })

    expect(onGestureStart).toHaveBeenCalledTimes(1)
    expect(onGestureEnd).toHaveBeenCalledTimes(1)
  })

  it('moves to the pointer and follows it, within one gesture', () => {
    mockTrack()
    const { fader, onChange, onGestureEnd, onGestureStart } = renderFader()

    fireEvent.pointerDown(fader, { clientY: 160, pointerId: 1 })
    fireEvent.pointerMove(fader, { clientY: 120, pointerId: 1 })
    fireEvent.pointerMove(fader, { clientY: 20, pointerId: 1 })
    fireEvent.pointerUp(fader, { pointerId: 1 })
    fireEvent.pointerMove(fader, { clientY: 180, pointerId: 1 })

    expect(onChange.mock.calls.map(([value]) => value)).toEqual([40, 80, 100])
    expect(onGestureStart).toHaveBeenCalledTimes(1)
    expect(onGestureEnd).toHaveBeenCalledTimes(1)
  })

  it('ignores a second pointer while one is dragging', () => {
    mockTrack()
    const { fader, onChange } = renderFader()

    fireEvent.pointerDown(fader, { clientY: 160, pointerId: 1 })
    fireEvent.pointerMove(fader, { clientY: 110, pointerId: 2 })

    expect(onChange.mock.calls.map(([value]) => value)).toEqual([40])
  })

  it('leaves the tab order and ignores the pointer and keys while disabled', () => {
    mockTrack()
    const { fader, onChange, onGestureStart } = renderFader({ disabled: true })

    fireEvent.keyDown(fader, { key: 'ArrowUp' })
    fireEvent.pointerDown(fader, { clientY: 150, pointerId: 1 })

    expect(fader.getAttribute('aria-disabled')).toBe('true')
    expect(fader.hasAttribute('tabindex')).toBe(false)
    expect(onChange).not.toHaveBeenCalled()
    expect(onGestureStart).not.toHaveBeenCalled()
  })

  it('names itself and its value in the tooltip in the interface language', async () => {
    await setLocale('de')
    try {
      const { fader } = renderFader()
      expect(fader.getAttribute('title')).toBe(
        'Noise: 20%. Zum Einstellen nach oben oder unten ziehen.',
      )
    } finally {
      await setLocale('en-GB')
    }
  })
})
