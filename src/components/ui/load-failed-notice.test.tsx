// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { reloadPage } from '@/lib/reload-page'

import { LoadFailedNotice } from './load-failed-notice'

vi.mock('@/lib/reload-page', () => ({ reloadPage: vi.fn() }))

afterEach(() => {
  cleanup()
  vi.mocked(reloadPage).mockClear()
})

describe('LoadFailedNotice', () => {
  it('announces the message with a reload button', () => {
    render(<LoadFailedNotice message="The keyboard could not be opened." />)

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('The keyboard could not be opened.')).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Reload app' })).toBeTruthy()
  })

  it('reloads the page when the reload button is chosen', async () => {
    const user = userEvent.setup()
    render(<LoadFailedNotice message="The keyboard could not be opened." />)

    await user.click(screen.getByRole('button', { name: 'Reload app' }))

    expect(reloadPage).toHaveBeenCalledTimes(1)
  })
})
