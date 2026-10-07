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

const curvePath = () =>
  screen.getByTestId('va-filter-scope').querySelector('path[fill="none"]')?.getAttribute('d')

describe('VaFilterScope', () => {
  it('redraws when the type, cutoff, or resonance change', () => {
    const { rerender } = render(<VaFilterScope cutoff={50} resonance={0} type={0} />)
    const first = curvePath()
    rerender(<VaFilterScope cutoff={80} resonance={0} type={0} />)
    const opened = curvePath()
    rerender(<VaFilterScope cutoff={80} resonance={60} type={0} />)
    const resonant = curvePath()
    rerender(<VaFilterScope cutoff={80} resonance={60} type={3} />)
    expect(new Set([first, opened, resonant, curvePath()]).size).toBe(4)
  })

  it('cuts the top more steeply at 24 dB than at 12 dB, and the bottom with high pass', () => {
    const top = scopeViewWidth
    expect(vaFilterResponse(1, 30, 0, top)).toBeLessThan(vaFilterResponse(0, 30, 0, top))
    expect(vaFilterResponse(3, 70, 0, 0)).toBeLessThan(vaFilterResponse(0, 70, 0, 0))
  })

  it('stays hidden from assistive technology', () => {
    render(<VaFilterScope cutoff={50} resonance={0} type={0} />)
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
