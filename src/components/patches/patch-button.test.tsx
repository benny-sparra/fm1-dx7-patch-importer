// @vitest-environment jsdom

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { PatchButton } from '@/components/patches/patch-button'

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
