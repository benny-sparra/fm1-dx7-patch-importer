// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Fm1ColorwayPicker } from '@/components/ui/fm1-colorway-picker'
import { setLocale } from '@/i18n'

afterEach(async () => {
  cleanup()
  await setLocale('en-GB')
})

describe('Fm1ColorwayPicker', () => {
  // A phone shows no tooltip, so the swatch carries a caption, and a tap on it opens the choice.
  it('focuses the current finish when its caption is pressed', async () => {
    const user = userEvent.setup()
    render(<Fm1ColorwayPicker onChange={vi.fn()} value="orange" />)

    await user.click(screen.getByText('Finish'))

    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Orange FM1 finish' }))
  })

  it('keeps each finish named by its colour, not by the caption', () => {
    render(<Fm1ColorwayPicker onChange={vi.fn()} value="orange" />)

    expect(screen.getByRole('radio', { name: 'Orange FM1 finish' })).toHaveProperty('checked', true)
    expect(screen.queryByRole('radio', { name: 'Finish' })).toBeNull()
  })

  it('shows its caption in the interface language', async () => {
    await setLocale('uk')
    render(<Fm1ColorwayPicker onChange={vi.fn()} value="orange" />)

    expect(screen.getByText('Корпус')).toBeTruthy()
  })
})
