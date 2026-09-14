// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

afterEach(cleanup)

function MenuView({ onEscape = vi.fn() }: { onEscape?: () => void }) {
  const menuRef = useDismissableDetails()
  useKeyboardShortcuts([{ key: 'Escape', onTrigger: onEscape }])

  return (
    <>
      <button type="button">Outside</button>
      <details ref={menuRef}>
        <summary>Presets</summary>
        <button type="button">Soft pad</button>
      </details>
    </>
  )
}

function openMenu() {
  const summary = screen.getByText('Presets')
  const details = summary.closest('details')!
  details.open = true
  return { details, summary }
}

describe('useDismissableDetails', () => {
  it('returns focus to the menu toggle when Escape closes the menu from inside it', async () => {
    const user = userEvent.setup()
    render(<MenuView />)
    const { details, summary } = openMenu()
    screen.getByRole('button', { name: 'Soft pad' }).focus()

    await user.keyboard('{Escape}')

    expect(details.open).toBe(false)
    expect(document.activeElement).toBe(summary)
  })

  it('leaves focus where it is when Escape closes the menu from outside it', async () => {
    const user = userEvent.setup()
    render(<MenuView />)
    const { details } = openMenu()
    const outside = screen.getByRole('button', { name: 'Outside' })
    outside.focus()

    await user.keyboard('{Escape}')

    expect(details.open).toBe(false)
    expect(document.activeElement).toBe(outside)
  })

  it('does not also run the view’s Escape shortcut when Escape closes a menu', async () => {
    const user = userEvent.setup()
    const onEscape = vi.fn()
    render(<MenuView onEscape={onEscape} />)
    openMenu()
    screen.getByRole('button', { name: 'Soft pad' }).focus()

    await user.keyboard('{Escape}')
    expect(onEscape).not.toHaveBeenCalled()

    await user.keyboard('{Escape}')
    expect(onEscape).toHaveBeenCalledOnce()
  })
})
