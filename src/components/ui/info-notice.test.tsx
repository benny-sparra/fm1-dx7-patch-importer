// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { InfoNotice } from './info-notice'

afterEach(cleanup)

describe('InfoNotice', () => {
  it('shows its text beside an info sign that assistive technology skips', () => {
    const { container } = render(
      <InfoNotice>
        <p>Your changes are heard once the patch is written.</p>
      </InfoNotice>,
    )

    expect(screen.getByText('Your changes are heard once the patch is written.')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.textContent).toBe('Your changes are heard once the patch is written.')
  })

  it('draws the sign from whole pixels in a square grid', () => {
    const { container } = render(<InfoNotice>Note</InfoNotice>)
    const rects = Array.from(container.querySelectorAll('rect'))

    expect(rects.length).toBeGreaterThan(0)
    for (const rect of rects) {
      const [x, y, width] = ['x', 'y', 'width'].map((name) => Number(rect.getAttribute(name)))
      expect(Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(width)).toBe(true)
      expect(x + width).toBeLessThanOrEqual(12)
      expect(y).toBeLessThan(12)
    }
  })

  it('is not an alert, so the live region around it decides what is announced', () => {
    render(<InfoNotice>Note</InfoNotice>)

    expect(screen.queryByRole('alert')).toBeNull()
  })
})
