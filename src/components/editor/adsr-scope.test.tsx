// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { adsrPoints, AdsrScope, adsrSettingsAt } from '@/components/editor/adsr-scope'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const settings = { attack: 20, decay: 40, release: 60, sustain: 50 }
const tracePath = () =>
  screen.getByTestId('adsr-scope').querySelector('path[fill="none"]')?.getAttribute('d')

describe('AdsrScope', () => {
  it('draws a longer stage wider and the sustain level higher', () => {
    const [peak, sustainStart, sustainEnd, end] = adsrPoints(settings)
    expect(adsrPoints({ ...settings, attack: 80 })[0].x).toBeGreaterThan(peak.x)
    expect(adsrPoints({ ...settings, sustain: 90 })[1].y).toBeLessThan(sustainStart.y)
    expect(sustainEnd.y).toBe(sustainStart.y)
    expect(end.x).toBeGreaterThan(sustainEnd.x)
  })

  it('redraws when a setting changes', () => {
    const { rerender } = render(<AdsrScope enabled {...settings} />)
    const before = tracePath()
    rerender(<AdsrScope enabled {...settings} release={10} />)
    expect(tracePath()).not.toBe(before)
  })

  it('dims while the Envelope is off', () => {
    const { rerender } = render(<AdsrScope enabled={false} {...settings} />)
    const trace = () => screen.getByTestId('adsr-scope').querySelector('g[opacity]')
    expect(trace()?.getAttribute('opacity')).toBe('0.4')
    rerender(<AdsrScope enabled {...settings} />)
    expect(trace()?.getAttribute('opacity')).toBe('1')
  })

  it('stays hidden from assistive technology', () => {
    render(<AdsrScope enabled {...settings} />)
    expect(screen.getByTestId('adsr-scope').getAttribute('aria-hidden')).toBe('true')
  })

  it('sets each setting from the point that draws it', () => {
    const [peak, sustainStart, sustainEnd, end] = adsrPoints(settings)
    expect(adsrSettingsAt(settings, 0, peak.x, 0)).toEqual({ attack: 20 })
    expect(adsrSettingsAt(settings, 1, sustainStart.x, sustainStart.y)).toEqual({
      decay: 40,
      sustain: 50,
    })
    expect(adsrSettingsAt(settings, 2, sustainEnd.x, sustainEnd.y)).toEqual({ sustain: 50 })
    expect(adsrSettingsAt(settings, 3, end.x, end.y)).toEqual({ release: 60 })
  })

  it('drags a point as one gesture, and not while the Envelope is off', () => {
    // The drawing is laid out at its own size, so a client pixel is a drawing unit.
    vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue({
      height: 180,
      left: 0,
      top: 0,
      width: 600,
    } as DOMRect)
    const onChange = vi.fn()
    const onGestureStart = vi.fn()
    const onGestureEnd = vi.fn()
    const { rerender } = render(
      <AdsrScope
        enabled
        {...settings}
        onChange={onChange}
        onGestureEnd={onGestureEnd}
        onGestureStart={onGestureStart}
      />,
    )
    const release = screen.getByTestId('adsr-point-4')
    const [, , sustainEnd] = adsrPoints(settings)

    fireEvent.pointerDown(release, { clientX: sustainEnd.x + 73, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(release, { clientX: sustainEnd.x + 146, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(release, { pointerId: 1 })

    expect(onChange.mock.calls).toEqual([
      ['release', 50],
      ['release', 100],
    ])
    expect(onGestureStart).toHaveBeenCalledTimes(1)
    expect(onGestureEnd).toHaveBeenCalledTimes(1)

    onChange.mockClear()
    rerender(<AdsrScope enabled={false} {...settings} onChange={onChange} />)
    fireEvent.pointerDown(screen.getByTestId('adsr-point-4'), { clientX: 10, clientY: 10 })
    expect(onChange).not.toHaveBeenCalled()
  })
})
