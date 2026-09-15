// @vitest-environment jsdom

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { PatchButton } from '@/components/patches/patch-button'
import { type Patch } from '@/data/patches'

afterEach(cleanup)

const patch = {
  bank: 'A',
  family: 'DX7',
  id: 'bank-A-1',
  name: 'Alpha Piano',
  number: 1,
  program: 0,
}

/* jsdom does not apply touch-action, so this checks which element declares it. */
describe('PatchButton touch scrolling', () => {
  it('stops touch scrolling only on the drag grip', () => {
    render(
      <DndContext>
        <SortableContext items={[patch.id]}>
          <PatchButton onSelect={vi.fn()} patch={patch} />
        </SortableContext>
      </DndContext>,
    )

    const grip = screen.getByRole('button', { name: /^Reorder Alpha Piano/ })
    const slot = screen.getByRole('button', { name: 'Send Alpha Piano to FM1' })

    expect(grip.classList.contains('touch-none')).toBe(true)
    expect(slot.closest('.patch-cell')?.classList.contains('touch-none')).toBe(false)
  })
})

describe('PatchButton slot menu', () => {
  function renderSlot(props: { disabled?: boolean } = {}) {
    const onCopy = vi.fn<(patch: Patch) => void>()
    const onEdit = vi.fn<(patch: Patch) => void>()
    const onSelect = vi.fn<(patch: Patch) => void>()
    render(
      <DndContext>
        <SortableContext items={[patch.id]}>
          <PatchButton
            onCopy={onCopy}
            onEdit={onEdit}
            onSelect={onSelect}
            patch={patch}
            {...props}
          />
        </SortableContext>
      </DndContext>,
    )
    return { onCopy, onEdit, onSelect, user: userEvent.setup() }
  }

  const trigger = () => screen.getByRole('button', { name: 'Actions for Alpha Piano' })

  it('offers Edit and Copy to… without playing the slot', async () => {
    const { onSelect, user } = renderSlot()

    await user.click(trigger())

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Edit',
      'Copy to…',
    ])
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('opens the slot in the editor from its menu and closes the menu', async () => {
    const { onEdit, user } = renderSlot()

    await user.click(trigger())
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))

    expect(onEdit).toHaveBeenCalledExactlyOnceWith(patch)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('copies the slot from its menu', async () => {
    const { onCopy, user } = renderSlot()

    await user.click(trigger())
    await user.click(screen.getByRole('menuitem', { name: 'Copy to…' }))

    expect(onCopy).toHaveBeenCalledExactlyOnceWith(patch)
  })

  it('closes on Escape, returns focus to its button, and keeps the key from view shortcuts', async () => {
    const { user } = renderSlot()
    const escapes: boolean[] = []
    const recordEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') escapes.push(event.defaultPrevented)
    }
    window.addEventListener('keydown', recordEscape)

    await user.click(trigger())
    await user.keyboard('{Escape}')
    window.removeEventListener('keydown', recordEscape)

    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger())
    expect(escapes).toEqual([true])
  })

  it('moves between its items with the arrow keys', async () => {
    const { user } = renderSlot()

    await user.click(trigger())
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit' }))
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Copy to…' }))
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit' }))
  })

  it('closes when the pointer goes down outside it', async () => {
    const { user } = renderSlot()

    await user.click(trigger())
    await user.click(document.body)

    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('offers no menu on a slot that cannot be used yet', () => {
    renderSlot({ disabled: true })

    expect(screen.queryByRole('button', { name: 'Actions for Alpha Piano' })).toBeNull()
  })
})
