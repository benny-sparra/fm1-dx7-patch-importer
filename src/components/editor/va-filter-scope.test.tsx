// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  VaFilterScope,
  VaFilterTypeIcon,
  vaFilterResponse,
} from '@/components/editor/va-filter-scope'
import { scopeViewWidth } from '@/components/editor/scope-frame'

afterEach(cleanup)

const noteLabel = (octave: number) => `C${octave}`

const noteLabels = () =>
  Array.from(
    screen.getByTestId('va-filter-scope').querySelectorAll('[data-note-label]'),
    (label) => label.textContent,
  )

const curvePath = (note = 'middle') =>
  screen
    .getByTestId('va-filter-scope')
    .querySelector(`path[data-note="${note}"]`)
    ?.getAttribute('d')

describe('VaFilterScope', () => {
  it('redraws when the type, cutoff, or resonance change', () => {
    const { rerender } = render(
      <VaFilterScope cutoff={50} noteLabel={noteLabel} keyTracking={0} resonance={0} type={0} />,
    )
    const first = curvePath()
    rerender(
      <VaFilterScope cutoff={80} noteLabel={noteLabel} keyTracking={0} resonance={0} type={0} />,
    )
    const opened = curvePath()
    rerender(
      <VaFilterScope cutoff={80} noteLabel={noteLabel} keyTracking={0} resonance={60} type={0} />,
    )
    const resonant = curvePath()
    rerender(
      <VaFilterScope cutoff={80} noteLabel={noteLabel} keyTracking={0} resonance={60} type={3} />,
    )
    expect(new Set([first, opened, resonant, curvePath()]).size).toBe(4)
  })

  it('cuts the top more steeply at 24 dB than at 12 dB, and the bottom with high pass', () => {
    const top = scopeViewWidth
    expect(vaFilterResponse(1, 30, 0, top)).toBeLessThan(vaFilterResponse(0, 30, 0, top))
    expect(vaFilterResponse(3, 70, 0, 0)).toBeLessThan(vaFilterResponse(0, 70, 0, 0))
  })

  it('draws no key tracking curves while Key Tracking is 0', () => {
    render(
      <VaFilterScope cutoff={50} noteLabel={noteLabel} keyTracking={0} resonance={0} type={0} />,
    )

    expect(curvePath('low')).toBeUndefined()
    expect(curvePath('high')).toBeUndefined()
    expect(noteLabels()).toEqual([])
  })

  it('names the three lit keys while Key Tracking is on', () => {
    render(
      <VaFilterScope cutoff={50} keyTracking={1} noteLabel={noteLabel} resonance={0} type={0} />,
    )

    expect(noteLabels()).toEqual(['C2', 'C4', 'C6'])
  })

  it('spreads the low and high notes’ curves further apart as Key Tracking rises', () => {
    const spread = (keyTracking: number) => {
      cleanup()
      render(
        <VaFilterScope
          cutoff={50}
          noteLabel={noteLabel}
          keyTracking={keyTracking}
          resonance={40}
          type={0}
        />,
      )
      // The x of each curve's resonant peak, its lowest y.
      const peakX = (note: string) => {
        const points = curvePath(note)!
          .slice(1)
          .split(' L')
          .map((point) => point.split(' ').map(Number))
        return points.reduce((peak, point) => (point[1] < peak[1] ? point : peak))[0]
      }
      expect(peakX('low')).toBeLessThan(peakX('middle'))
      expect(peakX('high')).toBeGreaterThan(peakX('middle'))
      return peakX('high') - peakX('low')
    }

    const steps = [1, 2, 3].map(spread)
    expect(steps[1]).toBeGreaterThan(steps[0])
    expect(steps[2]).toBeGreaterThan(steps[1])
  })

  it('stays hidden from assistive technology', () => {
    render(
      <VaFilterScope cutoff={50} noteLabel={noteLabel} keyTracking={0} resonance={0} type={0} />,
    )
    expect(screen.getByTestId('va-filter-scope').getAttribute('aria-hidden')).toBe('true')
  })

  it('draws each filter type as a different icon, hidden from assistive technology', () => {
    const { container } = render(
      <>
        {[0, 1, 2, 3].map((type) => (
          <VaFilterTypeIcon className="h-4 w-7" key={type} type={type} />
        ))}
      </>,
    )
    const icons = Array.from(container.querySelectorAll('svg'))

    expect(new Set(icons.map((icon) => icon.querySelector('path')?.getAttribute('d'))).size).toBe(4)
    expect(icons.every((icon) => icon.getAttribute('aria-hidden') === 'true')).toBe(true)
  })
})
