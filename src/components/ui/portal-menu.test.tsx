// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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

  it('names a headed run as a group a screen reader hears, and moves through it with the arrows', async () => {
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
    const groups = within(menu).getAllByRole('group')
    expect(groups).toHaveLength(1)
    const transfer = within(menu).getByRole('group', { name: 'Transfer' })
    expect(
      within(transfer)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Copy to…', 'Download patch'])
    expect(within(menu).getByRole('menuitem', { name: 'Delete' }).closest('[role="group"]')).toBe(
      null,
    )

    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(document.activeElement?.textContent).toBe('Download patch')
  })

  it('stays open while the menu scrolls itself, and closes when the page scrolls', async () => {
    const user = userEvent.setup()
    render(
      <PortalMenu
        items={[{ label: 'Edit' }, { label: 'Move later' }]}
        menuLabel="Patch actions"
        triggerLabel="Actions for A1"
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Actions for A1' }))

    fireEvent.scroll(screen.getByRole('menu', { name: 'Patch actions' }))
    expect(screen.getByRole('menu', { name: 'Patch actions' })).toBeTruthy()

    fireEvent.scroll(document)
    expect(screen.queryByRole('menu', { name: 'Patch actions' })).toBeNull()
  })
})
