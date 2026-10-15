// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

import { HelpPopover } from './help-popover'

function ViewWithHelp({ onBack }: { onBack: () => void }) {
  useKeyboardShortcuts([{ key: 'Escape', onTrigger: onBack }])

  return <HelpPopover label="Feedback" text="Feeds operator 6 back into itself." />
}

afterEach(cleanup)

describe('HelpPopover', () => {
  it('claims Escape, so closing it does not also run the view’s Escape shortcut', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    render(<ViewWithHelp onBack={onBack} />)
    const trigger = screen.getByRole('button', { name: /Feedback/ })

    // A pointer opens it on hover first, so open it from the keyboard.
    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('note')).toBeTruthy()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('note')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(onBack).not.toHaveBeenCalled()
  })
})
