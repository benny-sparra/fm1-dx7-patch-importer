// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Fm1ColorwayPicker } from '@/components/ui/fm1-colorway-picker'
import { setLocale } from '@/i18n'

afterEach(async () => {
  cleanup()
  await setLocale('en-GB')
})

describe('Fm1ColorwayPicker', () => {
  it('names the choice and each colour as the FM1 colour, not its finish', () => {
    render(<Fm1ColorwayPicker onChange={vi.fn()} value="orange" />)

    expect(screen.getByRole('group', { name: 'FM1 colour' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Orange FM1 colour' })).toHaveProperty('checked', true)
    expect(screen.queryByText('Finish')).toBeNull()
  })

  it('spells colour the American way in American English', async () => {
    await setLocale('en-US')
    render(<Fm1ColorwayPicker onChange={vi.fn()} value="orange" />)

    expect(screen.getByRole('group', { name: 'FM1 color' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Orange FM1 color' })).toBeTruthy()
  })
})
