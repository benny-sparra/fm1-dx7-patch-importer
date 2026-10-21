// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { PortalMenu } from './portal-menu'

afterEach(cleanup)

describe('PortalMenu', () => {
  it('closes onto its toggle when Tab is pressed, rather than sending focus past the page', async () => {
    const user = userEvent.setup()
    render(
      <PortalMenu
        items={[{ label: 'Copy to…' }, { label: 'Download patch' }]}
        menuLabel="Patch actions"
        triggerLabel="Actions for A1"
      />,
    )
    const trigger = screen.getByRole('button', { name: 'Actions for A1' })

    await user.click(trigger)
    screen.getByRole('menuitem', { name: 'Copy to…' }).focus()
    await user.keyboard('{Tab}')

    expect(screen.queryByRole('menu', { name: 'Patch actions' })).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('heads a run of two or more items and leaves a lone item unheaded', async () => {
    const user = userEvent.setup()
    render(
      <PortalMenu
        items={[
          { label: 'Edit' },
          { group: 'Transfer', label: 'Copy to…' },
          { group: 'Transfer', label: 'Download patch' },
          { group: 'Danger', label: 'Delete' },
        ]}
        menuLabel="Patch actions"
        triggerLabel="Actions for A1"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Actions for A1' }))

    const menu = screen.getByRole('menu', { name: 'Patch actions' })
    expect(within(menu).getByText('Transfer')).toBeTruthy()
    expect(within(menu).queryByText('Danger')).toBeNull()
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(4)
  })
})
