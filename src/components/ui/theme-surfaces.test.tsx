// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'

import { HelpPopover } from './help-popover'
import { ToastProvider, useToast } from './toast'

afterEach(() => {
  cleanup()
  delete window.umami
})

function ToastTrigger() {
  const toast = useToast()
  return (
    <button onClick={() => toast.success('Saved')} type="button">
      Save
    </button>
  )
}

describe('themed overlay surfaces', () => {
  it('marks a portalled help popup as a semantic popover surface', async () => {
    const user = userEvent.setup()
    render(<HelpPopover label="Algorithm" text="Choose an FM algorithm." />)

    await user.hover(screen.getByRole('button', { name: 'Help: Algorithm' }))

    expect(screen.getByRole('note').classList.contains('popover-surface')).toBe(true)
  })

  it('tracks a contextual help view without sending its translated label or text', async () => {
    const user = userEvent.setup()
    const track = vi.fn()
    window.umami = { track }
    render(<HelpPopover label="Algorithm" text="Choose an FM algorithm." />)

    const helpButton = screen.getByRole('button', { name: 'Help: Algorithm' })
    await user.hover(helpButton)
    await user.click(helpButton)
    await user.unhover(helpButton)
    await user.hover(helpButton)

    expect(track).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('help_opened', { surface: 'contextual' })
  })

  it('marks a portalled toast as a semantic toast surface', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Saved').parentElement?.classList.contains('toast-surface')).toBe(true)
  })
})
