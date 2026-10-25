// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SegmentGhost } from './segment-ghost'

describe('SegmentGhost', () => {
  it('draws every segment of the digits it stands behind, hidden from assistive technology', () => {
    const { container } = render(<SegmentGhost text="-07.5" />)
    const ghost = container.firstElementChild
    expect(ghost?.getAttribute('data-ghost')).toBe('-88.8')
    expect(ghost?.getAttribute('aria-hidden')).toBe('true')
    expect(ghost?.textContent).toBe('')
  })
})
