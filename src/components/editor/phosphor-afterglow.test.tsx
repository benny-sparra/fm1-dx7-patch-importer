// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PhosphorAfterglow } from './phosphor-afterglow'

afterEach(cleanup)

const afterglow = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.phosphor-afterglow')

describe('PhosphorAfterglow', () => {
  it('draws nothing until the value first changes', () => {
    const { container } = render(<PhosphorAfterglow text="50" />)

    expect(afterglow(container)).toBeNull()
  })

  it('glows with the value the readout showed before', () => {
    const { container, rerender } = render(<PhosphorAfterglow text="50" />)
    rerender(<PhosphorAfterglow text="51" />)

    expect(afterglow(container)?.dataset.afterglow).toBe('50')
  })

  it('starts the fade again on every change', () => {
    const { container, rerender } = render(<PhosphorAfterglow text="50" />)
    rerender(<PhosphorAfterglow text="51" />)
    const first = afterglow(container)
    rerender(<PhosphorAfterglow text="52" />)

    expect(afterglow(container)).not.toBe(first)
    expect(afterglow(container)?.dataset.afterglow).toBe('51')
  })

  it('stays hidden from assistive technology and holds no text', () => {
    const { container, rerender } = render(<PhosphorAfterglow text="50" />)
    rerender(<PhosphorAfterglow text="51" />)

    expect(afterglow(container)?.getAttribute('aria-hidden')).toBe('true')
    expect(afterglow(container)?.textContent).toBe('')
  })
})
