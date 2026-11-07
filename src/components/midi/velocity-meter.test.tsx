// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createPeakMeter } from '@/lib/peak-meter'

import { VelocityMeter } from './velocity-meter'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** Answers the reduced-motion query, which jsdom cannot evaluate. */
function requestReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: reduce && query.includes('reduce') })),
  )
}

const litSegments = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>('[data-meter-segment]'),
    (segment) => segment.dataset.lit ?? '',
  )

describe('VelocityMeter', () => {
  it('stays dark before any note', () => {
    const { container } = render(<VelocityMeter hit={null} meter={createPeakMeter()} />)

    expect(litSegments(container).every((lit) => lit === '')).toBe(true)
  })

  it('shows the last note’s velocity and stays still with reduced motion', () => {
    requestReducedMotion(true)
    const frame = vi.spyOn(window, 'requestAnimationFrame')
    const { container } = render(
      <VelocityMeter hit={{ count: 1, value: 0.5 }} meter={createPeakMeter()} />,
    )

    expect(litSegments(container).filter((lit) => lit === 'on')).toHaveLength(6)
    expect(frame).not.toHaveBeenCalled()
  })

  it('lights from the meter on the next frame and redraws with each note', () => {
    requestReducedMotion(false)
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((frame) => frames.push(frame))
    const meter = createPeakMeter()
    meter.hit(1, 0)
    const { container, rerender } = render(
      <VelocityMeter hit={{ count: 1, value: 1 }} meter={meter} />,
    )
    frames.shift()?.(0)
    const loud = litSegments(container).filter(Boolean).length

    meter.hit(0.25, 5000)
    rerender(<VelocityMeter hit={{ count: 2, value: 0.25 }} meter={meter} />)
    frames.at(-1)?.(5000)

    expect(loud).toBe(12)
    expect(litSegments(container).filter(Boolean).length).toBe(3)
  })

  it('stays hidden from assistive technology', () => {
    const { container } = render(<VelocityMeter hit={null} meter={createPeakMeter()} />)

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
  })
})
