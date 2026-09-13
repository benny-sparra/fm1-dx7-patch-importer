// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import '@/i18n'
import { OnOffLabel } from '@/components/ui/on-off-label'

afterEach(cleanup)

describe('OnOffLabel', () => {
  it('keeps both words in the layout so the button width never changes', () => {
    const { rerender } = render(
      <button type="button">
        <OnOffLabel on />
      </button>,
    )
    expect(screen.getByText('On').className).not.toContain('invisible')
    expect(screen.getByText('Off').className).toContain('invisible')

    rerender(
      <button type="button">
        <OnOffLabel on={false} />
      </button>,
    )
    expect(screen.getByText('On').className).toContain('invisible')
    expect(screen.getByText('Off').className).not.toContain('invisible')
  })

  it('names the control by the current state only', () => {
    const { rerender } = render(
      <button type="button">
        <OnOffLabel on />
      </button>,
    )
    expect(screen.getByRole('button', { name: 'On' })).toBeTruthy()

    rerender(
      <button type="button">
        <OnOffLabel on={false} />
      </button>,
    )
    expect(screen.getByRole('button', { name: 'Off' })).toBeTruthy()
  })
})
